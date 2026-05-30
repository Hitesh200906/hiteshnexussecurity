import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ContactSection } from "@/components/sections/ContactSection";
import { Footer } from "@/components/Footer";

export default function Contact() {
  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      <PageHeader
        badge="Contact"
        badgeIcon={MessageSquare}
        title={<><span className="text-white">Talk to our</span><span className="block text-muted-foreground/70">security team</span></>}
        subtitle="Request a custom audit, get answers about pricing, or discuss compliance needs with our experts."
      />
      <ContactSection />
      <Footer />
    </div>
  );
}
