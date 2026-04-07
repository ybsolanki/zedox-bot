import { PermissionsBitField, TextChannel, Message } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'cleanup-verify',
    description: 'Deletes all verification messages sent by the bot in the current channel',
    category: 'utility',
    aliases: ['clear-verify', 'verify-cleanup'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ You need **Manage Messages** permission to use this.');
        }

        try {
            const statusMsg = await message.reply('🔍 Searching for verification messages...');

            const channel = message.channel as TextChannel;
            const messages = await channel.messages.fetch({ limit: 100 });

            const toDelete = messages.filter(m =>
                m.author.id === message.client.user?.id &&
                m.embeds.some(e => e.title === '🛡️ Server Verification' || e.title === 'Verification')
            );

            if (toDelete.size === 0) {
                return statusMsg.edit('✨ No bot verification messages found in the last 100 messages.');
            }

            await channel.bulkDelete(toDelete);
            await statusMsg.edit(`✅ Successfully removed **${toDelete.size}** verification messages.`);
            setTimeout(() => statusMsg.delete().catch(() => { }), 5000);
        } catch (error) {
            console.error('[CLEANUP] Error during verification cleanup:', error);
            await message.reply('❌ Failed to cleanup messages. They might be older than 14 days.');
        }
    }
};
