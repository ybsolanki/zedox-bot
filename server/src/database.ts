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

interface GuildConfig {
  config: {
    prefix: string;
    error_logging: boolean;
    dm_permissions: boolean;
    status_message: string;
    mod_log_channel_id: string | null;
    muted_role_id: string | null;
    ticket_category_id: string | null;
    staff_role_id: string | null;
    ticket_count: number;
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

interface DBData {
  guilds: { [guildId: string]: GuildConfig };
  users: { [userId: string]: { accessToken: string; refreshToken: string; profile: any } };
}

const defaultGuildData: GuildConfig = {
  config: {
    prefix: ',',
    error_logging: true,
    dm_permissions: true,
    status_message: 'Watching over the server',
    mod_log_channel_id: null,
    muted_role_id: null,
    ticket_category_id: null,
    staff_role_id: null,
    ticket_count: 0,
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

const defaultData: DBData = {
  guilds: {},
  users: {}
};

function readDB(): DBData {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  // Migration or initialization
  if (!data.guilds) return { guilds: {}, users: {} };
  return data;
}

function writeDB(data: DBData) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getGuildData(data: DBData, guildId: string): GuildConfig {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = JSON.parse(JSON.stringify(defaultGuildData));
  }
  return data.guilds[guildId];
}

export const db_manager = {
  getConfig: (guildId: string) => getGuildData(readDB(), guildId).config,
  updateConfig: (guildId: string, key: string, value: any) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    if (key.startsWith('features.')) {
      const featureKey = key.split('.')[1];
      (guildData.config.features as any)[featureKey] = value;
    } else {
      (guildData.config as any)[key] = value;
    }
    writeDB(data);
  },
  logCommand: (id: string, command: string, user: string, guildId: string, success: boolean) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.command_logs.push({ id, command, user_tag: user, guild_id: guildId, success, timestamp: new Date().toISOString() });
    writeDB(data);
  },
  addMute: (userId: string, guildId: string, expiresAt: string) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.mutes = guildData.mutes.filter(m => m.user_id !== userId);
    guildData.mutes.push({ user_id: userId, guild_id: guildId, expires_at: expiresAt });
    writeDB(data);
  },
  getExpiredMutes: (guildId: string) => {
    const now = new Date();
    return getGuildData(readDB(), guildId).mutes.filter(m => new Date(m.expires_at) <= now);
  },
  getAllExpiredMutes: () => {
    const data = readDB();
    const now = new Date();
    let allExpired: any[] = [];
    for (const guildId in data.guilds) {
      const expired = data.guilds[guildId].mutes.filter(m => new Date(m.expires_at) <= now);
      allExpired = allExpired.concat(expired);
    }
    return allExpired;
  },
  removeMute: (userId: string, guildId: string) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.mutes = guildData.mutes.filter(m => m.user_id !== userId);
    writeDB(data);
  },
  getLogs: (guildId: string, limit = 10) => {
    const guildData = getGuildData(readDB(), guildId);
    return guildData.command_logs.slice(-limit).reverse();
  },

  // Auto-Mod Methods
  getAutoModConfig: (guildId: string) => getGuildData(readDB(), guildId).automod_config,
  updateAutoModConfig: (guildId: string, updates: Partial<GuildConfig['automod_config']>) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.automod_config = { ...guildData.automod_config, ...updates };
    writeDB(data);
  },

  // Welcome System Methods
  getWelcomeConfig: (guildId: string) => getGuildData(readDB(), guildId).welcome_config,
  updateWelcomeConfig: (guildId: string, updates: Partial<GuildConfig['welcome_config']>) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.welcome_config = { ...guildData.welcome_config, ...updates };
    writeDB(data);
  },

  // Violation Tracking
  addViolation: (userId: string, guildId: string, reason: string, content: string) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.violations.push({
      id: uuidv4(),
      user_id: userId,
      guild_id: guildId,
      reason,
      content,
      timestamp: new Date().toISOString()
    });
    if (guildData.violations.length > 1000) {
      guildData.violations = guildData.violations.slice(-1000);
    }
    writeDB(data);
  },
  getViolations: (guildId: string, limit = 100) => {
    const guildData = getGuildData(readDB(), guildId);
    return guildData.violations.slice(-limit).reverse();
  },

  // Warning System
  addWarning: (userId: string, guildId: string, reason: string) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    guildData.warnings.push({
      id: uuidv4(),
      user_id: userId,
      guild_id: guildId,
      reason,
      timestamp: new Date().toISOString()
    });
    writeDB(data);
  },
  getUserWarnings: (userId: string, guildId: string, hoursBack: number) => {
    const guildData = getGuildData(readDB(), guildId);
    const cutoff = new Date(Date.now() - hoursBack * 3600000);
    return guildData.warnings.filter(w =>
      w.user_id === userId && new Date(w.timestamp) > cutoff
    );
  },
  clearOldWarnings: (guildId: string, hoursBack: number) => {
    const data = readDB();
    const guildData = getGuildData(data, guildId);
    const cutoff = new Date(Date.now() - hoursBack * 3600000);
    guildData.warnings = guildData.warnings.filter(w => new Date(w.timestamp) > cutoff);
    writeDB(data);
  },

  // User Data for OAuth2
  upsertUser: (userId: string, accessToken: string, refreshToken: string, profile: any) => {
    const data = readDB();
    data.users[userId] = { accessToken, refreshToken, profile };
    writeDB(data);
  },
  getUser: (userId: string) => readDB().users[userId]
};
