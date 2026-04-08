import { Interaction, Client, EmbedBuilder, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db_manager } from '../database.js';
import { sendModLog } from '../utils/modLogs.js';

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

        if (interaction.customId === 'verify_member') {
            const guild = interaction.guild;
            if (!guild) return;

            const config = db_manager.getConfig(guild.id);
            if (!config.verified_role_id || !config.unverified_role_id) {
                return interaction.reply({ content: '❌ Verification system is not configured correctly. Roles missing in database.', ephemeral: true });
            }

            const member = await guild.members.fetch(interaction.user.id);
            if (!member) return;

            const botMember = guild.members.me;
            if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.reply({ content: '❌ I do not have permission to manage roles. Please contact an administrator.', ephemeral: true });
            }

            try {
                // Check if user already has verified role to avoid redundant work
                if (member.roles.cache.has(config.verified_role_id)) {
                    return interaction.reply({ content: 'ℹ️ You are already verified!', ephemeral: true });
                }

                await member.roles.add(config.verified_role_id, 'Member verified through security system');

                if (member.roles.cache.has(config.unverified_role_id)) {
                    await member.roles.remove(config.unverified_role_id, 'Member verified, removing unverified role');
                }

                await interaction.reply({ content: '✅ **Verification Successful!** You now have full access to the server.', ephemeral: true });
                console.log(`[VERIFY] ${member.user.tag} successfully verified.`);

                await sendModLog(guild, 'Member Verified', `**${member.user.tag}** completed verification.`, '#00FFFF', [
                    { name: 'User', value: `<@${member.id}>`, inline: true }
                ]);
            } catch (error) {
                console.error('[VERIFY] Error during verification:', error);
                await interaction.reply({ content: '❌ Failed to update your roles. My top role might be below the Verified/Unverified roles.', ephemeral: true });
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
