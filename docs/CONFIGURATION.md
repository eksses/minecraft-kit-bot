# Getting Started

This guide walks you through setting up MDB on your machine. It's pretty straightforward.

## What You Need

- **Node.js v18 or newer** — check with `node --version`
- **A Minecraft server** — could be 2b2t, 6b6t, or any Java Edition server
- **npm** — comes with Node.js

## Quick Setup

```bash
# Grab the code
git clone https://github.com/eksses/minecraft-kit-bot.git
cd minecraft-kit-bot

# Install everything (root + backend + frontend)
npm run install:all

# Set up your config
cp .env.example .env
# Open .env and fill in your server details

# Fire it up
npm run dev
```

That's it. Open **http://localhost:5173** in your browser and log in with `admin` / `admin`.

## Going Live

When you're ready to deploy:

```bash
npm run build    # Build the frontend
npm start        # Start the backend (serves everything)
```

The server binds to `0.0.0.0:8081` so it's accessible from anywhere.

## Troubleshooting

**Port already in use?**
Change the port in `.env` or kill the process using it.

**Bot won't connect?**
Double-check your server IP, port, and version in the bot settings. Make sure the server is online.

**Build failing?**
Delete `node_modules` and run `npm run install:all` again.

**Database issues?**
The SQLite database is in `data/mcdb.db`. If it's corrupted, delete it and restart — it'll recreate automatically.
