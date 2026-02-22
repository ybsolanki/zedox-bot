import { EmbedBuilder } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';

export const command: Command = {
    name: 'help',
    description: 'List all commands or get info about a specific one',
    category: 'utility',
    aliases: ['h'],
    async execute(message, args, musicManager) {
        // We'll need access to the command list.
        // For simplicity in this modular refactor, we can import it or pass it.
        // Let's assume for now we just show a static-ish list that we'll make dynamic later
        // OR better: we can use a global variable set in bot.ts

        const prefix = ','; // Default, we can get this from db_manager later

        const embed = new EmbedBuilder()
            .setTitle('Zedox Bot Commands')
            .setColor('#5865F2')
            .setDescription(`Current prefix is \`${prefix}\``)
            .addFields(
                { name: '🛡️ Moderation', value: '`kick`, `ban`, `clear`, `mute`, `unmute`, `deafen`, `undeafen`, `lockdown`, `unlock`, `Slowmode`, `nuke`' },
                { name: '🎶 Music', value: '`play` (p), `skip` (s), `stop` (leave, dc), `queue` (q), `pause`, `resume`, `volume` (vol), `shuffle`, `loop` (repeat), `nowplaying` (np), `autoplay`' },
                { name: '🛠️ Utility', value: '`userinfo`, `serverinfo`, `invite`, `prefix`, `debug`, `ping`, `uptime`, `role`, `help`' }
            )
            .setFooter({ text: 'Tip: You can use short forms like ,si ,ui ,p ,s ,q etc.' });

        await (message.channel as any).send({ embeds: [embed] });
    }
};
