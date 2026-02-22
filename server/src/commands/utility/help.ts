import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { commandHandler } from '../../bot.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'help',
    description: 'List all commands or get info about a specific one',
    category: 'utility',
    aliases: ['h'],
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        const prefix = config.prefix || ',';

        const categories: { [key: string]: string[] } = {};

        commandHandler.commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(`\`${cmd.name}\``);
        });

        const embed = new EmbedBuilder()
            .setTitle(' Zedox | Prefix: `,` ')
            .setColor('#5865F2')
            .setDescription('Here are the available commands for Zedox Bot.')
            .setFooter({ text: 'Tip: You can use short forms like ,si ,ui ,p ,s ,q etc.' });

        // Order categories: Moderation, Music, Utility
        const categoryEmojis: { [key: string]: string } = {
            moderation: '🛡️ Moderation',
            music: '🎶 Music',
            utility: '🛠️ Utility'
        };

        for (const [cat, emoji] of Object.entries(categoryEmojis)) {
            if (categories[cat]) {
                embed.addFields({ name: emoji, value: categories[cat].join(', ') });
            }
        }

        await (message.channel as any).send({ embeds: [embed] });
    }
};
