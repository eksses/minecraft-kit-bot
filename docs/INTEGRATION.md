# Integration Guide — MDB v3.0

How to add new platform integrations to the Minecraft Kit Delivery Bot.

---

## Architecture Overview

Integrations follow a plugin-based architecture. Each integration is a self-contained module that implements the Integration Interface. The integration router discovers all integrations and connects them to the bot.

---

## Integration Interface

Every integration must implement the following interface:

```javascript
module.exports = {
  name: 'my-integration',
  version: '1.0.0',

  async onStart(bot, config, utils) {
    // Initialize connection, set up listeners
  },

  async onStop(bot) {
    // Clean up connections, listeners
  },

  async onMessage(bot, message) {
    // Handle incoming messages from the platform
  },

  async onEvent(bot, event, data) {
    // Handle bot events (spawn, death, chat, etc.)
  }
};
```

### Parameters

- **bot** — The Mineflayer bot instance. Use `bot.chat()` to send messages, `bot.whisper(user, msg)` to send DMs.
- **config** — Integration-specific configuration loaded from the database or config file.
- **utils** — Shared utilities: `logger`, `database`, `takeItemFromChest`, etc.

---

## Integration Discovery

The bot loads integrations automatically from the `integrations/` directory:

```javascript
const fs = require('fs');
const path = require('path');

const integrationDir = path.join(__dirname, 'integrations');
const integrations = {};

fs.readdirSync(integrationDir).forEach((folder) => {
  const integrationPath = path.join(integrationDir, folder, 'index.js');
  if (fs.existsSync(integrationPath)) {
    const integration = require(integrationPath);
    integrations[integration.name] = integration;
    console.log(`Loaded integration: ${integration.name} v${integration.version}`);
  }
});
```

---

## Adding a New Integration — Step by Step

### Step 1: Create the Integration Folder

```bash
mkdir -p integrations/discord
```

### Step 2: Create `index.js`

```javascript
// integrations/discord/index.js
const { DiscordJSHandler } = require('./handler');

module.exports = {
  name: 'discord',
  version: '1.0.0',

  async onStart(bot, config, utils) {
    this.handler = new DiscordJSHandler(bot, config, utils);
    await this.handler.start();
  },

  async onStop(bot) {
    await this.handler.stop();
  },

  async onMessage(bot, message) {
    await this.handler.handleMessage(message);
  },

  async onEvent(bot, event, data) {
    await this.handler.handleEvent(event, data);
  }
};
```

### Step 3: Create `handler.js`

```javascript
// integrations/discord/handler.js
const { Client, GatewayIntentBits } = require('discord.js');

class DiscordJSHandler {
  constructor(bot, config, utils) {
    this.bot = bot;
    this.config = config;
    this.utils = utils;
    this.client = null;
  }

  async start() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    this.client.on('ready', () => {
      console.log(`Discord connected as ${this.client.user.tag}`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      // Handle slash commands
    });

    await this.client.login(this.config.token);
  }

  async stop() {
    if (this.client) await this.client.destroy();
  }

  async handleMessage(message) {
    this.bot.chat(message.content);
  }

  async handleEvent(event, data) {
    this.client.channels.cache.get(this.config.channelId)?.send(data);
  }
}

module.exports = { DiscordJSHandler };
```

### Step 4: Create `config.json`

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "guildId": "YOUR_SERVER_ID",
  "channelId": "YOUR_CHANNEL_ID"
}
```

### Step 5: Register the Integration

Add a configuration page in the frontend to toggle the integration.

---

## Existing Integration: Discord (Planned)

### Features to Implement

- **Slash Commands:**
  - `/kits` — List available kits
  - `/order <kit> <amount> <player>` — Order a kit
  - `/status` — Check bot status

- **Button Interactions:**
  - Kit cards with order buttons
  - Admin buttons for bot control

- **Embed Messages:**
  - Order confirmations
  - Bot status embeds
  - Error notifications

### Discord Bot Permissions

```json
{
  "permissions": ["SendMessages", "UseApplicationCommands", "EmbedLinks"],
  "bot_public": false,
  "bot_require_code_grant": false
}
```

---

## Integration Checklist

Before creating a new integration, make sure you have:

- [ ] Read the Integration Interface specification
- [ ] Set up your platform's SDK/framework
- [ ] Created `integrations/<name>/index.js`
- [ ] Created `integrations/<name>/handler.js`
- [ ] Added configuration schema
- [ ] Added a frontend page for configuration
- [ ] Tested the integration end-to-end
- [ ] Documented the integration

---

## Sharing Integrations

Integrations can be shared by including them in the `integrations/` folder. The integration router discovers them automatically on startup. To share with the community:

1. Fork the repository
2. Add your integration under `integrations/<name>/`
3. Submit a PR
4. Your integration will appear in the dashboard automatically
