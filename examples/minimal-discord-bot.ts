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

// Variable to track initialization status
let yukinoInitialized = false;

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// Simple logger
const log = (message: string) => console.log(`[DEBUG] ${message}`);

// Connection debugging
client.on('debug', (message) => {
  console.log(`[Discord Debug] ${message}`);
});

// Set up connector and node when client is ready
client.once("ready", async () => {
  log(`Logged in as ${client.user?.tag}!`);
  log(`Initializing Yukino client...`);

  try {
    // Setup Yukino directly with the Discord.js client
    const connectorOptions = {
      client,
      host: process.env.LAVALINK_HOST || "localhost",
      port: parseInt(process.env.LAVALINK_PORT || "1092"),
      auth: process.env.LAVALINK_PASSWORD || "root",
      secure: false,
      version: "v4",
      debug: true, // Enable debug logging
    };

    log(`Connector options: ${connectorOptions}`);

    const nodeOptions = {
      name: "DebugNode",
      url: process.env.LAVALINK_HOST
        ? `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT || "1092"}`
        : "localhost:1092",
      auth: process.env.LAVALINK_PASSWORD || "root",
      secure: false,
    };

    log(`Node options: ${JSON.stringify(nodeOptions, null, 2)}`);

    // Create YukinoClient and attach to Discord.js client
    client.yukino = new YukinoClient(client, connectorOptions, nodeOptions);
    log(`YukinoClient instance created`);

    // Event logging for detailed insight
    client.yukino.node.on(Events.NODE_ERROR, (error: any) => {
      console.error("[Lavalink] Node error:", error);
    });

    client.yukino.node.on(Events.NODE_READY, () => {
      log("[Lavalink] Node is ready!");
      yukinoInitialized = true;
    });

    client.yukino.connector.on("debug", (message: string) => {
      log(`[Connector Debug] ${message}`);
    });

    client.yukino.node.on("debug", (message: string) => {
      log(`[Node Debug] ${message}`);
    });

    client.yukino.node.on(Events.WS_CLOSED, (player, data) => {
      log(`[Voice] WebSocket closed: Code ${data?.code}, Reason: ${data?.reason || "Unknown"}`);
    });

    client.yukino.node.on(Events.PLAYER_CREATE, (player) => {
      log(`Player created in guild ${player.guildId}`);
    });

    // Connect to Lavalink
    log(`Attempting to connect YukinoClient to Lavalink...`);
    await client.yukino.connect();
    log(`YukinoClient connected successfully!`);

    // Register slash commands
    await registerCommands();
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Create player function with debug logs
async function createPlayer(guildId: string, voiceChannelId: string, textChannelId: string) {
  log(`createPlayer called for guild ${guildId}, voice ${voiceChannelId}, text ${textChannelId}`);
  
  // Check if yukino is defined
  if (!client.yukino) {
    log(`Error: YukinoClient is not initialized yet`);
    throw new Error("YukinoClient is not initialized yet. Please try again in a moment.");
  }
  
  // Return existing player if available
  const existingPlayer = client.yukino.getPlayer(guildId);
  if (existingPlayer) {
    log(`Returning existing player for guild ${guildId}`);
    return existingPlayer;
  }

  // Check if node is ready
  if (!yukinoInitialized || !client.yukino.isReady) {
    log(`Lavalink node is not ready yet`);
    throw new Error("Lavalink node is not ready yet. Please try again in a moment.");
  }

  log(`Creating new player for guild ${guildId}`);

  // Create the player using connector
  const player = client.yukino.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId,
    volume: 100,
    deaf: true,
  });

  // Connect the player
  try {
    log(`Connecting player to voice in guild ${guildId}`);
    await player.connect();
    log(`Player successfully connected to voice in guild ${guildId}`);
  } catch (error) {
    log(`Error connecting player: ${(error as Error).message}`);
    console.error("Player connection error:", error);
    throw error;
  }

  return player;
}

// Define slash commands - just play command for simplicity
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The song to play (URL or search query)")
        .setRequired(true)
    )
].map((command) => command.toJSON());

// Register commands
async function registerCommands() {
  log(`Registering slash commands...`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    log("Slash commands registered successfully!");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// Handle commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {
    log(`Play command received from user ${interaction.user.tag}`);

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

    // Check if user is in a voice channel
    if (!member?.voice?.channel) {
      await interaction.reply({
        content: "Join a voice channel first!",
        ephemeral: true,
      });
      return;
    }

    // Check if yukino is initialized
    if (!client.yukino || !yukinoInitialized) {
      await interaction.reply({
        content: "Bot is still initializing. Please wait a moment and try again.",
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
      // Create player with detailed logging
      log(`Creating player for guild ${interaction.guildId}`);
      const player = await createPlayer(
        interaction.guildId,
        member.voice.channel.id,
        interaction.channelId
      );

      // Load track with detailed logging
      log(`Loading track: "${query}"`);
      const result = await client.yukino!.loadTrack(query);
      log(`Load track result type: ${result?.loadType}`);
      
      if (!result || !result.data || !result.data.length) {
        log(`No tracks found for query: "${query}"`);
        await interaction.editReply("❌ No tracks found!");
        return;
      }

      if (
        result.loadType === LoadTypes.SEARCH_RESULT ||
        result.loadType === LoadTypes.TRACK_LOADED
      ) {
        const track = result.data[0];
        log(`Track found: "${track.info.title}" by ${track.info.author}`);

        // Play track immediately
        log(`Playing track: "${track.info.title}"`);
        await player.play({ track });
        await interaction.editReply(`▶️ Now playing: **${track.info.title}**`);
      } else if (result.loadType === LoadTypes.PLAYLIST_LOADED) {
        log(`Playlist found: "${result.playlistInfo?.name}" with ${result.data.length} tracks`);
        const firstTrack = result.data[0];
        log(`Playing first track from playlist: "${firstTrack.info.title}"`);
        
        await player.play({ track: firstTrack });
        await interaction.editReply(
          `▶️ Playing playlist: **${result.playlistInfo?.name}** with ${result.data.length} tracks`
        );
      } else {
        log(`Unhandled load type: ${result.loadType}`);
        await interaction.editReply("❌ No tracks found!");
      }
    } catch (error) {
      console.error("Play command error:", error);
      await interaction.editReply(
        `❌ Error playing track: ${(error as Error).message || "Unknown error"}`
      );
    }
  }
});

// Better voice state handling with debug logs
client.on("voiceStateUpdate", (oldState, newState) => {
  // Only handle events for our bot
  if (
    oldState.member?.user.id !== client.user?.id &&
    newState.member?.user.id !== client.user?.id
  ) {
    return;
  }

  log(`Voice state changed: ${oldState.channelId || "none"} -> ${newState.channelId || "none"}`);
});

// Start the bot
log("Bot is starting...");
client.login(TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
