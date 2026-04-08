import { PermissionsBitField, TextChannel, ChannelType } from 'discord.js';
import { Command } from '../../handlers/CommandHandler.js';
import { db_manager } from '../../database.js';

export const command: Command = {
    name: 'cleanup-verify',
    description: 'Clears the verification category and its channels from the server',
    category: 'utility',
    aliases: ['clear-verify', 'verify-cleanup'],
    async execute(message, args, musicManager) {
        if (!message.guild) return;
        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Admin required.');
        }

        try {
            const config = db_manager.getConfig(message.guild.id);
            let categoryId = config.verification_category_id;

            // If not in DB, try to find by name
            if (!categoryId) {
                const foundCategory = message.guild.channels.cache.find(c =>
                    c.type === ChannelType.GuildCategory && c.name === '🛡️ VERIFICATION'
                );
                if (foundCategory) categoryId = foundCategory.id;
            }

            if (categoryId) {
                const category = await message.guild.channels.fetch(categoryId).catch(() => null);
                if (category && category.type === ChannelType.GuildCategory) {
                    const statusMsg = await message.reply(`🧹 **Cleaning up verification system...**\nDeleting category: **${category.name}**`);

                    // Delete all channels in the category
                    const channels = message.guild.channels.cache.filter(c => c.parentId === categoryId);
                    for (const [, channel] of channels) {
                        await channel.delete('Verification cleanup requested').catch(e => console.error(`[CLEANUP] Failed to delete channel ${channel.name}:`, e));
                    }

                    // Delete the category itself
                    await category.delete('Verification cleanup requested');

                    // Update DB
                    db_manager.updateConfig(message.guild.id, 'verification_category_id', null);

                    return statusMsg.edit('✅ **Verification system cleared successfully.**\nCategory and all associated channels have been removed.');
                }
            }

            // Fallback: Original message cleanup logic if category not found
            const statusMsg = await message.reply('🔍 No verification category found. Searching for verification messages in this channel...');

            const channel = message.channel as TextChannel;
            const messages = await channel.messages.fetch({ limit: 100 });

            const toDelete = messages.filter(m =>
                m.author.id === message.client.user?.id &&
                (m.embeds.some(e => e.title === '🛡️ Gateway Verification' || e.title === 'Verification' || e.title?.includes('Security')))
            );

            if (toDelete.size === 0) {
                return statusMsg.edit('✨ No bot verification messages found in the last 100 messages.');
            }

            await channel.bulkDelete(toDelete);
            await statusMsg.edit(`✅ Successfully removed **${toDelete.size}** verification messages.`);
            setTimeout(() => statusMsg.delete().catch(() => { }), 5000);
        } catch (error) {
            console.error('[CLEANUP] Error during verification cleanup:', error);
            await message.reply('❌ Failed to cleanup verification system. Check permissions.');
        }
    }
};
