import { Client, ActivityType } from 'discord.js';

export const event = {
    name: 'ready',
    once: true,
    execute(client: Client) {
        console.log(`🚀 Modular Bot logged in as ${client.user?.tag}`);
        client.user?.setActivity('Zedox Dashboard', { type: ActivityType.Playing });
    }
};
