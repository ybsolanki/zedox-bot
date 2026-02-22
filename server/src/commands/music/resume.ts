import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'resume',
    description: 'Resume the paused music',
    category: 'music',
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing!');
            if (!queue.paused) return message.reply('▶️ Music is already playing.');
            queue.resume();
            message.reply('▶️ Resumed the music.');
        } catch (e) {
            message.reply('❌ Error resuming.');
        }
    }
};
