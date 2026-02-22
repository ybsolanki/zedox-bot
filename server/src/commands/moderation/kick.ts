import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';
import { sendModLog } from '../../utils/modLogs.js';

export const command: Command = {
    name: 'kick',
    description: 'Kick a member from the server',
    category: 'moderation',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled in the dashboard.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply('❌ Insufficient permissions.');

        const kickMember = message.mentions.members?.first();
        if (!kickMember) return message.reply('❌ Please mention a user to kick.');

        if (!kickMember.kickable) return message.reply('❌ I cannot kick this user.');

        const kickReason = args.slice(1).join(' ') || 'No reason provided';
        await kickMember.kick(kickReason);
        await message.reply(`✅ Kicked ${kickMember.user.tag}.`);

        await sendModLog(message.guild!, 'User Kicked', `${kickMember.user.tag} was kicked from the server.`, '#FFA500', [
            { name: 'Target', value: `<@${kickMember.id}>`, inline: true },
            { name: 'Moderator', value: `${message.author.tag}`, inline: true },
            { name: 'Reason', value: kickReason }
        ]);
    }
};
