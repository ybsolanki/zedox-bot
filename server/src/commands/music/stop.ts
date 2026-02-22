import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'stop',
    description: 'Stop the music and leave the voice channel',
    category: 'music',
    aliases: ['leave', 'dc'],
    async execute(message, args, musicManager) {
        try {
            const queue = musicManager.distube.getQueue(message);
            if (queue) {
                await queue.stop();
            }
            musicManager.distube.voices.leave(message.guild!);
            message.reply('⏹️ Stopped music and left the voice channel.');
        } catch (e) {
            message.reply('❌ Error stopping or leaving.');
        }
    }
};
