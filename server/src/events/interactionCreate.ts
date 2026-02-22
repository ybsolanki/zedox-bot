import { Interaction, Client, EmbedBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db_manager } from '../database.js';

export const event = {
    name: 'interactionCreate',
    async execute(interaction: Interaction, client: Client) {
        if (!interaction.isButton()) return;

        // Role handling
        if (interaction.customId.startsWith('role_')) {
            const roleName = interaction.customId.replace('role_', '');
            const guild = interaction.guild;
            if (!guild) return;

            const role = guild.roles.cache.find(r => r.name === roleName);
            const member = await guild.members.fetch(interaction.user.id);

            if (role && member) {
                const studentRoleNames = [
                    '9th', '10th', '11th-PCM', '11th-PCB',
                    '12th-PCM', '12th-PCB', '12th-PCM-Dropper', '12th-PCB-Dropper'
                ];
                const rolesToRemove = member.roles.cache.filter(r => studentRoleNames.includes(r.name));
                await member.roles.remove(rolesToRemove);
                await member.roles.add(role);
                await interaction.reply({ content: `✅ You have been assigned the **${roleName}** role!`, ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Role not found or error assigning role.', ephemeral: true });
            }
        }

        // Ticket Handling
        if (interaction.customId === 'ticket_create') {
            const guild = interaction.guild;
            if (!guild) return;

            const config = db_manager.getConfig(guild.id);
            if (!config.ticket_category_id) return interaction.reply({ content: '❌ Ticket system is not configured.', ephemeral: true });

            const ticketNum = config.ticket_count + 1;
            db_manager.updateConfig(guild.id, 'ticket_count', ticketNum);

            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${ticketNum}`,
                    type: ChannelType.GuildText,
                    parent: config.ticket_category_id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                        config.staff_role_id ? { id: config.staff_role_id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages] } : null
                    ].filter(Boolean) as any,
                });

                const embed = new EmbedBuilder()
                    .setTitle('🎫 Support Ticket')
                    .setDescription(`Hello ${interaction.user}, a member of our staff will be with you shortly.\n\nPlease describe your issue in detail.`)
                    .setColor('#5865F2')
                    .setTimestamp();

                const closeButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

                await ticketChannel.send({ content: `<@${interaction.user.id}> | <@&${config.staff_role_id}>`, embeds: [embed], components: [closeButton] });
                await interaction.reply({ content: `✅ Ticket created! ${ticketChannel}`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to create ticket.', ephemeral: true });
            }
        }

        if (interaction.customId === 'ticket_close') {
            const channel = interaction.channel;
            if (!channel || channel.type !== ChannelType.GuildText) return;

            await interaction.reply('🔒 Closing ticket in 5 seconds...');
            setTimeout(() => { channel.delete().catch(() => { }); }, 5000);
        }
    }
};
