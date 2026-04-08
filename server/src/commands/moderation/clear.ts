import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';
import { sendModLog } from '../../utils/modLogs.js';

export const command: Command = {
    name: 'clear',
    description: 'Bulk delete messages in a channel',
    category: 'moderation',
    aliases: ['purge'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        const config = db_manager.getConfig(message.guild.id);
        if (!config.features?.clear) return message.reply('❌ The **Clear Command** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Insufficient permissions.');

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Provide a number between 1 and 100.');

        try {
            const messages = await message.channel.messages.fetch({ limit: amount + 1 });
            await (message.channel as any).bulkDelete(messages);
            const delMsg = await (message.channel as any).send(`✅ Deleted **${amount}** messages.`);

            await sendModLog(message.guild, 'Messages Purged', `**${amount}** messages were deleted in ${message.channel} by ${message.author.tag}.`, '#FFFF00');

            setTimeout(() => delMsg.delete().catch(() => { }), 3000);
        } catch (error) {
            console.error('[CLEAR] Error:', error);
            await message.reply('❌ Failed to clear messages.');
        }
    }
};
