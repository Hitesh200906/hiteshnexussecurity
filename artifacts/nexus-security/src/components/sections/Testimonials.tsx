import { motion } from "framer-motion";
import { SectionBadge } from "@/components/SectionBadge";

const TESTIMONIALS = [
  {
    quote: "Nexus replaced three vendors and a quarterly pen test. Our engineers ship faster knowing the platform has their back.",
    name: "Aarav Mehta",
    role: "CTO, Lendwise",
    tag: "Series B Fintech",
  },
  {
    quote: "The reports look like something McKinsey would hand a board. Our customers' security teams ask for them by name.",
    name: "Priya Shah",
    role: "Founder, Quill API",
    tag: "SaaS Startup",
  },
  {
    quote: "We run continuous scans across 40+ client environments. Nothing has matched Nexus on signal-to-noise.",
    name: "Daniel Okafor",
    role: "Director of Security, Northwave Agency",
    tag: "Agency",
  },
  {
    quote: "An AI co-pilot that actually understands our architecture. Triage time is down 70% across the team.",
    name: "Sofia Lindqvist",
    role: "VP Engineering, Halcyon",
    tag: "Enterprise",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24 overflow-hidden border-t border-white/8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_50%,rgba(46,194,179,0.05)_0%,transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="flex justify-center mb-5"><SectionBadge>Trusted globally</SectionBadge></div>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
            Loved by security and
            <span className="block text-muted-foreground/70">engineering teams</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
              className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-8 hover:border-primary/25 transition-colors duration-300"
            >
              <blockquote className="text-foreground/90 leading-relaxed mb-8 text-[15px]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <cite className="not-italic text-sm font-semibold text-foreground block">{t.name}</cite>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-primary/80 border border-primary/20 rounded-full px-3 py-1">
                  {t.tag}
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
