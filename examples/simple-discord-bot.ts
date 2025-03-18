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
import { Track } from "../src/types/interfaces";
import { Player } from "../src/structures/Player";
import { FilterUtil } from "../src/utils/FilterUtil";
import { YukinoClient } from "../src/structures/YukinoClient";

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

// Set up connector and node when client is ready
client.once("ready", async () => {
  log(`Logged in as ${client.user?.tag}!`);

  // Setup Yukino directly with the Discord.js client
  const connectorOptions = {
    client,
    host: process.env.LAVALINK_HOST || "localhost",
    port: parseInt(process.env.LAVALINK_PORT || "2333"),
    auth: process.env.LAVALINK_PASSWORD || "youshallnotpass",
    secure: false,
    version: "v4",
    debug: false, // Enable debug logging for voice state tracking
  };

  const nodeOptions = {
    name: "Node1",
    url: process.env.LAVALINK_HOST
      ? `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT || "2333"}`
      : "localhost:2333",
    auth: process.env.LAVALINK_PASSWORD || "youshallnotpass",
    // Adding reconnect options to make the connection more resilient
    reconnectOptions: {
      maxRetryAttempts: 10,
      retryDelayInMs: 5000,
    },
  };

  // Create YukinoClient and attach to Discord.js client
  client.yukino = new YukinoClient(client, connectorOptions, nodeOptions);

  // Better event handling and debugging
  client.yukino.node.on(Events.NODE_ERROR, (error: any) => {
    console.error("[Lavalink] Node error:", error);
  });

  client.yukino.node.on(Events.NODE_READY, () => {
    log("[Lavalink] Node is ready!");
  });

  // Track events
  client.yukino.node.on(Events.TRACK_START, (player: Player, track: Track) => {
    log(`[Player] Now playing: ${track.info.title} in guild ${player.guildId}`);
  });

  client.yukino.node.on(
    Events.TRACK_END,
    (player: Player, track: Track, reason: any) => {
      log(
        `[Player] Track ended: ${track.info.title} in guild ${player.guildId} (${reason})`
      );

      // Let the Player's built-in queue handling work
      if (reason !== "REPLACED" && reason !== "STOPPED") {
        const nextTrack = player.queue.next();
        if (nextTrack) {
          player
            .play({ track: nextTrack })
            .catch((err: any) =>
              console.error("Error playing next track:", err)
            );
        }
      }
    }
  );

  client.yukino.node.on(
    Events.TRACK_ERROR,
    (player: Player, track: Track, error: any) => {
      console.error(`[Player] Error playing track ${track.info.title}:`, error);
    }
  );

  client.yukino.node.on(Events.PLAYER_CREATE, (player: Player) => {
    log(`Player successfully connected in guild ${player.guildId}`);
  });

  client.yukino.node.on(
    Events.PLAYER_DESTROY,
    (player: Player, reason: any) => {
      log(
        `Player disconnected in guild ${player.guildId}: ${reason || "No reason provided"
        }`
      );
    }
  );

  // Add handler for WebSocket closed events
  client.yukino.node.on(Events.WS_CLOSED, (player, data) => {
    log(
      `[Voice] WebSocket closed for guild ${player.guildId}: Code ${data?.code
      }, Reason: ${data?.reason || "Unknown"}, By Remote: ${data?.byRemote}`
    );

    // Handle specific error codes
    if (data?.code === 4006) {
      log(
        `[Voice] Session no longer valid for guild ${player.guildId}, attempting to reconnect...`
      );

      // Try to reconnect the player if session becomes invalid
      setTimeout(() => {
        if (player && player.options.voiceChannelId) {
          log(
            `[Voice] Attempting to reconnect player in guild ${player.guildId}...`
          );
          player
            .connect()
            .then(() =>
              log(
                `[Voice] Successfully reconnected player in guild ${player.guildId}`
              )
            )
            .catch((err: any) =>
              log(`[Voice] Failed to reconnect player: ${err.message}`)
            );
        }
      }, 2000);
    }
  });

  // Connect to Lavalink
  client.yukino.connect();

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
  const existingPlayer = client.yukino.getPlayer(guildId);
  if (existingPlayer) return existingPlayer;

  // Check if node is ready
  if (!client.yukino.isReady) {
    throw new Error(
      "Lavalink node is not ready yet. Please try again in a moment."
    );
  }

  log(
    `[Voice] Creating player and joining channel ${voiceChannelId} in guild ${guildId}`
  );

  // Create the player using connector
  const player = client.yukino.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId,
    volume: 100,
    deaf: true,
    // Adding autoReconnect option
    autoReconnect: true,
  });

  // Connect the player
  try {
    await player.connect();
    log(`[Voice] Player successfully connected to voice in guild ${guildId}`);
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
    .setName("pause")
    .setDescription("Pause the current song"),
  new SlashCommandBuilder().setName("resume").setDescription("Resume playback"),
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song"),
  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show information about the currently playing track"),
  new SlashCommandBuilder()
    .setName("filter")
    .setDescription("Apply audio filters to the current track")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The type of filter to apply")
        .setRequired(true)
        .addChoices(
          { name: "Bass Boost", value: "bassboost" },
          { name: "Nightcore", value: "nightcore" },
          { name: "Vaporwave", value: "vaporwave" },
          { name: "8D Audio", value: "8d" },
          { name: "Reset Filters", value: "reset" }
        )
    ),
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
          // Create player
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
              player.queue.add(track);
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
        const player = client.yukino.getPlayer(interaction.guildId);
        if (!player) {
          await interaction.reply({
            content: "Nothing is playing!",
            ephemeral: true,
          });
          return;
        }

        await player.destroy();
        await interaction.reply("⏹️ Playback stopped!");
        break;
      }

      case "pause": {
        const player = client.yukino.getPlayer(interaction.guildId);
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
        const player = client.yukino.getPlayer(interaction.guildId);
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
        const player = client.yukino.getPlayer(interaction.guildId);
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
        const player = client.yukino.getPlayer(interaction.guildId);
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

      case "filter": {
        const player = client.yukino.getPlayer(interaction.guildId);
        if (!player) {
          await interaction.reply({
            content: "Nothing is playing!",
            ephemeral: true,
          });
          return;
        }

        const filterType = interaction.options.getString("type");
        await interaction.deferReply();

        try {
          switch (filterType) {
            case "bassboost": {
              await player.setEqualizer(FilterUtil.createBassBoostEQ(0.5));
              await interaction.editReply("🔊 Applied Bass Boost filter!");
              break;
            }
            case "nightcore": {
              await player.setTimescale(FilterUtil.nightcorePreset().timescale);
              await interaction.editReply("⏩ Applied Nightcore filter!");
              break;
            }
            case "vaporwave": {
              await player.setTimescale(FilterUtil.vaporwavePreset().timescale);
              await interaction.editReply("⏪ Applied Vaporwave filter!");
              break;
            }
            case "8d": {
              await player.setRotation(
                FilterUtil.eightDimensionalPreset().rotation
              );
              await interaction.editReply("🔄 Applied 8D Audio filter!");
              break;
            }
            case "reset": {
              await player.clearFilters();
              await interaction.editReply("🔄 Reset all audio filters!");
              break;
            }
            default: {
              await interaction.editReply("❌ Unknown filter type!");
              break;
            }
          }
        } catch (error: any) {
          console.error("Filter error:", error);
          await interaction.editReply(
            `❌ Error applying filter: ${error.message || "Unknown error"}`
          );
        }
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

// Better voice state handling
client.on("voiceStateUpdate", async (oldState, newState) => {
  // Only handle events for our bot
  if (
    oldState.member?.user.id !== client.user?.id &&
    newState.member?.user.id !== client.user?.id
  ) {
    return;
  }

  log(
    `[Voice] Voice state changed: ${oldState.channelId || "none"} -> ${newState.channelId || "none"
    }`
  );

  // Bot was disconnected from voice channel
  if (oldState.channelId && !newState.channelId) {
    log(
      `[Voice] Bot was disconnected from voice channel in guild ${oldState.guild.id}`
    );

    // Get the player
    const player = client.yukino.getPlayer(oldState.guild.id);

    if (player) {
      // If we were forcibly disconnected but still have an active player
      if (player.playing) {
        log(
          `[Voice] Attempting to reconnect to channel ${player.voiceChannelId}`
        );

        // Use the YukinoClient updateVoiceState method that uses the connector
        setTimeout(() => {
          client.yukino.connector.sendVoiceUpdate(
            oldState.guild.id,
            player.voiceChannelId,
            player.deaf || true
          )
            .then(() => {
              log(
                `[Voice] Voice state update sent for guild ${oldState.guild.id}`
              );
            })
            .catch((error) => {
              log(`[Voice] Failed to reconnect: ${error.message}`);
              player.destroy().catch(console.error);
            });
        }, 1000);
      } else {
        // If not playing, just clean up the player
        log(`[Voice] Cleaning up player for guild ${oldState.guild.id}`);
        player.destroy().catch(console.error);
      }
    }
  }

  // Bot was moved to another channel
  else if (
    oldState.channelId &&
    newState.channelId &&
    oldState.channelId !== newState.channelId
  ) {
    log(
      `[Voice] Bot was moved to a different channel in guild ${newState.guild.id}`
    );

    // Update the player's voice channel using YukinoClient
    const player = client.yukino.getPlayer(newState.guild.id);
    if (player) {
      player.voiceChannelId = newState.channelId;
      log(`[Voice] Updated player voice channel to ${newState.channelId}`);
    }
  }
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  log("Shutting down...");

  // Destroy all players and clean up using yukino client
  if (client.yukino) {
    client.yukino.destroy();
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
