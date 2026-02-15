import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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
  automod_config: {
    enabled: boolean;
    banned_words: string[];
    warn_on_violation: boolean;
    mute_on_violation: boolean;
    warnings_before_mute: number;
    warning_expiry_hours: number;
    mute_duration_minutes: number;
    delete_messages: boolean;
  };
  welcome_config: {
    enabled: boolean;
    channel_id: string | null;
    embed: {
      title: string;
      description: string;
      color: string;
      thumbnail: string | null;
      thumbnail_url: string | null;
      image: string | null;
      footer: string;
    };
  };
  command_logs: any[];
  mutes: any[];
  violations: any[];
  warnings: any[];
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
  automod_config: {
    enabled: true,
    banned_words: ['fuck', 'shit', 'bitch', 'ass', 'damn', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'faggot', 'retard', 'slut', 'whore', 'bastard'],
    warn_on_violation: true,
    mute_on_violation: false,
    warnings_before_mute: 3,
    warning_expiry_hours: 1,
    mute_duration_minutes: 10,
    delete_messages: true
  },
  welcome_config: {
    enabled: false,
    channel_id: null,
    embed: {
      title: 'Welcome to {server}!',
      description: 'Hey {mention}, welcome to **{server}**! We\'re glad to have you here. 🎉',
      color: '#5865F2',
      thumbnail: 'user_avatar',
      thumbnail_url: null,
      image: null,
      footer: 'Member #{memberCount}'
    }
  },
  command_logs: [],
  mutes: [],
  violations: [],
  warnings: []
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
  },

  // Auto-Mod Methods
  getAutoModConfig: () => readDB().automod_config,
  updateAutoModConfig: (updates: Partial<DBData['automod_config']>) => {
    const data = readDB();
    data.automod_config = { ...data.automod_config, ...updates };
    writeDB(data);
  },

  // Welcome System Methods
  getWelcomeConfig: () => readDB().welcome_config,
  updateWelcomeConfig: (updates: Partial<DBData['welcome_config']>) => {
    const data = readDB();
    data.welcome_config = { ...data.welcome_config, ...updates };
    writeDB(data);
  },

  // Violation Tracking
  addViolation: (userId: string, guildId: string, reason: string, content: string) => {
    const data = readDB();
    data.violations.push({
      id: uuidv4(),
      user_id: userId,
      guild_id: guildId,
      reason,
      content,
      timestamp: new Date().toISOString()
    });
    // Keep only last 1000 violations
    if (data.violations.length > 1000) {
      data.violations = data.violations.slice(-1000);
    }
    writeDB(data);
  },
  getViolations: (limit = 100) => {
    const data = readDB();
    return data.violations.slice(-limit).reverse();
  },

  // Warning System
  addWarning: (userId: string, guildId: string, reason: string) => {
    const data = readDB();
    data.warnings.push({
      id: uuidv4(),
      user_id: userId,
      guild_id: guildId,
      reason,
      timestamp: new Date().toISOString()
    });
    writeDB(data);
  },
  getUserWarnings: (userId: string, hoursBack: number) => {
    const data = readDB();
    const cutoff = new Date(Date.now() - hoursBack * 3600000);
    return data.warnings.filter(w =>
      w.user_id === userId && new Date(w.timestamp) > cutoff
    );
  },
  clearOldWarnings: (hoursBack: number) => {
    const data = readDB();
    const cutoff = new Date(Date.now() - hoursBack * 3600000);
    data.warnings = data.warnings.filter(w => new Date(w.timestamp) > cutoff);
    writeDB(data);
  }
};
