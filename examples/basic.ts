import { Connector } from '../src/lib/connectors/Connector';
import { Events, LoadTypes } from '../src/constants';
import { Player } from '../src/lib/node/Player';

// Create a connector instance with Lavalink server details
const connector = new Connector({
    name: 'Main',
    url: 'localhost:1092', // Default Lavalink port
    auth: 'root', // Default Lavalink password
    secure: false, // Use false for ws://, true for wss://
});

// Create a test player for a guild
const player = connector.createPlayer({
    guildId: '123456789',
    voiceChannelId: '987654321',
    textChannelId: '987654321', // Optional
    selfDeaf: true, // Optional
    volume: 100 // Optional
});

// Example: Handle various events
connector.on(Events.NODE_READY, (node) => {
    console.log(`Node ${node.options.name} is ready!`);
});

connector.on(Events.NODE_ERROR, (node, error) => {
    console.error(`Node ${node.options.name} encountered an error:`, error);
});

connector.on(Events.NODE_DISCONNECT, (node) => {
    console.log(`Node ${node.options.name} has disconnected. Attempting to reconnect...`);
});

// Player event handling
player.on(Events.PLAYER_CREATE, () => {
    console.log('Player was created!');
});

player.on(Events.TRACK_START, (player, track) => {
    console.log('Now playing:', track.info.title);
});

player.on(Events.TRACK_END, (player, track, reason) => {
    console.log(`Track ended: ${track.info.title}, Reason: ${reason}`);
});

player.on(Events.TRACK_STUCK, (player, track) => {
    console.log('Track got stuck:', track.info.title);
    player.skip(); // Skip the stuck track
});

player.on(Events.TRACK_ERROR, (player, track, error) => {
    console.error('Track error:', error);
});

// Example: Load and play a track
async function playTrack() {
    try {
        // Load a track (can be a URL or search query)
        const result = await connector.loadTrack('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        
        if (result.loadType === LoadTypes.TRACK_LOADED || result.loadType === LoadTypes.SEARCH_RESULT) {
            // Play the first track
            await player.play(result.tracks[0]);
            console.log('Started playing:', result.tracks[0].info.title);
        }
        else if (result.loadType === LoadTypes.PLAYLIST_LOADED) {
            // Play the first track and add rest to queue
            await player.play(result.tracks[0]);
            console.log('Started playing playlist:', result.playlistInfo.name);
        }
        else if (result.loadType === LoadTypes.NO_MATCHES) {
            console.log('No tracks found!');
        }
        else if (result.loadType === LoadTypes.LOAD_FAILED) {
            console.error('Failed to load track:', result.exception?.message);
        }
    } catch (error) {
        console.error('Error playing track:', error);
    }
}

// Example: Using filters
async function testFilters() {
    // Set volume
    await player.setVolume(80);

    // Apply equalizer
    await player.filters.setEqualizer([
        { band: 0, gain: 0.25 },
        { band: 1, gain: 0.25 },
    ]);

    // Apply nightcore effect
    await player.filters.setTimescale({
        speed: 1.2,
        pitch: 1.3,
        rate: 1
    });

    // Clear all filters
    await player.filters.clearFilters();
}

// Example: Voice channel management
async function testVoiceManagement() {
    // Move to a different voice channel
    await player.moveVoiceChannel('98765432', { selfDeaf: true });
    
    // Disconnect from voice
    player.disconnect();
}

// Example: Basic controls
async function testControls() {
    // Pause
    await player.pause();
    
    // Resume
    await player.pause(false);
    
    // Seek to position (in milliseconds)
    await player.seek(30000); // Seek to 30 seconds
    
    // Stop
    await player.stop();
}

// Clean up on process exit
process.on('SIGINT', () => {
    connector.destroy();
    process.exit(0);
});

// Example usage
(async () => {
    try {
        await playTrack();
        await testFilters();
        await testControls();
    } catch (error) {
        console.error('Error in example:', error);
    }
})();