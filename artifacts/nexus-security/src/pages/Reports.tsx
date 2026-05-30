import { FileSearch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ReportShowcase } from "@/components/sections/ReportShowcase";
import { CtaSection } from "@/components/sections/CtaSection";
import { Footer } from "@/components/Footer";

export default function Reports() {
  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      <PageHeader
        badge="Reports"
        badgeIcon={FileSearch}
        title={<><span className="text-white">Security reports</span><span className="block text-muted-foreground/70">you can act on</span></>}
        subtitle="Executive-ready reports with CVSS scoring, evidence screenshots, and clear remediation steps your team will actually read."
      />
      <ReportShowcase showHeader={false} />
      <CtaSection />
      <Footer />
    </div>
  );
}
