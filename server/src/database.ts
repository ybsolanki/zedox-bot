import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/db.json');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface DBData {
  config: {
    prefix: string;
    error_logging: boolean;
    dm_permissions: boolean;
    status_message: string;
    features: {
      moderation: boolean;
      automod: boolean;
      economy: boolean;
      music: boolean;
      clear: boolean;
      mute: boolean;
      lockdown: boolean;
      invite: boolean;
      ping: boolean;
      info: boolean;
    };
  };
  command_logs: any[];
  mutes: any[];
}

const defaultData: DBData = {
  config: {
    prefix: ',',
    error_logging: true,
    dm_permissions: true,
    status_message: 'Watching over the server',
    features: {
      moderation: true,
      automod: true,
      economy: false,
      music: false,
      clear: true,
      mute: true,
      lockdown: false,
      invite: true,
      ping: true,
      info: true
    }
  },
  command_logs: [],
  mutes: []
};

function readDB(): DBData {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDB(data: DBData) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export const db_manager = {
  getConfig: () => readDB().config,
  updateConfig: (key: string, value: any) => {
    const data = readDB();
    if (key.startsWith('features.')) {
      const featureKey = key.split('.')[1];
      (data.config.features as any)[featureKey] = value;
    } else {
      (data.config as any)[key] = value;
    }
    writeDB(data);
  },
  logCommand: (id: string, command: string, user: string, guild: string, success: boolean) => {
    const data = readDB();
    data.command_logs.push({ id, command, user_tag: user, guild_id: guild, success, timestamp: new Date().toISOString() });
    writeDB(data);
  },
  addMute: (userId: string, guildId: string, expiresAt: string) => {
    const data = readDB();
    data.mutes = data.mutes.filter(m => m.user_id !== userId);
    data.mutes.push({ user_id: userId, guild_id: guildId, expires_at: expiresAt });
    writeDB(data);
  },
  getExpiredMutes: () => {
    const now = new Date();
    return readDB().mutes.filter(m => new Date(m.expires_at) <= now);
  },
  removeMute: (userId: string) => {
    const data = readDB();
    data.mutes = data.mutes.filter(m => m.user_id !== userId);
    writeDB(data);
  },
  getLogs: (limit = 10) => {
    const data = readDB();
    return data.command_logs.slice(-limit).reverse();
  }
};
