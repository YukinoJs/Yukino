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

### Advanced Example

For more advanced usage, including queue management and custom plugins, see the [examples](examples) directory.

## Documentation

For detailed documentation, see the [docs](docs) directory.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
