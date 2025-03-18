# Yukino.

> kawaii Node.js wrapper written in TypeScript for Lavalink audio streaming. 🚀

[![npm version](https://badge.fury.io/js/yukinojs.svg)](https://badge.fury.io/js/yukinojs)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Lavalink](https://img.shields.io/badge/Lavalink-7289DA.svg)](https://github.com/lavalink-devs/Lavalink)
[![Discord](https://img.shields.io/discord/your-discord-server-id.svg?logo=discord&color=7289DA)](https://discord.gg/your-invite-link)

<p align="center">
    <img src="https://i.kwin.in/r/m8esywqp751.png"> 
</p>

### 📖 Introduction

Yukino brings simplicity and reliability to Discord music bot development. Built as a modern TypeScript wrapper for [Lavalink](https://github.com/lavalink-devs/Lavalink), it offers a seamless experience for creating feature-rich music bots. Designed with developer experience in mind ✨.

### ⭐ Key Features

- **TypeScript First** - Complete type safety with comprehensive TypeScript definitions 📝

- **Developer Friendly** - Clear and concise API with minimal boilerplate 🛠️

- **Smart Voice Handling** - Intelligent voice state management and tracking 🎧

- **Audio Enhancement** - Rich set of audio filters including equalizer, tempo, and more 🎚️

- **Event-Driven Design** - Comprehensive event system for precise control ⚡

### 📋 System Requirements

- [Lavalink Server](https://github.com/lavalink-devs/Lavalink) (v4.x)
- Node.js v18.x or newer
- Discord.js v14.x

### 🚀 Quick Start
Install Yukino using npm:
```bash
npm install yukinojs
```

### 📚 API Documentation
Visit our [documentation](https://yukino.kwin.in) for detailed guides and API reference.

### 💡 Quick Example
Here's how to get started with Yukino:
```typescript
import { Client, GatewayIntentBits } from 'discord.js';
import { YukinoClient } from 'yukinojs';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once('ready', () => {
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

    yukino.connect();
});

// Basic music playback example
async function playMusic(guildId: string, voiceChannelId: string, query: string) {
    const player = yukino.createPlayer({
        guildId,
        voiceChannelId
    });
    
    await player.connect();
    const result = await yukino.loadTrack(query);
    
    if (result.loadType === 'TRACK_LOADED') {
        await player.play({ track: result.data[0] });
    }
}

client.login('your-token-here');
```

### 🤝 Need Help?
- Join the [Community](https://discord.gg/your-invite-link) 💬
- Report [Issues](https://github.com/YukinoJs/Yukino/issues) 🐛

### 🌟 Want to Contribute?
We welcome contributions! Check our [Contributing Guidelines](CONTRIBUTING.md) to get started.

### 📄 License
Released under the [MIT License](LICENSE).

### 🔗 Quick Links
- [Source Code](https://github.com/YukinoJs/Yukino) 📦
- [Package](https://www.npmjs.com/package/yukinojs) 📥
- [API Docs](https://yukino.kwin.in) 📖
- [Community](https://discord.gg/your-invite-link) 💬
