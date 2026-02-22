import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'debug',
    description: 'Check bot diagnostic info',
    category: 'utility',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.info) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        const uptime = process.uptime();
        await message.reply(`⚙️ **Debug Info:**\nUptime: ${Math.floor(uptime / 60)}m\nGuilds: ${message.client.guilds.cache.size}\nLat: ${message.client.ws.ping}ms`);
    }
};
