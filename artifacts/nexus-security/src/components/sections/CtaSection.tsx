import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative py-28 overflow-hidden border-t border-white/8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(46,194,179,0.1)_0%,transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto rounded-3xl border border-white/10 bg-black px-6 py-20 sm:px-12 text-center overflow-hidden shadow-[0_0_70px_-20px_rgba(46,194,179,0.35)]"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-1/3 bg-primary blur-[6px] opacity-70" />
          <h2 className="text-5xl md:text-6xl font-bold leading-[1.05] mb-5">
            <span className="block text-white">Ship faster.</span>
            <span className="block"
              style={{
                background: "linear-gradient(180deg, #cdcdcd 0%, #3a3a3a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Sleep better.
            </span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10">
            Join thousands of engineering teams who trust Nexus Security to find vulnerabilities before attackers do.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/pricing"
              className="flex items-center gap-2.5 px-8 py-4 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200 shadow-[0_0_40px_rgba(255,255,255,0.18)]"
            >
              Start Free Scan <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact"
              className="flex items-center gap-2.5 px-8 py-4 border border-white/20 text-foreground font-semibold text-sm rounded-full hover:border-white/40 hover:bg-white/5 transition-all duration-200"
            >
              Talk to Sales
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
