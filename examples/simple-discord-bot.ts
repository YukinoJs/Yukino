import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { DiscordJSConnector } from "../src/lib/connectors/DiscordJSConnector";
import { Events, LoadTypes } from "../src/types/constants";
import { config } from "dotenv";
import { Track } from "../src/types/interfaces";
import { Player } from "../src/structures/Player";

// Load environment variables
config();

// Bot configuration
const TOKEN = process.env.DISCORD_TOKEN || "your-token-here";
const CLIENT_ID = process.env.CLIENT_ID || "your-client-id-here";

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// Simple logger
const log = (message: string) => console.log(`[BOT] ${message}`);

// Store active players
const players = new Map();

// Track node readiness
let nodeReady = false;

// Global connector and node references
let connector: DiscordJSConnector;
let node: any;

// Set up connector and node when client is ready
client.once("ready", async () => {
  log(`Logged in as ${client.user?.tag}!`);

  // Create DiscordJSConnector instead of generic Connector
  // This handles voice state updates automatically
  connector = new DiscordJSConnector({
    client,
    host: process.env.LAVALINK_HOST || "localhost",
    port: parseInt(process.env.LAVALINK_PORT || "1092"),
    auth: process.env.LAVALINK_PASSWORD || "root",
    secure: false,
    version: "v4",
  });

  // Create and initialize node
  node = connector.createNode({
    name: "TestNode",
    url: process.env.LAVALINK_HOST
      ? `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT || "1092"}`
      : "localhost:1092",
    auth: process.env.LAVALINK_PASSWORD || "root",
  });

  // Better event handling and debugging
  node.on(Events.NODE_ERROR, (error: any) => {
    console.error("[Lavalink] Node error:", error);
    nodeReady = false;
  });

  node.on(Events.NODE_READY, () => {
    log("[Lavalink] Node is ready!");
    nodeReady = true;
  });


  // Track events
  node.on(Events.TRACK_START, (player: Player, track: Track) => {
    log(`[Player] Now playing: ${track.info.title} in guild ${player.guildId}`);
  });

  node.on(Events.TRACK_END, (player: Player, track: Track, reason:any) => {
    log(
      `[Player] Track ended: ${track.info.title} in guild ${player.guildId} (${reason})`
    );

    // Let the Player's built-in queue handling work
    if (reason !== "REPLACED" && reason !== "STOPPED") {
      const nextTrack = player.queue.next();
      if (nextTrack) {
        player
          .play({ track: nextTrack })
          .catch((err: any) => console.error("Error playing next track:", err));
      }
    }
  });

  node.on(Events.TRACK_ERROR, (player: Player, track: Track, error: any) => {
    console.error(`[Player] Error playing track ${track.info.title}:`, error);
  });

  node.on(Events.PLAYER_CREATE, (player: Player) => {
    log(`Player successfully connected in guild ${player.guildId}`);
  });

  node.on(Events.PLAYER_DESTROY, (player: Player, reason: any) => {
    log(
      `Player disconnected in guild ${player.guildId}: ${
        reason || "No reason provided"
      }`
    );
    players.delete(player.guildId);
  });

  // Connect to Lavalink
  node.connect();

  // Register slash commands
  registerCommands();
});

// Create player function
async function createPlayer(
  guildId: string,
  voiceChannelId: string,
  textChannelId: string
) {
  // Return existing player if available
  if (players.has(guildId)) return players.get(guildId);

  // Check if node is ready
  if (!nodeReady) {
    throw new Error(
      "Lavalink node is not ready yet. Please try again in a moment."
    );
  }

  log(
    `[Voice] Creating player and joining channel ${voiceChannelId} in guild ${guildId}`
  );

  // Create the player using connector
  const player = connector.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId,
    volume: 100,
    deaf: false, // Setting to false for troubleshooting
  });

  // Store player reference
  players.set(guildId, player);

  // Connect the player
  try {
    await player.connect();
    log(`[Voice] Player successfully connected to voice in guild ${guildId}`);
  } catch (error) {
    log(`[Voice] Error connecting player: ${(error as Error).message}`);
    players.delete(guildId);
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
    .setName("pause")
    .setDescription("Pause the current song"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume playback"),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song"),
  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show information about the currently playing track"),
].map((command) => command.toJSON());

// Register commands
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    log("Commands registered!");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// Helper function to format time
function formatTime(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 60000) % 60);
  const hours = Math.floor(ms / 3600000);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

// Helper function to create a progress bar
function createProgressBar(
  current: number,
  total: number,
  length: number = 15
): string {
  const percentage = Math.min(100, Math.round((current / total) * 100));
  const progress = Math.round((percentage / 100) * length);

  let progressBar = "▬".repeat(Math.max(0, progress - 1));
  if (progress > 0) progressBar += "🔘";
  progressBar += "▬".repeat(Math.max(0, length - progress));

  return progressBar;
}

// Handle commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

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

  try {
    switch (commandName) {
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

        try {
          // Check if Lavalink node is ready
          if (!nodeReady) {
            await interaction.editReply(
              "❌ Lavalink node is not ready yet. Please try again in a moment."
            );
            return;
          }

          // Create player
          const player = await createPlayer(
            interaction.guildId,
            member.voice.channel.id,
            interaction.channelId
          );

          // Load track
          const result = await connector.loadTrack(query);
          if (!result || !result.data || !result.data.length) {
            await interaction.editReply("❌ No tracks found!");
            return;
          }

          if (
            result.loadType === LoadTypes.SEARCH_RESULT ||
            result.loadType === LoadTypes.TRACK_LOADED
          ) {
            const track = result.data[0];

            // Check if already playing something
            if (player.current && player.playing) {
              // Add to queue instead of immediately playing
              player.queue.add(track);
              await interaction.editReply(
                `Added to queue: **${track.info.title}**`
              );
            } else {
              // Play track immediately
              await player.play({ track });
              await interaction.editReply(
                `▶️ Now playing: **${track.info.title}**`
              );
            }
          } else if (result.loadType === LoadTypes.PLAYLIST_LOADED) {
            // For playlists, add all tracks to queue
            const firstTrack = result.data[0];
            const restTracks = result.data.slice(1);

            // Add all but first track to queue
            for (const track of restTracks) {
              player.queue.add({track});
            }

            // Play first track
            if (player.current && player.playing) {
              player.queue.add(firstTrack);
              await interaction.editReply(
                `Added playlist: **${result.playlistInfo?.name}** with ${result.data.length} tracks to queue`
              );
            } else {
              await player.play({ track: firstTrack });
              await interaction.editReply(
                `▶️ Playing playlist: **${result.playlistInfo?.name}** with ${result.data.length} tracks`
              );
            }
          } else {
            await interaction.editReply("❌ No tracks found!");
          }
        } catch (error: any) {
          console.error("Play error:", error);
          await interaction.editReply(
            `❌ Error playing track: ${error.message || "Unknown error"}`
          );
        }
        break;
      }

      case "stop": {
        const player = players.get(interaction.guildId);
        if (!player) {
          await interaction.reply({
            content: "Nothing is playing!",
            ephemeral: true,
          });
          return;
        }

        await player.destroy();
        players.delete(interaction.guildId);
        await interaction.reply("⏹️ Playback stopped!");
        break;
      }

      case "pause": {
        const player = players.get(interaction.guildId);
        if (!player) {
          await interaction.reply({
            content: "Nothing is playing!",
            ephemeral: true,
          });
          return;
        }

        await player.pause(true);
        await interaction.reply("⏸️ Playback paused!");
        break;
      }

      case "resume": {
        const player = players.get(interaction.guildId);
        if (!player) {
          await interaction.reply({
            content: "Nothing is playing!",
            ephemeral: true,
          });
          return;
        }

        await player.pause(false);
        await interaction.reply("▶️ Playback resumed!");
        break;
      }

      case "skip": {
        const player = players.get(interaction.guildId);
        if (!player) {
          await interaction.reply({
            content: "Nothing is playing!",
            ephemeral: true,
          });
          return;
        }

        // Use the Player.skip method which handles the queue automatically
        await player.skip();

        // Handle response based on whether there was a next track
        if (player.queue.size > 0) {
          await interaction.reply("⏭️ Skipped to the next song!");
        } else {
          await interaction.reply("⏭️ Skipped song! No more tracks in queue.");
        }
        break;
      }

      case "nowplaying": {
        const player = players.get(interaction.guildId);
        if (!player || !player.current) {
          await interaction.reply({
            content: "Nothing is playing right now!",
            ephemeral: true,
          });
          return;
        }

        const track = player.current;
        const trackInfo = track.info;

        // Use the Player's built-in position tracking
        const position =
          player.position +
          (player.playing ? Date.now() - player.timestamp : 0);
        const duration = trackInfo.length;

        // Get formatted position
        const positionFormatted = player.getFormattedPosition();
        const durationFormatted = formatTime(duration);

        // Create progress bar
        const progressBar = createProgressBar(position, duration);

        // Enhanced response that shows queue information too
        const nextInQueue =
          player.queue.size > 0
            ? `\nNext in queue: ${player.queue.size} track(s)`
            : "";

        const response = `
**Now Playing: ${trackInfo.title}**
By: ${trackInfo.author}

${progressBar}
${positionFormatted} / ${durationFormatted}

${trackInfo.isStream ? "🔴 LIVE" : ""}
${player.paused ? "⏸️ Paused" : "▶️ Playing"}${nextInQueue}
`;

        await interaction.reply(response);
        break;
      }

      default: {
        await interaction.reply({
          content: "Unknown command!",
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    console.error(`Error executing ${commandName} command:`, error);

    // Handle errors gracefully
    const errorMessage = "An error occurred while executing this command.";
    if (interaction.deferred) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  log("Shutting down...");

  // Destroy all players
  for (const [_, player] of players) {
    await player.destroy().catch(console.error);
  }

  // Destroy the connector if available
  if (connector) {
    connector.destroy();
  }

  // Logout of Discord
  client.destroy();

  process.exit(0);
});

// Start the bot
client.login(TOKEN).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});

log("Bot is starting...");
