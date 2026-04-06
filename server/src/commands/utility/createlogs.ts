import { PermissionsBitField, ChannelType } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'createlogs',
    description: 'Create a dedicated log channel for the bot',
    category: 'utility',
    aliases: ['setup-logs', 'logsetup'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ You need **Administrator** permissions to use this command.');
        }

        try {
            const channel = await message.guild.channels.create({
                name: 'zedox-logs',
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: message.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: message.client.user!.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks],
                    }
                ],
            });

            db_manager.updateConfig(message.guild.id, 'mod_log_channel_id', channel.id);

            await message.reply(`✅ Successfully created and configured the log channel: ${channel}`);
        } catch (error) {
            console.error('Error creating log channel:', error);
            await message.reply('❌ Failed to create the log channel. Please check my permissions.');
        }
    }
};
