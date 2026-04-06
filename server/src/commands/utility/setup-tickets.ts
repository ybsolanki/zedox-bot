import { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'setup-tickets',
    description: 'Configure the ticket system and send the creation embed',
    category: 'utility',
    aliases: ['ticketing', 'ticketsetup'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Admin required.');
        }

        const categoryId = args[0];
        const staffRoleId = message.mentions.roles.first()?.id || args[1];

        if (!categoryId || !staffRoleId) {
            return message.reply('❌ Usage: `,setup-tickets <category_id> <@staff_role_or_id>`');
        }

        try {
            db_manager.updateConfig(message.guild.id, 'ticket_category_id', categoryId);
            db_manager.updateConfig(message.guild.id, 'staff_role_id', staffRoleId);

            const embed = new EmbedBuilder()
                .setTitle('🎫 Support Tickets')
                .setDescription('Click the button below to open a support ticket.\nOur staff will be with you as soon as possible.')
                .setColor('#5865F2')
                .setFooter({ text: 'Zedox Support System' });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create')
                    .setLabel('Open Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

            const channel = message.channel as any;
            await channel.send({ embeds: [embed], components: [row] });
            await message.reply('✅ Ticket system configured and setup embed sent!');
        } catch (error) {
            console.error(error);
            await message.reply('❌ Failed to configure ticket system.');
        }
    }
};
