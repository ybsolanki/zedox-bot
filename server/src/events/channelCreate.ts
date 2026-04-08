import { GuildChannel, Client, ChannelType } from 'discord.js';
import { sendModLog } from '../utils/modLogs.js';

export const event = {
    name: 'channelCreate',
    async execute(channel: GuildChannel, client: Client) {
        if (!channel.guild) return;

        const typeStr = ChannelType[channel.type] || 'Unknown';
        await sendModLog(channel.guild, 'Channel Created', `New channel **#${channel.name}** was created.`, '#00FF00', [
            { name: 'Name', value: `${channel.name}`, inline: true },
            { name: 'Type', value: `${typeStr}`, inline: true },
            { name: 'ID', value: `${channel.id}`, inline: true }
        ]);
    }
};
