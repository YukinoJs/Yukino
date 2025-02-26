import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Connector } from '../src/lib/connectors/Connector';
import { Events, LoadTypes } from '../src/constants';
import { joinVoiceChannel } from '@discordjs/voice';

// Replace these with your bot's details
const TOKEN = 'OTc0MzYwNzE2ODA5MjIwMTE4.GivOQs.l4KAyIxqnReNcLQTyfM0y24S065cnXlwgF-xow';
const CLIENT_ID = '974360716809220118';

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ]
});

// Create Lavalink connector with exact configuration from application.yml
const connector = new Connector({
    name: 'Main',
    url: 'http://127.0.0.1:1092',  // Matches server.address and server.port from application.yml
    auth: 'root',  // Matches lavalink.server.password from application.yml
    secure: false,
    sessionId: '12345',
    version: 'v4'  // Small numeric value that's guaranteed to parse as a Java Long
});

// Create a single node and connect
const node = connector.createNode({ name: 'Node1' });

// Add detailed event logging
node.on('error', (error) => {
    console.error('[Lavalink] Node error:', error);
});

node.on('close', (code, reason) => {
    console.log(`[Lavalink] Node closed: ${code} - ${reason}`);
});

node.on('ready', () => {
    console.log('[Lavalink] Node is ready!');
});

// Try to establish initial connection
node.connect();
console.log('[Lavalink] Attempting initial connection...');

// Store players for each guild
const players = new Map();

// Add Discord.js voice state update handling
client.on('voiceStateUpdate', (oldState, newState) => {
    // Only handle updates for our bot user
    if (newState.member?.id !== client.user?.id) return;
    
    console.log('[Voice] State update received:', {
        guild: newState.guild.id,
        userId: newState.member?.id,
        sessionId: newState.sessionId,
        channelId: newState.channelId
    });

    // Forward voice state updates to Lavalink
    node.handleVoiceStateUpdate({
        guild_id: newState.guild.id,
        user_id: newState.member?.id,
        session_id: newState.sessionId,
        channel_id: newState.channelId
    });
});

client.on('raw', (packet) => {
    // We need both VOICE_SERVER_UPDATE and VOICE_STATE_UPDATE from raw gateway events
    if (packet.t === 'VOICE_SERVER_UPDATE') {
        console.log('[Voice] Server update received:', packet.d);
        node.handleVoiceServerUpdate(packet.d);
    }
    
    // Also capture VOICE_STATE_UPDATE from raw events to get session ID directly
    if (packet.t === 'VOICE_STATE_UPDATE' && packet.d.user_id === client.user?.id) {
        console.log('[Voice] Raw state update received:', packet.d);
        node.handleVoiceStateUpdate(packet.d);
    }
});

// Define commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The song to play (URL or search query)')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the current song'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the current song'),
].map(command => command.toJSON());

// Register commands when bot starts
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Bot is ready and commands are registered!');
    } catch (error) {
        console.error(error);
    }
});

// Handle commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName } = interaction;
    
    // Ensure this is in a guild
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply('This command can only be used in a server!');
        return;
    }

    // Get member and check voice state
    const member = interaction.member as GuildMember;
    if (!member?.voice?.channel) {
        await interaction.reply('You need to be in a voice channel!');
        return;
    }

    try {
        switch (commandName) {
            case 'play': {
                const query = interaction.options.getString('query');
                if (!query) {
                    await interaction.reply('Please provide a song to play!');
                    return;
                }
                
                await interaction.deferReply();

                // Create or get player
                let player = players.get(interaction.guildId);
                if (!player) {
                    // Store voice channel ID for reference
                    const voiceChannelId = member.voice.channel.id;
                    
                    player = connector.createPlayer({
                        guildId: interaction.guildId,
                        voiceChannelId: voiceChannelId,
                        textChannelId: interaction.channelId,
                    });
                    players.set(interaction.guildId, player);

                    console.log(`[Voice] Creating connection to channel ${voiceChannelId} in guild ${interaction.guildId}`);
                    
                    // Join voice channel - this triggers the voice state update events
                    const connection = joinVoiceChannel({
                        channelId: voiceChannelId,
                        guildId: interaction.guildId,
                        adapterCreator: interaction.guild.voiceAdapterCreator,
                        selfDeaf: true,
                    });
                    
                    // Set up event listeners to properly synchronize Discord.js and Lavalink voice states
                    connection.on('stateChange', (oldState, newState) => {
                        console.log(`[Voice] Connection state changed: ${oldState.status} -> ${newState.status}`);
                        
                        // When we're ready, manually update the player with voice state
                        if (newState.status === 'ready') {
                            // Access connection properties in a type-safe way
                            const connectionData = connection.joinConfig;
                            if (!connectionData) {
                                console.error('[Voice] No connection data available');
                                return;
                            }

                            // State contains the actual session ID, not the joinConfig
                            console.log(`[Voice] Connection ready in channel ${connectionData.channelId}`);
                            
                            // Send the voice state update with the correct session ID
                            node.handleVoiceStateUpdate({
                                guild_id: interaction.guildId,
                                user_id: interaction.client.user?.id || CLIENT_ID,
                                session_id: connectionData.sessionId, 
                                channel_id: voiceChannelId
                            });
                            
                            // Get server data from the Discord.js connection
                            try {
                                // Access voice server data from raw events instead of the connection object
                                // We rely on the raw event handlers to provide voice server information
                                console.log('[Voice] Ready to process voice updates');
                            } catch (err) {
                                console.error('[Voice] Error accessing connection state:', err);
                            }
                        }
                    });
                    
                    // Explicitly connect the player after joining the voice channel
                    await player.connect();
                    
                    // Give the voice connection a moment to initialize before playing
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Load and play track
                const result = await connector.loadTrack(query);
                
                if (result.loadType === LoadTypes.SEARCH_RESULT || 
                    result.loadType === LoadTypes.TRACK_LOADED) {
                    await player.play(result.data[0]);
                    await interaction.editReply(`Now playing: ${result.data[0].info.title}`);
                } else if (result.loadType === LoadTypes.PLAYLIST_LOADED) {
                    // For playlists, add all tracks to queue and start playing the first one
                    // Play the first track immediately and queue the rest
                    await player.play(result.data[0]);
                    
                    // Add remaining tracks to queue if it exists
                    if (player.queue && typeof player.queue.add === 'function') {
                        for (let i = 1; i < result.data.length; i++) {
                            await player.queue.add(result.data[i]);
                        }
                    }
                    
                    await interaction.editReply(`Playing playlist with ${result.data.length} tracks`);
                } else if (result.loadType === LoadTypes.NO_MATCHES) {
                    await interaction.editReply('No tracks found for your query');
                } else {
                    await interaction.editReply('Failed to load track');
                }
                break;
            }
            case 'stop': {
                const player = players.get(interaction.guildId);
                if (player) {
                    await player.stop();
                    await interaction.reply('Playback stopped');
                } else {
                    await interaction.reply('Nothing is playing!');
                }
                break;
            }
            case 'skip': {
                const player = players.get(interaction.guildId);
                if (player) {
                    await player.skip();
                    await interaction.reply('Skipped current track');
                } else {
                    await interaction.reply('Nothing is playing!');
                }
                break;
            }
            case 'pause': {
                const player = players.get(interaction.guildId);
                if (player) {
                    await player.pause();
                    await interaction.reply('Playback paused');
                } else {
                    await interaction.reply('Nothing is playing!');
                }
                break;
            }
            case 'resume': {
                const player = players.get(interaction.guildId);
                if (player) {
                    await player.pause(false);
                    await interaction.reply('Playback resumed');
                } else {
                    await interaction.reply('Nothing is playing!');
                }
                break;
            }
        }
    } catch (error) {
        console.error(error);
        const message = 'An error occurred while processing the command.';
        if (interaction.deferred) {
            await interaction.editReply(message);
        } else {
            await interaction.reply(message);
        }
    }
});

// Handle player events
connector.on(Events.NODE_READY, (node) => {
    console.log(`Node ${node.options.name} is ready!`);
});

connector.on(Events.NODE_ERROR, (node, error) => {
    console.error(`Node ${node.options.name} encountered an error:`, error);
});

// Track events
connector.on(Events.TRACK_START, (player, track) => {
    console.log(`Track started: ${track.info.title} in guild ${player.guildId}`);
});

connector.on(Events.TRACK_END, (player, track, reason) => {
    console.log(`Track ended: ${track.info.title} in guild ${player.guildId}, reason: ${reason}`);
});

connector.on(Events.TRACK_STUCK, (player, track) => {
    console.log(`Track stuck: ${track.info.title}`);
    player.skip().catch(console.error);
});

connector.on(Events.TRACK_ERROR, (player, track, error) => {
    console.error(`Track error: ${error}`, track.info.title);
    player.skip().catch(console.error);
});

// Voice events
connector.on(Events.VOICE_CONNECTED, (player) => {
    console.log(`Voice connected in guild ${player.guildId}`);
});

connector.on(Events.VOICE_DISCONNECTED, (player) => {
    console.log(`Voice disconnected in guild ${player.guildId}`);
});

// Clean up on process exit
process.on('SIGINT', () => {
    connector.destroy();
    client.destroy();
    process.exit(0);
});

// Start the bot
client.login(TOKEN);