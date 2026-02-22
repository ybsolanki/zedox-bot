import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'mute',
    description: 'Mute a member in the server',
    category: 'moderation',
    aliases: ['textmute'],
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.mute) return message.reply('❌ **Mute Control** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Insufficient permissions.');

        const muteUser = message.mentions.members?.first();
        const durationStr = args[1];
        if (!muteUser || !durationStr) return message.reply('❌ Usage: ,mute @user 10m [reason]');

        const muteDuration = parseInt(durationStr);
        const muteUnit = durationStr.slice(-1);
        let muteMsValue = muteDuration * 60000;
        if (muteUnit === 'h') muteMsValue = muteDuration * 3600000;
        if (muteUnit === 'd') muteMsValue = muteDuration * 86400000;

        const muteReason = args.slice(2).join(' ') || 'No reason provided';
        await muteUser.timeout(muteMsValue, muteReason);

        if (config.muted_role_id) {
            await muteUser.roles.add(config.muted_role_id).catch(() => { });
        }

        const muteExpiresAt = new Date(Date.now() + muteMsValue).toISOString();
        db_manager.addMute(muteUser.id, message.guild!.id, muteExpiresAt);
        await message.reply(`✅ Muted ${muteUser.user.tag} for ${durationStr}.`);
    }
};
