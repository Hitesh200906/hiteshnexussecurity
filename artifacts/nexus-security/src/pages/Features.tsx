import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Capabilities } from "@/components/sections/Capabilities";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { CtaSection } from "@/components/sections/CtaSection";
import { Footer } from "@/components/Footer";

export default function Features() {
  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      <PageHeader
        badge="Features"
        badgeIcon={ShieldCheck}
        title={<><span className="text-white">Everything you need to</span><span className="block text-muted-foreground/70">stay secure</span></>}
        subtitle="A complete platform that combines AI reasoning with battle-tested security methodology to protect every layer of your stack."
      />
      <Capabilities />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </div>
  );
}
