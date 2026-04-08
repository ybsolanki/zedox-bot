import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';
import { sendModLog } from '../../utils/modLogs.js';

export const command: Command = {
    name: 'undeafen',
    description: 'Undeafen a member in the server',
    category: 'moderation',
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        const config = db_manager.getConfig(message.guild.id);
        if (!config.features?.moderation) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.DeafenMembers)) return message.reply('❌ Insufficient permissions.');

        const target = message.mentions.members?.first();
        if (!target) return message.reply('❌ Please mention a user to undeafen.');

        if (!target.voice.channel) return message.reply('❌ User is not in a voice channel.');

        await target.voice.setDeaf(false);
        await message.reply(`✅ Undeafened ${target.user.tag}.`);

        await sendModLog(message.guild, 'User Undeafened', `${target.user.tag} was undeafened by ${message.author.tag}.`, '#00FF00', [
            { name: 'Target', value: `<@${target.id}>`, inline: true },
            { name: 'Moderator', value: `${message.author.tag}`, inline: true }
        ]);
    }
};
