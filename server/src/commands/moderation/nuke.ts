import { PermissionsBitField, TextChannel } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';
import { sendModLog } from '../../utils/modLogs.js';

export const command: Command = {
    name: 'nuke',
    description: 'Nuke the current channel (re-create it to clear all messages)',
    category: 'moderation',
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');

        const channel = message.channel as TextChannel;
        const position = channel.position;
        const topic = channel.topic;
        const parentId = channel.parentId;

        try {
            const newChannel = await channel.clone();
            await channel.delete('Channel nuked');

            await newChannel.setPosition(position);
            if (topic) await newChannel.setTopic(topic);
            if (parentId) await newChannel.setParent(parentId);

            await newChannel.send('☢️ **Channel Nuked Successfully.**');

            await sendModLog(message.guild, 'Channel Nuked', `Channel **#${channel.name}** was nuked by ${message.author.tag}.`, '#FF4500', [
                { name: 'Channel', value: `${newChannel}`, inline: true },
                { name: 'Moderator', value: `${message.author.tag}`, inline: true }
            ]);
        } catch (error) {
            console.error('[NUKE] Error:', error);
            await message.reply('❌ Failed to nuke the channel.');
        }
    }
};
