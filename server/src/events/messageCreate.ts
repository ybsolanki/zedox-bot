import { Message, Client } from 'discord.js';
import { db_manager } from '../database.js';
import { musicManager, commandHandler } from '../bot.js';

export const event = {
    name: 'messageCreate',
    async execute(message: Message, client: Client) {
        if (message.author.bot || !message.guild) return;

        const config = db_manager.getConfig(message.guild.id);
        const prefix = config.prefix || ',';

        if (!message.content.startsWith(prefix)) return;

        await commandHandler.handleCommand(message, musicManager, prefix);
    }
};
