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
    leaveOnStop: false,
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

            case 'setup':
                if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ Administrator role is required to run setup.');
                const setupMsg = await message.reply('⏳ **Starting professional server setup...** This may take a minute.');

                try {
                    const guild = message.guild;
                    const everyone = guild.roles.everyone;

                    // 1. CREATE ROLES (Top to Bottom)
                    const roleData = [
                        { name: '🔺 Management', color: '#880808', hoist: true },
                        { name: '👑 Owner', color: '#FFD700', hoist: true },
                        { name: '🛡 Admin', color: '#FF0000', hoist: true },
                        { name: '📋 Moderator', color: '#00FF00', hoist: true },
                        { name: '👨‍🏫 Academic', color: '#FF8C00', hoist: true },
                        { name: '🎓 Teacher', color: '#FFA500', hoist: true },
                        { name: '🧑‍🏫 Doubt Support', color: '#FFFF00', hoist: true },
                        // Student Roles (Blue Family)
                        { name: '9th', color: '#ADD8E6' },
                        { name: '10th', color: '#87CEEB' },
                        { name: '11th-PCM', color: '#00BFFF' },
                        { name: '11th-PCB', color: '#1E90FF' },
                        { name: '12th-PCM', color: '#6495ED' },
                        { name: '12th-PCB', color: '#4169E1' },
                        { name: '12th-PCM-Dropper', color: '#0000FF' },
                        { name: '12th-PCB-Dropper', color: '#00008B' }
                    ];

                    const createdRoles: any = {};
                    for (const rd of roleData) {
                        createdRoles[rd.name] = await guild.roles.create({
                            name: rd.name,
                            color: rd.color as any,
                            hoist: rd.hoist || false,
                            reason: 'Server Setup'
                        });
                    }

                    const modRole = createdRoles['📋 Moderator'];
                    const teacherRole = createdRoles['🎓 Teacher'];

                    // 2. CATEGORY: WELCOME & INFO
                    const catWelcome = await guild.channels.create({ name: '📌 WELCOME & INFO', type: ChannelType.GuildCategory });
                    await guild.channels.create({ name: '📍┃welcome', parent: catWelcome.id });
                    await guild.channels.create({ name: '📜┃rules', parent: catWelcome.id });
                    await guild.channels.create({
                        name: '📢┃announcements',
                        parent: catWelcome.id,
                        permissionOverwrites: [
                            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
                            { id: modRole.id, allow: [PermissionsBitField.Flags.SendMessages] },
                            { id: teacherRole.id, allow: [PermissionsBitField.Flags.SendMessages] }
                        ]
                    });
                    const channelSelect = await guild.channels.create({ name: '🎓┃select-your-class', parent: catWelcome.id });
                    await guild.channels.create({ name: '🆘┃help-desk', parent: catWelcome.id });

                    // Send Role Selection Message
                    const studentRoles = roleData.filter(rd => !rd.hoist);
                    const embed = new EmbedBuilder()
                        .setTitle('🎓 Select Your Class')
                        .setDescription('Click the buttons below to assign yourself to your respective class. You can only have one class role at a time.')
                        .setColor('#5865F2')
                        .setFooter({ text: 'Zedox Academic System' });

                    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
                    for (let i = 0; i < studentRoles.length; i += 4) {
                        const row = new ActionRowBuilder<ButtonBuilder>();
                        const slice = studentRoles.slice(i, i + 4);
                        slice.forEach(sr => {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`role_${sr.name}`)
                                    .setLabel(sr.name)
                                    .setStyle(ButtonStyle.Primary)
                            );
                        });
                        rows.push(row);
                    }

                    await (channelSelect as any).send({ embeds: [embed], components: rows });

                    // 3. CATEGORY: COMMON AREA
                    const catCommon = await guild.channels.create({ name: '🌐 COMMON AREA', type: ChannelType.GuildCategory });
                    await guild.channels.create({ name: '💬┃general-chat', parent: catCommon.id });
                    await guild.channels.create({ name: '📚┃study-tips', parent: catCommon.id });
                    await guild.channels.create({ name: '🎯┃motivation', parent: catCommon.id });
                    await guild.channels.create({ name: '🎙┃common-vc', type: ChannelType.GuildVoice, parent: catCommon.id });

                    // Helper to create Class Categories
                    const createClassCategory = async (catName: string, roleName: string, channels: { name: string, type?: any }[]) => {
                        const classRole = createdRoles[roleName];
                        const category = await guild.channels.create({
                            name: catName,
                            type: ChannelType.GuildCategory,
                            permissionOverwrites: [
                                { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                                { id: classRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                                { id: teacherRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                                { id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                            ]
                        });

                        for (const ch of channels) {
                            await guild.channels.create({
                                name: ch.name,
                                type: ch.type || ChannelType.GuildText,
                                parent: category.id
                            });
                        }
                    };

                    // 4. CLASS 9 & 10
                    await createClassCategory('📘 CLASS 9', '9th', [{ name: '💬┃9-chat' }, { name: '❓┃9-doubts' }, { name: '🔊┃9-main-vc', type: ChannelType.GuildVoice }]);
                    await createClassCategory('📗 CLASS 10', '10th', [{ name: '💬┃10-chat' }, { name: '❓┃10-doubts' }, { name: '🔊┃10-main-vc', type: ChannelType.GuildVoice }]);

                    // 5. CLASS 11 PCM/PCB
                    await createClassCategory('📙 CLASS 11 – PCM', '11th-PCM', [
                        { name: '💬┃11-pcm-chat' }, { name: '❓┃11-pcm-doubts' },
                        { name: '🔊┃11-pcm-physics-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃11-pcm-chemistry-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃11-pcm-maths-vc', type: ChannelType.GuildVoice }
                    ]);
                    await createClassCategory('📙 CLASS 11 – PCB', '11th-PCB', [
                        { name: '💬┃11-pcb-chat' }, { name: '❓┃11-pcb-doubts' },
                        { name: '🔊┃11-pcb-biology-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃11-pcb-chemistry-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃11-pcb-physics-vc', type: ChannelType.GuildVoice }
                    ]);

                    // 6. CLASS 12 PCM/PCB
                    await createClassCategory('📕 CLASS 12 – PCM', '12th-PCM', [
                        { name: '💬┃12-pcm-chat' }, { name: '❓┃12-pcm-doubts' },
                        { name: '🔊┃12-pcm-physics-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃12-pcm-chemistry-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃12-pcm-maths-vc', type: ChannelType.GuildVoice }
                    ]);
                    await createClassCategory('📕 CLASS 12 – PCB', '12th-PCB', [
                        { name: '💬┃12-pcb-chat' }, { name: '❓┃12-pcb-doubts' },
                        { name: '🔊┃12-pcb-biology-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃12-pcb-chemistry-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃12-pcb-physics-vc', type: ChannelType.GuildVoice }
                    ]);

                    // 7. DROPPERS
                    await createClassCategory('🔴 12th PCM DROPPER', '12th-PCM-Dropper', [
                        { name: '💬┃pcm-drop-chat' }, { name: '❓┃pcm-drop-doubts' },
                        { name: '🔊┃pcm-drop-physics-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃pcm-drop-chemistry-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃pcm-drop-maths-vc', type: ChannelType.GuildVoice }
                    ]);
                    await createClassCategory('🔴 12th PCB DROPPER', '12th-PCB-Dropper', [
                        { name: '💬┃pcb-drop-chat' }, { name: '❓┃pcb-drop-doubts' },
                        { name: '🔊┃pcb-drop-biology-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃pcb-drop-chemistry-vc', type: ChannelType.GuildVoice },
                        { name: '🔊┃pcb-drop-physics-vc', type: ChannelType.GuildVoice }
                    ]);

                    // 8. CENTRAL DOUBT FORUM
                    const catForum = await guild.channels.create({ name: '📚 CENTRAL DOUBT FORUM', type: ChannelType.GuildCategory });
                    await guild.channels.create({
                        name: '📖┃doubt-forum',
                        type: ChannelType.GuildForum as any,
                        parent: catForum.id,
                        rateLimitPerUser: 15, // 15s slowmode
                        reason: 'Academic doubt forum'
                    });

                    await setupMsg.edit('✅ **Server setup complete!** 🚀\nRoles, categories, and channels have been professionally configured.');
                } catch (err) {
                    console.error(err);
                    await setupMsg.edit('❌ **Setup failed.** Ensure the bot has Administrator permissions and is at the top of the role list.');
                }
                break;

            case 'help':
                // Help should probably always work or check a flag
                const helpEmbed = new EmbedBuilder()
                    .setTitle('Zedox Bot Commands')
                    .setColor('#5865F2')
                    .setDescription(`Current prefix is \`${prefix}\``)
                    .addFields(
                        { name: 'Moderation (11)', value: '`kick`, `ban`, `clear`, `mute`, `unmute`, `deafen`, `undeafen`, `lockdown`, `unlock`, `textmute`, `slowmode`' },
                        { name: 'Music (4)', value: '`play`, `skip`, `stop`, `queue`' },
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
                const q = queue.songs
                    .map((song, i) => `${i === 0 ? 'Playing:' : `${i}.`} ${song.name} - \`${song.formattedDuration}\``)
                    .join('\n')
                    .slice(0, 4000); // Discord limit

                const qEmbed = new EmbedBuilder()
                    .setTitle('🎶 Server Queue')
                    .setDescription(q || 'Empty')
                    .setColor('#5865F2');
                await (message.channel as any).send({ embeds: [qEmbed] });
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
