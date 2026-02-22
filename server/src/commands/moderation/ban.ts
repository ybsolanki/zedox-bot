import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'ban',
    description: 'Ban a member from the server',
    category: 'moderation',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ Insufficient permissions.');

        const banMember = message.mentions.members?.first();
        if (!banMember) return message.reply('❌ Please mention a user to ban.');

        if (!banMember.bannable) return message.reply('❌ I cannot ban this user.');

        const banReason = args.slice(1).join(' ') || 'No reason provided';
        await banMember.ban({ reason: banReason });
        await message.reply(`✅ Banned ${banMember.user.tag}.`);

        console.log(`[ModLog] ${banMember.user.tag} banned by ${message.author.tag}. Reason: ${banReason}`);
    }
};
