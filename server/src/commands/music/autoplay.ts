import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'autoplay',
    description: 'Toggle music autoplay',
    category: 'music',
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (!queue) return message.reply('❌ Nothing is playing!');
            const autoplay = queue.toggleAutoplay();
            message.reply(`📻 Autoplay is now **${autoplay ? 'ON' : 'OFF'}**`);
        } catch (e) {
            message.reply('❌ Error toggling autoplay.');
        }
    }
};
