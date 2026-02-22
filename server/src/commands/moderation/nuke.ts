import { PermissionsBitField, TextChannel } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'nuke',
    description: 'Nuke the current channel (re-create it to clear all messages)',
    category: 'moderation',
    async execute(message, args, musicManager) {
        const config = db_manager.getConfig(message.guild!.id);
        if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');

        const channel = message.channel as TextChannel;
        const position = channel.position;
        const topic = channel.topic;

        const newChannel = await channel.clone();
        await channel.delete();

        await newChannel.setPosition(position);
        if (topic) await newChannel.setTopic(topic);

        await newChannel.send('☢️ **Channel Nuked Successfully.**');
    }
};
