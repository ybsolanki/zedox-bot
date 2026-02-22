import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { MusicManager } from './music/MusicManager.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { EventHandler } from './handlers/EventHandler.js';

dotenv.config();

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// Initialize Managers and Handlers
export const musicManager = new MusicManager(client);
export const commandHandler = new CommandHandler();
export const eventHandler = new EventHandler(client);

// Bot start function for API
export function startBot() {
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error('❌ Failed to login:', err);
    });
}
