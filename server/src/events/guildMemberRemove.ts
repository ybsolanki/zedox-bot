import { GuildMember, Client } from 'discord.js';
import { sendModLog } from '../utils/modLogs.js';

export const event = {
    name: 'guildMemberRemove',
    async execute(member: GuildMember, client: Client) {
        await sendModLog(member.guild, 'Member Left', `**${member.user.tag}** left the server.`, '#FF0000', [
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
        ]);
    }
};
