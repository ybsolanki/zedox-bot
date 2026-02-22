import { Message, Collection } from 'discord.js';
import { MusicManager } from '../music/MusicManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Command {
    name: string;
    description: string;
    category: string;
    aliases?: string[];
    execute(message: Message, args: string[], musicManager: MusicManager): Promise<any>;
}

export class CommandHandler {
    public commands: Collection<string, Command> = new Collection();
    public aliases: Collection<string, string> = new Collection();

    constructor() {
        this.loadCommands();
    }

    private async loadCommands() {
        const categoriesPath = path.join(__dirname, '../commands');
        const categories = fs.readdirSync(categoriesPath);

        for (const category of categories) {
            const commandFiles = fs.readdirSync(path.join(categoriesPath, category)).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const { command } = await import(`../commands/${category}/${file}`);
                    if (command) {
                        this.commands.set(command.name, command);
                        if (command.aliases) {
                            command.aliases.forEach((alias: string) => this.aliases.set(alias, command.name));
                        }
                    }
                } catch (error) {
                    console.error(`Error loading command ${file}:`, error);
                }
            }
        }
    }

    public async handleCommand(message: Message, musicManager: MusicManager, prefix: string) {
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const actualCommandName = this.aliases.get(commandName) || commandName;
        const command = this.commands.get(actualCommandName);

        if (command) {
            try {
                await command.execute(message, args, musicManager);
            } catch (error) {
                console.error(error);
                message.reply('❌ There was an error executing that command.');
            }
        }
    }
}
