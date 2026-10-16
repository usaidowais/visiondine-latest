'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { supabaseService } from '@/lib/services/supabaseService';
import { useRouter } from 'next/navigation';



export default function GlobalSettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        dbLoad: { percent: 0, activeConnections: 0, avgLatency: 0, iops: '0k' },
        storage: { percent: 0, totalUsed: '0 GB', limit: '100 GB', projectedFull: 'Unknown', modelsCount: 0 }
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await supabaseService.getSystemHealth();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch system stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);



    const dbData = [
        { name: 'Used', value: stats.dbLoad.percent },
        { name: 'Free', value: 100 - stats.dbLoad.percent },
    ];

    const storageData = [
        { name: 'Used', value: stats.storage.percent },
        { name: 'Free', value: 100 - stats.storage.percent },
    ];


    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>Settings</span>
                        <span className="material-icons-round text-xs">chevron_right</span>
                        <span className="text-foreground font-medium">System Control</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Global System Control</h2>
                    <p className="text-muted-foreground mt-1">Monitor platform health, manage visual presets, and configure communication.</p>
                </div>
                <Button className="gap-2 shadow-lg shadow-primary/20">
                    <span className="material-icons-round">save</span>
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column (Stats & Presets) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Database Load */}
                        <div className="glass-card p-6 rounded-2xl border border-border/50">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-blue-500">dns</span>
                                    <h3 className="font-bold text-foreground">Database Load</h3>
                                </div>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">HEALTHY</span>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="h-24 w-24 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={dbData} innerRadius={35} outerRadius={45} dataKey="value" startAngle={90} endAngle={-270}>
                                                <Cell fill="var(--primary)" />
                                                <Cell fill="var(--muted)" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <span className="absolute font-bold text-xl text-foreground">{stats.dbLoad.percent}%</span>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Active Connections</span>
                                        <span className="font-bold text-foreground">{stats.dbLoad.activeConnections}</span>
                                    </div>
                                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full rounded-full" style={{ width: `${stats.dbLoad.percent}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                        <span>Avg Latency: <span className="text-foreground font-medium">{stats.dbLoad.avgLatency}ms</span></span>
                                        <span>IOPS: <span className="text-foreground font-medium">{stats.dbLoad.iops}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Storage Capacity */}
                        <div className="glass-card p-6 rounded-2xl border border-border/50">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-orange-500">inventory_2</span>
                                    <h3 className="font-bold text-foreground">Storage Capacity</h3>
                                </div>
                                {stats.storage.percent > 90 ? (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">CRITICAL</span>
                                ) : stats.storage.percent > 70 ? (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200">WARNING</span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">HEALTHY</span>
                                )}
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="h-24 w-24 relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={storageData} innerRadius={35} outerRadius={45} dataKey="value" startAngle={90} endAngle={-270}>
                                                <Cell fill={stats.storage.percent > 90 ? '#ef4444' : stats.storage.percent > 70 ? '#f97316' : '#22c55e'} />
                                                <Cell fill="var(--muted)" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <span className="absolute font-bold text-xl text-foreground">{stats.storage.percent}%</span>
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Usage</span>
                                        <span className="font-bold text-foreground">{stats.storage.totalUsed} <span className="text-muted-foreground font-normal">/ {stats.storage.limit}</span></span>
                                    </div>
                                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stats.storage.percent > 90 ? 'bg-red-500' : stats.storage.percent > 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                                            style={{ width: `${stats.storage.percent}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                        <span>Status: <span className={`font-medium ${stats.storage.percent > 70 ? 'text-orange-600' : 'text-green-600'}`}>{stats.storage.percent > 70 ? 'High Load' : 'Optimal'}</span></span>
                                        <span>Models: <span className="text-foreground font-medium">{stats.storage.modelsCount}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>

                {/* Right Column (Email Templates) */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl border border-border/50 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="material-icons-round text-purple-500">email</span>
                                <h3 className="font-bold text-foreground">Email Templates</h3>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground">
                                <span className="material-icons-round">more_horiz</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {[
                                { name: 'Welcome Email', desc: 'Sent on registration', subject: 'Subject: Welcome to VisionDine...', status: 'Active', updated: '2d ago', icon: 'waving_hand', color: 'bg-blue-100 text-blue-600' },
                                { name: 'Account Suspension', desc: 'Policy violation notice', subject: 'Subject: Important: Action Requi...', status: 'Active', updated: '1mo ago', icon: 'block', color: 'bg-red-100 text-red-600' },
                                { name: 'Password Reset', desc: 'Security automated', subject: 'Subject: Reset your password ins...', status: 'Active', updated: '6mo ago', icon: 'lock_reset', color: 'bg-yellow-100 text-yellow-600' }
                            ].map((template, idx) => (
                                <div key={idx} className="group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-full ${template.color} flex items-center justify-center flex-shrink-0`}>
                                                <span className="material-icons-round text-lg">{template.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground text-sm">{template.name}</h4>
                                                <p className="text-xs text-muted-foreground">{template.desc}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                                    </div>

                                    <div className="ml-13 bg-secondary/50 rounded-lg p-2 text-xs text-muted-foreground font-mono truncate border border-border/50 mb-2">
                                        {template.subject}
                                    </div>

                                    <div className="ml-13 flex justify-between items-center text-[10px]">
                                        <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 font-medium">{template.status}</span>
                                        <span className="text-muted-foreground">Last edited {template.updated}</span>
                                    </div>

                                    {idx < 2 && <div className="border-b border-border/50 mt-4"></div>}
                                </div>
                            ))}
                        </div>

                        <Button variant="ghost" fullWidth className="mt-6 border border-border">
                            View All Templates
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
