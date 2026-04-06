import { PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { commandHandler } from '../../bot.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'botsetup',
    description: 'Master setup! Creates Admin category, logs, help-desk, and Verification system.',
    category: 'utility',
    aliases: ['master-setup', 'full-setup'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Admin required.');
        }

        const verifiedRoleId = message.mentions.roles.at(0)?.id || args[0];
        const unverifiedRoleId = message.mentions.roles.at(1)?.id || args[1];

        if (!verifiedRoleId || !unverifiedRoleId) {
            return message.reply('❌ Usage: `,botsetup <@VerifiedRole> <@UnverifiedRole>`');
        }

        try {
            await message.reply('⚙️ **Starting Master Setup...** This will take a moment.');

            // 1. Create ADMIN Category (Private)
            const adminCategory = await message.guild.channels.create({
                name: '🛡️ ZEDOX ADMIN',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                    // Only Admin can see by default if the above is set and they have Admin perm
                ]
            });

            // 2. Create Logs Channel
            const logChannel = await message.guild.channels.create({
                name: 'zedox-logs',
                type: ChannelType.GuildText,
                parent: adminCategory.id,
                topic: 'Automated Bot Activity Logs'
            });

            // 3. Create Help Desk Channel
            const helpDeskChannel = await message.guild.channels.create({
                name: 'help-desk',
                type: ChannelType.GuildText,
                parent: adminCategory.id,
                topic: 'Command Reference & Bot Instructions'
            });

            // 4. Create VERIFICATION Category
            const verifyCategory = await message.guild.channels.create({
                name: '🔓 VERIFICATION',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: unverifiedRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] }
                ]
            });

            // 5. Create Verify Here Channel
            const verifyChannel = await message.guild.channels.create({
                name: 'verify-here',
                type: ChannelType.GuildText,
                parent: verifyCategory.id,
                permissionOverwrites: [
                    { id: message.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: unverifiedRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory], deny: [PermissionsBitField.Flags.SendMessages] }
                ]
            });

            // --- Configure Database ---
            db_manager.updateConfig(message.guild.id, 'mod_log_channel_id', logChannel.id);
            db_manager.updateConfig(message.guild.id, 'verified_role_id', verifiedRoleId);
            db_manager.updateConfig(message.guild.id, 'unverified_role_id', unverifiedRoleId);

            // --- Help Desk Content ---
            const helpEmbed = new EmbedBuilder()
                .setTitle('📚 Zedox Help Desk')
                .setDescription('Complete list of available commands and their descriptions.')
                .setColor('#5865F2')
                .setTimestamp();

            const categories: { [key: string]: string[] } = {};
            commandHandler.commands.forEach(cmd => {
                if (!categories[cmd.category]) categories[cmd.category] = [];
                categories[cmd.category].push(`\`${cmd.name}\` - ${cmd.description}`);
            });

            const labels: { [key: string]: string } = {
                moderation: '🛡️ Moderation',
                music: '🎶 Music',
                utility: '🛠️ Utility'
            };

            for (const [cat, cmds] of Object.entries(categories)) {
                helpEmbed.addFields({ name: labels[cat] || `✨ ${cat}`, value: cmds.join('\n') });
            }

            await (helpDeskChannel as any).send({ embeds: [helpEmbed] });

            // --- Verification Content ---
            const verifyEmbed = new EmbedBuilder()
                .setTitle('🛡️ Server Verification')
                .setDescription('Welcome to the server! Click the button below to verify and gain access to the rest of the channels.')
                .setColor('#00FF00')
                .setFooter({ text: 'Zedox Security' });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_member')
                    .setLabel('Verify')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

            await (verifyChannel as any).send({ embeds: [verifyEmbed], components: [row] });

            await message.reply('✅ **Master Setup Complete!**\n- Admin Category & Private Logs created.\n- Help Desk populated.\n- Verification system live.');

        } catch (error) {
            console.error(error);
            await message.reply('❌ **Error during setup.** Check bot permissions.');
        }
    }
};
