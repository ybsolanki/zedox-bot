import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'loop',
    description: 'Toggle song or queue loop',
    category: 'music',
    aliases: ['repeat'],
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing!');

            let mode = 0;
            const input = args[0]?.toLowerCase();

            if (input === 'song' || input === '1') mode = 1;
            else if (input === 'queue' || input === '2') mode = 2;
            else mode = queue.repeatMode === 0 ? 1 : 0; // Default toggle between off/song if no arg

            mode = queue.setRepeatMode(mode);
            const modeName = mode === 0 ? 'OFF' : (mode === 1 ? '🔂 Song' : '🔁 Queue');
            message.reply(`🔄 Loop mode set to: **${modeName}**`);
        } catch (e) {
            message.reply('❌ Error setting loop mode.');
        }
    }
};
