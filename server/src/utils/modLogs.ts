import { EmbedBuilder, Guild, ChannelType } from 'discord.js';
import { db_manager } from '../database.js';

export async function sendModLog(guild: Guild, title: string, description: string, color: any, fields: any[] = []) {
    try {
        const config = db_manager.getConfig(guild.id);
        const logChannelId = config.mod_log_channel_id;

        if (!logChannelId) {
            // console.log(`[LOGS] No log channel configured for guild: ${guild.name}`);
            return;
        }

        // Try to fetch channel if not in cache
        let logChannel = guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            logChannel = await guild.channels.fetch(logChannelId).catch(() => undefined) as any;
        }

        if (!logChannel || !('send' in logChannel)) {
            console.error(`[LOGS] Log channel ${logChannelId} not found or inaccessible in ${guild.name}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        await (logChannel as any).send({ embeds: [embed] });
    } catch (error) {
        console.error('[LOGS] Error sending mod log:', error);
    }
}
