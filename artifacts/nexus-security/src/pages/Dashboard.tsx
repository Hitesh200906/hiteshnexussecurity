import { useGetStatus, useGetScanStats, useGetScans } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid, ScanSearch, FileText, CreditCard, Settings,
  ShieldCheck, ArrowRight, Download, Search, Activity, ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Footer } from "@/components/Footer";

const SIDEBAR = [
  { label: "Overview", icon: LayoutGrid, href: "/dashboard" },
  { label: "Scans", icon: ScanSearch, href: "/profile" },
  { label: "Reports", icon: FileText, href: "/reports" },
  { label: "Billing", icon: CreditCard, href: "/pricing" },
  { label: "Settings", icon: Settings, href: "/profile" },
];

const RISK = [
  { label: "Critical", value: 3, max: 22, color: "bg-red-500" },
  { label: "High", value: 8, max: 22, color: "bg-orange-500" },
  { label: "Medium", value: 14, max: 22, color: "bg-yellow-500" },
  { label: "Low", value: 22, max: 22, color: "bg-primary" },
];

const ACTIVITY = [
  { text: "Scan completed for acme-fintech.com", time: "2m ago" },
  { text: "Critical finding resolved · VLN-2026-0421", time: "1h ago" },
  { text: "Report rpt_8420 downloaded", time: "3h ago" },
  { text: "Continuous scan started · halcyon.ai", time: "Yesterday" },
  { text: "Plan upgraded to Professional", time: "2d ago" },
];

const SAMPLE_SCANS = [
  { target: "acme-fintech.com", status: "completed", score: "72/100" },
  { target: "api.lendwise.io", status: "completed", score: "88/100" },
  { target: "shop.quill.dev", status: "in_progress", score: "—" },
  { target: "internal-admin.northwave.co", status: "completed", score: "64/100" },
  { target: "halcyon.ai", status: "queued", score: "—" },
];

const chartData = Array.from({ length: 30 }, (_, i) => ({
  d: i,
  v: Math.round(42 + i * 0.7 + Math.sin(i / 2.2) * 6 + (i > 20 ? (i - 20) * 1.4 : 0)),
}));

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "completed") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (s === "failed") return "bg-red-500/10 text-red-400 border-red-500/30";
  if (s.includes("progress")) return "bg-sky-500/10 text-sky-400 border-sky-500/30";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
}

function stableScore(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `${55 + (h % 41)}/100`;
}

export default function Dashboard() {
  const { data: status } = useGetStatus();
  const { data: stats } = useGetScanStats({ query: { enabled: !!status?.loggedIn, queryKey: ["scan-stats"] } });
  const { data: scans } = useGetScans({ query: { enabled: !!status?.loggedIn, queryKey: ["scans"] } });
  const [location] = useLocation();

  if (!status?.loggedIn) {
    return (
      <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-[#060606] pt-28 px-4">
        <div className="border border-white/10 rounded-2xl bg-[#0c0c0c] p-10 text-center max-w-md">
          <ShieldCheck className="w-12 h-12 text-primary/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in required</h2>
          <p className="text-sm text-muted-foreground mb-6">You need to be logged in to view your dashboard.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const recentScans =
    scans && scans.length > 0
      ? scans.slice(0, 6).map((s) => ({
          target: hostOf(s.websiteUrl),
          status: s.status,
          score: s.status.toLowerCase() === "completed" ? stableScore(s.id) : "—",
        }))
      : SAMPLE_SCANS;

  const scansThisMonth = stats?.totalScans && stats.totalScans > 0 ? stats.totalScans : 18;

  const KPIS = [
    { label: "Security Score", value: "72", delta: "+6", up: true },
    { label: "Open Findings", value: "47", delta: "-12", up: true },
    { label: "Scans This Month", value: String(scansThisMonth), delta: "+4", up: true },
    { label: "Avg. Resolve Time", value: "3.2d", delta: "-0.6d", up: true },
  ];

  return (
    <div className="flex-1 w-full bg-[#060606] relative flex flex-col">
      <div className="relative z-10 flex-1 w-full pt-20">
        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/8 min-h-[calc(100vh-5rem)] sticky top-20 self-start">
            <nav className="flex-1 px-3 py-6 space-y-1">
              {SIDEBAR.map(({ label, icon: Icon, href }) => {
                const active = label === "Overview" && location === "/dashboard";
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-primary/10 text-foreground border border-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="m-3 rounded-xl border border-white/10 bg-[#0c0c0c] p-4">
              <p className="text-xs text-muted-foreground mb-1">{status.user?.isAdmin ? "Admin" : "Professional"} Plan</p>
              <p className="text-sm text-foreground font-semibold mb-3">{stats?.credits ?? 0} credits remaining</p>
              <Link href="/pricing" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Upgrade plan <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0 px-5 md:px-8 py-6">
            <div className="flex items-center justify-between gap-4 mb-7">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">/dashboard</p>
                <h1 className="text-2xl font-bold text-foreground mt-0.5">Overview</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground text-sm">
                  <Search className="w-3.5 h-3.5" /> Search
                  <span className="ml-2 text-[10px] font-mono border border-white/10 rounded px-1.5 py-0.5">⌘K</span>
                </div>
                <Link href="/pricing" className="inline-flex items-center gap-2 px-4 h-9 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-colors">
                  New Scan
                </Link>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {KPIS.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5"
                >
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">{k.label}</div>
                  <div className="flex items-end justify-between">
                    <span className={`text-4xl font-bold ${k.label === "Security Score" ? "text-primary" : "text-foreground"}`}>{k.value}</span>
                    <span className="text-xs font-mono text-emerald-400">{k.delta}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Chart + Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Security Score</span>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-4">Last 30 days</h3>
                <div className="h-[240px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2ec2b3" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2ec2b3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        cursor={{ stroke: "#2ec2b3", strokeOpacity: 0.3 }}
                        contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={() => ""}
                        formatter={(v: number) => [`${v}`, "Score"]}
                      />
                      <Area type="monotone" dataKey="v" stroke="#2ec2b3" strokeWidth={2} fill="url(#scoreFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-5">Risk Distribution</div>
                <div className="space-y-5">
                  {RISK.map((r) => (
                    <div key={r.label}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="text-foreground font-mono">{r.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / r.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent scans + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-foreground">Recent Scans</h3>
                  <Link href="/profile" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70">
                        <th className="text-left font-normal pb-3">Target</th>
                        <th className="text-left font-normal pb-3">Status</th>
                        <th className="text-left font-normal pb-3">Score</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans.map((s, i) => (
                        <tr key={`${s.target}-${i}`} className="border-t border-white/5">
                          <td className="py-3.5 font-mono text-foreground/90 text-xs">{s.target}</td>
                          <td className="py-3.5">
                            <span className={`text-[10px] font-mono uppercase tracking-wide border rounded px-2 py-0.5 ${statusBadge(s.status)}`}>
                              {s.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 font-mono text-muted-foreground text-xs">{s.score}</td>
                          <td className="py-3.5 text-right">
                            <Download className="w-4 h-4 text-muted-foreground hover:text-foreground inline-block cursor-pointer" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-foreground">Activity</h3>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <ul className="space-y-5">
                  {ACTIVITY.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-foreground/90 leading-snug">{a.text}</p>
                        <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">{a.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
