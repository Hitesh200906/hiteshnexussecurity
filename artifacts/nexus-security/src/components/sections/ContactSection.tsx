import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const INFO = [
  { icon: Mail, label: "Email", value: "security@nexussecurity.com", sub: "Typical response within 4 hours" },
  { icon: Phone, label: "Phone", value: "+1 (800) NEXUS-SEC", sub: "Mon–Fri, 9am–6pm EST" },
  { icon: MapPin, label: "Headquarters", value: "San Francisco, CA", sub: "Remote-first security team" },
  { icon: Clock, label: "Response SLA", value: "12-hour SLA", sub: "For Enterprise customers" },
];

export function ContactSection() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast({ title: "Request received", description: "Our security team will reach out shortly." });
  };

  return (
    <section className="relative py-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-5">
              Request a
              <span className="block text-muted-foreground/70">security audit</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-10 max-w-md">
              Tell us about your stack and compliance needs. Our security engineers will scope a custom audit and get back to you fast.
            </p>

            <div className="space-y-5">
              {INFO.map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono tracking-[0.2em] text-muted-foreground uppercase">{label}</div>
                    <div className="text-foreground font-medium text-sm">{value}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="p-8 border border-white/10 rounded-2xl bg-[#0c0c0c] space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Full Name</Label>
                <Input required placeholder="Jane Smith" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Work Email</Label>
                <Input required type="email" placeholder="jane@company.com" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Company</Label>
              <Input required placeholder="Acme Corp" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">How can we help?</Label>
              <textarea
                required
                rows={4}
                placeholder="Tell us about your environment and goals..."
                className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={sent}
              className="w-full h-12 rounded-full bg-primary text-black font-semibold hover:bg-primary/90"
            >
              {sent ? "Request Sent" : <span className="flex items-center gap-2">Send Request <ArrowRight className="w-4 h-4" /></span>}
            </Button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
