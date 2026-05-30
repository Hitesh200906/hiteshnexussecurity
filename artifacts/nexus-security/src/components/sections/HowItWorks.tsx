import { motion } from "framer-motion";
import { Crosshair, Cpu, FileCheck } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";

const STEPS = [
  {
    n: "01",
    icon: Crosshair,
    title: "Submit Target",
    desc: "Provide a domain, website URL, or IP address. Our intake adapts to any asset.",
    tags: ["Domain", "Website URL", "IP Address"],
  },
  {
    n: "02",
    icon: Cpu,
    title: "AI Analysis",
    desc: "Our engine orchestrates hundreds of checks while AI agents reason over evidence in real time.",
    tags: ["Vulnerability Scanning", "Security Analysis", "Threat Assessment"],
  },
  {
    n: "03",
    icon: FileCheck,
    title: "Receive Report",
    desc: "A polished, executive-ready report lands in your dashboard with a clear remediation plan.",
    tags: ["Security Score", "Findings", "Remediation Guide"],
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 overflow-hidden border-t border-white/8">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <div className="flex justify-center mb-5"><SectionBadge>How It Works</SectionBadge></div>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
            From input to insight
            <span className="block text-muted-foreground/70">in three steps</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our pipeline takes you from raw target to executive-ready report — without the toil.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 max-w-5xl mx-auto">
          <div className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40" />

          {STEPS.map(({ n, icon: Icon, title, desc, tags }, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center flex flex-col items-center"
            >
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-2xl border border-primary/30 bg-[#0a0a0a] flex items-center justify-center shadow-[0_0_24px_rgba(46,194,179,0.18)]">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 bg-primary text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono">{n}</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">{desc}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {tags.map(tag => (
                  <span key={tag} className="text-[11px] px-3 py-1 rounded-full border border-white/10 bg-white/5 text-muted-foreground">{tag}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
