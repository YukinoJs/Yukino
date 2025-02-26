import { Connector } from '../src/lib/connectors/Connector';
import { Events, LoadTypes } from '../src/constants';
import { BasePlugin } from '../src/lib/plugins/BasePlugin';
import { Queue } from '../src/lib/node/Queue';

// Example custom plugin
class CustomStatsPlugin extends BasePlugin {
    constructor() {
        super('customStats');
    }

    public handle(payload: any): void {
        if (payload.type === 'customStats') {
            console.log('Received custom stats:', payload.data);
        }
    }
}

// Initialize connector
const connector = new Connector({
    name: 'Main',
    url: 'localhost:2333',
    auth: 'youshallnotpass'
});

// Create and configure player
const player = connector.createPlayer({
    guildId: '123456789',
    voiceChannelId: '987654321'
});

// Create and configure queue
const queue = new Queue(1000);

// Register custom plugin
const node = connector.createNode();
node.registerPlugin('customStats', new CustomStatsPlugin());

// Queue management example
async function queueExample() {
    try {
        // Search for tracks
        const searchResult = await connector.loadTrack('nightcore');
        
        if (searchResult.loadType === LoadTypes.SEARCH_RESULT) {
            // Add tracks to queue
            queue.add(searchResult.tracks[0]);
            console.log('Added to queue:', searchResult.tracks[0].info.title);

            // Start playing if not already playing
            if (!player.playing) {
                const track = queue.next();
                if (track) {
                    await player.play(track);
                }
            }
        }

        // Load a playlist
        const playlistResult = await connector.loadTrack('https://www.youtube.com/playlist?list=PLExample');
        
        if (playlistResult.loadType === LoadTypes.PLAYLIST_LOADED) {
            queue.add(playlistResult.tracks);
            console.log(`Added playlist to queue: ${playlistResult.playlistInfo.name}`);
        }
    } catch (error) {
        console.error('Error in queue example:', error);
    }
}

// Filter chains example
async function filterChainsExample() {
    try {
        // Apply multiple filters in sequence
        await player.filters.setTimescale({
            speed: 1.2,
            pitch: 1.3,
            rate: 1.0
        });

        await player.filters.setEqualizer([
            { band: 0, gain: 0.3 },
            { band: 1, gain: 0.2 }
        ]);

        // Add tremolo effect
        await player.filters.setTremolo(2.0, 0.5);

        console.log('Applied filter chain');

        // Wait 5 seconds then clear
        setTimeout(async () => {
            await player.filters.clearFilters();
            console.log('Cleared all filters');
        }, 5000);
    } catch (error) {
        console.error('Error in filter chains example:', error);
    }
}

// Queue event handling
queue.on(Events.QUEUE_UPDATE, (tracks) => {
    console.log('Queue updated, new length:', tracks.length);
});

queue.on(Events.QUEUE_END, () => {
    console.log('Queue finished playing');
});

// Advanced player event handling
player.on(Events.PLAYER_UPDATE, (state) => {
    console.log('Player state updated:', {
        position: state.position,
        ping: state.ping
    });
});

// Voice state handling
player.on(Events.VOICE_CONNECTED, () => {
    console.log('Successfully connected to voice channel');
});

player.on(Events.VOICE_DISCONNECTED, () => {
    console.log('Disconnected from voice channel');
});

player.on(Events.VOICE_ERROR, (error) => {
    console.error('Voice connection error:', error);
});

// Example of handling track transitions
player.on(Events.TRACK_END, async (_, track, reason) => {
    console.log(`Track ended: ${track.info.title}, reason: ${reason}`);
    
    // Auto play next track if available
    const nextTrack = queue.next();
    if (nextTrack) {
        try {
            await player.play(nextTrack);
            console.log('Playing next track:', nextTrack.info.title);
        } catch (error) {
            console.error('Failed to play next track:', error);
        }
    }
});

// Run examples
async function runExamples() {
    try {
        await queueExample();
        await filterChainsExample();
    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Clean up on exit
process.on('SIGINT', () => {
    player.destroy();
    connector.destroy();
    process.exit(0);
});

// Run the examples
runExamples();