import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'invite',
    description: 'Get the bot invite link',
    category: 'utility',
    async execute(message, args, musicManager) {
        // We'll use a placeholder for the ID or try to get it from the client
        const clientId = message.client.user?.id || 'YOUR_ID';
        await message.reply(`🔗 **Invite Zedox:** https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`);
    }
};
