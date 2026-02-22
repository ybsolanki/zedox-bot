import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'clear',
    description: 'Bulk delete messages in a channel',
    category: 'moderation',
    aliases: ['purge'],
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!config.features?.clear) return message.reply('❌ The **Clear Command** is currently disabled.');
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Insufficient permissions.');

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Provide a number between 1 and 100.');

        await message.channel.messages.fetch({ limit: amount + 1 }).then(async messages => {
            await (message.channel as any).bulkDelete(messages);
            const delMsg = await (message.channel as any).send(`✅ Deleted **${amount}** messages.`);
            setTimeout(() => delMsg.delete().catch(() => { }), 3000);
        });
    }
};
