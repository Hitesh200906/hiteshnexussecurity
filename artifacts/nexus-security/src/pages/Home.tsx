import { Hero } from "@/components/sections/Hero";
import { StatsBar } from "@/components/sections/StatsBar";
import { Capabilities } from "@/components/sections/Capabilities";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ReportShowcase } from "@/components/sections/ReportShowcase";
import { Testimonials } from "@/components/sections/Testimonials";
import { CtaSection } from "@/components/sections/CtaSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      <Hero />
      <StatsBar />
      <Capabilities />
      <HowItWorks />
      <ReportShowcase />
      <Testimonials />
      <CtaSection />
      <Footer />
    </div>
  );
}
