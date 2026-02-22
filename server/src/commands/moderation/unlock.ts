import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'unlock',
    description: 'Unlock the current channel',
    category: 'moderation',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.lockdown) return message.reply('❌ **Lockdown Mode** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');

        await (message.channel as any).permissionOverwrites.edit(message.guild!.roles.everyone, {
            SendMessages: null
        });
        await message.reply('🔓 Channel unlocked.');
    }
};
