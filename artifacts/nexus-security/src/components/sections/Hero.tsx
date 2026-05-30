import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GlobeAnimation } from "@/components/GlobeAnimation";

const COMPLIANCE = ["SOC 2 TYPE II", "ISO 27001", "OWASP VERIFIED", "GDPR COMPLIANT"];

export function Hero() {
  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden pt-44 pb-20">
      <div className="absolute inset-0 bg-black" />
      <GlobeAnimation className="absolute inset-0 w-full h-full" />

      <div className="relative z-10 text-center px-6 w-full max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-muted-foreground mb-10 text-xs font-mono tracking-[0.2em] uppercase">
            <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
            System Online
          </div>

          <h1 className="font-bold text-center leading-[1.0] tracking-tight mb-7"
            style={{ fontSize: "clamp(3.25rem, 9vw, 7.5rem)" }}>
            <span className="block text-white">AI-Powered</span>
            <span className="block"
              style={{
                background: "linear-gradient(180deg, #cdcdcd 0%, #3a3a3a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Security Analysis
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Detect vulnerabilities before attackers do. Get detailed, actionable security reports
            powered by AI and industry-leading security methodologies.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/pricing"
              className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            >
              Start Security Scan <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing"
              className="flex items-center gap-2.5 px-7 py-3.5 border border-white/20 text-foreground font-semibold text-sm rounded-full hover:border-white/40 hover:bg-white/5 transition-all duration-200"
            >
              View Plans
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {COMPLIANCE.map((badge, i) => (
              <div key={badge} className="flex items-center gap-5">
                <span className="text-[11px] font-mono tracking-[0.2em] text-muted-foreground/50 uppercase">{badge}</span>
                {i < COMPLIANCE.length - 1 && <span className="text-muted-foreground/25 text-xs">·</span>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
