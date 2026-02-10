import {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    getVoiceConnection,
    AudioPlayer,
    VoiceConnection
} from '@discordjs/voice';
import play from 'play-dl';
import { Message } from 'discord.js';

interface Song {
    title: string;
    url: string;
    duration: string;
    thumbnail: string;
}

class GuildQueue {
    public player: AudioPlayer;
    public connection: VoiceConnection | null = null;
    public songs: Song[] = [];
    public playing = false;

    constructor() {
        this.player = createAudioPlayer();
    }
}

export class MusicManager {
    private static instance: MusicManager;
    private queues = new Map<string, GuildQueue>();

    private constructor() {
        // Essential for SoundCloud and some Spotify functions
        play.getFreeClientID().then((clientID) => {
            play.setToken({
                soundcloud: {
                    client_id: clientID
                }
            });
        }).catch(err => console.error('Failed to get SoundCloud client ID:', err));
    }

    public static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
    }

    private getOrCreateQueue(guildId: string): GuildQueue {
        let queue = this.queues.get(guildId);
        if (!queue) {
            queue = new GuildQueue();
            this.queues.set(guildId, queue);
        }
        return queue;
    }

    public async play(message: Message, query: string) {
        const guildId = message.guildId;
        if (!guildId) return;

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ You need to be in a voice channel to play music!');
        }

        const queue = this.getOrCreateQueue(guildId);

        try {
            console.log(`[Music] Request: "${query}" in guild ${guildId}`);

            let songInfo: Song;

            // Comprehensive validation using play-dl (safe check)
            let validation: any = false;
            try {
                validation = await play.validate(query);
            } catch (e) {
                validation = 'search';
            }

            if (validation && validation !== 'search') {
                if (validation.includes('yt')) {
                    try {
                        const info = await play.video_info(query);
                        songInfo = {
                            title: info.video_details.title || 'YouTube Track',
                            url: info.video_details.url,
                            duration: info.video_details.durationRaw,
                            thumbnail: info.video_details.thumbnails[0].url
                        };
                    } catch (err: any) {
                        // Fallback to search if link fails (common for bot detection errors)
                        console.warn(`[Music] Link info failed, falling back to search: ${err.message}`);
                        const searchResult = await play.search(query, { limit: 1, source: { youtube: 'video' } });
                        if (searchResult.length === 0) throw new Error('Could not play this link. Try searching for the song name!');
                        songInfo = {
                            title: searchResult[0].title || 'Unknown',
                            url: searchResult[0].url,
                            duration: searchResult[0].durationRaw,
                            thumbnail: searchResult[0].thumbnails[0].url
                        };
                    }
                } else if (validation.includes('sp')) {
                    const spData = await play.spotify(query) as any;
                    const spTitle = spData.name || 'Spotify Track';
                    const spArtist = spData.artists ? spData.artists[0].name : '';
                    const searchResult = await play.search(`${spTitle} ${spArtist}`, { limit: 1, source: { youtube: 'video' } });
                    if (searchResult.length === 0) return message.reply('❌ Could not find this Spotify track on streaming platforms.');
                    songInfo = {
                        title: spTitle,
                        url: searchResult[0].url,
                        duration: searchResult[0].durationRaw,
                        thumbnail: (spData.thumbnail?.url) || (searchResult[0].thumbnails[0].url)
                    };
                } else if (validation.includes('so')) {
                    const soData = await play.soundcloud(query) as any;
                    songInfo = {
                        title: soData.name,
                        url: soData.url,
                        duration: soData.durationRaw || '0:00',
                        thumbnail: soData.thumbnail || ''
                    };
                } else {
                    return message.reply(`❌ Link platform \`${validation}\` is not supported yet.`);
                }
            } else {
                // Default search (YouTube)
                const searchResult = await play.search(query, { limit: 1, source: { youtube: 'video' } });
                if (searchResult.length === 0) return message.reply('❌ No results found on YouTube.');
                songInfo = {
                    title: searchResult[0].title || 'Unknown',
                    url: searchResult[0].url,
                    duration: searchResult[0].durationRaw,
                    thumbnail: searchResult[0].thumbnails[0].url
                };
            }

            queue.songs.push(songInfo);

            if (!queue.connection) {
                console.log(`[Music] Connecting to: ${voiceChannel.name} (${voiceChannel.id})`);
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
                });

                // Crucial: Wait for the connection to be ready before playing
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Voice connection timeout')), 10000);
                    queue.connection?.once(VoiceConnectionStatus.Ready, () => {
                        clearTimeout(timeout);
                        console.log(`[Music] Voice Connection READY in ${guildId}`);
                        resolve();
                    });
                });

                queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
                    console.log(`[Music] Voice Connection DISCONNECTED in ${guildId}`);
                    queue.connection?.destroy();
                    queue.connection = null;
                    this.queues.delete(guildId);
                });

                queue.connection.subscribe(queue.player);
            }

            if (queue.songs.length === 1 && !queue.playing) {
                await this.playNext(guildId);
                (message.channel as any).send(`🎶 Now playing: **${songInfo.title}** (Requested by: **${message.author.username}**)`);
            } else {
                (message.channel as any).send(`✅ Added to queue: **${songInfo.title}**`);
            }

        } catch (error: any) {
            console.error('[Music] Global Play Error:', error);
            const errorMessage = error.message || 'Unknown error';
            message.reply(`❌ **Playback Error:** \`${errorMessage}\` \n*Try searching by song name (e.g. ,play ${query.slice(0, 10)})*`);
        }
    }

    private async playNext(guildId: string) {
        const queue = this.queues.get(guildId);
        if (!queue || queue.songs.length === 0) {
            queue?.connection?.destroy();
            this.queues.delete(guildId);
            return;
        }

        const song = queue.songs[0];
        try {
            console.log(`[Music] Attempting to stream: ${song.title} (${song.url})`);

            // Adding discordPlayerCompatibility and choosing highest audio quality
            const stream = await play.stream(song.url, {
                discordPlayerCompatibility: true,
                quality: 2 // Highest audio quality
            });

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            queue.player.play(resource);
            queue.playing = true;

            queue.player.once(AudioPlayerStatus.Idle, () => {
                if (queue.playing) {
                    console.log(`[Music] Song finished: ${song.title}`);
                    queue.playing = false;
                    queue.songs.shift();
                    this.playNext(guildId);
                }
            });

            queue.player.on('error', error => {
                console.error(`[Music] Player error for "${song.title}": ${error.message}`);
                queue.playing = false;
                queue.songs.shift();
                this.playNext(guildId);
            });

        } catch (error: any) {
            console.error(`[Music] Streaming failed for "${song.title}": ${error.message}`);

            // Auto-fallback: If the link is blocked, try searching the title instead
            if (error.message.includes('Sign in') || error.message.includes('403')) {
                try {
                    console.log(`[Music] Link blocked. Trying search fallback for: ${song.title}`);
                    const searchRes = await play.search(song.title, { limit: 1, source: { youtube: 'video' } });
                    if (searchRes.length > 0 && searchRes[0].url !== song.url) {
                        song.url = searchRes[0].url; // Update to the non-blocked version
                        console.log(`[Music] Fallback successful. Retrying with new URL.`);
                        return this.playNext(guildId);
                    }
                } catch (fallbackErr) {
                    console.error(`[Music] Fallback failed: ${fallbackErr}`);
                }
            }

            queue.songs.shift();
            this.playNext(guildId);
        }
    }

    public skip(guildId: string) {
        const queue = this.queues.get(guildId);
        if (!queue) return '❌ Nothing is playing.';
        queue.player.stop();
        return '⏩ Skipped to the next track.';
    }

    public stop(guildId: string) {
        const queue = this.queues.get(guildId);
        if (!queue) return '❌ Nothing is playing.';
        queue.songs = [];
        queue.player.stop();
        queue.connection?.destroy();
        this.queues.delete(guildId);
        return '⏹️ Stopped and cleared the queue.';
    }

    public getQueue(guildId: string) {
        const queue = this.queues.get(guildId);
        if (!queue || queue.songs.length === 0) return '❌ The queue is empty.';
        return queue.songs.map((s, i) => `${i + 1}. **${s.title}** (${s.duration})`).join('\n');
    }
}

export const music_manager = MusicManager.getInstance();
