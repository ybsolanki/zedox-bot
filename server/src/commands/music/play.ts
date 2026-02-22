import { Message } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { MusicManager } from '../../music/MusicManager.js';

export const command: Command = {
    name: 'play',
    description: 'Play a song or link',
    category: 'music',
    aliases: ['p'],
    async execute(message, args, musicManager) {
        const query = args.join(' ');
        if (!query) {
            message.reply('❌ Please provide a song name or link.');
            return;
        }

        if (!message.member?.voice?.channel) {
            message.reply('❌ You must be in a voice channel!');
            return;
        }

        try {
            const statusMsg = await message.reply(`🔍 Searching for \`${query}\`...`);
            console.log(`[Music] Modular Search: ${query}`);

            await musicManager.distube.play(message.member.voice.channel, query, {
                member: message.member,
                textChannel: message.channel as any,
                message
            });

            setTimeout(() => statusMsg.delete().catch(() => { }), 5000);
        } catch (e: any) {
            console.error('[Music] Play Error:', e);
            message.reply(`❌ Error playing song: ${e.message || e}`);
        }
    }
};
