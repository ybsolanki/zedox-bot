import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';
import { sendModLog } from '../../utils/modLogs.js';

export const command: Command = {
    name: 'unmute',
    description: 'Unmute a member in the server',
    category: 'moderation',
    aliases: ['textunmute'],
    async execute(message, args, musicManager) {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Insufficient permissions.');

        const unmuteUser = message.mentions.members?.first();
        if (!unmuteUser) return message.reply('❌ Please mention a user to unmute.');

        await unmuteUser.timeout(null);

        const config = db_manager.getConfig(message.guild!.id);
        if (config.muted_role_id) {
            await unmuteUser.roles.remove(config.muted_role_id).catch(() => { });
        }

        db_manager.removeMute(unmuteUser.id, message.guild!.id);
        await message.reply(`✅ Unmuted ${unmuteUser.user.tag}.`);

        await sendModLog(message.guild!, 'User Unmuted', `${unmuteUser.user.tag} was unmuted.`, '#00FF00', [
            { name: 'Target', value: `<@${unmuteUser.id}>`, inline: true },
            { name: 'Moderator', value: `${message.author.tag}`, inline: true }
        ]);
    }
};
