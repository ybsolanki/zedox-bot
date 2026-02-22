import { EmbedBuilder, Guild } from 'discord.js';
import { db_manager } from '../database.js';

export async function sendModLog(guild: Guild, title: string, description: string, color: any, fields: any[] = []) {
    const config = db_manager.getConfig(guild.id);
    if (!config.mod_log_channel_id) return;

    const logChannel = guild.channels.cache.get(config.mod_log_channel_id);
    if (!logChannel || !('send' in logChannel)) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (fields.length > 0) {
        embed.addFields(fields);
    }

    try {
        await (logChannel as any).send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending mod log:', error);
    }
}
