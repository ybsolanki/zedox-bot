import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'userinfo',
    description: 'Display information about a user',
    category: 'utility',
    aliases: ['ui'],
    async execute(message, args, musicManager) {
        const target = message.mentions.users.first() || message.author;

        const uEmbed = new EmbedBuilder()
            .setTitle(`${target.tag}'s Info`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: 'ID', value: target.id, inline: true },
                { name: 'Created At', value: target.createdAt.toDateString(), inline: true }
            )
            .setColor('#5865F2');

        await (message.channel as any).send({ embeds: [uEmbed] });
    }
};
