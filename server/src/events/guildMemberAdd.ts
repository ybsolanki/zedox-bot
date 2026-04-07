import { GuildMember, Client, PermissionsBitField } from 'discord.js';
import { db_manager } from '../database.js';

export const event = {
    name: 'guildMemberAdd',
    async execute(member: GuildMember, client: Client) {
        const config = db_manager.getConfig(member.guild.id);
        if (config.unverified_role_id) {
            // Check if bot has permission to manage roles
            const botMember = member.guild.members.me;
            if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                console.error(`[VERIFY] Missing 'ManageRoles' permission to assign role in ${member.guild.name}`);
                return;
            }

            try {
                await member.roles.add(config.unverified_role_id);
                console.log(`[VERIFY] Successfully assigned unverified role to ${member.user.tag} (${member.id})`);
            } catch (error) {
                console.error(`[VERIFY] Error assigning unverified role to ${member.user.tag}:`, error);
            }
        }
    }
};
