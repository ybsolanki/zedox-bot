import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'nowplaying',
    description: 'Show info about the currently playing song',
    category: 'music',
    aliases: ['np'],
    async execute(message, args, musicManager) {
        const queue = musicManager.distube.getQueue(message);
        if (!queue || !queue.songs[0]) return message.reply('❌ Nothing is playing!');

        const song = queue.songs[0];
        const embed = new EmbedBuilder()
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\``, inline: true },
                { name: 'Requested By', value: `${song.user}`, inline: true },
                { name: 'Volume', value: `\`${queue.volume}%\``, inline: true },
                { name: 'Loop', value: `\`${queue.repeatMode === 0 ? 'Off' : (queue.repeatMode === 1 ? 'Song' : 'Queue')}\``, inline: true },
                { name: 'Autoplay', value: `\`${queue.autoplay ? 'On' : 'Off'}\``, inline: true }
            )
            .setThumbnail(song.thumbnail || null)
            .setColor('#5865F2');

        await (message.channel as any).send({ embeds: [embed] });
    }
};
