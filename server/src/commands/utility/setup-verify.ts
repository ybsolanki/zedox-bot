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

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Server Verification')
                .setDescription('Welcome to the server! To prevent spam and gain access to the rest of the channels, please click the button below to verify your account.')
                .setColor('#00FF00')
                .setFooter({ text: 'Zedox Security System' });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_member')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

            const channel = message.channel as any; // Cast to bypass type check for Sendable
            await channel.send({ embeds: [embed], components: [row] });
            await message.reply('✅ Verification system configured and message sent!');
        } catch (error) {
            console.error(error);
            await message.reply('❌ Failed to configure verification system.');
        }
    }
};
