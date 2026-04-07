import { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'setup-verify',
    description: 'Setup the verification system in a channel',
    category: 'utility',
    aliases: ['verification-setup', 'verify-setup'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Admin required.');
        }

        const verifiedRoleId = message.mentions.roles.at(0)?.id || args[0];
        const unverifiedRoleId = message.mentions.roles.at(1)?.id || args[1];

        if (!verifiedRoleId || !unverifiedRoleId) {
            return message.reply('❌ Usage: `,setup-verify <@VerifiedRole> <@UnverifiedRole>`');
        }

        try {
            db_manager.updateConfig(message.guild.id, 'verified_role_id', verifiedRoleId);
            db_manager.updateConfig(message.guild.id, 'unverified_role_id', unverifiedRoleId);

            // 1. Create Category
            const category = await message.guild.channels.create({
                name: '🛡️ VERIFICATION',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: unverifiedRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.UseExternalEmojis] },
                    { id: verifiedRoleId, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });
            console.log(`[VERIFY] Created category: ${category.name}`);

            // 2. Create Channel in Category
            const verifyChannel = await message.guild.channels.create({
                name: 'verify-here',
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: unverifiedRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory], deny: [PermissionsBitField.Flags.SendMessages] },
                    { id: verifiedRoleId, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });
            console.log(`[VERIFY] Created channel: ${verifyChannel.name}`);

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'ZEDOX™ SECURITY', iconURL: message.guild.iconURL() || undefined })
                .setTitle('🛡️ Gateway Verification')
                .setDescription(`
                    👋 **Welcome to the Inner Circle.**
                    
                    To maintain the high standards of **${message.guild.name}**, you're required to verify your identity.
                    
                    *Click the button below to unlock all channels and join the community.*
                    
                    > **Note:** By verifying, you agree to follow the server rules and maintain loyalty.
                `)
                .setColor('#000001') // Deep Aesthetic Black
                .setThumbnail(message.guild.iconURL({ size: 1024 }) || null)
                .setFooter({ text: 'Zedox™ | Security Enforcement System', iconURL: message.client.user?.displayAvatarURL() });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_member')
                    .setLabel('Complete Verification')
                    .setStyle(ButtonStyle.Secondary) // Darker gray button for "calm" look
                    .setEmoji('🛡️')
            );

            await (verifyChannel as any).send({ embeds: [embed], components: [row] });
            await message.reply(`✅ Verification system configured!\nCategory: **${category.name}**\nChannel: ${verifyChannel}\n\n*Unverified members will now see ONLY this category. Verified members will no longer see it.*`);
        } catch (error) {
            console.error(error);
            await message.reply('❌ Failed to configure verification system.');
        }
    }
};
