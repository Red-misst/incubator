"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Thermometer,
    Droplets,
    Wind,
    Activity,
    Settings2,
    AlertCircle,
    PlaySquare,
    Box,
    LayoutDashboard,
    WifiOff,
    ChevronDown,
    ChevronUp,
    Database,
    Menu,
    X
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { mockTemperatureData, mockHumidityData, mockOperationalMetrics, incubatorModels } from "@/lib/mockData";

const cx = (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(" ");

export function Dashboard() {
    const [isMounted, setIsMounted] = useState(false);
    const [showTable, setShowTable] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className="flex min-h-screen bg-[#07090e] text-neutral-100 font-sans selection:bg-cyan-500/30">

            {/* --- Mobile Sidebar Toggle --- */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden absolute top-4 left-4 z-50 p-2 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-400"
            >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* --- Persistent Sidebar Navigation --- */}
            <aside className={cx(
                "fixed lg:sticky top-0 h-screen w-72 bg-[#0a0d14] border-r border-neutral-800/60 flex flex-col z-40 transition-transform duration-300",
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-6 flex items-center gap-3 border-b border-neutral-800/60">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <Box className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Incubator Pro<br /><span className="text-cyan-400 text-sm">v4.0 OS</span></h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">

                    <div className="space-y-2">
                        <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Main View</p>
                        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                            <LayoutDashboard className="h-5 w-5" />
                            Overview Dashboard
                        </Link>
                    </div>

                    <div className="space-y-2">
                        <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Digital Twins</p>

                        {incubatorModels.map(model => (
                            <Link
                                key={model.id}
                                href={`/models/${model.id}`}
                                className="group flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-neutral-800/50 text-neutral-400 hover:text-white transition-colors"
                            >
                                <div className="mt-0.5 p-1.5 rounded-md bg-neutral-800 group-hover:bg-neutral-700 text-neutral-500 group-hover:text-white transition-colors">
                                    <PlaySquare className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-neutral-200 group-hover:text-cyan-400 transition-colors">{model.title}</p>
                                    <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{model.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                </div>

                <div className="p-6 border-t border-neutral-800/60 bg-[#0a0d14]/80 backdrop-blur-sm">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="relative flex h-3 w-3 shrink-0">
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-400">System Offline</p>
                            <p className="text-xs text-red-500/80">Showing Historic Data</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- Main Content Area --- */}
            <main className="flex-1 w-full flex flex-col h-screen overflow-y-auto">
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800/60 bg-[#0a0d14]/80 px-6 py-4 backdrop-blur-xl lg:px-10">
                    <div className="flex items-center gap-4 lg:hidden ml-10">
                        {/* Spacer for mobile menu button */}
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="text-xl font-semibold text-neutral-100">Telemetry & Control</h2>
                        <p className="text-sm text-neutral-500">Monitoring historic batch #884A</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                            <WifiOff className="h-4 w-4" />
                            OFFLINE
                        </div>
                    </div>
                </header>

                <div className="p-6 lg:p-10 space-y-8 flex-1">

                    {/* KPI Cards */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        <MetricCard
                            title="Avg Temperature"
                            value="37.4°C"
                            target="37.5°C"
                            icon={<Thermometer className="h-5 w-5 text-orange-400" />}
                            trend="stable"
                        />
                        <MetricCard
                            title="Avg Humidity"
                            value="54.8%"
                            target="55.0%"
                            icon={<Droplets className="h-5 w-5 text-cyan-400" />}
                            trend="up"
                        />
                        <MetricCard
                            title="Airflow Velocity"
                            value="2.4 m/s"
                            target="Peak"
                            icon={<Wind className="h-5 w-5 text-neutral-300" />}
                            trend="stable"
                        />
                        <MetricCard
                            title="Egg Tilts Recorded"
                            value={mockOperationalMetrics.eggTilts.toString()}
                            target="No failures"
                            icon={<Activity className="h-5 w-5 text-emerald-400" />}
                            trend="up"
                        />
                    </section>

                    {/* Charts Section */}
                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <ChartCard
                            title="Historic Thermal Stability (24h)"
                            icon={<Thermometer className="h-5 w-5 text-orange-500" />}
                            data={mockTemperatureData}
                            dataKeyActual="actual"
                            dataKeyOptimal="optimal"
                            domain={[36.5, 38.5]}
                            color="#f97316"
                            format="°C"
                        />

                        <ChartCard
                            title="Historic Humidity Tracking (24h)"
                            icon={<Droplets className="h-5 w-5 text-cyan-500" />}
                            data={mockHumidityData}
                            dataKeyActual="actual"
                            dataKeyOptimal="optimal"
                            domain={[45, 65]}
                            color="#06b6d4"
                            format="%"
                        />
                    </section>

                    {/* Collapsible Raw Data Table */}
                    <section className="rounded-2xl border border-neutral-800/60 bg-[#0a0d14] shadow-xl overflow-hidden">
                        <button
                            onClick={() => setShowTable(!showTable)}
                            className="w-full flex items-center justify-between p-6 hover:bg-neutral-800/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400">
                                    <Database className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-lg font-semibold text-white">Raw Historic Data Log</h2>
                                    <p className="text-sm text-neutral-500">View tabular telemetry for this batch</p>
                                </div>
                            </div>
                            <div className="text-neutral-500 bg-neutral-900 rounded-full p-2 border border-neutral-800">
                                {showTable ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                        </button>

                        {showTable && (
                            <div className="p-6 border-t border-neutral-800/60 bg-neutral-900/20 overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-neutral-800 text-sm tracking-wide text-neutral-500 uppercase">
                                            <th className="py-4 px-4 font-semibold">Time</th>
                                            <th className="py-4 px-4 font-semibold">Temperature (°C)</th>
                                            <th className="py-4 px-4 font-semibold">Temp Target</th>
                                            <th className="py-4 px-4 font-semibold">Humidity (%)</th>
                                            <th className="py-4 px-4 font-semibold">Hum Target</th>
                                            <th className="py-4 px-4 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {mockTemperatureData.map((data, index) => {
                                            const tVal = data.actual.toFixed(1);
                                            const hVal = mockHumidityData[index].actual.toFixed(1);
                                            return (
                                                <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-neutral-300">{data.time}</td>
                                                    <td className="py-3 px-4 text-orange-400">{tVal}</td>
                                                    <td className="py-3 px-4 text-neutral-500">{data.optimal.toFixed(1)}</td>
                                                    <td className="py-3 px-4 text-cyan-400">{hVal}</td>
                                                    <td className="py-3 px-4 text-neutral-500">{mockHumidityData[index].optimal.toFixed(1)}</td>
                                                    <td className="py-3 px-4 text-emerald-500 text-xs font-semibold">Log Saved</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Diagnostics Row */}
                    <section className="mt-8 rounded-2xl border border-neutral-800/60 bg-[#0a0d14] p-6 shadow-xl space-y-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                            <Settings2 className="h-5 w-5 text-neutral-400" />
                            Historic Diagnostics Log
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <DiagnosticRow label="Heater SSR" value={mockOperationalMetrics.heaterStatus} status="active" />
                            <DiagnosticRow label="Ultrasonic Mistifier" value={mockOperationalMetrics.mistifierStatus} status="idle" />
                            <DiagnosticRow label="Solenoid Valves" value={`${mockOperationalMetrics.valvesOpen}/${mockOperationalMetrics.totalValves} Open`} status="active" />
                            <DiagnosticRow label="Cabinet Door Seal" value={mockOperationalMetrics.doorStatus} status="good" />
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}

function MetricCard({ title, value, target, icon, trend }: { title: string, value: string, target: string, icon: React.ReactNode, trend: 'up' | 'down' | 'stable' }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800/60 bg-[#0a0d14] p-6 shadow-xl group hover:-translate-y-1 transition-all duration-300">
            <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">{title}</h3>
                <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
                <div className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-neutral-700"></span>
                    Target: {target}
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, icon, data, dataKeyActual, dataKeyOptimal, domain, color, format }: any) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    return (
        <div className="rounded-2xl border border-neutral-800/60 bg-[#0a0d14] p-6 sm:p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <h2 className="text-lg font-semibold text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">{icon}</div>
                {title}
            </h2>
            <div className="h-72 w-full ml-[-20px] sm:ml-0">
                {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis
                                domain={domain}
                                stroke="#6b7280"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}${format}`}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f1117', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            <Line type="monotone" dataKey={dataKeyActual} name={`Actual (${format})`} stroke={color} strokeWidth={3} dot={false} activeDot={{ r: 6, fill: color, stroke: '#0f1117', strokeWidth: 2 }} />
                            <Line type="monotone" dataKey={dataKeyOptimal} name={`Target (${format})`} stroke="#4b5563" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}

function DiagnosticRow({ label, value, status }: { label: string, value: string, status: 'active' | 'idle' | 'good' | 'error' }) {
    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-neutral-800/40 bg-neutral-900/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</span>
            <div className="flex items-center gap-3">
                <span className={cx(
                    "h-2 w-2 rounded-full shrink-0",
                    status === "active" ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse" :
                        status === "good" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                            status === "idle" ? "bg-neutral-600" : "bg-red-500"
                )} />
                <span className="text-sm font-bold text-white">{value}</span>
            </div>
        </div>
    );
}
