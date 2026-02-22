import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'serverinfo',
    description: 'Display information about the server',
    category: 'utility',
    aliases: ['si'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;

        const sEmbed = new EmbedBuilder()
            .setTitle(message.guild.name)
            .setThumbnail(message.guild.iconURL())
            .addFields(
                { name: 'Members', value: `${message.guild.memberCount}`, inline: true },
                { name: 'Created At', value: message.guild.createdAt.toDateString(), inline: true },
                { name: 'Owner', value: `<@${message.guild.ownerId}>`, inline: true }
            )
            .setColor('#5865F2');

        await (message.channel as any).send({ embeds: [sEmbed] });
    }
};
