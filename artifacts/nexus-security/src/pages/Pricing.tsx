import { BarChart2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PricingPlans } from "@/components/sections/PricingPlans";
import { FaqSection } from "@/components/sections/FaqSection";
import { Footer } from "@/components/Footer";

export default function Pricing() {
  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      <PageHeader
        badge="Pricing"
        badgeIcon={BarChart2}
        title={<><span className="text-white">Simple, transparent</span><span className="block text-muted-foreground/70">pricing</span></>}
        subtitle="Select the scan depth that fits your security needs. Pay with credits — top up anytime, and unused credits never expire."
      />
      <section className="pb-24">
        <PricingPlans />
      </section>
      <FaqSection />
      <Footer />
    </div>
  );
}
