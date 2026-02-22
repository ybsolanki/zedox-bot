import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'pause',
    description: 'Pause the current music',
    category: 'music',
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing!');
            if (queue.paused) return message.reply('⏸️ Music is already paused.');
            queue.pause();
            message.reply('⏸️ Paused the music.');
        } catch (e) {
            message.reply('❌ Error pausing.');
        }
    }
};
