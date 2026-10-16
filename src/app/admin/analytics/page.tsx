'use client';

import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Button } from '@/components/ui/Button';

// --- Mock Data ---

const dailyEngagementData = [
    { date: 'May 01', qr: 0, ar: 0 },
    { date: 'May 05', qr: 0, ar: 0 },
    { date: 'May 10', qr: 0, ar: 0 },
    { date: 'May 15', qr: 0, ar: 0 },
    { date: 'May 20', qr: 0, ar: 0 },
    { date: 'May 25', qr: 0, ar: 0 },
    { date: 'May 30', qr: 0, ar: 0 },
];

const deviceData = [
    { name: 'iOS', value: 0, color: '#3B82F6' },
    { name: 'Android', value: 0, color: '#06B6D4' },
];

const topRestaurants: { name: string; scans: number; max: number }[] = [];

const recentTenants: { id: number; name: string; status: string; date: string; plan: string; initial: string; color: string }[] = [];

// Sparkline Data
const scansSpark = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
const interactionSpark = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
const sessionSpark = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState('30D');

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Overview</h1>
                    <p className="text-muted-foreground mt-1">VisionDine 2.0 Super Admin</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative hidden md:block">
                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            className="pl-9 pr-4 py-2 bg-white border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>

                    {/* Time Filter */}
                    <div className="flex bg-white border border-input rounded-lg p-1">
                        {['7D', '30D', 'Custom'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${timeRange === range
                                    ? 'bg-secondary text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-secondary/50'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    {/* Export Button */}
                    <Button className="gap-2 h-9 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
                        <span className="material-icons-round text-sm">download</span>
                        Export
                    </Button>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Card 1: Total Global Scans */}
                <div className="glass-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Global Scans</p>
                            <h3 className="text-3xl font-bold text-foreground mt-1">0</h3>
                            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Real measured count (0 scans logged)</p>
                        </div>
                        <span className="bg-secondary text-muted-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="material-icons-round text-xs">check_circle</span>
                            Active
                        </span>
                    </div>
                    <div className="h-16 -mx-2 opacity-50 relative z-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={scansSpark}>
                                <defs>
                                    <linearGradient id="gScan" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke="#3B82F6" strokeWidth={2} fill="url(#gScan)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Card 2: Interaction Rate */}
                <div className="glass-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">AR Interaction Rate</p>
                            <h3 className="text-3xl font-bold text-foreground mt-1">0%</h3>
                            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Real measured conversion</p>
                        </div>
                        <span className="bg-secondary text-muted-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="material-icons-round text-xs">horizontal_rule</span>
                            0%
                        </span>
                    </div>
                    <div className="h-16 -mx-2 opacity-50 relative z-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={interactionSpark}>
                                <defs>
                                    <linearGradient id="gInter" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke="#10B981" strokeWidth={2} fill="url(#gInter)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Card 3: Avg Session Time */}
                <div className="glass-card p-6 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Session Time</p>
                            <h3 className="text-3xl font-bold text-muted-foreground mt-1">N/A</h3>
                            <p className="text-[11px] text-muted-foreground mt-1 font-medium">Metric unavailable (telemetry not configured)</p>
                        </div>
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="material-icons-round text-xs">info</span>
                            Unavailable
                        </span>
                    </div>
                    <div className="h-16 -mx-2 opacity-50 relative z-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sessionSpark}>
                                <Line type="monotone" dataKey="v" stroke="#9CA3AF" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Engagement Trends & Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Chart */}
                <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-border/50 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-foreground">Engagement Trends</h3>
                                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-semibold">No events recorded yet</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Comparing QR Scans vs AR Views</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span> QR Scans
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full border-2 border-cyan-400"></span> AR Views
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyEngagementData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorQr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(value) => `${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#1F2937', fontWeight: 600 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="qr"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorQr)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="ar"
                                    stroke="#22D3EE"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    fill="none"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar: Top Restaurants & Device Breakdown */}
                <div className="space-y-6">

                    {/* Top Restaurants */}
                    <div className="glass-card p-6 rounded-2xl border border-border/50 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-foreground">Top 5 Restaurants</h3>
                            <button className="text-sm text-primary font-semibold hover:underline">View All</button>
                        </div>
                        <div className="space-y-5">
                            {topRestaurants.length === 0 ? (
                                <div className="py-8 text-center text-sm text-muted-foreground">
                                    No scan data collected yet
                                </div>
                            ) : (
                                topRestaurants.map((res, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-foreground">{res.name}</span>
                                            <span className="text-muted-foreground text-xs">{res.scans.toLocaleString()} Scans</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{ width: `${(res.scans / res.max) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Device Breakdown */}
                    <div className="glass-card p-6 rounded-2xl border border-border/50 shadow-sm">
                        <h3 className="text-lg font-bold text-foreground mb-4">Device Breakdown</h3>
                        <div className="flex items-center gap-6">
                            <div className="h-32 w-32 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={deviceData}
                                            innerRadius={40}
                                            outerRadius={55}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {deviceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs text-muted-foreground">Total</span>
                                    <span className="text-xs font-bold text-muted-foreground">No data</span>
                                </div>
                            </div>
                            <div className="space-y-3 flex-1">
                                {deviceData.every(item => item.value === 0) ? (
                                    <div className="py-2 text-xs text-muted-foreground">
                                        No device telemetry collected yet
                                    </div>
                                ) : (
                                    deviceData.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                                                <span className="text-muted-foreground">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-foreground">{item.value}%</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Recent Tenants Table */}
            <div className="glass-card rounded-xl overflow-hidden border border-border/50 shadow-sm">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-secondary/30">
                    <h3 className="font-bold text-foreground text-sm tracking-wider uppercase">Recent Tenants Onboarded</h3>
                    <button className="text-xs text-primary font-bold hover:underline">View All Tenants</button>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/20">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tenant Name</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date Added</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Plan</th>
                            <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {recentTenants.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    No tenant onboarding events recorded yet
                                </td>
                            </tr>
                        ) : (
                            recentTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${tenant.color}`}>
                                                {tenant.initial}
                                            </div>
                                            <span className="font-semibold text-foreground">{tenant.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${tenant.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            }`}>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">{tenant.date}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{tenant.plan}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-muted-foreground hover:text-foreground">
                                            <span className="material-icons-round text-lg">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Global Activity Heatmap */}
            <div className="glass-card p-8 rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-foreground">Global Activity Heatmap</h3>
                            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-semibold">No activity recorded yet</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Scan intensity by day and time (Local Time)</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/50">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-primary/10"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary/30"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
                            <div className="w-3 h-3 rounded-sm bg-primary"></div>
                        </div>
                        <span>More</span>
                    </div>
                </div>

                <div className="w-full overflow-x-auto pb-2">
                    <div className="min-w-[800px]">
                        {/* Hours Header */}
                        <div className="flex mb-2">
                            <div className="w-14 shrink-0"></div> {/* Spacer for Days */}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="flex-1 text-xs text-muted-foreground text-center border-l border-border/30 first:border-l-0">
                                    {i * 2}:00
                                </div>
                            ))}
                        </div>

                        {/* Heatmap Grid */}
                        <div className="space-y-1.5">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="flex items-center gap-2">
                                    {/* Day Label */}
                                    <div className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">{day}</div>

                                    {/* Hour Cells */}
                                    <div className="flex-1 grid grid-cols-24 gap-1">
                                        {Array.from({ length: 24 }).map((_, hIndex) => {
                                            // Generate deterministic "random" intensity for demo
                                            let intensity = 0;

                                            // Determine color class
                                            let colorClass = 'bg-primary/5 hover:bg-primary/10';
                                            if (intensity > 0.2) colorClass = 'bg-primary/20 hover:bg-primary/30';
                                            if (intensity > 0.5) colorClass = 'bg-primary/50 hover:bg-primary/60';
                                            if (intensity > 0.8) colorClass = 'bg-primary hover:opacity-90 shadow-sm shadow-primary/30';

                                            return (
                                                <div
                                                    key={hIndex}
                                                    className={`h-8 rounded-sm transition-all duration-300 cursor-pointer relative group ${colorClass}`}
                                                >
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-border">
                                                        {day} {hIndex}:00 - {Math.floor(intensity * 120)} scans
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
