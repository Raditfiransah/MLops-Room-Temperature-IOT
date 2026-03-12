"use client";

import * as React from "react";
import { Settings, Moon, Sun, Monitor, Download, FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TimeRange = "1D" | "3D" | "7D" | "1M" | "CUSTOM";
type FileExt = "json" | "xlsx" | "csv";

export function ModeToggle() {
  const { setTheme } = useTheme();
  
  // Download Modal States
  const [downloadOpen, setDownloadOpen] = React.useState(false);
  const [range, setRange] = React.useState<TimeRange>("1D");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const [ext, setExt] = React.useState<FileExt>("csv");
  const [loading, setLoading] = React.useState(false);

  const formatDateInput = (d: Date) => d.toISOString().split("T")[0];

  const handleRange = (r: TimeRange) => {
    setRange(r);
    if (r === "CUSTOM") {
      const now = new Date();
      setCustomStart(formatDateInput(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)));
      setCustomEnd(formatDateInput(now));
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      let fromDate: Date;
      let toDate = new Date();

      if (range === "CUSTOM" && customStart && customEnd) {
        fromDate = new Date(customStart + "T00:00:00");
        toDate = new Date(customEnd + "T23:59:59");
      } else {
        const now = new Date();
        switch (range) {
          case "1D": fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
          case "3D": fromDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); break;
          case "7D": fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "1M": fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          default: fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        }
      }

      const { data, error } = await supabase
        .from("sensor_logs_suhu")
        .select("*")
        .gte("recorded_at", fromDate.toISOString())
        .lte("recorded_at", toDate.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(15000); // larger limit for exports

      if (error) {
        console.error("Fetch error:", error);
        alert("Gagal mengambil data.");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        alert("Tidak ada data pada rentang waktu ini.");
        setLoading(false);
        return;
      }

      const fileName = `tempmonitor_data_${Date.now()}`;

      if (ext === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (ext === "csv") {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const csvText = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (ext === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Sensor");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      }

      setDownloadOpen(false);
    } catch (err) {
      console.error("Download fail:", err);
      alert("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted hover:bg-accent hover:text-accent-foreground outline-none cursor-pointer">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-xl bg-card border-border shadow-xl">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Theme Settings</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={() => setTheme("light")} className="text-xs font-semibold cursor-pointer">
              <Sun className="mr-2 h-3.5 w-3.5" />
              Light Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="text-xs font-semibold cursor-pointer">
              <Moon className="mr-2 h-3.5 w-3.5" />
              Dark Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="text-xs font-semibold cursor-pointer">
              <Monitor className="mr-2 h-3.5 w-3.5" />
              System
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-border/50" />
            
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data Options</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setDownloadOpen(true)} className="text-xs font-semibold cursor-pointer text-primary focus:text-primary">
              <Download className="mr-2 h-3.5 w-3.5" />
              Download Data
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="max-w-[400px] rounded-xl bg-card border-border shadow-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Download Data
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Select the time range and file format to export the data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Range Selection */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time Range</p>
              <div className="flex flex-wrap gap-2">
                {(["1D", "3D", "7D", "1M", "CUSTOM"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRange(r)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                      range === r
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range Inputs */}
            {range === "CUSTOM" && (
              <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">From</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">To</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs font-semibold outline-none"
                  />
                </div>
              </div>
            )}

            {/* Extension Selection */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">File Format (Extension)</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setExt("csv")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition-all ${
                    ext === "csv" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <FileText className="h-4 w-4" /> CSV
                </button>
                <button
                  onClick={() => setExt("xlsx")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition-all ${
                    ext === "xlsx" ? "border-[#FF3E9B] bg-[#FF3E9B]/10 text-[#FF3E9B]" : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" /> XLSX
                </button>
                <button
                  onClick={() => setExt("json")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition-all ${
                    ext === "json" ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <FileJson className="h-4 w-4" /> JSON
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleDownload}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-extrabold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {loading ? "Preparing file..." : "Download"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
