import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'undeafen',
    description: 'Undeafen a member in a voice channel',
    category: 'moderation',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.moderation) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.DeafenMembers)) return message.reply('❌ Insufficient permissions.');

        const target = message.mentions.members?.first();
        if (!target) return message.reply('❌ Please mention a user to undeafen.');

        if (!target.voice.channel) return message.reply('❌ User is not in a voice channel.');

        await target.voice.setDeaf(false);
        await message.reply(`✅ Undeafened ${target.user.tag}.`);
    }
};
