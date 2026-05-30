import { motion } from "framer-motion";
import {
  ShieldCheck, FileSearch, FileText, Network, Cloud, Radar,
} from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";

const CAPABILITIES = [
  {
    icon: ShieldCheck,
    title: "AI Vulnerability Detection",
    desc: "Models trained on millions of CVEs surface unknown attack paths and zero-day patterns in seconds.",
  },
  {
    icon: FileSearch,
    title: "OWASP Security Assessment",
    desc: "Full OWASP Top 10 coverage with deep checks for injection, auth, and broken access control flaws.",
  },
  {
    icon: FileText,
    title: "Penetration Testing Reports",
    desc: "Executive-grade reports with reproducible steps, evidence and CVSS-scored remediation paths.",
  },
  {
    icon: Network,
    title: "API Security Analysis",
    desc: "Schema-aware fuzzing for REST, GraphQL and gRPC. BOLA, rate limit and auth flow validation.",
  },
  {
    icon: Cloud,
    title: "Cloud Infrastructure Audits",
    desc: "AWS, GCP and Azure misconfiguration analysis mapped to CIS benchmarks and best practices.",
  },
  {
    icon: Radar,
    title: "Real-Time Threat Intelligence",
    desc: "Live feeds from 40+ sources continuously correlated with your exposed surface and assets.",
  },
];

export function Capabilities() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(46,194,179,0.05)_0%,transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="flex justify-center mb-5"><SectionBadge>Capabilities</SectionBadge></div>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
            Security infrastructure,
            <span className="block text-muted-foreground/70">reimagined</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            A complete platform that combines AI reasoning with battle-tested security methodology to keep your stack protected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {CAPABILITIES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="group relative rounded-2xl bg-black border border-primary/15 p-8 shadow-[0_0_25px_-6px_rgba(46,194,179,0.18)] hover:border-primary/45 hover:shadow-[0_0_35px_-4px_rgba(46,194,179,0.4)] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center mb-5 group-hover:border-primary/60 group-hover:shadow-[0_0_20px_rgba(46,194,179,0.35)] transition-all duration-300">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
