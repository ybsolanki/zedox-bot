import { Client, GatewayIntentBits, Message, EmbedBuilder, PermissionsBitField, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
import { db_manager } from './database.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user?.tag}`);
    const config = db_manager.getConfig();
    client.user?.setActivity(config.status_message || 'Zedox Dashboard');

    // Check for expired mutes every minute
    setInterval(async () => {
        const expired = db_manager.getExpiredMutes();
        for (const mute of expired) {
            const guild = client.guilds.cache.get(mute.guild_id);
            const member = await guild?.members.fetch(mute.user_id).catch(() => null);
            if (member) {
                // Unmute logic (usually removing a role or un-timeout)
                await member.timeout(null, 'Timed mute expired').catch(console.error);
            }
            db_manager.removeMute(mute.user_id);
        }
    }, 60000);
});

const messageLog = new Map<string, number[]>();

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    const config = db_manager.getConfig();

    // Auto-Mod: Anti-Spam
    if (config.features?.automod) {
        const now = Date.now();
        const timestamps = messageLog.get(message.author.id) || [];
        timestamps.push(now);

        // Keep only last 5 seconds
        const recentTimestamps = timestamps.filter(t => now - t < 5000);
        messageLog.set(message.author.id, recentTimestamps);

        if (recentTimestamps.length > 5) {
            await message.delete().catch(() => { });
            return (message.channel as any).send(`⚠️ **Auto-Mod:** ${message.author}, please slow down!`).then((msg: any) => {
                setTimeout(() => msg.delete().catch(() => { }), 3000);
            });
        }
    }

    const prefix = config.prefix || ',';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    try {
        // Command handler logic
        switch (commandName) {
            case 'serverinfo':
                const sEmbed = new EmbedBuilder()
                    .setTitle(message.guild.name)
                    .setThumbnail(message.guild.iconURL())
                    .addFields(
                        { name: 'Members', value: `${message.guild.memberCount}`, inline: true },
                        { name: 'Created At', value: message.guild.createdAt.toDateString(), inline: true },
                        { name: 'Owner', value: `<@${message.guild.ownerId}>`, inline: true }
                    )
                    .setColor('#5865F2');
                await (message.channel as any).send({ embeds: [sEmbed] });
                break;

            case 'userinfo':
                const target = message.mentions.users.first() || message.author;
                const uEmbed = new EmbedBuilder()
                    .setTitle(`${target.tag}'s Info`)
                    .setThumbnail(target.displayAvatarURL())
                    .addFields(
                        { name: 'ID', value: target.id, inline: true },
                        { name: 'Created At', value: target.createdAt.toDateString(), inline: true }
                    )
                    .setColor('#5865F2');
                await (message.channel as any).send({ embeds: [uEmbed] });
                break;

            case 'invite':
                await message.reply('🔗 **Invite Zedox:** https://discord.com/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot%20applications.commands');
                break;

            case 'kick':
                if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled in the dashboard.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply('❌ Insufficient permissions.');
                const kickMember = message.mentions.members?.first();
                if (!kickMember) return message.reply('❌ Please mention a user to kick.');
                await kickMember.kick(args.slice(1).join(' ') || 'No reason provided');
                await message.reply(`✅ Kicked ${kickMember.user.tag}.`);
                break;

            case 'ban':
                if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled in the dashboard.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ Insufficient permissions.');
                const banMember = message.mentions.members?.first();
                if (!banMember) return message.reply('❌ Please mention a user to ban.');
                await banMember.ban({ reason: args.slice(1).join(' ') || 'No reason provided' });
                await message.reply(`✅ Banned ${banMember.user.tag}.`);
                break;

            case 'clear':
                if (!config.features?.clear) return message.reply('❌ The **Clear Command** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Insufficient permissions.');
                const amount = parseInt(args[0]);
                if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Provide a number between 1 and 100.');
                await message.channel.messages.fetch({ limit: amount + 1 }).then(messages => {
                    (message.channel as any).bulkDelete(messages);
                });
                break;

            case 'mute':
            case 'textmute':
                if (!config.features?.mute) return message.reply('❌ **Mute Control** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Insufficient permissions.');
                const muteUser = message.mentions.members?.first();
                const durationStr = args[1];
                if (!muteUser || !durationStr) return message.reply('❌ Usage: ,mute @user 10m [reason]');

                const duration = parseInt(durationStr);
                const unit = durationStr.slice(-1);
                let ms = duration * 60000;
                if (unit === 'h') ms = duration * 3600000;
                if (unit === 'd') ms = duration * 86400000;

                await muteUser.timeout(ms, args.slice(2).join(' ') || 'No reason provided');
                const expiresAt = new Date(Date.now() + ms).toISOString();
                db_manager.addMute(muteUser.id, message.guild.id, expiresAt);
                await message.reply(`✅ Muted ${muteUser.user.tag} for ${durationStr}.`);
                break;

            case 'unmute':
            case 'textunmute':
                if (!config.features?.mute) return message.reply('❌ **Mute Control** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Insufficient permissions.');
                const unmuteUser = message.mentions.members?.first();
                if (!unmuteUser) return message.reply('❌ Mention a user.');
                await unmuteUser.timeout(null);
                db_manager.removeMute(unmuteUser.id);
                await message.reply(`✅ Unmuted ${unmuteUser.user.tag}.`);
                break;

            case 'deafen':
                if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.DeafenMembers)) return message.reply('❌ Insufficient permissions.');
                const deafMember = message.mentions.members?.first();
                if (!deafMember || !deafMember.voice.channel) return message.reply('❌ User not in voice.');
                await deafMember.voice.setDeaf(true);
                await message.reply(`✅ Deafened ${deafMember.user.tag}.`);
                break;

            case 'undeafen':
                if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.DeafenMembers)) return message.reply('❌ Insufficient permissions.');
                const undeafMember = message.mentions.members?.first();
                if (!undeafMember || !undeafMember.voice.channel) return message.reply('❌ User not in voice.');
                await undeafMember.voice.setDeaf(false);
                await message.reply(`✅ Undeafened ${undeafMember.user.tag}.`);
                break;

            case 'lockdown':
                if (!config.features?.lockdown) return message.reply('❌ **Lockdown Mode** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');
                await (message.channel as any).permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });
                await message.reply('🔒 Channel locked down.');
                break;

            case 'unlock':
                if (!config.features?.lockdown) return message.reply('❌ **Lockdown Mode** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');
                await (message.channel as any).permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                });
                await message.reply('🔓 Channel unlocked.');
                break;

            case 'debug':
                if (!config.features?.info) return;
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;
                const uptime = process.uptime();
                await message.reply(`⚙️ **Debug Info:**\nUptime: ${Math.floor(uptime / 60)}m\nGuilds: ${client.guilds.cache.size}\nLat: ${client.ws.ping}ms`);
                break;

            case 'prefix':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Admin required.');
                const newPrefix = args[0];
                if (!newPrefix) return message.reply('❌ Provide a new prefix.');
                db_manager.updateConfig('prefix', newPrefix);
                await message.reply(`✅ Prefix updated to \`${newPrefix}\`.`);
                break;

            case 'ping':
                if (!config.features?.ping) return message.reply('❌ **Ping Command** is currently disabled.');
                await message.reply(`🏓 Pong! Latency is ${Date.now() - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms.`);
                break;

            case 'help':
                // Help should probably always work or check a flag
                const helpEmbed = new EmbedBuilder()
                    .setTitle('Zedox Bot Commands')
                    .setColor('#5865F2')
                    .setDescription(`Current prefix is \`${prefix}\``)
                    .addFields(
                        { name: 'Moderation (11)', value: '`kick`, `ban`, `clear`, `mute`, `unmute`, `deafen`, `undeafen`, `lockdown`, `unlock`, `textmute`, `slowmode`' },
                        { name: 'Utility & Info (7)', value: '`userinfo`, `serverinfo`, `invite`, `prefix`, `debug`, `ping`, `uptime`' },
                        { name: 'Other', value: '`help`' }
                    );
                await (message.channel as any).send({ embeds: [helpEmbed] });
                break;

            case 'uptime':
                if (!config.features?.info) return message.reply('❌ **Info Commands** are currently disabled.');
                const ut = process.uptime();
                const days = Math.floor(ut / 86400);
                const hours = Math.floor(ut / 3600) % 24;
                const minutes = Math.floor(ut / 60) % 60;
                await message.reply(`⏰ **Uptime:** ${days}d ${hours}h ${minutes}m`);
                break;

            case 'slowmode':
                if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');
                const smAmount = parseInt(args[0]);
                if (isNaN(smAmount)) return message.reply('❌ Provide a number in seconds.');
                await (message.channel as any).setRateLimitPerUser(smAmount);
                await message.reply(`✅ Slowmode set to ${smAmount}s.`);
                break;

            case 'invite':
                if (!config.features?.invite) return message.reply('❌ **Invite Generator** is currently disabled.');
                await message.reply('🔗 **Invite Zedox:** https://discord.com/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot%20applications.commands');
                break;

            default:
                break;
        }

        db_manager.logCommand(uuidv4(), commandName, message.author.tag, message.guild.id, true);
    } catch (error) {
        console.error(error);
        db_manager.logCommand(uuidv4(), commandName, message.author.tag, message.guild.id, false);
        message.reply('❌ An error occurred while executing the command.');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
