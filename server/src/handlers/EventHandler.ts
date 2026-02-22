import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class EventHandler {
    constructor(client: Client) {
        this.loadEvents(client);
    }

    private async loadEvents(client: Client) {
        const eventsPath = path.join(__dirname, '../events');
        if (!fs.existsSync(eventsPath)) return;

        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of eventFiles) {
            try {
                const { event } = await import(`../events/${file}`);
                if (event) {
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args, client));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args, client));
                    }
                }
            } catch (error) {
                console.error(`Error loading event ${file}:`, error);
            }
        }
    }
}
