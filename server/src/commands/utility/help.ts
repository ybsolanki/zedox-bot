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
            .setTitle('Zedox Bot Commands')
            .setColor('#5865F2')
            .setDescription(`Current prefix is \`${prefix}\` (Case-insensitive)`)
            .setFooter({ text: 'Tip: You can use short forms like ,si ,ui ,p ,s ,q etc.' });

        // Order categories: Moderation, Music, Utility
        const categoryGroups: { [key: string]: { label: string, cmds: string[] } } = {
            moderation: { label: '🛡️ Moderation', cmds: [] },
            music: { label: '🎶 Music', cmds: [] },
            utility: { label: '🛠️ Utility & Info', cmds: [] },
            other: { label: '✨ Other', cmds: [] }
        };

        commandHandler.commands.forEach(cmd => {
            const cat = cmd.category === 'utility' && cmd.name === 'help' ? 'other' : cmd.category;
            if (categoryGroups[cat]) {
                categoryGroups[cat].cmds.push(`\`${cmd.name}\``);
            } else if (categoryGroups['utility']) {
                categoryGroups['utility'].cmds.push(`\`${cmd.name}\``);
            }
        });

        for (const group of Object.values(categoryGroups)) {
            if (group.cmds.length > 0) {
                embed.addFields({ name: group.label, value: group.cmds.join(', ') });
            }
        }

        await (message.channel as any).send({ embeds: [embed] });
    }
};
