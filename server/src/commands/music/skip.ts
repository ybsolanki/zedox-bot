import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'skip',
    description: 'Skip the current song',
    category: 'music',
    aliases: ['s'],
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing to skip!');
            if (queue.songs.length <= 1 && !queue.autoplay) return message.reply('❌ No more songs in the queue to skip!');

            const song = await queue.skip();
            message.reply(`⏩ Skipped! Now playing: **${song.name}**`);
        } catch (e) {
            message.reply('❌ Error skipping song.');
        }
    }
};
