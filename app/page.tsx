"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
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

type PresetRange = "1d" | "3d" | "7d" | "1m" | "custom";

// ─── Chart Colors ───────────────────────────────────────────────────
const COLORS = {
  temperature: { stroke: "#22d3ee", fill: "#22d3ee", gradient: "from-cyan-500/20" },
  humidity: { stroke: "#818cf8", fill: "#818cf8", gradient: "from-indigo-500/20" },
  heatIndex: { stroke: "#fb923c", fill: "#fb923c", gradient: "from-orange-500/20" },
};

// ─── Helpers ────────────────────────────────────────────────────────
function getDateFromPreset(preset: PresetRange): Date {
  const now = new Date();
  switch (preset) {
    case "1d":
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    case "3d":
      return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  }
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Custom Tooltip ─────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
  unit,
  color,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>
        {payload[0].value.toFixed(1)} {unit}
      </p>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  unit,
  icon,
  color,
  gradient,
}: {
  title: string;
  value: number | null;
  unit: string;
  icon: string;
  color: string;
  gradient: string;
}) {
  return (
    <Card className={`relative overflow-hidden border-0 bg-linear-to-br ${gradient} to-card`}>
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{ background: color }}
      />
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="text-lg">{icon}</span>
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight" style={{ color }}>
            {value !== null ? value.toFixed(1) : "—"}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart Card ─────────────────────────────────────────────────────
function ChartCard({
  title,
  description,
  data,
  dataKey,
  color,
  unit,
}: {
  title: string;
  description: string;
  data: Array<{ time: string; [key: string]: string | number }>;
  dataKey: string;
  color: string;
  unit: string;
}) {
  const gradientId = `gradient-${dataKey}`;

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.25)"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.25)"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip unit={unit} color={color} />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: color,
                  stroke: "rgba(0,0,0,0.5)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Preset Button ──────────────────────────────────────────────────
function PresetButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: PresetRange;
  active: boolean;
  onClick: (v: PresetRange) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]"
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Time range state
  const [activePreset, setActivePreset] = useState<PresetRange>("1d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Compute date range
  const dateRange = useMemo(() => {
    if (activePreset === "custom" && customStart && customEnd) {
      return {
        from: new Date(customStart + "T00:00:00"),
        to: new Date(customEnd + "T23:59:59"),
      };
    }
    return {
      from: getDateFromPreset(activePreset),
      to: new Date(),
    };
  }, [activePreset, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("sensor_logs_suhu")
      .select("*")
      .gte("recorded_at", dateRange.from.toISOString())
      .lte("recorded_at", dateRange.to.toISOString())
      .order("recorded_at", { ascending: true })
      .limit(500);

    if (!error && data) {
      setSensorData(data as SensorData[]);
      if (data.length > 0) {
        setLastUpdated(
          new Date(data[data.length - 1].recorded_at).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          })
        );
      }
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();

    // Real-time subscription
    const channel = supabase
      .channel("sensor-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_logs_suhu" },
        (payload) => {
          const newRow = payload.new as SensorData;
          setSensorData((prev) => {
            const updated = [...prev, newRow];
            return updated.slice(-500);
          });
          setLastUpdated(
            new Date(newRow.recorded_at).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
            })
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Handle preset click
  const handlePresetClick = (preset: PresetRange) => {
    setActivePreset(preset);
    if (preset !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    } else {
      // Default custom range to last 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setCustomStart(formatDateForInput(weekAgo));
      setCustomEnd(formatDateForInput(now));
    }
  };

  // Format data for charts - show date+time for multi-day ranges
  const chartData = sensorData.map((d) => {
    const date = new Date(d.recorded_at);
    const showDate = activePreset !== "1d";
    const time = showDate
      ? date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          timeZone: "Asia/Jakarta",
        }) +
        " " +
        date.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        })
      : date.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        });

    return {
      time,
      temperature: d.temperature,
      humidity: d.humidity,
      heat_index: d.heat_index,
    };
  });

  const latest = sensorData.length > 0 ? sensorData[sensorData.length - 1] : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      {/* Header */}
      <header className="mx-auto mb-8 max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              <span className="mr-2">📡</span>
              IoT Sensor Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitoring suhu, kelembapan & heat index secara real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-4 py-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isConnected
                    ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                    : "bg-red-400"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Live" : "Disconnected"}
              </span>
            </div>
            {/* Last Updated */}
            {lastUpdated && (
              <div className="hidden rounded-full border border-white/10 bg-card px-4 py-2 text-xs text-muted-foreground sm:block">
                Update: {lastUpdated}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        {/* ── Time Range Filter ── */}
        <Card className="border-0">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Preset Buttons */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
              <PresetButton label="1 Hari" value="1d" active={activePreset === "1d"} onClick={handlePresetClick} />
              <PresetButton label="3 Hari" value="3d" active={activePreset === "3d"} onClick={handlePresetClick} />
              <PresetButton label="7 Hari" value="7d" active={activePreset === "7d"} onClick={handlePresetClick} />
              <PresetButton label="1 Bulan" value="1m" active={activePreset === "1m"} onClick={handlePresetClick} />
              <PresetButton label="Custom" value="custom" active={activePreset === "custom"} onClick={handlePresetClick} />
            </div>

            {/* Custom Date Range */}
            {activePreset === "custom" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Dari</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 [color-scheme:dark]"
                  />
                </div>
                <span className="text-xs text-muted-foreground">—</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Sampai</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 [color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            {/* Data count badge */}
            <div className="text-xs text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {sensorData.length} data
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Suhu"
            value={latest?.temperature ?? null}
            unit="°C"
            icon="🌡️"
            color={COLORS.temperature.stroke}
            gradient={COLORS.temperature.gradient}
          />
          <StatCard
            title="Kelembapan"
            value={latest?.humidity ?? null}
            unit="%"
            icon="💧"
            color={COLORS.humidity.stroke}
            gradient={COLORS.humidity.gradient}
          />
          <StatCard
            title="Heat Index"
            value={latest?.heat_index ?? null}
            unit="°C"
            icon="🔥"
            color={COLORS.heatIndex.stroke}
            gradient={COLORS.heatIndex.gradient}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title="🌡️ Suhu (Temperature)"
            description="Monitoring suhu lingkungan"
            data={chartData}
            dataKey="temperature"
            color={COLORS.temperature.stroke}
            unit="°C"
          />
          <ChartCard
            title="💧 Kelembapan (Humidity)"
            description="Monitoring kelembapan udara"
            data={chartData}
            dataKey="humidity"
            color={COLORS.humidity.stroke}
            unit="%"
          />
        </div>

        <div className="grid grid-cols-1">
          <ChartCard
            title="🔥 Heat Index"
            description="Indeks panas — kombinasi suhu & kelembapan"
            data={chartData}
            dataKey="heat_index"
            color={COLORS.heatIndex.stroke}
            unit="°C"
          />
        </div>

        {/* Footer */}
        <footer className="pb-6 pt-4 text-center text-xs text-muted-foreground">
          <p>IoT Sensor Dashboard • Data dari Supabase • Auto-reload aktif</p>
        </footer>
      </main>
    </div>
  );
}
