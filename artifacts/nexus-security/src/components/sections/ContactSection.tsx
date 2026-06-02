import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateSupportTicket, useGetStatus } from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLocation } from "wouter";

const INFO = [
  { icon: Mail, label: "Email", value: "security@nexussecurity.com", sub: "Typical response within 4 hours" },
  { icon: Phone, label: "Phone", value: "+1 (800) NEXUS-SEC", sub: "Mon–Fri, 9am–6pm EST" },
  { icon: MapPin, label: "Headquarters", value: "San Francisco, CA", sub: "Remote-first security team" },
  { icon: Clock, label: "Response SLA", value: "12-hour SLA", sub: "For Enterprise customers" },
];

export function ContactSection() {
  const { toast } = useToast();
  const { data: status } = useGetStatus();
  const createTicket = useCreateSupportTicket();
  const [, setLocation] = useLocation();
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", subject: "", company: "", message: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const message = form.company ? `Company: ${form.company}\n\n${form.message}` : form.message;
      await createTicket.mutateAsync({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim() || "General inquiry",
          message,
        },
      });
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", company: "", message: "" });
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Failed to send your request.";
      toast({ title: "Could not submit", description: msg, variant: "destructive" });
    }
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
              Tell us about your stack and compliance needs. Every message opens a support ticket you can track and
              chat on from your profile.
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
                <Input required value={form.name} onChange={set("name")} placeholder="Jane Smith" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Work Email</Label>
                <Input required type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Subject</Label>
                <Input required value={form.subject} onChange={set("subject")} placeholder="Custom audit request" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Company</Label>
                <Input value={form.company} onChange={set("company")} placeholder="Acme Corp" className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">How can we help?</Label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={set("message")}
                placeholder="Tell us about your environment and goals..."
                className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={createTicket.isPending}
              className="w-full h-12 rounded-full bg-primary text-black font-semibold hover:bg-primary/90"
            >
              {createTicket.isPending ? "Submitting..." : <span className="flex items-center gap-2">Send Request <ArrowRight className="w-4 h-4" /></span>}
            </Button>
          </motion.form>
        </div>
      </div>

      <Dialog open={success} onOpenChange={setSuccess}>
        <DialogContent className="glass-panel border-primary/30 max-w-md text-center">
          <div className="flex flex-col items-center pt-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Request submitted</h3>
            <p className="text-sm text-muted-foreground mb-1">
              A support ticket has been opened for your request.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {status?.loggedIn
                ? "Track it and chat with our team from your profile."
                : "We'll reply to your email shortly. Sign in to chat with our team in real time."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {status?.loggedIn ? (
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setLocation("/profile#tickets");
                  }}
                  className="flex-1 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 h-11"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Go to Profile
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setLocation("/login");
                  }}
                  className="flex-1 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 h-11"
                >
                  Sign in
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setSuccess(false)}
                className="flex-1 rounded-full border-white/15 text-foreground hover:bg-white/5 h-11"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
