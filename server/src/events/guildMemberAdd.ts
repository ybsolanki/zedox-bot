import { GuildMember, Client, PermissionsBitField } from 'discord.js';
import { db_manager } from '../database.js';
import { sendModLog } from '../utils/modLogs.js';

export const event = {
    name: 'guildMemberAdd',
    async execute(member: GuildMember, client: Client) {
        console.log(`[VERIFY] Member joined: ${member.user.tag} (${member.id}) in ${member.guild.name}`);

        await sendModLog(member.guild, 'Member Joined', `**${member.user.tag}** joined the server.`, '#00FF00', [
            { name: 'User', value: `<@${member.id}>`, inline: true },
            { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
        ]);

        const config = db_manager.getConfig(member.guild.id);
        console.log(`[VERIFY] Current config for ${member.guild.name}:`, JSON.stringify(config));

        if (config.unverified_role_id) {
            // Check if bot has permission to manage roles
            const botMember = member.guild.members.me;
            if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                console.error(`[VERIFY] Missing 'ManageRoles' permission to assign role in ${member.guild.name}`);
                return;
            }

            try {
                // Verify the role actually exists in the cache/guild
                const role = member.guild.roles.cache.get(config.unverified_role_id);
                if (!role) {
                    console.error(`[VERIFY] Unverified role with ID ${config.unverified_role_id} not found in server.`);
                    return;
                }

                await member.roles.add(config.unverified_role_id);
                console.log(`[VERIFY] Successfully assigned unverified role (${role.name}) to ${member.user.tag}`);
            } catch (error: any) {
                console.error(`[VERIFY] Error assigning unverified role to ${member.user.tag}:`, error.message);
                if (error.message.includes('Missing Permissions')) {
                    console.error('[VERIFY] TIP: My role might be BELOW the unverified role in the hierarchy. Please move my role up!');
                }
            }
        } else {
            console.warn(`[VERIFY] No unverified role configured for ${member.guild.name}. Run ,setup-verify to configure.`);
        }
    }
};
