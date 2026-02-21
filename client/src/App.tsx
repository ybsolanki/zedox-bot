import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    ShieldCheck,
    Settings,
    Activity,
    Terminal,
    MessageSquare,
    UserPlus,
    LogOut,
    Moon,
    Zap,
    Hammer,
    Plus,
    X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-surface p-6 rounded-2xl border border-white/5 shadow-xl hover:border-primary/50 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className={cn("p-3 rounded-xl", color)}>
                <Icon size={24} className="text-white" />
            </div>
            <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                <Zap size={14} /> +12%
            </div>
        </div>
        <div className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">{title}</div>
        <div className="text-3xl font-bold text-white leading-none">{value}</div>
    </div>
);

const CommandToggle = ({ name, description, active, onToggle }: any) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-colors">
        <div>
            <div className="text-white font-semibold">{name}</div>
            <div className="text-white/40 text-sm">{description}</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={active}
                onChange={(e) => onToggle(e.target.checked)}
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
    </div>
);

export default function App() {
    const [user, setUser] = useState<any>(null);
    const [guilds, setGuilds] = useState<any[]>([]);
    const [selectedGuild, setSelectedGuild] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ uptime: 0, guilds: 0, users: 0, commandsRun: 0 });
    const [config, setConfig] = useState<any>({ prefix: ',', error_logging: true, status_message: '', features: {} });
    const [automodConfig, setAutomodConfig] = useState<any>({ enabled: false, banned_words: [], warn_on_violation: true, warnings_before_mute: 3, mute_duration_minutes: 10, delete_messages: true, whitelist_roles: [], whitelist_members: [] });
    const [welcomeConfig, setWelcomeConfig] = useState<any>({ enabled: false, channel_id: null, embed: { title: '', description: '', color: '#5865F2', footer: '' } });
    const [violations, setViolations] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [guildRoles, setGuildRoles] = useState<any[]>([]);
    const [guildMembers, setGuildMembers] = useState<any[]>([]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/me');
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                    fetchGuilds();
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Failed to fetch user', err);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchGuilds = async () => {
            try {
                const res = await fetch('/api/guilds');
                if (res.ok) {
                    const guildsData = await res.json();
                    setGuilds(guildsData);
                }
            } catch (err) {
                console.error('Failed to fetch guilds', err);
            }
        };

        fetchUser();
    }, []);

    useEffect(() => {
        if (!selectedGuild) return;

        // Reset states to defaults/empty while fetching new guild data
        setAutomodConfig({ enabled: false, banned_words: [], warn_on_violation: true, warnings_before_mute: 3, mute_duration_minutes: 10, delete_messages: true, whitelist_roles: [], whitelist_members: [] });
        setWelcomeConfig({ enabled: false, channel_id: null, embed: { title: '', description: '', color: '#5865F2', footer: '' } });
        setViolations([]);
        setLogs([]);

        const fetchData = async () => {
            try {
                const guildId = selectedGuild.id;

                const configRes = await fetch(`/api/config/${guildId}`);
                if (configRes.ok) setConfig(await configRes.json());

                const automodRes = await fetch(`/api/automod/${guildId}`);
                if (automodRes.ok) setAutomodConfig(await automodRes.json());

                const welcomeRes = await fetch(`/api/welcome/${guildId}`);
                if (welcomeRes.ok) setWelcomeConfig(await welcomeRes.json());

                const violationsRes = await fetch(`/api/violations/${guildId}`);
                if (violationsRes.ok) setViolations(await violationsRes.json());

                const statsRes = await fetch(`/api/stats/${guildId}`);
                if (statsRes.ok) setStats(await statsRes.json());

                const logsRes = await fetch(`/api/logs/${guildId}`);
                if (logsRes.ok) setLogs(await logsRes.json());
            } catch (err) {
                console.error('Failed to fetch guild data', err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [selectedGuild]);

    useEffect(() => {
        if (activeTab === 'automod' && selectedGuild) {
            fetch(`/api/roles/${selectedGuild.id}`).then(res => res.json()).then(setGuildRoles).catch(console.error);
            fetch(`/api/members/${selectedGuild.id}`).then(res => res.json()).then(setGuildMembers).catch(console.error);
        }
    }, [activeTab, selectedGuild]);

    const handleLogin = () => {
        window.location.href = '/auth/discord';
    };

    const handleLogout = async () => {
        await fetch('/auth/logout');
        window.location.href = '/';
    };

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const formatTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        return `${minutes}m ago`;
    };

    const handleUpdateConfig = async (key: string, value: any) => {
        if (!selectedGuild) return;
        try {
            const res = await fetch(`/api/config/${selectedGuild.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });

            if (res.ok) {
                setConfig((prev: any) => {
                    const newConfig = { ...prev };
                    if (key.startsWith('features.')) {
                        const featureKey = key.split('.')[1];
                        newConfig.features = { ...newConfig.features, [featureKey]: value };
                    } else {
                        newConfig[key] = value;
                    }
                    return newConfig;
                });
            }
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    const handleUpdateAutomod = async (updates: any) => {
        if (!selectedGuild) return;
        try {
            const newConfig = { ...automodConfig, ...updates };
            setAutomodConfig(newConfig);
            await fetch(`/api/automod/${selectedGuild.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (err) {
            console.error('Automod update failed', err);
        }
    };

    const handleUpdateWelcome = async (updates: any) => {
        if (!selectedGuild) return;
        try {
            const newConfig = { ...welcomeConfig, ...updates };
            setWelcomeConfig(newConfig);
            await fetch(`/api/welcome/${selectedGuild.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (err) {
            console.error('Welcome update failed', err);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-background flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background text-text flex">
            {!user ? (
                <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background via-surface to-background">
                    <div className="max-w-md w-full bg-surface p-12 rounded-3xl border border-white/5 shadow-2xl space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mx-auto">
                                <ShieldCheck size={32} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white">Zedox Dashboard</h2>
                            <p className="text-white/40">Login with Discord to manage your servers.</p>
                        </div>
                        <button
                            onClick={handleLogin}
                            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#5865F2]/20 transition-all flex items-center justify-center gap-3 group"
                        >
                            <img src="https://cdn.prod.website-files.com/6257adef93867e3ed1449492/6257adef93867e611844955b_White%20Logo.svg" alt="Discord" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            Login with Discord
                        </button>
                    </div>
                </div>
            ) : !selectedGuild ? (
                <div className="flex-1 p-12 bg-gradient-to-br from-background via-surface to-background overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-12">
                        <header className="text-center space-y-4">
                            <h1 className="text-5xl font-extrabold text-white">Welcome back, <span className="text-primary">{user.username}</span>!</h1>
                            <p className="text-xl text-white/40">Please select a server to get started</p>
                        </header>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {guilds.map((guild) => (
                                <button
                                    key={guild.id}
                                    onClick={() => setSelectedGuild(guild)}
                                    className="bg-surface p-8 rounded-3xl border border-white/5 shadow-xl hover:border-primary/50 hover:bg-white/5 transition-all group text-center space-y-4"
                                >
                                    <div className="relative mx-auto w-24 h-24">
                                        {guild.icon ? (
                                            <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt={guild.name} className="w-24 h-24 rounded-full shadow-2xl group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary group-hover:scale-105 transition-transform">
                                                {guild.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-surface rounded-full flex items-center justify-center text-white">
                                            <ShieldCheck size={14} />
                                        </div>
                                    </div>
                                    <div className="font-bold text-white text-lg truncate px-2">{guild.name}</div>
                                    <div className="text-primary/60 text-xs font-bold uppercase tracking-widest group-hover:text-primary transition-colors">Select Server</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Sidebar */}
                    <aside className="w-72 bg-surface/50 border-r border-white/5 p-8 flex flex-col gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                                {selectedGuild?.icon ? (
                                    <img src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`} alt={selectedGuild.name} />
                                ) : (
                                    <ShieldCheck size={24} className="text-white" />
                                )}
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white uppercase truncate">{selectedGuild?.name}</span>
                        </div>

                        <nav className="flex flex-col gap-2">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    activeTab === 'overview' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/50 hover:bg-white/5"
                                )}
                            >
                                <BarChart3 size={20} /> Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('commands')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    activeTab === 'commands' ? "bg-primary text-white" : "text-white/50 hover:bg-white/5"
                                )}
                            >
                                <Terminal size={20} /> Commands
                            </button>
                            <button
                                onClick={() => setActiveTab('moderation')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    activeTab === 'moderation' ? "bg-primary text-white" : "text-white/50 hover:bg-white/5"
                                )}
                            >
                                <Hammer size={20} /> Moderation
                            </button>
                            <button
                                onClick={() => setActiveTab('automod')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    activeTab === 'automod' ? "bg-primary text-white" : "text-white/50 hover:bg-white/5"
                                )}
                            >
                                <ShieldCheck size={20} /> Auto-Mod
                            </button>
                            <button
                                onClick={() => setActiveTab('welcome')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    activeTab === 'welcome' ? "bg-primary text-white" : "text-white/50 hover:bg-white/5"
                                )}
                            >
                                <UserPlus size={20} /> Welcome msg
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                    activeTab === 'settings' ? "bg-primary text-white" : "text-white/50 hover:bg-white/5"
                                )}
                            >
                                <Settings size={20} /> Settings
                            </button>
                        </nav>

                        <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
                            <button
                                onClick={() => setSelectedGuild(null)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:bg-white/5 transition-all text-sm font-medium border border-white/5"
                            >
                                <Activity size={18} /> Switch Server
                            </button>
                            <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                                    <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} alt="Avatar" />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 font-medium">Logged in as</div>
                                    <div className="text-sm font-bold text-white truncate max-w-[100px]">{user.username}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="ml-auto text-white/40 hover:text-red-400 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 p-12 overflow-y-auto">
                        <header className="flex justify-between items-center mb-12">
                            <div>
                                <h1 className="text-4xl font-extrabold text-white mb-2">
                                    {selectedGuild?.name} <span className="text-primary">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                                </h1>
                                <p className="text-white/40 font-medium">Manage and monitor your Zedox Bot on {selectedGuild?.name}.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-full border border-green-500/20 font-bold text-sm">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    SERVER CONNECTED
                                </div>
                                <button className="p-3 bg-white/5 border border-white/5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all">
                                    <Moon size={20} />
                                </button>
                            </div>
                        </header>

                        {activeTab === 'overview' && (
                            <div className="space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard title="Total Guilds" value={stats.guilds.toLocaleString()} icon={Activity} color="bg-blue-500" />
                                    <StatCard title="Bot Uptime" value={formatUptime(stats.uptime)} icon={MessageSquare} color="bg-purple-500" />
                                    <StatCard title="Commands (Session)" value={stats.commandsRun} icon={ShieldCheck} color="bg-orange-500" />
                                    <StatCard title="Cached Users" value={stats.users.toLocaleString()} icon={UserPlus} color="bg-pink-500" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    <section className="bg-surface p-8 rounded-3xl border border-white/5">
                                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Activity size={22} className="text-primary" /> System Logs
                                        </h2>
                                        <div className="space-y-4">
                                            {logs.length > 0 ? logs.map((log) => (
                                                <div key={log.id} className="flex gap-4 items-start p-4 hover:bg-white/5 rounded-2xl transition-all cursor-default group">
                                                    <div className="bg-white/10 p-2 rounded-lg group-hover:bg-primary/20 transition-all">
                                                        <Terminal size={16} className={cn("transition-all", log.success ? "text-primary" : "text-red-400")} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white/60 italic">{formatTimeAgo(log.timestamp)}</div>
                                                        <div className="text-white font-semibold">User <span className="text-white/40">@{log.user_tag}</span> executed <span className="text-primary">{config.prefix}{log.command}</span></div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-8 text-center text-white/20 font-medium">No logs available yet</div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="bg-surface p-8 rounded-3xl border border-white/5">
                                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Settings size={22} className="text-primary" /> Active Config
                                        </h2>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                                <span className="text-white font-medium">Command Prefix</span>
                                                <code className="bg-primary/20 text-primary px-3 py-1 rounded-lg font-bold">{config.prefix}</code>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                                <span className="text-white font-medium">Error Logging</span>
                                                <span className={cn("font-bold uppercase text-sm tracking-widest", config.error_logging ? "text-green-400" : "text-red-400")}>
                                                    {config.error_logging ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="max-w-2xl bg-surface p-8 rounded-3xl border border-white/5 space-y-8">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-white/40 uppercase tracking-widest">Bot Prefix</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            value={config.prefix}
                                            onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                        />
                                        <button
                                            onClick={() => handleUpdateConfig('prefix', config.prefix)}
                                            className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-lg font-bold text-white">Error Logging</div>
                                            <div className="text-sm text-white/40">Log bot errors to the database and dashboard.</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={config.error_logging}
                                                onChange={(e) => handleUpdateConfig('error_logging', e.target.checked)}
                                            />
                                            <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'commands' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CommandToggle
                                    name="Moderation Pack"
                                    description="Kick, Ban, Mute commands"
                                    active={config.features?.moderation}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.moderation', v)}
                                />
                                <CommandToggle
                                    name="Auto-Mod"
                                    description="Automatic spam protection"
                                    active={config.features?.automod}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.automod', v)}
                                />
                                <CommandToggle
                                    name="Economy System"
                                    description="Enable server coins and shop"
                                    active={config.features?.economy}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.economy', v)}
                                />
                                <CommandToggle
                                    name="Music Player"
                                    description="High quality audio streaming"
                                    active={config.features?.music}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.music', v)}
                                />
                            </div>
                        )}

                        {activeTab === 'automod' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <section className="bg-surface p-8 rounded-3xl border border-white/5 space-y-6">
                                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                            <ShieldCheck size={22} className="text-primary" /> Core Settings
                                        </h2>

                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                            <div>
                                                <div className="text-white font-bold">Enable Filter</div>
                                                <div className="text-sm text-white/40">Enable or disable word filtering.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={automodConfig.enabled}
                                                    onChange={(e) => handleUpdateAutomod({ enabled: e.target.checked })}
                                                />
                                                <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-white/40 uppercase tracking-widest">Banned Words (comma separated)</label>
                                            <textarea
                                                value={(automodConfig?.banned_words || []).join(', ')}
                                                onChange={(e) => handleUpdateAutomod({ banned_words: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono text-sm"
                                                placeholder="badword1, badword2..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-white/5 rounded-2xl">
                                                <div className="text-sm font-bold text-white/40 uppercase mb-2">Warn Limit</div>
                                                <input
                                                    type="number"
                                                    value={automodConfig.warnings_before_mute}
                                                    onChange={(e) => handleUpdateAutomod({ warnings_before_mute: parseInt(e.target.value) })}
                                                    className="w-full bg-transparent text-white font-bold text-xl focus:outline-none"
                                                />
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-2xl">
                                                <div className="text-sm font-bold text-white/40 uppercase mb-2">Mute (Min)</div>
                                                <input
                                                    type="number"
                                                    value={automodConfig.mute_duration_minutes}
                                                    onChange={(e) => handleUpdateAutomod({ mute_duration_minutes: parseInt(e.target.value) })}
                                                    className="w-full bg-transparent text-white font-bold text-xl focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="bg-surface p-8 rounded-3xl border border-white/5">
                                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Activity size={22} className="text-red-400" /> Recent Violations
                                        </h2>
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {violations.length > 0 ? violations.map((v: any) => (
                                                <div key={v.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-red-400 text-xs font-bold uppercase">{v.reason}</span>
                                                        <span className="text-white/20 text-xs">{formatTimeAgo(v.timestamp)}</span>
                                                    </div>
                                                    <div className="text-white font-medium mb-1 truncate">User ID: <span className="text-white/60">{v.user_id}</span></div>
                                                    <div className="text-sm text-white/40 bg-black/20 p-2 rounded-lg italic break-all">"{v.content}"</div>
                                                </div>
                                            )) : (
                                                <div className="p-12 text-center text-white/20 font-bold uppercase tracking-widest">Clean Environment</div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                <section className="bg-surface p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                                <ShieldCheck size={22} className="text-primary" /> Whitelist
                                            </h2>
                                            <p className="text-white/40 text-sm">Selected roles and members are immune from all auto-mod and spam filters.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                        {/* Roles Whitelist */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Whitelisted Roles</h3>
                                            <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-black/20 rounded-2xl border border-white/5">
                                                {automodConfig.whitelist_roles?.length > 0 ? automodConfig.whitelist_roles.map((roleId: string) => {
                                                    const role = guildRoles.find((r: any) => r.id === roleId);
                                                    return (
                                                        <div key={roleId} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20 group animate-in fade-in zoom-in duration-200">
                                                            <span className="text-sm font-bold">{role?.name || 'Loading...'}</span>
                                                            <button
                                                                onClick={() => handleUpdateAutomod({ whitelist_roles: automodConfig.whitelist_roles.filter((id: string) => id !== roleId) })}
                                                                className="hover:text-red-400 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                }) : (
                                                    <span className="text-white/20 text-sm font-medium italic">No roles whitelisted</span>
                                                )}
                                            </div>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                                onChange={(e) => {
                                                    if (e.target.value && !(automodConfig?.whitelist_roles || []).includes(e.target.value)) {
                                                        handleUpdateAutomod({ whitelist_roles: [...(automodConfig?.whitelist_roles || []), e.target.value] });
                                                    }
                                                    e.target.value = "";
                                                }}
                                            >
                                                <option value="" className="bg-surface text-white">Add a role to whitelist...</option>
                                                {(guildRoles || []).filter((r: any) => !(automodConfig?.whitelist_roles || []).includes(r.id)).map((role: any) => (
                                                    <option key={role.id} value={role.id} className="bg-surface text-white">{role.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Members Whitelist */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Whitelisted Members</h3>
                                            <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-black/20 rounded-2xl border border-white/5">
                                                {automodConfig.whitelist_members?.length > 0 ? automodConfig.whitelist_members.map((userId: string) => {
                                                    const member = guildMembers.find((m: any) => m.id === userId);
                                                    return (
                                                        <div key={userId} className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-xl border border-accent/20 group animate-in fade-in zoom-in duration-200">
                                                            <span className="text-sm font-bold">{member?.displayName || 'Loading...'}</span>
                                                            <button
                                                                onClick={() => handleUpdateAutomod({ whitelist_members: automodConfig.whitelist_members.filter((id: string) => id !== userId) })}
                                                                className="hover:text-red-400 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                }) : (
                                                    <span className="text-white/20 text-sm font-medium italic">No members whitelisted</span>
                                                )}
                                            </div>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                                onChange={(e) => {
                                                    if (e.target.value && !(automodConfig?.whitelist_members || []).includes(e.target.value)) {
                                                        handleUpdateAutomod({ whitelist_members: [...(automodConfig?.whitelist_members || []), e.target.value] });
                                                    }
                                                    e.target.value = "";
                                                }}
                                            >
                                                <option value="" className="bg-surface text-white">Add a member to whitelist...</option>
                                                {(guildMembers || []).filter((m: any) => !(automodConfig?.whitelist_members || []).includes(m.id)).map((member: any) => (
                                                    <option key={member.id} value={member.id} className="bg-surface text-white">{member.displayName} (@{member.username})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'welcome' && (
                            <div className="max-w-4xl space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <section className="bg-surface p-8 rounded-3xl border border-white/5 space-y-6">
                                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                            <Zap size={22} className="text-primary" /> Configuration
                                        </h2>

                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                            <div>
                                                <div className="text-white font-bold">Enable Greetings</div>
                                                <div className="text-sm text-white/40">Greet new users with a message.</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={welcomeConfig.enabled}
                                                    onChange={(e) => handleUpdateWelcome({ enabled: e.target.checked })}
                                                />
                                                <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-white/40 uppercase tracking-widest">Welcome Channel ID</label>
                                            <input
                                                type="text"
                                                value={welcomeConfig.channel_id || ''}
                                                onChange={(e) => handleUpdateWelcome({ channel_id: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                                placeholder="1234567890..."
                                            />
                                        </div>

                                        <div className="pt-6 border-t border-white/5 space-y-4">
                                            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">Embed Designer</h3>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-white/30 ml-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={welcomeConfig.embed.title}
                                                    onChange={(e) => handleUpdateWelcome({ embed: { ...welcomeConfig.embed, title: e.target.value } })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-white/30 ml-1">Description</label>
                                                <textarea
                                                    value={welcomeConfig.embed.description}
                                                    onChange={(e) => handleUpdateWelcome({ embed: { ...welcomeConfig.embed, description: e.target.value } })}
                                                    rows={3}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-white/30 ml-1">Color (Hex)</label>
                                                    <input
                                                        type="text"
                                                        value={welcomeConfig.embed.color}
                                                        onChange={(e) => handleUpdateWelcome({ embed: { ...welcomeConfig.embed, color: e.target.value } })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-white/30 ml-1">Footer</label>
                                                    <input
                                                        type="text"
                                                        value={welcomeConfig.embed.footer}
                                                        onChange={(e) => handleUpdateWelcome({ embed: { ...welcomeConfig.embed, footer: e.target.value } })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="bg-[#2B2D31] p-8 rounded-3xl border border-white/5 self-start">
                                        <h2 className="text-xs font-bold text-white/20 uppercase tracking-[0.2em] mb-6">Discord Preview</h2>
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex-shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-bold">Zedox</span>
                                                    <span className="bg-primary text-[10px] px-1 rounded-sm text-white font-bold uppercase">Bot</span>
                                                    <span className="text-white/20 text-xs">Today at 12:00 PM</span>
                                                </div>
                                                <div className="text-[#DBDEE1] text-sm">
                                                    Hey <span className="text-[#00A8FC] bg-[#00A8FC]/10 px-0.5 rounded-sm cursor-pointer hover:bg-[#00A8FC]/20 transition-all">@User</span>, welcome!
                                                </div>
                                                <div className="border-l-4 rounded-sm p-4 bg-[#232428] space-y-2 max-w-[400px]" style={{ borderColor: welcomeConfig.embed.color }}>
                                                    <div className="font-bold text-white">{(welcomeConfig.embed.title || '').replace(/{server}/g, 'Zedox Server')}</div>
                                                    <div className="text-sm text-[#DBDEE1] whitespace-pre-wrap">{(welcomeConfig.embed.description || '').replace(/{mention}/g, '@User').replace(/{server}/g, 'Zedox Server')}</div>
                                                    <div className="text-[10px] text-white/40 font-medium">{(welcomeConfig.embed.footer || '').replace(/{memberCount}/g, '123')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {activeTab === 'moderation' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CommandToggle
                                    name="Clear Command"
                                    description="Allows moderators to bulk delete messages"
                                    active={config.features?.clear}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.clear', v)}
                                />
                                <CommandToggle
                                    name="Mute Control"
                                    description="Timed mute and timeout functionality"
                                    active={config.features?.mute}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.mute', v)}
                                />
                                <CommandToggle
                                    name="Lockdown Mode"
                                    description="Emergency channel locking"
                                    active={config.features?.lockdown}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.lockdown', v)}
                                />
                                <CommandToggle
                                    name="Invite Generator"
                                    description="Generate bot invite links"
                                    active={config.features?.invite}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.invite', v)}
                                />
                                <CommandToggle
                                    name="Ping Command"
                                    description="Check bot latency and API status"
                                    active={config.features?.ping}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.ping', v)}
                                />
                                <CommandToggle
                                    name="Info Boards"
                                    description="Server and user info embeds"
                                    active={config.features?.info}
                                    onToggle={(v: boolean) => handleUpdateConfig('features.info', v)}
                                />
                            </div>
                        )}
                    </main>
                </>
            )}
        </div>
    );
}
