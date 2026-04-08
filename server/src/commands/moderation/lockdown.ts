import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';
import { sendModLog } from '../../utils/modLogs.js';

export const command: Command = {
    name: 'lockdown',
    description: 'Lock down a channel to prevent everyone from sending messages',
    category: 'moderation',
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        const config = db_manager.getConfig(message.guild.id);
        if (!config.features?.lockdown) return message.reply('❌ **Lockdown Mode** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');

        await (message.channel as any).permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: false
        });
        await message.reply('🔒 Channel locked down.');

        await sendModLog(message.guild, 'Channel Locked', `${message.channel} was locked by ${message.author.tag}.`, '#FF0000', [
            { name: 'Channel', value: `${message.channel}`, inline: true },
            { name: 'Moderator', value: `${message.author.tag}`, inline: true }
        ]);
    }
};
