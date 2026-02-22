import { DisTube } from 'distube';
import { YtDlpPlugin } from '@distube/yt-dlp';
import { Client, EmbedBuilder, ActivityType } from 'discord.js';
import ffmpegPath from 'ffmpeg-static';

export class MusicManager {
    public distube: any;

    constructor(client: Client) {
        this.distube = new DisTube(client, {
            emitNewSongOnly: true,
            emitAddSongWhenCreatingQueue: false,
            emitAddListWhenCreatingQueue: false,
            plugins: [new YtDlpPlugin()],
            leaveOnEmpty: true,
            leaveOnFinish: false,
            leaveOnStop: true,
            ffmpeg: {
                path: ffmpegPath || 'ffmpeg'
            }
        });

        this.setupEvents(client);
    }

    private setupEvents(client: Client) {
        this.distube
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

                // Update bot status and nickname
                console.log(`[Music] Now playing: ${song.name}`);
                client.user?.setActivity(song.name, { type: ActivityType.Playing });
                if (queue.textChannel && 'guild' in queue.textChannel) {
                    queue.textChannel.guild.members.me?.setNickname(`🎶 ${song.name}`.slice(0, 32)).catch(() => { });
                }
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
                console.error('[Music Error]', e);
                if (channel) channel.send(`❌ Music Error: ${e.message || e.toString().slice(0, 1900)}`);
            })
            .on('empty', queue => {
                queue.textChannel?.send('Voice channel is empty! Leaving...');
                client.user?.setActivity('Zedox Dashboard');
                if (queue.textChannel && 'guild' in queue.textChannel) {
                    queue.textChannel.guild.members.me?.setNickname(null).catch(() => { });
                }
            })
            .on('finish', queue => {
                queue.textChannel?.send('Queue finished!');
                client.user?.setActivity('Zedox Dashboard');
                if (queue.textChannel && 'guild' in queue.textChannel) {
                    queue.textChannel.guild.members.me?.setNickname(null).catch(() => { });
                }
            })
            .on('debug', message => {
                if (process.env.DEBUG === 'true') console.log(`[DisTube Debug] ${message}`);
            });
    }
}
