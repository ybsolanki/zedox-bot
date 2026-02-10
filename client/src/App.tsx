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
    Hammer
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
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(localStorage.getItem('zedox_token') || '');
    const [loginInput, setLoginInput] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ uptime: 0, guilds: 0, users: 0, commandsRun: 0 });
    const [config, setConfig] = useState<any>({ prefix: ',', error_logging: true, status_message: '', features: {} });
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const configRes = await fetch('/api/config', {
                    headers: { 'Authorization': token }
                });

                if (configRes.status === 200) {
                    const configData = await configRes.json();
                    setConfig(configData);
                    setIsAuthenticated(true);
                    setLoginError('');
                } else if (configRes.status === 401) {
                    setIsAuthenticated(false);
                    if (token) setLoginError('Invalid Token! Please check your Render environment variables.');
                }

                const statsRes = await fetch('/api/stats', {
                    headers: { 'Authorization': token }
                });
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(statsData);
                }

                const logsRes = await fetch('/api/logs', {
                    headers: { 'Authorization': token }
                });
                if (logsRes.ok) {
                    const logsData = await logsRes.json();
                    setLogs(logsData);
                }
            } catch (err) {
                console.error('Failed to fetch data', err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [token]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        try {
            const res = await fetch('/api/config', {
                headers: { 'Authorization': loginInput }
            });

            if (res.status === 200) {
                setToken(loginInput);
                localStorage.setItem('zedox_token', loginInput);
                setIsAuthenticated(true);
            } else {
                setLoginError('Incorrect Token. Make sure it matches the DASHBOARD_TOKEN on Render.');
            }
        } catch (err) {
            setLoginError('Connection failed. Is the bot server running?');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setToken('');
        setLoginInput('');
        setIsAuthenticated(false);
        localStorage.removeItem('zedox_token');
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
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({ key, value })
            });

            if (res.status === 401) {
                alert('Invalid Token! Please log in again.');
                handleLogout();
                return;
            }

            // Update local state correctly for nested keys
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
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    return (
        <div className="min-h-screen bg-background text-text flex">
            {!isAuthenticated ? (
                <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background via-surface to-background">
                    <div className="max-w-md w-full bg-surface p-12 rounded-3xl border border-white/5 shadow-2xl space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mx-auto">
                                <ShieldCheck size={32} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white">Zedox Dashboard</h2>
                            <p className="text-white/40">Enter your access token to continue.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/40 uppercase tracking-widest ml-1">Access Token</label>
                                <input
                                    type="password"
                                    value={loginInput}
                                    onChange={(e) => setLoginInput(e.target.value)}
                                    placeholder="••••••••••••••••"
                                    className={cn(
                                        "w-full bg-white/5 border rounded-xl px-4 py-4 text-white focus:outline-none transition-all placeholder:text-white/10",
                                        loginError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-primary"
                                    )}
                                    required
                                />
                                {loginError && (
                                    <div className="text-red-400 text-xs font-bold mt-2 ml-1 animate-pulse flex items-center gap-1">
                                        <Activity size={12} /> {loginError}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className={cn(
                                    "w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group",
                                    isLoggingIn && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isLoggingIn ? "Authenticating..." : "Access Dashboard"}
                                {!isLoggingIn && <Zap size={18} className="group-hover:scale-110 transition-transform" />}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <>
                    {/* Sidebar */}
                    <aside className="w-72 bg-surface/50 border-r border-white/5 p-8 flex flex-col gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <ShieldCheck size={24} className="text-white" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">ZEDOX <span className="text-primary text-xs ml-1 uppercase">v1.2</span></span>
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
                            <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                                    <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Zedox" alt="Avatar" />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40 font-medium">Logged in as</div>
                                    <div className="text-sm font-bold text-white">Zedox Admin</div>
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
                                    Dashboard <span className="text-primary">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                                </h1>
                                <p className="text-white/40 font-medium">Manage and monitor your Zedox Bot instance.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-full border border-green-500/20 font-bold text-sm">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    SYSTEM ONLINE
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
