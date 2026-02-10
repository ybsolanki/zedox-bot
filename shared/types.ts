export interface BotStats {
    uptime: number;
    guilds: number;
    users: number;
    commandsRun: number;
    status: 'online' | 'offline' | 'error';
}

export interface BotConfig {
    prefix: string;
    errorLogging: boolean;
    dmPermissions: boolean;
    statusMessage: string;
}

export interface CommandLog {
    id: string;
    command: string;
    user: string;
    guild: string;
    timestamp: string;
    success: boolean;
}

export interface ModerationLog {
    id: string;
    action: 'kick' | 'ban' | 'mute' | 'lockdown' | 'clear';
    target: string;
    moderator: string;
    reason: string;
    timestamp: string;
}
