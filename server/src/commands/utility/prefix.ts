import { PermissionsBitField } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'prefix',
    description: 'Change the bot prefix for this server',
    category: 'utility',
    async execute(message, args, musicManager) {
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Admin required.');
        const newPrefix = args[0];
        if (!newPrefix) return message.reply('❌ Provide a new prefix.');

        db_manager.updateConfig(message.guild!.id, 'prefix', newPrefix);
        await message.reply(`✅ Prefix updated to \`${newPrefix}\`.`);
    }
};
