# Yukino - A TypeScript Lavalink Client

A powerful and flexible Lavalink v4 client written in TypeScript, designed for Discord music bots.

## Features

- Full Lavalink v4 API support
- Advanced queue management with looping and shuffling
- Extensive filter support (equalizer, karaoke, timescale, etc.)
- Automatic reconnection handling
- Voice state tracking and error recovery
- Comprehensive event system
- Support for search and playlist loading
- Built-in logging system with debug mode
- Type-safe with full TypeScript support

## Installation

```bash
npm install yukino
```

## Quick Start

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { YukinoClient } from 'yukino';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

client.once('ready', () => {
  // Initialize Yukino
  const yukino = new YukinoClient(client, {
    client,
    host: 'localhost',
    port: 2333,
    auth: 'youshallnotpass',
    version: 'v4'
  }, {
    name: 'MainNode',
    url: 'localhost:2333',
    auth: 'youshallnotpass'
  });

  // Connect to Lavalink
  yukino.connect();
});

client.login('your-token-here');
```

## Basic Usage

### Playing Music

```typescript
// Create a player for a guild
const player = yukino.createPlayer({
  guildId: 'your-guild-id',
  voiceChannelId: 'voice-channel-id',
  textChannelId: 'text-channel-id'
});

// Connect to voice channel
await player.connect();

// Load and play a track
const result = await yukino.loadTrack('your search query or URL');
if (result.loadType === 'TRACK_LOADED') {
  await player.play({ track: result.data[0] });
}
```

### Using Filters

```typescript
// Apply bass boost
await player.setEqualizer(FilterUtil.createBassBoostEQ(0.5));

// Apply nightcore effect
await player.setTimescale(FilterUtil.nightcorePreset().timescale);

// Apply 8D audio
await player.setRotation(FilterUtil.eightDimensionalPreset().rotation);

// Clear all filters
await player.clearFilters();
```

### Queue Management

```typescript
// Add tracks to queue
player.queue.add(track);

// Skip current track
await player.skip();

// Toggle repeat modes
player.setTrackLoop(true); // Repeat current track
player.setQueueLoop(true); // Repeat entire queue
```

## Events

```typescript
yukino.node.on('nodeReady', () => {
  console.log('Connected to Lavalink!');
});

yukino.node.on('trackStart', (player, track) => {
  console.log(`Now playing: ${track.info.title}`);
});

yukino.node.on('trackEnd', (player, track, reason) => {
  console.log(`Track ended: ${track.info.title}`);
});
```

## Advanced Configuration

### Debug Mode

Enable debug logging for detailed information:

```typescript
const yukino = new YukinoClient(client, {
  ...options,
  debug: true
});
```

### Custom Voice State Handling

```typescript
client.on('voiceStateUpdate', async (oldState, newState) => {
  const player = yukino.getPlayer(oldState.guild.id);
  if (player && !newState.channelId) {
    // Handle disconnections
    await player.destroy();
  }
});
```

## Documentation

For more detailed documentation and examples, check out:
- [Example Bot Implementation](examples/simple-discord-bot.ts)
- [API Documentation](docs/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
