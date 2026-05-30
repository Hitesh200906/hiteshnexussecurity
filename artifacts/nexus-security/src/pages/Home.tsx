import { Hero } from "@/components/sections/Hero";
import { StatsBar } from "@/components/sections/StatsBar";
import { Capabilities } from "@/components/sections/Capabilities";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ReportShowcase } from "@/components/sections/ReportShowcase";
import { PricingPlans } from "@/components/sections/PricingPlans";
import { Testimonials } from "@/components/sections/Testimonials";
import { CtaSection } from "@/components/sections/CtaSection";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      <Hero />
      <StatsBar />
      <Capabilities />
      <HowItWorks />
      <ReportShowcase />

      <section id="pricing" className="relative py-28 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto px-4 mb-16"
        >
          <div className="inline-block text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground border border-white/10 rounded-full px-4 py-1.5 mb-6">
            Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Pricing built for every team</h2>
          <p className="text-muted-foreground">
            Start with a one-time scan, scale to continuous coverage. No hidden seats. No surprise overages.
          </p>
        </motion.div>
        <PricingPlans />
      </section>

      <Testimonials />
      <CtaSection />
      <Footer />
    </div>
  );
}
