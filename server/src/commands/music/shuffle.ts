import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'shuffle',
    description: 'Shuffle the current music queue',
    category: 'music',
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing to shuffle!');
            await queue.shuffle();
            message.reply('🔀 Shuffled the queue!');
        } catch (e) {
            message.reply('❌ Error shuffling.');
        }
    }
};
