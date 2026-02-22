import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'kick',
    description: 'Kick a member from the server',
    category: 'moderation',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply('❌ Insufficient permissions.');

        const kickMember = message.mentions.members?.first();
        if (!kickMember) return message.reply('❌ Please mention a user to kick.');

        if (!kickMember.kickable) return message.reply('❌ I cannot kick this user.');

        const kickReason = args.slice(1).join(' ') || 'No reason provided';
        await kickMember.kick(kickReason);
        await message.reply(`✅ Kicked ${kickMember.user.tag}.`);

        // Note: sendModLog is a utility that should be moved to a separate file, but for now we'll skip or use a placeholder
        console.log(`[ModLog] ${kickMember.user.tag} kicked by ${message.author.tag}. Reason: ${kickReason}`);
    }
};
