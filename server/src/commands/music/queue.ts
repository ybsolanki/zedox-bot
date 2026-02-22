import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'queue',
    description: 'Show the current music queue',
    category: 'music',
    aliases: ['q'],
    async execute(message, args, musicManager) {
        const queue = musicManager.distube.getQueue(message);
        if (!queue) return message.reply('❌ Queue is empty.');

        const qDisplay = queue.songs
            .map((song, i) => `**${i === 0 ? 'Playing:' : `${i}.`}** [${song.name}](${song.url}) - \`${song.formattedDuration}\``)
            .join('\n')
            .slice(0, 4000);

        const qEmbed = new EmbedBuilder()
            .setTitle('🎶 Server Queue')
            .setDescription(qDisplay || 'Empty')
            .setColor('#5865F2')
            .setTimestamp();

        if (queue.autoplay) qEmbed.setFooter({ text: 'Autoplay: ON' });

        await (message.channel as any).send({ embeds: [qEmbed] });
    }
};
