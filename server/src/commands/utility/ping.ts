import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'ping',
    description: 'Check the bot latency',
    category: 'utility',
    async execute(message, args, musicManager) {
        const msg = await message.reply('🏓 Pinging...');
        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(message.client.ws.ping);

        await msg.edit(`🏓 Pong!\n**Latency:** \`${latency}ms\`\n**API Latency:** \`${apiLatency}ms\``);
    }
};
