import { GuildMember, Client } from 'discord.js';
import { db_manager } from '../database.js';

export const event = {
    name: 'guildMemberAdd',
    async execute(member: GuildMember, client: Client) {
        const config = db_manager.getConfig(member.guild.id);
        if (config.unverified_role_id) {
            try {
                await member.roles.add(config.unverified_role_id);
                console.log(`[VERIFY] Assigned unverified role to ${member.user.tag}`);
            } catch (error) {
                console.error(`[VERIFY] Failed to assign unverified role to ${member.user.tag}:`, error);
            }
        }
    }
};
