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
        // play-dl authorization (optional but recommended for Spotify)
        // play.getFreeClientID().then(id => {
        //     play.setToken({ spotify: { client_id: id, ... } });
        // });
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
            (message.channel as any).send(`🔍 Searching for \`${query}\`...`);

            let songInfo: Song;

            // Multi-platform handling with play-dl
            if (play.sp_validate(query) === 'track') {
                const spData = await play.spotify(query) as any;
                const searchResult = await play.search(`${spData.name} ${spData.artists[0].name}`, { limit: 1 });
                if (searchResult.length === 0) return message.reply('❌ Could not find this Spotify track on streaming platforms.');
                songInfo = {
                    title: spData.name,
                    url: searchResult[0].url,
                    duration: searchResult[0].durationRaw,
                    thumbnail: spData.thumbnail?.url || ''
                };
            } else if (play.so_validate(query)) {
                const soData = await play.soundcloud(query) as any;
                songInfo = {
                    title: soData.name,
                    url: soData.url,
                    duration: soData.durationRaw || '0:00',
                    thumbnail: soData.thumbnail || ''
                };
            } else {
                const searchResult = await play.search(query, { limit: 1 });
                if (searchResult.length === 0) return message.reply('❌ No results found.');
                songInfo = {
                    title: searchResult[0].title || 'Unknown',
                    url: searchResult[0].url,
                    duration: searchResult[0].durationRaw,
                    thumbnail: searchResult[0].thumbnails[0].url
                };
            }

            queue.songs.push(songInfo);

            if (!queue.connection) {
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
                });

                queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
                    this.queues.delete(guildId);
                });

                queue.connection.subscribe(queue.player);
            }

            if (queue.songs.length === 1 && !queue.playing) {
                this.playNext(guildId);
                (message.channel as any).send(`🎶 Now playing: **${songInfo.title}**`);
            } else {
                (message.channel as any).send(`✅ Added to queue: **${songInfo.title}**`);
            }

        } catch (error) {
            console.error(error);
            message.reply('❌ An error occurred while trying to play music.');
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
            const stream = await play.stream(song.url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type
            });

            queue.player.play(resource);
            queue.playing = true;

            queue.player.once(AudioPlayerStatus.Idle, () => {
                queue.playing = false;
                queue.songs.shift();
                this.playNext(guildId);
            });
        } catch (error) {
            console.error(error);
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
