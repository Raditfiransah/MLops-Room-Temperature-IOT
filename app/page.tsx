"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { ModeToggle } from "@/components/mode-toggle";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────
interface SensorData {
  id: number;
  temperature: number;
  humidity: number;
  heat_index: number;
  recorded_at: string;
}

type TimeRange = "1D" | "3D" | "7D" | "1M" | "CUSTOM";
type ThresholdLevel = "normal" | "warning" | "critical";

// ─── CSS var helper ─────────────────────────────────────────────────
function cssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ─── Thresholds ─────────────────────────────────────────────────────
const THRESHOLDS = {
  temperature: { warning: 30, critical: 35 },
  humidity: { warning: 70, critical: 85 },
  heat_index: { warning: 32, critical: 40 },
};

function getLevel(value: number, key: keyof typeof THRESHOLDS): ThresholdLevel {
  if (value >= THRESHOLDS[key].critical) return "critical";
  if (value >= THRESHOLDS[key].warning) return "warning";
  return "normal";
}

const LEVEL_COLORS: Record<ThresholdLevel, string> = {
  normal: "#3A8B95  ",
  warning: "#FF9644",
  critical: "#FF3E9B",
};

const LEVEL_LABELS: Record<ThresholdLevel, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
};

// ─── Helpers ────────────────────────────────────────────────────────
function getRangeStart(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "1D": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "3D": return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    case "7D": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1M": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

function formatTime(ts: string, range: TimeRange): string {
  const d = new Date(ts);
  if (range === "1D") {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  }
  return d.toLocaleDateString("id-ID", { month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" }) +
    " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

function formatFull(ts: string): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function formatDateInput(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─── Circular Gauge with threshold colors ───────────────────────────
function CircleGauge({
  value, unit, label, min, max, thresholdKey,
}: {
  value: number | null; unit: string; label: string; min: number; max: number;
  thresholdKey: keyof typeof THRESHOLDS;
}) {
  const pct = value !== null ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference - pct * circumference * 0.75;
  const level = value !== null ? getLevel(value, thresholdKey) : "normal";
  const arcColor = LEVEL_COLORS[level];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[120px] w-[120px]">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-135">
          {/* Background arc */}
          <circle cx="50" cy="50" r="42" fill="none" className="stroke-border" strokeWidth="5"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
          {/* Value arc — color changes by threshold */}
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="5"
            stroke={arcColor}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={dashOffset} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${arcColor}80)`, transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }} />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-foreground">
            {value !== null ? value.toFixed(1) : "--"}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">{unit}</span>
        </div>
      </div>
      {/* Label */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {/* Threshold badge */}
      {value !== null && (
        <span
          className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: `${arcColor}18`,
            color: arcColor,
            border: `1px solid ${arcColor}30`,
          }}
        >
          {LEVEL_LABELS[level]}
        </span>
      )}
    </div>
  );
}

// ─── Humidity Trend Chart (improved) ────────────────────────────────
function HumidityChart({
  data, themeColors,
}: {
  data: Array<{ time: string; humidity: number }>;
  themeColors: { primary: string; accent: string; border: string; bg: string; muted: string };
}) {
  const sliced = data.slice(-50);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sliced} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="hum-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.25} />
              <stop offset="50%" stopColor={themeColors.primary} stopOpacity={0.08} />
              <stop offset="100%" stopColor={themeColors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={`${themeColors.border}60`} />
          {/* Warning threshold line at 70% */}
          <XAxis
            dataKey="time"
            stroke="transparent"
            tick={{ fill: themeColors.muted, fontSize: 9 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="transparent"
            tick={{ fill: themeColors.muted, fontSize: 9 }}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = payload[0].value as number;
              const lvl = getLevel(v, "humidity");
              return (
                <div className="rounded-xl border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{v.toFixed(1)}%</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase"
                      style={{ background: `${LEVEL_COLORS[lvl]}18`, color: LEVEL_COLORS[lvl] }}>
                      {LEVEL_LABELS[lvl]}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          {/* Warning zone reference line */}
          <Area
            type="monotone"
            dataKey="humidity"
            stroke={themeColors.primary}
            strokeWidth={2.5}
            fill="url(#hum-fill)"
            dot={false}
            activeDot={{ r: 4, fill: themeColors.primary, stroke: themeColors.bg, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Chart Tooltip ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const labels: Record<string, string> = { temperature: "Temperature", heat_index: "Heat Index" };
  const units: Record<string, string> = { temperature: "°C", heat_index: "°C" };
  const keys: Record<string, keyof typeof THRESHOLDS> = { temperature: "temperature", heat_index: "heat_index" };

  return (
    <div className="rounded-xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      {payload.map((p) => {
        const lvl = getLevel(p.value, keys[p.dataKey] || "temperature");
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
            <span className="text-xs text-muted-foreground">{labels[p.dataKey] || p.dataKey}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">{p.value.toFixed(1)} {units[p.dataKey] || ""}</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: LEVEL_COLORS[lvl] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats Cell ─────────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-primary">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [nowTime, setNowTime] = useState(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>("1D");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const { resolvedTheme } = useTheme();
  const [themeColors, setThemeColors] = useState({
    primary: "#c4b0f5", accent: "#7c5cbf", border: "#252336",
    bg: "#0b0b10", muted: "#7a6e9a",
  });

  // Read CSS vars whenever theme changes
  const readThemeColors = useCallback(() => {
    setTimeout(() => {
      setThemeColors({
        primary: cssVar("--primary") || "#c4b0f5",
        accent: cssVar("--accent") || "#7c5cbf",
        border: cssVar("--border") || "#252336",
        bg: cssVar("--background") || "#0b0b10",
        muted: cssVar("--muted-foreground") || "#7a6e9a",
      });
    }, 50);
  }, []);

  useEffect(() => { readThemeColors(); }, [resolvedTheme, readThemeColors]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Date range
  const dateRange = useMemo(() => {
    if (timeRange === "CUSTOM" && customStart && customEnd) {
      return { from: new Date(customStart + "T00:00:00"), to: new Date(customEnd + "T23:59:59") };
    }
    return { from: getRangeStart(timeRange), to: new Date() };
  }, [timeRange, customStart, customEnd]);

  // Fetch
  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("sensor_logs_suhu")
      .select("*")
      .gte("recorded_at", dateRange.from.toISOString())
      .lte("recorded_at", dateRange.to.toISOString())
      .order("recorded_at", { ascending: true })
      .limit(1000);
    if (!error && data) setSensorData(data as SensorData[]);
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel("tempmonitor-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_logs_suhu" },
        (payload) => {
          const row = payload.new as SensorData;
          setSensorData((prev) => [...prev, row].slice(-1000));
        }
      )
      .subscribe((status) => setIsConnected(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Range handler
  const handleRange = (r: TimeRange) => {
    setTimeRange(r);
    if (r === "CUSTOM") {
      const now = new Date();
      setCustomStart(formatDateInput(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)));
      setCustomEnd(formatDateInput(now));
    }
  };

  // Derived
  const latest = sensorData.length > 0 ? sensorData[sensorData.length - 1] : null;
  const recentRows = [...sensorData].reverse().slice(0, 12);

  const chartData = sensorData.map((d) => ({
    time: formatTime(d.recorded_at, timeRange),
    temperature: d.temperature,
    heat_index: d.heat_index,
  }));

  const humidityData = sensorData.map((d) => ({
    time: formatTime(d.recorded_at, timeRange),
    humidity: d.humidity,
  }));

  // Stats
  const stats = useMemo(() => {
    if (sensorData.length === 0) return null;
    const temps = sensorData.map((d) => d.temperature);
    const hums = sensorData.map((d) => d.humidity);
    const his = sensorData.map((d) => d.heat_index);
    const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    return {
      tempMin: Math.min(...temps).toFixed(1), tempMax: Math.max(...temps).toFixed(1), tempAvg: avg(temps),
      humMin: Math.min(...hums).toFixed(1), humMax: Math.max(...hums).toFixed(1), humAvg: avg(hums),
      hiMin: Math.min(...his).toFixed(1), hiMax: Math.max(...his).toFixed(1), hiAvg: avg(his),
    };
  }, [sensorData]);

  const ranges: TimeRange[] = ["1D", "3D", "7D", "1M", "CUSTOM"];

  return (
    <div className="min-h-screen text-foreground">
      {/* ══════ HEADER ══════ */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
              <div className="h-3 w-3 rounded-full bg-primary-foreground/85" />
            </div>
            <span className="text-base font-extrabold tracking-tight">TempMonitor</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">
              {nowTime.toLocaleString("id-ID", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
                timeZone: "Asia/Jakarta",
              })}
            </span>

            <ModeToggle />
            
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-5 px-6 py-6">

        {/* ══════ SECTION 1: GAUGES + HUMIDITY CHART ══════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
          {/* Left — Three circular gauges with threshold colors */}
          <div className="flex items-center justify-around rounded-xl border border-border bg-card px-4 py-6">
            <CircleGauge value={latest?.temperature ?? null} unit="°C" label="Temperature"
              min={15} max={50} thresholdKey="temperature" />
            <CircleGauge value={latest?.humidity ?? null} unit="%" label="Humidity"
              min={0} max={100} thresholdKey="humidity" />
            <CircleGauge value={latest?.heat_index ?? null} unit="°C" label="Heat Index"
              min={15} max={55} thresholdKey="heat_index" />
          </div>

          {/* Right — Humidity Trend (improved) */}
          <div className="flex flex-col rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <div>
                <h3 className="text-sm font-bold">Humidity Trend</h3>
                <p className="text-[10px] font-semibold text-muted-foreground">
                  Last {Math.min(humidityData.length, 50)} readings
                </p>
              </div>
              {latest && (() => {
                const lvl = getLevel(latest.humidity, "humidity");
                return (
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <span className="text-2xl font-extrabold text-primary">{latest.humidity.toFixed(1)}</span>
                      <span className="ml-0.5 text-xs font-semibold text-muted-foreground">%</span>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase"
                      style={{ background: `${LEVEL_COLORS[lvl]}18`, color: LEVEL_COLORS[lvl], border: `1px solid ${LEVEL_COLORS[lvl]}30` }}>
                      {LEVEL_LABELS[lvl]}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="min-h-[140px] flex-1 px-2 pb-3">
              <HumidityChart data={humidityData} themeColors={themeColors} />
            </div>
          </div>
        </div>

        {/* ══════ SECTION 2: MAIN CHART (Temp + Heat Index) ══════ */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold">Temperature & Heat Index</h2>
              <p className="text-[10px] font-semibold text-muted-foreground">Historical sensor data</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-0.5 rounded-lg bg-background p-0.5">
                {ranges.map((r) => (
                  <button key={r} onClick={() => handleRange(r)}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-colors ${
                      timeRange === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {r === "CUSTOM" ? "Custom" : r}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-[6px] w-[6px] rounded-full bg-primary" />
                  <span className="text-[10px] font-semibold text-muted-foreground">Temperature</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-[6px] w-[6px] rounded-full bg-accent" />
                  <span className="text-[10px] font-semibold text-muted-foreground">Heat Index</span>
                </div>
              </div>
            </div>
          </div>

          {timeRange === "CUSTOM" && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</span>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none scheme-dark" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none scheme-dark" />
              </div>
            </div>
          )}

          {sensorData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center">
              <p className="text-sm font-semibold text-muted-foreground">No sensor data available for this period</p>
            </div>
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-temp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={themeColors.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-hi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={themeColors.accent} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={themeColors.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${themeColors.border}60`} />
                  <XAxis dataKey="time" stroke="transparent"
                    tick={{ fill: themeColors.muted, fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="transparent"
                    tick={{ fill: themeColors.muted, fontSize: 9 }} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="heat_index" stroke={themeColors.accent} strokeWidth={2}
                    fill="url(#g-hi)" dot={false} strokeDasharray="6 3"
                    activeDot={{ r: 4, fill: themeColors.accent, stroke: themeColors.bg, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="temperature" stroke={themeColors.primary} strokeWidth={2.5}
                    fill="url(#g-temp)" dot={false}
                    activeDot={{ r: 4, fill: themeColors.primary, stroke: themeColors.bg, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ══════ SECTION 3: TABLE + STATS ══════ */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
          {/* Recent Readings Table with conditional formatting */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="px-5 py-4">
              <h3 className="text-sm font-bold">Recent Readings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["TIMESTAMP", "TEMP (°C)", "HUMIDITY (%)", "HEAT INDEX (°C)"].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center font-semibold text-muted-foreground">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    recentRows.map((row, i) => {
                      const tLvl = getLevel(row.temperature, "temperature");
                      const hLvl = getLevel(row.humidity, "humidity");
                      const hiLvl = getLevel(row.heat_index, "heat_index");
                      const hasAlert = tLvl !== "normal" || hLvl !== "normal" || hiLvl !== "normal";

                      return (
                        <tr key={row.id}
                          className={`border-b border-border/30 ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}
                          style={hasAlert ? { borderLeft: `3px solid ${LEVEL_COLORS[tLvl === "critical" ? "critical" : hLvl === "critical" ? "critical" : hiLvl === "critical" ? "critical" : "warning"]}` } : {}}>
                          <td className="px-5 py-2.5 font-semibold text-muted-foreground">{formatFull(row.recorded_at)}</td>
                          <td className="px-5 py-2.5 font-bold" style={{ color: LEVEL_COLORS[tLvl] }}>
                            {row.temperature.toFixed(1)}
                          </td>
                          <td className="px-5 py-2.5 font-bold" style={{ color: LEVEL_COLORS[hLvl] }}>
                            {row.humidity.toFixed(1)}
                          </td>
                          <td className="px-5 py-2.5 font-bold" style={{ color: LEVEL_COLORS[hiLvl] }}>
                            {row.heat_index.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistics Panel */}
          <div className="rounded-xl border border-border bg-card">
            <div className="px-5 py-4">
              <h3 className="text-sm font-bold">Statistics</h3>
            </div>
            <div className="px-5 pb-5">
              {stats ? (
                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Min Temp" value={`${stats.tempMin}°C`} />
                  <StatCell label="Max Temp" value={`${stats.tempMax}°C`} />
                  <StatCell label="Avg Temp" value={`${stats.tempAvg}°C`} />
                  <StatCell label="Min Hum" value={`${stats.humMin}%`} />
                  <StatCell label="Max Hum" value={`${stats.humMax}%`} />
                  <StatCell label="Avg Hum" value={`${stats.humAvg}%`} />
                  <StatCell label="Min HI" value={`${stats.hiMin}°C`} />
                  <StatCell label="Max HI" value={`${stats.hiMax}°C`} />
                  <StatCell label="Avg HI" value={`${stats.hiAvg}°C`} />
                </div>
              ) : (
                <p className="py-6 text-center text-xs font-semibold text-muted-foreground">No data for statistics</p>
              )}

              {/* System Status */}
              <div className="mt-4 rounded-lg bg-background p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System Status</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Data Source</span>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#AFFFB5]" />
                      <span className="text-[11px] font-bold">Supabase</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Last Updated</span>
                    <div className="flex items-center gap-1.5">
                      {isConnected && (
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#AFFFB5] opacity-40" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#AFFFB5]" />
                        </span>
                      )}
                      <span className="text-[11px] font-bold">{latest ? formatFull(latest.recorded_at) : "--"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Sensor Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${isConnected ? "bg-[#AFFFB5]" : "bg-[#b83560]"}`} />
                      <span className={`text-[11px] font-bold ${isConnected ? "text-[#AFFFB5]" : "text-[#b83560]"}`}>
                        {isConnected ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">Total Readings</span>
                    <span className="text-[11px] font-bold">{sensorData.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="pb-4 pt-2 text-center">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground/40">
            TempMonitor v1.0 / Supabase Realtime / {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
