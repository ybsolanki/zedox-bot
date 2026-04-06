import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'uptime',
    description: 'Check how long the bot has been online',
    category: 'utility',
    aliases: ['up'],
    async execute(message, args, musicManager) {
        const totalSeconds = process.uptime();
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = Math.floor(totalSeconds % 60);

        const uptimeEmbed = new EmbedBuilder()
            .setTitle('🚀 Bot Uptime')
            .setDescription(`**${days}d ${hours}h ${minutes}m ${seconds}s**`)
            .setColor('#5865F2')
            .setTimestamp();

        await message.reply({ embeds: [uptimeEmbed] });
    }
};
