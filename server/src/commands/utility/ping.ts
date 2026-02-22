import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'ping',
    description: 'Check the bot latency',
    category: 'utility',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.ping) return message.reply('❌ **Ping Command** is currently disabled.');

        await message.reply(`🏓 Pong! Latency is ${Date.now() - message.createdTimestamp}ms. API Latency is ${Math.round(message.client.ws.ping)}ms.`);
    }
};
