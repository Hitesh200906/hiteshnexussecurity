import { useGetStatus, useGetScanStats, useGetScans, useGetReports } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid, ScanSearch, FileText, CreditCard, Settings,
  ShieldCheck, ArrowRight, Download, ArrowUpRight, ScanLine, Activity, CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";

const SIDEBAR = [
  { label: "Overview", icon: LayoutGrid, href: "/dashboard" },
  { label: "Scans", icon: ScanSearch, href: "/profile" },
  { label: "Reports", icon: FileText, href: "/reports" },
  { label: "Billing", icon: CreditCard, href: "/pricing" },
  { label: "Settings", icon: Settings, href: "/profile" },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "completed") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (s === "failed") return "bg-red-500/10 text-red-400 border-red-500/30";
  if (s.includes("progress")) return "bg-sky-500/10 text-sky-400 border-sky-500/30";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
}

export default function Dashboard() {
  const { data: status } = useGetStatus();
  const { data: stats } = useGetScanStats({ query: { enabled: !!status?.loggedIn, queryKey: ["scan-stats"] } });
  const { data: scans } = useGetScans({ query: { enabled: !!status?.loggedIn, queryKey: ["scans"] } });
  const { data: reports } = useGetReports({ query: { enabled: !!status?.loggedIn, queryKey: ["reports"] } });
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

  const recentScans = (scans ?? []).slice(0, 6);
  const recentReports = (reports ?? []).slice(0, 6);

  const KPIS = [
    { label: "Total Scans", value: stats?.totalScans ?? 0, icon: ScanLine },
    { label: "Active Scans", value: stats?.activeScans ?? 0, icon: Activity },
    { label: "Completed Scans", value: stats?.completedScans ?? 0, icon: CheckCircle2 },
    { label: "Reports Available", value: stats?.reportsAvailable ?? 0, icon: FileText },
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
              <p className="text-xs text-muted-foreground mb-1">Credits</p>
              <p className="text-sm text-foreground font-semibold mb-3">{stats?.credits ?? 0} credits remaining</p>
              <Link href="/pricing" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Buy more <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0 px-5 md:px-8 py-6">
            <div className="flex items-center justify-between gap-4 mb-7">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">/dashboard</p>
                <h1 className="text-2xl font-bold text-foreground mt-0.5">
                  Welcome back, {status.user?.name?.split(" ")[0] || "there"}
                </h1>
              </div>
              <Link href="/pricing" className="inline-flex items-center gap-2 px-4 h-9 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-colors">
                New Scan
              </Link>
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
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{k.label}</span>
                    <k.icon className="w-4 h-4 text-primary/70" />
                  </div>
                  <span className="text-4xl font-bold text-foreground">{k.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Recent scans + Recent reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-foreground">Recent Scans</h3>
                  <Link href="/profile" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentScans.length === 0 ? (
                  <div className="py-10 text-center">
                    <ScanSearch className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">No scans yet.</p>
                    <Link href="/pricing" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      Start your first scan <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70">
                          <th className="text-left font-normal pb-3">Target</th>
                          <th className="text-left font-normal pb-3">Plan</th>
                          <th className="text-left font-normal pb-3">Status</th>
                          <th className="text-left font-normal pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentScans.map((s) => (
                          <tr key={s.id} className="border-t border-white/5">
                            <td className="py-3.5 font-mono text-foreground/90 text-xs">{hostOf(s.websiteUrl)}</td>
                            <td className="py-3.5 text-muted-foreground text-xs capitalize">{s.plan}</td>
                            <td className="py-3.5">
                              <span className={`text-[10px] font-mono uppercase tracking-wide border rounded px-2 py-0.5 ${statusBadge(s.status)}`}>
                                {s.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-muted-foreground text-xs">{fmtDate(s.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-foreground">Recent Reports</h3>
                  <Link href="/reports" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                {recentReports.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No reports yet. Reports appear here once a scan completes.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70">
                          <th className="text-left font-normal pb-3">Target</th>
                          <th className="text-left font-normal pb-3">Plan</th>
                          <th className="text-left font-normal pb-3">Date</th>
                          <th className="pb-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentReports.map((r) => (
                          <tr key={r.id} className="border-t border-white/5">
                            <td className="py-3.5 font-mono text-foreground/90 text-xs">{r.websiteUrl ? hostOf(r.websiteUrl) : "—"}</td>
                            <td className="py-3.5 text-muted-foreground text-xs capitalize">{r.plan ?? "—"}</td>
                            <td className="py-3.5 font-mono text-muted-foreground text-xs">{fmtDate(r.createdAt)}</td>
                            <td className="py-3.5 text-right">
                              {r.pdfUrl ? (
                                <a href={r.pdfUrl} target="_blank" rel="noreferrer">
                                  <Download className="w-4 h-4 text-muted-foreground hover:text-foreground inline-block cursor-pointer" />
                                </a>
                              ) : (
                                <Download className="w-4 h-4 text-muted-foreground/30 inline-block" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
