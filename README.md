# Yukino - A Lavalink Client in TypeScript

Yukino is a powerful and flexible Lavalink client written in TypeScript. It provides a comprehensive set of features for interacting with Lavalink, including node management, player control, track loading, and more.

## Features

- Node management with automatic reconnection
- Player control with support for filters and effects
- Track loading from URLs and search queries
- Queue management with looping and shuffling
- Plugin system for extending functionality
- Comprehensive event handling

## Installation

To install Yukino, use npm:

```bash
npm install yukino
```

## Usage

### Basic Example

Here's a basic example of how to use Yukino to connect to a Lavalink server and play a track:

```typescript
import { Connector } from 'yukino';
import { Events, LoadTypes } from 'yukino/constants';

const connector = new Connector({
    name: 'Main',
    url: 'localhost:2333',
    auth: 'youshallnotpass',
    secure: false,
});

const player = connector.createPlayer({
    guildId: '123456789',
    voiceChannelId: '987654321',
    textChannelId: '987654321',
    selfDeaf: true,
    volume: 100,
});

connector.on(Events.NODE_READY, (node) => {
    console.log(`Node ${node.options.name} is ready!`);
});

player.on(Events.TRACK_START, (player, track) => {
    console.log('Now playing:', track.info.title);
});

async function playTrack() {
    const result = await connector.loadTrack('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    if (result.loadType === LoadTypes.TRACK_LOADED) {
        await player.play(result.tracks[0]);
        console.log('Started playing:', result.tracks[0].info.title);
    }
}

playTrack().catch(console.error);
```

### Setting up with Discord.js

Yukino can be easily integrated with Discord.js in two ways:

#### Method 1: Using the setup helper

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { setupYukino } from 'yukino';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Setup Yukino with the helper function
  setupYukino(
    client,
    {
      host: 'localhost', 
      port: 2333,
      auth: 'youshallnotpass',
      secure: false,
      version: 'v4',
    },
    {
      name: 'MainNode',
      url: 'localhost:2333',
      auth: 'youshallnotpass',
    }
  );
  
  // Connect to Lavalink
  client.yukino.connect();
});
```

#### Method 2: Direct instantiation

```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { YukinoClient } from 'yukino';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Create and attach Yukino directly
  client.yukino = new YukinoClient(
    client,
    {
      host: 'localhost', 
      port: 2333,
      auth: 'youshallnotpass',
      secure: false,
      version: 'v4',
    },
    {
      name: 'MainNode',
      url: 'localhost:2333',
      auth: 'youshallnotpass',
    }
  );
  
  // Connect to Lavalink
  client.yukino.connect();
});
```

### Playing Music

Once Yukino is set up, you can use it to play music:

```typescript
// Creating a player
const player = client.yukino.createPlayer({
  guildId: 'your-guild-id',
  voiceChannelId: 'voice-channel-id',
  textChannelId: 'text-channel-id',
});

// Connect the player to voice
await player.connect();

// Search and play music
const result = await client.yukino.loadTrack('your search query');
if (result.loadType === 'TRACK_LOADED') {
  await player.play({ track: result.data[0] });
}
```

### Managing Players and Queues

You can easily access and manage players and queues:

```typescript
// Get a player for a specific guild
const player = client.yukino.getPlayer('guild-id');

// Get the queue for a guild
const queue = client.yukino.getQueue('guild-id');

// Check all active players
const activePlayers = client.yukino.players;
```

### Advanced Example

For more advanced usage, including queue management and custom plugins, see the [examples](examples) directory.

## Documentation

For detailed documentation, see the [docs](docs) directory.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
