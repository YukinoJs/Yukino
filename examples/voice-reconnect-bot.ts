import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  GuildMember,
} from "discord.js";
import { Events, LoadTypes } from "../src/types/constants";
import { config } from "dotenv";
import { YukinoClient } from "../src/structures/YukinoClient";

// TypeScript Declaration: Extend Discord.js Client type to include yukino property
declare module "discord.js" {
  interface Client {
    yukino: YukinoClient;
  }
}

// Load environment variables
config();

// Bot configuration
const TOKEN = process.env.DISCORD_TOKEN || "your-token-here";
const CLIENT_ID = process.env.CLIENT_ID || "your-client-id-here";

// Create Discord client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Simple logger
const log = (message: string) => console.log(`[BOT] ${message}`);

// Voice connection state tracking by guild
const voiceReconnectTimers = new Map<string, NodeJS.Timeout>();
const reconnectAttempts = new Map<string, number>();
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000; // 3 seconds

client.once("ready", async () => {
  log(`Logged in as ${client.user?.tag}!`);

  try {
    // Setup Yukino with enhanced connection options
    const connectorOptions = {
      client,
      host: process.env.LAVALINK_HOST || "localhost",
      port: parseInt(process.env.LAVALINK_PORT || "1092"),
      auth: process.env.LAVALINK_PASSWORD || "root",
      secure: false,
      version: "v4",
      debug: true, // Enable debug logging
      reconnect: true, // Enable auto reconnect for the connector
      resumeKey: "yukino-reconnect-bot", // Unique key to resume audio sessions on reconnect
      resumeTimeout: 60, // Resume timeout in seconds
    };

    const nodeOptions = {
      name: "MainNode",
      url: process.env.LAVALINK_HOST
        ? `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT || "1092"}`
        : "localhost:1092",
      auth: process.env.LAVALINK_PASSWORD || "root",
      secure: false,
      reconnectOptions: {
        maxRetryAttempts: 10,
        retryDelayInMs: 3000,
      },
    };

    // Create YukinoClient and attach to Discord.js client
    client.yukino = new YukinoClient(client, connectorOptions, nodeOptions);
    
    // Enhanced error handling and reconnection logic
    client.yukino.node.on(Events.NODE_ERROR, (error: any) => {
      console.error("[Lavalink] Node error:", error);
    });

    client.yukino.node.on(Events.NODE_READY, () => {
      log("[Lavalink] Node is ready!");
    });

    // Handle WebSocket closed events specifically for code 4006
    client.yukino.node.on(Events.WS_CLOSED, (player, data) => {
      const guildId = player.guildId;
      log(`[Voice] WebSocket closed for guild ${guildId}: Code=${data?.code}, Reason="${data?.reason || "Unknown"}"`);
      
      // Handle 4006 error specifically - Session no longer valid
      if (data?.code === 4006 || !data?.code) {
        handleVoiceDisconnect(player.guildId, player.voiceChannelId);
      }
    });

    // Player destroy event - remove any reconnect timers
    client.yukino.node.on(Events.PLAYER_DESTROY, (player) => {
      const guildId = player.guildId;
      clearReconnectTimer(guildId);
      log(`[Voice] Player destroyed for guild ${guildId}`);
    });

    // Connect to Lavalink
    await client.yukino.connect();
    log("Connected to Lavalink");

    // Register slash commands
    await registerCommands();
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Function to handle voice disconnections
function handleVoiceDisconnect(guildId: string, voiceChannelId: string | null) {
  // Skip if no voice channel ID is available
  if (!voiceChannelId) {
    log(`[Voice] No voice channel ID available for guild ${guildId}, cannot reconnect`);
    return;
  }

  // Clear any existing reconnect timer for this guild
  clearReconnectTimer(guildId);

  // Get the current attempt count or initialize it
  const attempts = reconnectAttempts.get(guildId) || 0;
  
  // Check if we've hit the max attempts
  if (attempts >= MAX_RECONNECT_ATTEMPTS) {
    log(`[Voice] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached for guild ${guildId}`);
    reconnectAttempts.delete(guildId);
    
    // Get the player and destroy it
    const player = client.yukino.getPlayer(guildId);
    if (player) {
      player.destroy().catch(console.error);
    }
    return;
  }

  // Set a timeout to attempt reconnection
  log(`[Voice] Scheduling reconnect attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS} for guild ${guildId}`);
  
  const timerId = setTimeout(async () => {
    log(`[Voice] Attempting to reconnect to voice in guild ${guildId} (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    try {
      // Get the existing player or create a new one
      let player = client.yukino.getPlayer(guildId);
      
      if (player) {
        // Reconnect existing player
        log(`[Voice] Reconnecting existing player in guild ${guildId}`);
        await player.connect();
      } else {
        // Create a new player if it doesn't exist
        log(`[Voice] Creating new player for guild ${guildId}`);
        player = client.yukino.createPlayer({
          guildId,
          voiceChannelId,
          volume: 100,
          deaf: true,
        });
        await player.connect();
      }
      
      // Reset attempts on success
      log(`[Voice] Successfully reconnected to voice in guild ${guildId}`);
      reconnectAttempts.delete(guildId);
    } catch (error) {
      // Increment attempt counter on failure
      reconnectAttempts.set(guildId, attempts + 1);
      log(`[Voice] Failed to reconnect to voice in guild ${guildId}: ${(error as Error).message}`);
      
      // Try again
      handleVoiceDisconnect(guildId, voiceChannelId);
    } finally {
      // Clean up the timer entry
      voiceReconnectTimers.delete(guildId);
    }
  }, RECONNECT_INTERVAL);
  
  // Store the timer ID
  voiceReconnectTimers.set(guildId, timerId);
  
  // Update the attempt counter
  reconnectAttempts.set(guildId, attempts + 1);
}

// Function to clear reconnect timer
function clearReconnectTimer(guildId: string) {
  const timerId = voiceReconnectTimers.get(guildId);
  if (timerId) {
    clearTimeout(timerId);
    voiceReconnectTimers.delete(guildId);
  }
}

// Create player with enhanced reconnection capabilities
async function createPlayer(guildId: string, voiceChannelId: string, textChannelId: string) {
  // Return existing player if available
  const existingPlayer = client.yukino.getPlayer(guildId);
  if (existingPlayer) {
    return existingPlayer;
  }

  // Check node readiness
  if (!client.yukino.isReady) {
    throw new Error("Lavalink node is not ready. Please try again in a moment.");
  }

  log(`[Voice] Creating player for guild ${guildId} in channel ${voiceChannelId}`);
  
  // Create the player with auto-reconnect enabled
  const player = client.yukino.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId,
    volume: 100,
    deaf: true,
    // Add auto-reconnect capabilities if supported by your version
    autoReconnect: true,
  });

  // Connect the player
  try {
    await player.connect();
    log(`[Voice] Player connected to voice in guild ${guildId}`);
    
    // Reset reconnection attempts when we connect successfully
    reconnectAttempts.delete(guildId);
  } catch (error) {
    log(`[Voice] Error connecting player: ${(error as Error).message}`);
    throw error;
  }

  return player;
}

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The song to play (URL or search query)")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop playback and disconnect"),
  new SlashCommandBuilder()
    .setName("reconnect")
    .setDescription("Force reconnect to voice channel if disconnected"),
].map((command) => command.toJSON());

// Register commands
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    log("Commands registered successfully!");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// Handle commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Check if in a guild
  if (!interaction.guildId) {
    await interaction.reply({
      content: "Commands only work in servers!",
      ephemeral: true,
    });
    return;
  }

  // Get member for voice commands
  const member = interaction.member as GuildMember;

  switch (interaction.commandName) {
    case "play": {
      // Check if user is in a voice channel
      if (!member?.voice?.channel) {
        await interaction.reply({
          content: "Join a voice channel first!",
          ephemeral: true,
        });
        return;
      }

      const query = interaction.options.getString("query");
      if (!query) {
        await interaction.reply({
          content: "Please provide a song to play!",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();
      log(`Processing play command for query: "${query}"`);

      try {
        // Create player with enhanced connection handling
        const player = await createPlayer(
          interaction.guildId,
          member.voice.channel.id,
          interaction.channelId
        );

        // Load track
        const result = await client.yukino.loadTrack(query);
        
        if (!result || !result.data || !result.data.length) {
          await interaction.editReply("❌ No tracks found!");
          return;
        }

        if (
          result.loadType === LoadTypes.SEARCH_RESULT ||
          result.loadType === LoadTypes.TRACK_LOADED
        ) {
          const track = result.data[0];
          
          // Clear any reconnect attempts when we play a new track
          reconnectAttempts.delete(interaction.guildId);
          
          await player.play({ track });
          await interaction.editReply(`▶️ Now playing: **${track.info.title}**`);
        } else if (result.loadType === LoadTypes.PLAYLIST_LOADED) {
          const firstTrack = result.data[0];
          
          // Clear any reconnect attempts when we play a new track
          reconnectAttempts.delete(interaction.guildId);
          
          await player.play({ track: firstTrack });
          await interaction.editReply(
            `▶️ Playing playlist: **${result.playlistInfo?.name}** with ${result.data.length} tracks`
          );
        } else {
          await interaction.editReply("❌ No tracks found!");
        }
      } catch (error: any) {
        console.error("Play command error:", error);
        await interaction.editReply(
          `❌ Error playing track: ${error.message || "Unknown error"}`
        );
      }
      break;
    }

    case "stop": {
      const player = client.yukino.getPlayer(interaction.guildId);
      if (!player) {
        await interaction.reply({
          content: "Nothing is playing!",
          ephemeral: true,
        });
        return;
      }

      // Clear reconnection attempts and destroy player
      clearReconnectTimer(interaction.guildId);
      reconnectAttempts.delete(interaction.guildId);

      await player.destroy();
      await interaction.reply("⏹️ Playback stopped!");
      break;
    }

    case "reconnect": {
      // Check if user is in a voice channel
      if (!member?.voice?.channel) {
        await interaction.reply({
          content: "Join a voice channel first!",
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      try {
        // Clear any existing reconnection attempts
        clearReconnectTimer(interaction.guildId);
        reconnectAttempts.delete(interaction.guildId);

        // Get existing player or create a new one
        let player = client.yukino.getPlayer(interaction.guildId);
        
        if (player) {
          log(`[Voice] Force reconnecting player in guild ${interaction.guildId}`);
          await player.connect();
        } else {
          log(`[Voice] Creating new player for guild ${interaction.guildId} during force reconnect`);
          player = client.yukino.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: member.voice.channel.id,
            textChannelId: interaction.channelId,
            volume: 100,
            deaf: true,
          });
          await player.connect();
        }

        await interaction.editReply("🔄 Successfully reconnected to voice channel!");
      } catch (error: any) {
        console.error("Reconnect command error:", error);
        await interaction.editReply(
          `❌ Error reconnecting: ${error.message || "Unknown error"}`
        );
      }
      break;
    }
  }
});

// Enhanced voice state handling
client.on("voiceStateUpdate", (oldState, newState) => {
  // Only handle events for our bot
  if (
    oldState.member?.user.id !== client.user?.id &&
    newState.member?.user.id !== client.user?.id
  ) {
    return;
  }

  const guildId = oldState.guild.id;
  log(`[Voice] Voice state changed in guild ${guildId}: ${oldState.channelId || "none"} -> ${newState.channelId || "none"}`);

  // Bot was disconnected from voice channel
  if (oldState.channelId && !newState.channelId) {
    log(`[Voice] Bot was disconnected from voice channel in guild ${guildId}`);
    
    // Get the player
    const player = client.yukino.getPlayer(guildId);
    if (player && player.playing) {
      // Try to reconnect if we were playing
      handleVoiceDisconnect(guildId, player.voiceChannelId);
    }
  }
  // Bot was moved to another channel
  else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    log(`[Voice] Bot was moved to a different channel in guild ${guildId}`);
    
    // Update player's voice channel ID
    const player = client.yukino.getPlayer(guildId);
    if (player) {
      player.voiceChannelId = newState.channelId;
    }
  }
});

// Start the bot
log("Bot is starting...");
client.login(TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
