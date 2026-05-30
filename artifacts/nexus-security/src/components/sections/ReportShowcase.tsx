import { motion } from "framer-motion";
import { Shield, FileText, Target, BadgeCheck } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";

const SEVERITIES = [
  { label: "Critical", count: 3, color: "#ef4444" },
  { label: "High", count: 8, color: "#f97316" },
  { label: "Medium", count: 14, color: "#eab308" },
  { label: "Low", count: 22, color: "#2ec2b3" },
];

const FINDINGS = [
  { sev: "CRITICAL", color: "#ef4444", title: "SQL Injection in /api/users", cvss: "9.8" },
  { sev: "HIGH", color: "#f97316", title: "Missing rate limiting on login", cvss: "7.5" },
  { sev: "HIGH", color: "#f97316", title: "Outdated TLS configuration", cvss: "7.1" },
  { sev: "MEDIUM", color: "#eab308", title: "Reflected XSS in search param", cvss: "5.4" },
];

const TOTAL = SEVERITIES.reduce((a, s) => a + s.count, 0);

const VALUE_PROPS = [
  { icon: Shield, title: "CVSS Scoring", desc: "Every finding scored by severity using the industry-standard CVSS framework." },
  { icon: FileText, title: "Evidence Included", desc: "Screenshots, request/response pairs, and reproduction steps your team can verify." },
  { icon: Target, title: "Remediation Guide", desc: "Line-by-line fix instructions, ordered by risk impact and effort required." },
  { icon: BadgeCheck, title: "Compliance Ready", desc: "Mapped to PCI-DSS, ISO 27001, HIPAA, and GDPR for audit-ready documentation." },
];

export function ReportShowcase({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section className="relative py-24 overflow-hidden border-t border-white/8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgba(46,194,179,0.05)_0%,transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10">
        {showHeader && (
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="flex justify-center mb-5"><SectionBadge>Reports</SectionBadge></div>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
              Reports your security team
              <span className="block text-muted-foreground/70">will actually read</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Beautifully structured, executive-ready reports with CVSS scoring, evidence, and clear remediation steps.
            </p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto rounded-2xl border border-primary/20 bg-black overflow-hidden shadow-[0_0_60px_-8px_rgba(46,194,179,0.3)]"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-sm font-mono text-muted-foreground ml-2">Security Report</span>
            </div>
            <span className="text-xs font-mono text-primary">acme-fintech.com</span>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="flex flex-col items-center">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                  <motion.circle
                    cx="50" cy="50" r="44" fill="none" stroke="#2ec2b3" strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                    whileInView={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - 0.72) }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold font-mono text-foreground">72</span>
                  <span className="text-[10px] font-mono text-muted-foreground tracking-widest">/ 100</span>
                </div>
              </div>
              <span className="mt-3 text-[11px] font-mono tracking-[0.2em] text-muted-foreground uppercase">Security Score</span>
            </div>

            <div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {SEVERITIES.map(s => (
                  <div key={s.label} className="text-center rounded-xl border border-white/8 bg-black/40 py-3">
                    <div className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">Risk Distribution</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden">
                {SEVERITIES.map(s => (
                  <motion.div
                    key={s.label}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(s.count / TOTAL) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{ backgroundColor: s.color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-8">
            <div className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase mb-3">Top Findings</div>
            <div className="space-y-2">
              {FINDINGS.map(f => (
                <div key={f.title} className="flex items-center justify-between gap-4 rounded-lg border border-white/8 bg-black/30 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded shrink-0" style={{ color: f.color, backgroundColor: `${f.color}1a` }}>{f.sev}</span>
                    <span className="text-sm text-foreground truncate">{f.title}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">CVSS {f.cvss}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto mt-12">
          {VALUE_PROPS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="p-6 rounded-xl bg-black border border-primary/15 shadow-[0_0_22px_-6px_rgba(46,194,179,0.18)] hover:border-primary/45 hover:shadow-[0_0_32px_-4px_rgba(46,194,179,0.4)] transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground mb-2">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
