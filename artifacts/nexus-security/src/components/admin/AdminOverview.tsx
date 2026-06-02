import { useGetAdminAnalytics } from "@workspace/api-client-react";
import { Users, Activity, ScanLine, CheckCircle2, Clock, CreditCard, MessageSquare, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type MetricPoint = { label: string; value: number };

function MiniBars({ data, accent = "bg-primary" }: { data: MetricPoint[]; accent?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="w-full flex items-end h-full">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              className={`w-full rounded-t ${accent} min-h-[2px]`}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground/60 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminOverview() {
  const { data: analytics, isLoading } = useGetAdminAnalytics({ query: { queryKey: ["admin-analytics"] } });

  if (isLoading || !analytics) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;
  }

  const kpis = [
    { label: "Total Users", value: analytics.totalUsers, icon: Users },
    { label: "Active Users", value: analytics.activeUsers, icon: Activity },
    { label: "Total Scans", value: analytics.totalScans, icon: ScanLine },
    { label: "Completed", value: analytics.completedScans, icon: CheckCircle2 },
    { label: "Pending Scans", value: analytics.pendingScans, icon: Clock },
    { label: "Revenue", value: analytics.revenue, icon: CreditCard, prefix: "" },
    { label: "Open Tickets", value: analytics.ticketsOpen, icon: MessageSquare },
    { label: "Closed Tickets", value: analytics.ticketsClosed, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{k.label}</span>
              <k.icon className="w-4 h-4 text-primary/70" />
            </div>
            <span className="text-3xl font-bold text-foreground">{k.value.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="User Growth"><MiniBars data={analytics.userGrowth} /></Panel>
        <Panel title="Scan Activity"><MiniBars data={analytics.scanActivity} accent="bg-sky-500/70" /></Panel>
        <Panel title="Revenue"><MiniBars data={analytics.revenueGrowth} accent="bg-emerald-500/70" /></Panel>
        <Panel title="Plan Distribution">
          <div className="space-y-3 pt-2">
            {analytics.planDistribution.map((p) => {
              const total = Math.max(1, analytics.planDistribution.reduce((s, x) => s + x.value, 0));
              return (
                <div key={p.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground/90 capitalize">{p.label}</span>
                    <span className="font-mono text-muted-foreground">{p.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(p.value / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}
