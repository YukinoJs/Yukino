import { Connector } from "../src/lib/connectors/Connector";
import { Events } from "../src/constants";

// Create a connector with reconnection settings
const connector = new Connector({
  name: "Main",
  url: "http://127.0.0.1:1092", // Matches server.address and server.port from application.yml
  auth: "root", // Matches lavalink.server.password from application.yml
  secure: false,
  sessionId: "12345", // Small numeric value that's guaranteed to parse as a Java Long
});

// Create player
const player = connector.createPlayer({
  guildId: "123456789",
  voiceChannelId: "987654321",
});

// Node error handling
connector.on(Events.NODE_ERROR, (node, error) => {
  console.error(`Node ${node.options.name} error:`, error);
  // You might want to switch to a different node here
  const alternativeNode = connector.createNode({
    name: "Backup",
    url: "localhost:2333",
    auth: "youshallnotpass",
  });

  // Move player to the new node
  if (alternativeNode) {
    player
      .moveToNode(alternativeNode)
      .catch((e) => console.error("Failed to move to backup node:", e));
  }
});

// Reconnection handling
connector.on(Events.NODE_DISCONNECT, (node) => {
  console.log(
    `Node ${node.options.name} disconnected. Attempting reconnect...`
  );
});

connector.on(Events.NODE_RECONNECT, (node) => {
  console.log(`Attempting to reconnect node ${node.options.name}...`);
});

connector.on(Events.NODE_RESUME, (node) => {
  console.log(`Node ${node.options.name} resumed successfully`);
});

// Track error handling
player.on(Events.TRACK_ERROR, async (player, track, error) => {
  console.error("Track playback error:", error);

  try {
    // Attempt to restart the track
    await player.play(track, { startTime: player.position });
  } catch (e) {
    console.error("Failed to restart track:", e);
    // Skip to next track as fallback
    await player.skip();
  }
});

// Voice connection error handling
player.on(Events.VOICE_ERROR, async (error) => {
  console.error("Voice connection error:", error);

  try {
    // Attempt to reconnect to voice channel
    await player.connect({ selfDeaf: true });
  } catch (e) {
    console.error("Failed to reconnect to voice:", e);
    // Destroy player as last resort
    player.destroy();
  }
});

// Example of handling stuck tracks
player.on(Events.TRACK_STUCK, async (player, track, thresholdMs) => {
  console.warn(`Track got stuck for ${thresholdMs}ms:`, track.info.title);

  try {
    // Attempt to resume from current position
    await player.play(track, {
      startTime: player.position,
      noReplace: false,
    });
  } catch (e) {
    console.error("Failed to recover from stuck track:", e);
    await player.skip();
  }
});

// Socket closure handling
player.on(Events.SOCKET_CLOSED, async (code, reason) => {
  console.warn(`WebSocket closed (${code}):`, reason);

  if (code === 4006 || code === 4014) {
    // Session expired or invalid, attempt to create new session
    try {
      await player.connect();
    } catch (e) {
      console.error("Failed to create new session:", e);
    }
  }
});

// Example of handling timeouts
function setupTimeoutHandler() {
  let lastUpdate = Date.now();

  player.on(Events.PLAYER_UPDATE, () => {
    lastUpdate = Date.now();
  });

  // Check for stale connections every 5 seconds
  setInterval(() => {
    const timeSinceUpdate = Date.now() - lastUpdate;
    if (timeSinceUpdate > 15000) {
      // 15 seconds threshold
      console.warn("Player seems frozen, attempting recovery...");
      player.connect().catch((e) => console.error("Recovery failed:", e));
    }
  }, 5000);
}

setupTimeoutHandler();

// Cleanup
process.on("SIGINT", () => {
  player.destroy();
  connector.destroy();
  process.exit(0);
});
