import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'volume',
    description: 'Change the music volume',
    category: 'music',
    aliases: ['vol'],
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing!');

            const volume = parseInt(args[0]);
            if (isNaN(volume) || volume < 0 || volume > 100) {
                return message.reply('❌ Please provide a volume between 0 and 100.');
            }

            queue.setVolume(volume);
            message.reply(`🔊 Volume set to **${volume}%**`);
        } catch (e) {
            message.reply('❌ Error setting volume.');
        }
    }
};
