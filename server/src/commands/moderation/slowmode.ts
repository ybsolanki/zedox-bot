import { PermissionsBitField, TextChannel } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'slowmode',
    description: 'Set the slowmode for a channel',
    category: 'moderation',
    async execute(message, args, musicManager) {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');

        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('❌ Provide a number of seconds between 0 and 21600.');

        const channel = message.channel as TextChannel;
        await channel.setRateLimitPerUser(seconds);

        if (seconds === 0) {
            await message.reply('✅ Slowmode has been disabled.');
        } else {
            await message.reply(`✅ Slowmode set to **${seconds}** seconds.`);
        }
    }
};
