import { Client, GatewayIntentBits, Message, EmbedBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import dotenv from 'dotenv';
import { db_manager } from './database.js';
import { v4 as uuidv4 } from 'uuid';
import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';

dotenv.config();

export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Initialize DisTube
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [
        new YtDlpPlugin()
    ]
});

// DisTube Event Listeners
distube
    .on('playSong', (queue, song) => {
        const embed = new EmbedBuilder()
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: song.formattedDuration || 'Unknown', inline: true },
                { name: 'Requested By', value: `${song.user}`, inline: true }
            )
            .setThumbnail(song.thumbnail || null)
            .setColor('#5865F2');
        queue.textChannel?.send({ embeds: [embed] });
    })
    .on('addSong', (queue, song) => {
        const embed = new EmbedBuilder()
            .setDescription(`✅ Added **[${song.name}](${song.url})** to the queue.`)
            .setColor('#5865F2');
        queue.textChannel?.send({ embeds: [embed] });
    })
    .on('addList', (queue, playlist) => {
        const embed = new EmbedBuilder()
            .setDescription(`✅ Added playlist **${playlist.name}** (${playlist.songs.length} songs) to the queue.`)
            .setColor('#5865F2');
        queue.textChannel?.send({ embeds: [embed] });
    })
    .on('error', (channel: any, e: any) => {
        console.error(e);
        if (channel) channel.send(`❌ An error encountered: ${e.toString().slice(0, 1974)}`);
    });


client.once('ready', () => {
    console.log(`Bot logged in as ${client.user?.tag}`);
    // Use a default or global status message or fetch from a specific guild if needed
    client.user?.setActivity('Zedox Dashboard');

    // Check for expired mutes every minute across all guilds
    setInterval(async () => {
        const expired = db_manager.getAllExpiredMutes();
        for (const mute of expired) {
            const guild = client.guilds.cache.get(mute.guild_id);
            const member = await guild?.members.fetch(mute.user_id).catch(() => null);
            if (member) {
                await member.timeout(null, 'Timed mute expired').catch(console.error);
            }
            db_manager.removeMute(mute.user_id, mute.guild_id);
        }
    }, 60000);
});

// Utility: Send Moderation Log
const sendModLog = async (guild: any, title: string, description: string, color: string = '#FF0000', fields: any[] = []) => {
    const config = db_manager.getConfig(guild.id);
    if (!config.mod_log_channel_id) return;

    const channel = guild.channels.cache.get(config.mod_log_channel_id);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color as any)
        .addFields(fields)
        .setTimestamp();

    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Failed to send mod log:', error);
    }
};

// Welcome Messages System
client.on('guildMemberAdd', async (member) => {
    const welcomeConfig = db_manager.getWelcomeConfig(member.guild.id);
    if (!welcomeConfig.enabled || !welcomeConfig.channel_id) return;

    const channel = member.guild.channels.cache.get(welcomeConfig.channel_id);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const config = welcomeConfig.embed;

    // Placeholder replacement
    const replacePlaceholders = (text: string) => {
        if (!text) return '';
        return text
            .replace(/{server}/g, member.guild.name)
            .replace(/{mention}/g, `<@${member.id}>`)
            .replace(/{user}/g, member.user.tag)
            .replace(/{memberCount}/g, member.guild.memberCount.toString());
    };

    const embed = new EmbedBuilder()
        .setTitle(replacePlaceholders(config.title))
        .setDescription(replacePlaceholders(config.description))
        .setColor(config.color as any)
        .setFooter({ text: replacePlaceholders(config.footer) });

    // Handle thumbnail
    if (config.thumbnail === 'user_avatar') {
        embed.setThumbnail(member.user.displayAvatarURL());
    } else if (config.thumbnail === 'server_icon') {
        embed.setThumbnail(member.guild.iconURL());
    } else if (config.thumbnail === 'custom_url' && config.thumbnail_url) {
        embed.setThumbnail(config.thumbnail_url);
    }

    // Handle main image
    if (config.image) {
        embed.setImage(config.image);
    }

    await (channel as any).send({ content: `<@${member.id}>`, embeds: [embed] }).catch(console.error);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('role_')) {
        const roleName = interaction.customId.replace('role_', '');
        const guild = interaction.guild;
        if (!guild) return;

        const role = guild.roles.cache.find(r => r.name === roleName);
        const member = await guild.members.fetch(interaction.user.id);

        if (role && member) {
            // Remove all other student roles first
            const studentRoleNames = [
                '9th', '10th', '11th-PCM', '11th-PCB',
                '12th-PCM', '12th-PCB', '12th-PCM-Dropper', '12th-PCB-Dropper'
            ];
            const rolesToRemove = member.roles.cache.filter(r => studentRoleNames.includes(r.name));
            await member.roles.remove(rolesToRemove);

            // Add the new role
            await member.roles.add(role);
            await interaction.reply({ content: `✅ You have been assigned the **${roleName}** role!`, ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Role not found or error assigning role.', ephemeral: true });
        }
    }

    if (interaction.customId === 'ticket_create') {
        const guild = interaction.guild;
        if (!guild) return;

        const config = db_manager.getConfig(guild.id);
        if (!config.ticket_category_id) return interaction.reply({ content: '❌ Ticket system is not configured.', ephemeral: true });

        const ticketNum = config.ticket_count + 1;
        db_manager.updateConfig(guild.id, 'ticket_count', ticketNum);

        try {
            const ticketChannel = await guild.channels.create({
                name: `ticket-${ticketNum}`,
                type: ChannelType.GuildText,
                parent: config.ticket_category_id,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles],
                    },
                    config.staff_role_id ? {
                        id: config.staff_role_id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages],
                    } : null
                ].filter(Boolean) as any,
            });

            const embed = new EmbedBuilder()
                .setTitle('🎫 Support Ticket')
                .setDescription(`Hello ${interaction.user}, a member of our staff will be with you shortly.\n\nPlease describe your issue in detail.`)
                .setColor('#5865F2')
                .setTimestamp();

            const closeButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({ content: `<@${interaction.user.id}> | <@&${config.staff_role_id}>`, embeds: [embed], components: [closeButton] });
            await interaction.reply({ content: `✅ Ticket created! ${ticketChannel}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Failed to create ticket.', ephemeral: true });
        }
    }

    if (interaction.customId === 'ticket_close') {
        const channel = interaction.channel;
        if (!channel || channel.type !== ChannelType.GuildText) return;

        await interaction.reply('🔒 Closing ticket in 5 seconds...');
        setTimeout(() => {
            channel.delete().catch(() => { });
        }, 5000);
    }
});

const messageLog = new Map<string, number[]>();

// Profanity filter logic
const checkProfanity = (content: string, bannedWords: string[]): boolean => {
    const lowerContent = content.toLowerCase();
    // Match whole words or common variations
    return bannedWords.some(word => {
        const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
        return regex.test(lowerContent);
    });
};

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.guild) return;

    const config = db_manager.getConfig(message.guild.id);
    const automodConfig = db_manager.getAutoModConfig(message.guild.id);

    // Auto-Mod: Content Filter
    if (automodConfig.enabled) {
        if (checkProfanity(message.content, automodConfig.banned_words)) {
            if (automodConfig.delete_messages) {
                await message.delete().catch(() => { });
            }

            db_manager.addViolation(message.author.id, message.guild.id, 'Profanity/Banned Word', message.content);

            if (automodConfig.warn_on_violation) {
                db_manager.addWarning(message.author.id, message.guild.id, 'Usage of banned words');

                const userWarnings = db_manager.getUserWarnings(message.author.id, message.guild.id, automodConfig.warning_expiry_hours);

                if (userWarnings.length >= automodConfig.warnings_before_mute) {
                    if (automodConfig.mute_on_violation || true) { // Default to timeout for now
                        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                        if (member) {
                            const muteMs = automodConfig.mute_duration_minutes * 60000;
                            await member.timeout(muteMs, 'Auto-Mod: Repeated violations').catch(console.error);

                            // Add Muted Role if configured
                            if (config.muted_role_id) {
                                await member.roles.add(config.muted_role_id).catch(() => { });
                            }

                            const expiresAt = new Date(Date.now() + muteMs).toISOString();
                            db_manager.addMute(message.author.id, message.guild.id, expiresAt);

                            await (message.channel as any).send(`🔇 ${message.author} has been muted for ${automodConfig.mute_duration_minutes} minutes due to repeated violations.`);

                            await sendModLog(message.guild, 'Auto-Mod: User Muted', `${message.author.tag} was automatically muted for repeated violations.`, '#FF0000', [
                                { name: 'Target', value: `<@${message.author.id}>`, inline: true },
                                { name: 'Duration', value: `${automodConfig.mute_duration_minutes}m`, inline: true },
                                { name: 'Reason', value: 'Auto-Mod: Repeated violations' }
                            ]);
                        }
                    }
                }
                else {
                    const warnMsg = await (message.channel as any).send(`⚠️ ${message.author}, please watch your language! Warning (${userWarnings.length}/${automodConfig.warnings_before_mute})`);
                    setTimeout(() => warnMsg.delete().catch(() => { }), 5000);
                }
            }
            return;
        }
    }

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
    const rawCommandName = args.shift()?.toLowerCase();

    if (!rawCommandName) return;

    // Command aliases mapping
    const aliases: { [key: string]: string } = {
        'si': 'serverinfo',
        'serverinformation': 'serverinfo',
        'ui': 'userinfo',
        'p': 'play',
        's': 'skip',
        'q': 'queue',
        'purge': 'clear',
        'h': 'help'
    };

    const commandName = aliases[rawCommandName] || rawCommandName;

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
                const kickReason = args.slice(1).join(' ') || 'No reason provided';
                await kickMember.kick(kickReason);
                await message.reply(`✅ Kicked ${kickMember.user.tag}.`);
                await sendModLog(message.guild, 'User Kicked', `${kickMember.user.tag} was kicked from the server.`, '#FFA500', [
                    { name: 'Target', value: `<@${kickMember.id}>`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                    { name: 'Reason', value: kickReason }
                ]);
                break;

            case 'ban':
                if (!config.features?.moderation) return message.reply('❌ The **Moderation Pack** is currently disabled in the dashboard.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ Insufficient permissions.');
                const banMember = message.mentions.members?.first();
                if (!banMember) return message.reply('❌ Please mention a user to ban.');
                const banReason = args.slice(1).join(' ') || 'No reason provided';
                await banMember.ban({ reason: banReason });
                await message.reply(`✅ Banned ${banMember.user.tag}.`);
                await sendModLog(message.guild, 'User Banned', `${banMember.user.tag} was permanently banned.`, '#FF0000', [
                    { name: 'Target', value: `<@${banMember.id}>`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                    { name: 'Reason', value: banReason }
                ]);
                break;

            case 'clear':
                if (!config.features?.clear) return message.reply('❌ The **Clear Command** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ Insufficient permissions.');
                const amount = parseInt(args[0]);
                if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('❌ Provide a number between 1 and 100.');
                await message.channel.messages.fetch({ limit: amount + 1 }).then(async messages => {
                    await (message.channel as any).bulkDelete(messages);
                    const delMsg = await message.channel.send(`✅ Deleted **${amount}** messages.`);
                    setTimeout(() => delMsg.delete().catch(() => { }), 3000);
                });
                break;

            case 'mute':
            case 'textmute':
                if (!config.features?.mute) return message.reply('❌ **Mute Control** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Insufficient permissions.');
                const muteUser = message.mentions.members?.first();
                const durationStr = args[1];
                if (!muteUser || !durationStr) return message.reply('❌ Usage: ,mute @user 10m [reason]');

                const muteDuration = parseInt(durationStr);
                const muteUnit = durationStr.slice(-1);
                let muteMsValue = muteDuration * 60000;
                if (muteUnit === 'h') muteMsValue = muteDuration * 3600000;
                if (muteUnit === 'd') muteMsValue = muteDuration * 86400000;

                const muteReason = args.slice(2).join(' ') || 'No reason provided';
                await muteUser.timeout(muteMsValue, muteReason);

                // Add Muted Role if configured
                if (config.muted_role_id) {
                    await muteUser.roles.add(config.muted_role_id).catch(() => { });
                }

                const muteExpiresAt = new Date(Date.now() + muteMsValue).toISOString();
                db_manager.addMute(muteUser.id, message.guild.id, muteExpiresAt);
                await message.reply(`✅ Muted ${muteUser.user.tag} for ${durationStr}.`);

                await sendModLog(message.guild, 'User Muted', `${muteUser.user.tag} was muted.`, '#FFA500', [
                    { name: 'Target', value: `<@${muteUser.id}>`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true },
                    { name: 'Duration', value: durationStr, inline: true },
                    { name: 'Reason', value: muteReason }
                ]);
                break;

            case 'unmute':
            case 'textunmute':
                if (!config.features?.mute) return message.reply('❌ **Mute Control** is currently disabled.');
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply('❌ Insufficient permissions.');
                const unmuteUser = message.mentions.members?.first();
                if (!unmuteUser) return message.reply('❌ Mention a user.');
                await unmuteUser.timeout(null);

                // Remove Muted Role if configured
                if (config.muted_role_id) {
                    await unmuteUser.roles.remove(config.muted_role_id).catch(() => { });
                }

                db_manager.removeMute(unmuteUser.id, message.guild.id);
                await message.reply(`✅ Unmuted ${unmuteUser.user.tag}.`);

                await sendModLog(message.guild, 'User Unmuted', `${unmuteUser.user.tag} was unmuted.`, '#00FF00', [
                    { name: 'Target', value: `<@${unmuteUser.id}>`, inline: true },
                    { name: 'Moderator', value: `${message.author.tag}`, inline: true }
                ]);
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
                db_manager.updateConfig(message.guild.id, 'prefix', newPrefix);
                await message.reply(`✅ Prefix updated to \`${newPrefix}\`.`);
                break;

            case 'ping':
                if (!config.features?.ping) return message.reply('❌ **Ping Command** is currently disabled.');
                await message.reply(`🏓 Pong! Latency is ${Date.now() - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms.`);
                break;

            case 'setup':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Administrator role is required to run setup.');
                const setupMsg = await message.reply('⏳ **Starting Zedox HQ server setup...** This will be awesome!');

                try {
                    const guild = message.guild;
                    const everyone = guild.roles.everyone;

                    // 1. CREATE ROLES (Top to Bottom)
                    const roleData = [
                        { name: '👑 HQ Owner', color: '#FFD700', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
                        { name: '🛠 Lead Developer', color: '#00BFFF', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
                        { name: '🛡 Staff Manager', color: '#880808', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
                        { name: '🛡 Moderator', color: '#00FF00', hoist: true, permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
                        { name: '🤝 Partner', color: '#FF69B4', hoist: true },
                        { name: '💎 Premium User', color: '#FFD700', hoist: true },
                        { name: '👤 Zedox Member', color: '#ADD8E6', hoist: false },
                        { name: '🤖 Bot', color: '#818386', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] }
                    ];

                    const createdRoles: any = {};
                    for (const rd of roleData) {
                        createdRoles[rd.name] = await guild.roles.create({
                            name: rd.name,
                            color: rd.color as any,
                            hoist: rd.hoist || false,
                            permissions: rd.permissions || [],
                            reason: 'Zedox HQ Setup'
                        });
                    }

                    // Create Muted Role
                    const mutedRole = await guild.roles.create({
                        name: 'Muted',
                        color: '#818386',
                        reason: 'Zedox HQ Setup - Muted Role'
                    });
                    db_manager.updateConfig(guild.id, 'muted_role_id', mutedRole.id);

                    const modRole = createdRoles['🛡 Moderator'];
                    const staffManagerRole = createdRoles['🛡 Staff Manager'];
                    const staffRoles = [modRole.id, staffManagerRole.id, createdRoles['🛠 Lead Developer'].id, createdRoles['👑 HQ Owner'].id];

                    // 2. CATEGORY: WELCOME & INFO
                    const catWelcome = await guild.channels.create({ name: '📌 WELCOME & INFO', type: ChannelType.GuildCategory });
                    await guild.channels.create({ name: '📍┃welcome', parent: catWelcome.id });
                    await guild.channels.create({ name: '📜┃rules', parent: catWelcome.id });
                    await guild.channels.create({
                        name: '📢┃announcements',
                        parent: catWelcome.id,
                        permissionOverwrites: [
                            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
                            { id: modRole.id, allow: [PermissionsBitField.Flags.SendMessages] }
                        ]
                    });
                    await guild.channels.create({ name: '🔗┃links', parent: catWelcome.id });

                    // 3. CATEGORY: COMMUNITY
                    const catCommunity = await guild.channels.create({ name: '🌐 COMMUNITY', type: ChannelType.GuildCategory });
                    await guild.channels.create({ name: '💬┃general', parent: catCommunity.id });
                    await guild.channels.create({ name: '📸┃media', parent: catCommunity.id });
                    await guild.channels.create({ name: '🤖┃commands', parent: catCommunity.id });

                    // 4. CATEGORY: ZEDOX BOT SUPPORT
                    const catSupport = await guild.channels.create({ name: '🤖 ZEDOX BOT SUPPORT', type: ChannelType.GuildCategory });
                    await guild.channels.create({ name: '🎫┃support-tickets', parent: catSupport.id });
                    await guild.channels.create({ name: '💡┃suggestions', parent: catSupport.id });
                    await guild.channels.create({ name: '🐛┃bug-reports', parent: catSupport.id });
                    await guild.channels.create({ name: '📚┃bot-guide', parent: catSupport.id });

                    // 5. CATEGORY: STAFF AREA (PRIVATE)
                    const catStaff = await guild.channels.create({
                        name: '🔐 STAFF AREA',
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            ...staffRoles.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel] }))
                        ]
                    });
                    await guild.channels.create({ name: '🔐┃staff-chat', parent: catStaff.id });
                    await guild.channels.create({ name: '🛠┃staff-commands', parent: catStaff.id });
                    const logChannel = await guild.channels.create({
                        name: '📜┃mod-logs',
                        parent: catStaff.id,
                        permissionOverwrites: [
                            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            ...staffRoles.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel] }))
                        ]
                    });
                    db_manager.updateConfig(guild.id, 'mod_log_channel_id', logChannel.id);

                    // 6. CATEGORY: VOICE CHANNELS
                    const catVoice = await guild.channels.create({ name: '🔊 VOICE CHANNELS', type: ChannelType.GuildCategory });
                    await guild.channels.create({ name: '🔊┃Lounge', type: ChannelType.GuildVoice, parent: catVoice.id });
                    await guild.channels.create({ name: '🎮┃Gaming', type: ChannelType.GuildVoice, parent: catVoice.id });

                    // 7. CATEGORY: TICKETS
                    const catTickets = await guild.channels.create({ name: '🎫 TICKETS', type: ChannelType.GuildCategory });
                    db_manager.updateConfig(guild.id, 'ticket_category_id', catTickets.id);
                    db_manager.updateConfig(guild.id, 'staff_role_id', staffManagerRole.id);

                    const ticketSetupChannel = await guild.channels.create({
                        name: '🎫┃create-a-ticket',
                        parent: catTickets.id,
                        permissionOverwrites: [
                            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }
                        ]
                    });

                    const ticketEmbed = new EmbedBuilder()
                        .setTitle('🎫 Create a Support Ticket')
                        .setDescription('Need help? Click the button below to open a private support ticket.\n\nOur staff manager and moderators will assist you as soon as possible.')
                        .setColor('#5865F2')
                        .setTimestamp();

                    const ticketButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_create')
                            .setLabel('Create Ticket')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎫')
                    );

                    await (ticketSetupChannel as any).send({ embeds: [ticketEmbed], components: [ticketButton] });

                    // Apply Muted role overrides to all channels
                    guild.channels.cache.forEach(async (channel: any) => {
                        try {
                            if (channel.permissionOverwrites) {
                                await (channel as any).permissionOverwrites.create(mutedRole, {
                                    SendMessages: false,
                                    AddReactions: false,
                                    Speak: false,
                                    CreatePublicThreads: false,
                                    CreatePrivateThreads: false,
                                    SendMessagesInThreads: false,
                                });
                            }
                        } catch (e) { }
                    });

                    await setupMsg.edit('✅ **Zedox HQ Setup Complete!** 🚀\nYour server has been professionally configured with roles, categories, private staff areas, and a ticket system.');
                    await sendModLog(guild, 'System Setup', `Server setup completed by ${message.author.tag}`, '#00FF00');
                } catch (err) {
                    console.error(err);
                    await setupMsg.edit('❌ **Setup failed.** Ensure I have Administrator permissions and my role is at the top.');
                }
                break;

            case 'ticket-setup':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Admin required.');
                const tEmbed = new EmbedBuilder()
                    .setTitle('🎫 Create a Support Ticket')
                    .setDescription('Click the button below to open a support ticket.')
                    .setColor('#5865F2');

                const tRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create')
                        .setLabel('Create Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫')
                );

                await (message.channel as any).send({ embeds: [tEmbed], components: [tRow] });
                break;

            case 'help':
                // Help should probably always work or check a flag
                const helpEmbed = new EmbedBuilder()
                    .setTitle('Zedox Bot Commands')
                    .setColor('#5865F2')
                    .setDescription(`Current prefix is \`${prefix}\` (Case-insensitive)`)
                    .addFields(
                        { name: '🛡️ Moderation', value: '`kick`, `ban`, `clear`, `mute`, `unmute`, `deafen`, `undeafen`, `lockdown`, `unlock`, `textmute`, `slowmode`, `nuke`' },
                        { name: '🎶 Music', value: '`play`, `skip`, `stop`, `queue`' },
                        { name: '🛠️ Utility & Info', value: '`userinfo`, `serverinfo`, `invite`, `prefix`, `debug`, `ping`, `uptime`, `role`' },
                        { name: '✨ Other', value: '`help`' }
                    )
                    .setFooter({ text: 'Tip: You can use short forms like ,si ,ui ,p ,s ,q ,purge etc.' });
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

            case 'p':
            case 'play':
                // Music is always enabled
                const musicQuery = args.join(' ');
                if (!musicQuery) return message.reply('❌ Please provide a song name or link.');
                if (!message.member?.voice?.channel) return message.reply('❌ You must be in a voice channel!');

                try {
                    await distube.play(message.member.voice.channel, musicQuery, {
                        member: message.member,
                        textChannel: message.channel as any,
                        message
                    });
                } catch (e) {
                    message.reply('❌ Error playing song.');
                    console.error(e);
                }
                break;

            case 'skip':
            case 's':
                try {
                    const queue = distube.getQueue(message);
                    if (!queue) return message.reply('❌ Nothing is playing to skip!');
                    await queue.skip();
                    message.reply('⏩ Skipped!');
                } catch (e) {
                    message.reply('❌ Error skipping song.');
                }
                break;

            case 'stop':
            case 'leave':
                try {
                    const queue = distube.getQueue(message);
                    if (!queue) {
                        distube.voices.leave(message.guild);
                        return message.reply('👋 Left the voice channel.');
                    }
                    await queue.stop();
                    distube.voices.leave(message.guild);
                    message.reply('⏹️ Stopped music and left.');
                } catch (e) {
                    message.reply('❌ Error stopping.');
                }
                break;

            case 'q':
            case 'queue':
                const queue = distube.getQueue(message);
                if (!queue) return message.reply('❌ Queue is empty.');
                const qDisplay = queue.songs
                    .map((song, i) => `${i === 0 ? 'Playing:' : `${i}.`} ${song.name} - \`${song.formattedDuration}\``)
                    .join('\n')
                    .slice(0, 4000); // Discord limit

                const qEmbed = new EmbedBuilder()
                    .setTitle('🎶 Server Queue')
                    .setDescription(qDisplay || 'Empty')
                    .setColor('#5865F2');
                await (message.channel as any).send({ embeds: [qEmbed] });
                break;

            case 'testwelcome':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Admin required.');
                const welcomeConfig = db_manager.getWelcomeConfig(message.guild.id);
                if (!welcomeConfig.enabled) return message.reply('❌ Welcome system is currently disabled in the dashboard.');
                if (!welcomeConfig.channel_id) return message.reply('❌ No welcome channel configured in the dashboard.');

                // Manually trigger the guildMemberAdd logic for the command sender
                client.emit('guildMemberAdd', message.member as any);
                await message.reply('✨ Simulating member join event...');
                break;

            case 'setlogs':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Admin required.');
                try {
                    const logChannel = await message.guild.channels.create({
                        name: 'mod-logs',
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: message.guild.roles.everyone,
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                        ],
                    });
                    db_manager.updateConfig(message.guild.id, 'mod_log_channel_id', logChannel.id);
                    await message.reply(`✅ Moderation logs channel created: ${logChannel}`);
                    await sendModLog(message.guild, 'System Setup', `Log channel configured by ${message.author.tag}`, '#00FF00');
                } catch (error) {
                    await message.reply('❌ Failed to create channel. Check my permissions.');
                }
                break;

            case 'createrole':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Admin required.');
                try {
                    const mutedRole = await message.guild.roles.create({
                        name: 'Muted',
                        color: '#818386',
                        reason: 'Muted role for automated moderation',
                    });

                    // Set overrides for all categories/channels
                    message.guild.channels.cache.forEach(async (channel: any) => {
                        try {
                            if (channel.permissionOverwrites) {
                                await (channel as any).permissionOverwrites.create(mutedRole, {
                                    SendMessages: false,
                                    AddReactions: false,
                                    Speak: false,
                                    CreatePublicThreads: false,
                                    CreatePrivateThreads: false,
                                    SendMessagesInThreads: false,
                                });
                            }
                        } catch (e) { }
                    });

                    db_manager.updateConfig(message.guild.id, 'muted_role_id', mutedRole.id);
                    await message.reply(`✅ Created and configured "Muted" role: ${mutedRole}`);
                    await sendModLog(message.guild, 'System Setup', `Muted role created and configured by ${message.author.tag}`, '#00FF00');
                } catch (error) {
                    await message.reply('❌ Failed to create role. Check my permissions.');
                }
                break;

            case 'role':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply('❌ Insufficient permissions.');
                const subCommand = args[0]?.toLowerCase();
                const roleMember = message.mentions.members?.first();
                const roleToProcess = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);

                if (!subCommand || !['add', 'remove'].includes(subCommand) || !roleMember || !roleToProcess) {
                    return message.reply(`❌ Usage: \`${prefix}role add/remove @member @role\``);
                }

                if (message.member.roles.highest.position <= roleToProcess.position && message.author.id !== message.guild.ownerId) {
                    return message.reply('❌ You cannot manage a role higher than or equal to your highest role.');
                }

                try {
                    if (subCommand === 'add') {
                        await roleMember.roles.add(roleToProcess);
                        await message.reply(`✅ Added role **${roleToProcess.name}** to ${roleMember.user.tag}.`);
                    } else {
                        await roleMember.roles.remove(roleToProcess);
                        await message.reply(`✅ Removed role **${roleToProcess.name}** from ${roleMember.user.tag}.`);
                    }
                } catch (err) {
                    console.error(err);
                    await message.reply('❌ Failed to update roles. Make sure my role is above the target role.');
                }
                break;

            case 'nuke':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply('❌ Insufficient permissions.');
                if (message.channel.type === ChannelType.DM) return;

                const originalChannel = message.channel as any;
                const position = originalChannel.position;

                try {
                    const newChannel = await originalChannel.clone({
                        reason: `Nuked by ${message.author.tag}`
                    });
                    await newChannel.setPosition(position);
                    await originalChannel.delete();

                    const nukeEmbed = new EmbedBuilder()
                        .setTitle('💥 Channel Nuked!')
                        .setImage('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2FiamZxeXp6Ym85eWllbXp4eW54eW54eW54eW54eW54eW54eW54JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/HhTXt43pk1I1W/giphy.gif')
                        .setColor('#FF0000')
                        .setTimestamp();

                    await newChannel.send({ embeds: [nukeEmbed] });
                } catch (err) {
                    console.error(err);
                    await message.reply('❌ Failed to nuke channel.');
                }
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

export const startBot = () => {
    client.login(process.env.DISCORD_BOT_TOKEN);
};

// Check if this file is being run directly
if (process.argv[1].endsWith('bot.ts') || process.argv[1].endsWith('bot.js')) {
    startBot();
}
