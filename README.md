# Zedox Discord Bot & Dashboard

A comprehensive Discord bot named **Zedox** featuring **19+** moderation and utility commands with a premium React dashboard.

## Features
- **19+ Commands**: Help, Ping, Uptime, Slowmode, ServerInfo, Invite, Kick, Ban, Clear, Mute, Unmute, Deafen, Undeafen, Lockdown, Unlock, TextMute, TextUnmute, UserInfo, Prefix, Debug.
- **Premium Dashboard**: Real-time stats, system logs, and live command configuration.
- **Persistence**: Pure JavaScript JSON storage (No Python/native deps required).

## Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm run install:all
   ```
3. Set environment variables in `.env`:
   ```env
   DISCORD_BOT_TOKEN=your_token
   DASHBOARD_TOKEN=secret
   ```
4. Start the application:
   ```bash
   npm run dev
   ```

## Tech Stack
- **Backend**: Node.js, Express, Discord.js, SQLite
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
