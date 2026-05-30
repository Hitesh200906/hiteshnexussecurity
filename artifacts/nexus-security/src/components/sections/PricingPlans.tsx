import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useGetPlanPrices, useRequestScan, useVerifyCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Code, FileText, ArrowRight, CheckCircle2, Copy, Check,
  Globe, AlertTriangle, Eye, ScanSearch,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScanRequestPlan, ScanRequestVerificationMethod } from "@workspace/api-client-react";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Role is required"),
  companyName: z.string().min(2, "Company name is required"),
  email: z.string().email("Invalid email"),
  websiteUrl: z.string().url("Invalid URL — include https://"),
  businessEmail: z.string().email("Invalid business email"),
});

type PlanCard = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
  contact?: boolean;
};

const PLAN_CARDS: Record<ScanRequestPlan, PlanCard> = {
  basic: {
    name: "Starter",
    price: "₹999",
    period: "/scan",
    description: "For founders and indie hackers running their first audit.",
    features: ["Basic Scan", "PDF Report", "Email Support"],
    cta: "Get Started",
  },
  advanced: {
    name: "Professional",
    price: "₹4,999",
    period: "/month",
    description: "Everything growing teams need to stay continuously protected.",
    features: ["Full Security Audit", "Priority Reports", "AI Recommendations", "API Analysis"],
    cta: "Most Popular",
    popular: true,
  },
  protection: {
    name: "Enterprise",
    price: "Custom",
    description: "Dedicated coverage for regulated environments and large estates.",
    features: ["Dedicated Security Team", "Continuous Monitoring", "Compliance Reports", "Custom Integrations"],
    cta: "Contact Sales",
    contact: true,
  },
};

export function PricingPlans() {
  const { data: plans } = useGetPlanPrices();
  const [selectedPlan, setSelectedPlan] = useState<ScanRequestPlan | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<ScanRequestVerificationMethod | null>(null);
  const requestScan = useRequestScan();
  const verifyCodeMutation = useVerifyCode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const formRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const [scanState, setScanState] = useState<{
    status: "idle" | "verifying_code" | "email_sent" | "completed";
    jobId?: string;
    verificationId?: string;
    verificationCode?: string;
    websiteUrl?: string;
  }>({ status: "idle" });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: "", role: "", companyName: "", email: "", websiteUrl: "", businessEmail: "" },
  });

  const handleSelectPlan = (plan: ScanRequestPlan) => {
    setSelectedPlan(plan);
    setVerificationMethod(null);
    setScanState({ status: "idle" });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedPlan || !verificationMethod) {
      toast({ title: "Select a verification method", variant: "destructive" });
      return;
    }
    try {
      const res = await requestScan.mutateAsync({
        data: { ...values, plan: selectedPlan, verificationMethod },
      });

      if (verificationMethod === "manual" && res.verificationCode) {
        setScanState({
          status: "verifying_code",
          jobId: res.jobId,
          verificationId: res.verificationId || undefined,
          verificationCode: res.verificationCode,
          websiteUrl: values.websiteUrl,
        });
      } else {
        setScanState({ status: "email_sent", jobId: res.jobId });
        toast({ title: "Verification email sent", description: res.message });
      }
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Failed to submit scan request.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scanState.verificationCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Code copied to clipboard" });
  };

  const handleVerifyCode = async () => {
    if (!scanState.verificationId) return;
    try {
      await verifyCodeMutation.mutateAsync({
        data: { verificationId: scanState.verificationId, websiteUrl: scanState.websiteUrl || form.getValues("websiteUrl") },
      });
      setScanState(prev => ({ ...prev, status: "completed" }));
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Verification failed.";
      toast({ title: "Verification Failed", description: msg, variant: "destructive" });
    }
  };

  const FALLBACK_PRICES: Record<ScanRequestPlan, number> = { basic: 0, advanced: 10, protection: 25 };
  const planPrice = (plan: ScanRequestPlan): number =>
    plans ? (plans as Record<ScanRequestPlan, number>)[plan] : FALLBACK_PRICES[plan];

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {(["basic", "advanced", "protection"] as ScanRequestPlan[]).map((planKey, i) => {
          const card = PLAN_CARDS[planKey];
          const isSelected = selectedPlan === planKey;

          return (
            <motion.div
              key={planKey}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-8 bg-black transition-all duration-300 ${
                card.popular
                  ? "border border-primary/50 shadow-[0_0_50px_-8px_rgba(46,194,179,0.45)] lg:-mt-4 lg:mb-4"
                  : isSelected
                    ? "border border-primary shadow-[0_0_45px_-8px_rgba(46,194,179,0.5)]"
                    : "border border-primary/15 shadow-[0_0_25px_-8px_rgba(46,194,179,0.2)] hover:border-primary/40 hover:shadow-[0_0_35px_-6px_rgba(46,194,179,0.35)]"
              }`}
            >
              {card.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full bg-primary text-black text-[10px] font-bold tracking-[0.18em] uppercase shadow-[0_0_24px_rgba(46,194,179,0.5)]">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-5">
                {card.name}
              </div>

              <div className="flex items-end gap-1.5 mb-4">
                <span className="text-5xl font-bold text-foreground leading-none">{card.price}</span>
                {card.period && <span className="text-muted-foreground text-sm mb-1">{card.period}</span>}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-8 min-h-[40px]">
                {card.description}
              </p>

              <ul className="space-y-3.5 mb-10 flex-1">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-foreground/90">
                    <Check className="w-4 h-4 shrink-0 text-primary" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                data-testid={`button-select-plan-${planKey}`}
                onClick={() => (card.contact ? setLocation("/contact") : handleSelectPlan(planKey))}
                className={`w-full rounded-full h-12 text-sm font-semibold ${
                  card.popular
                    ? "bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 border border-white/15 text-foreground hover:bg-white/10 hover:border-white/25"
                }`}
              >
                {isSelected ? "Selected" : card.cta}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <div ref={formRef} className="scroll-mt-24" />

      <AnimatePresence>
        {selectedPlan && scanState.status === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="mt-16 max-w-3xl mx-auto"
          >
            <Card className="border border-white/10 rounded-2xl bg-[#0c0c0c] relative overflow-hidden">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
                    <ScanSearch className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Scan Request</h3>
                    <p className="text-xs text-primary font-mono mt-0.5 uppercase tracking-[0.2em]">
                      Plan: {PLAN_CARDS[selectedPlan].name} — {planPrice(selectedPlan)} credits
                    </p>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {[
                        { name: "fullName" as const, label: "Full Name", placeholder: "Jane Smith" },
                        { name: "role" as const, label: "Role / Title", placeholder: "Security Engineer" },
                        { name: "companyName" as const, label: "Company Name", placeholder: "Acme Corp" },
                        { name: "email" as const, label: "Your Email", placeholder: "jane@example.com" },
                        { name: "websiteUrl" as const, label: "Target Website URL", placeholder: "https://example.com" },
                        { name: "businessEmail" as const, label: "Business Email", placeholder: "security@example.com" },
                      ].map(({ name, label, placeholder }) => (
                        <FormField
                          key={name}
                          control={form.control}
                          name={name}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm text-muted-foreground">{label}</FormLabel>
                              <FormControl>
                                <Input
                                  data-testid={`input-scan-${name}`}
                                  placeholder={placeholder}
                                  className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>

                    <div className="pt-5 border-t border-white/8">
                      <Label className="mb-4 block text-base font-semibold text-foreground">Ownership Verification</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        We need to confirm you own the domain before scanning it.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card
                          data-testid="card-verify-email"
                          onClick={() => setVerificationMethod("email")}
                          className={`cursor-pointer transition-all border rounded-xl p-4 bg-transparent ${verificationMethod === "email"
                            ? "border-primary bg-primary/5"
                            : "border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${verificationMethod === "email" ? "border-primary" : "border-muted-foreground"}`}>
                              {verificationMethod === "email" && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <div className="font-semibold flex items-center gap-2 text-sm">
                                <FileText className="w-4 h-4 text-primary" /> Email Verification
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                We send a confirmation link to your business email. Click it to confirm domain ownership and queue the scan.
                              </p>
                            </div>
                          </div>
                        </Card>
                        <Card
                          data-testid="card-verify-manual"
                          onClick={() => setVerificationMethod("manual")}
                          className={`cursor-pointer transition-all border rounded-xl p-4 bg-transparent ${verificationMethod === "manual"
                            ? "border-primary bg-primary/5"
                            : "border-white/10 hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${verificationMethod === "manual" ? "border-primary" : "border-muted-foreground"}`}>
                              {verificationMethod === "manual" && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div>
                              <div className="font-semibold flex items-center gap-2 text-sm">
                                <Code className="w-4 h-4 text-primary" /> Manual Code
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                We generate a 6-character code. Paste it anywhere on your site (footer, meta tag, hidden div). Our AI crawls your site to verify it's there.
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      data-testid="button-execute-scan"
                      disabled={requestScan.isPending || !verificationMethod}
                      className="w-full h-12 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 mt-2"
                    >
                      {requestScan.isPending ? (
                        <span className="animate-pulse">Initializing Scan...</span>
                      ) : (
                        <span className="flex items-center gap-2">Execute Scan <ArrowRight className="w-4 h-4" /></span>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </Card>
          </motion.div>
        )}

        {scanState.status === "email_sent" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <Card className="border border-primary/30 rounded-2xl bg-[#0c0c0c] p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Verification Email Sent</h3>
              <p className="text-muted-foreground mb-2">
                A confirmation link has been sent to your business email.
              </p>
              <p className="text-muted-foreground mb-8 text-sm">
                Click the link to verify domain ownership and queue your scan. Check your spam folder if you don't see it.
              </p>
              <Button onClick={() => setScanState({ status: "idle" })} variant="outline" className="rounded-full border-primary/40 text-foreground hover:bg-primary/10">
                Submit Another Scan
              </Button>
            </Card>
          </motion.div>
        )}

        {scanState.status === "verifying_code" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <Card className="border border-primary/30 rounded-2xl bg-[#0c0c0c]">
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
                    <Globe className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Ownership Verification</h3>
                  <p className="text-muted-foreground text-sm">
                    Our AI will crawl <span className="text-primary font-mono">{scanState.websiteUrl}</span> to verify this code is present.
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-black text-xs font-bold flex items-center justify-center">1</div>
                    <span className="font-semibold text-sm">Copy your unique verification code</span>
                  </div>
                  <div className="bg-black/60 border border-white/8 rounded-xl p-4 flex items-center justify-between gap-4 font-mono">
                    <span className="text-primary text-2xl tracking-[0.4em] font-bold">{scanState.verificationCode}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="button-copy-code"
                      onClick={handleCopyCode}
                      className="shrink-0 text-muted-foreground hover:text-foreground rounded-full"
                    >
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                      <span className="ml-2 text-xs">{copied ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-black text-xs font-bold flex items-center justify-center">2</div>
                    <span className="font-semibold text-sm">Paste it anywhere on your website</span>
                  </div>
                  <div className="bg-black/40 border border-white/8 rounded-xl p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Choose any of these methods:</p>
                    {[
                      { label: "HTML meta tag (recommended)", code: `<meta name="nexus-verify" content="${scanState.verificationCode}">` },
                      { label: "Visible text anywhere on page", code: scanState.verificationCode! },
                      { label: "Hidden div in footer", code: `<div style="display:none">${scanState.verificationCode}</div>` },
                    ].map(({ label, code }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-1">{label}:</p>
                        <code className="block bg-black/60 border border-white/8 rounded-lg px-3 py-2 text-xs text-primary font-mono break-all">{code}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-black text-xs font-bold flex items-center justify-center">3</div>
                    <span className="font-semibold text-sm">Click verify — our AI checks your site</span>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Make sure the code is live and publicly accessible before clicking verify. Our AI crawler will attempt to fetch and scan the page.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleVerifyCode}
                  data-testid="button-verify-code"
                  disabled={verifyCodeMutation.isPending}
                  className="w-full h-12 rounded-full bg-primary text-black font-semibold hover:bg-primary/90"
                >
                  {verifyCodeMutation.isPending ? (
                    <span className="flex items-center gap-2"><Eye className="w-4 h-4 animate-pulse" /> AI Crawling Website...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> Verify Ownership</span>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {scanState.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <Card className="border border-primary/30 rounded-2xl bg-[#0c0c0c] p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Scan Queued</h3>
              <p className="text-muted-foreground mb-2">
                Ownership verified. Your website has been added to the scan queue.
              </p>
              <p className="text-muted-foreground text-sm mb-8">
                Track progress and download your report from the dashboard once scanning is complete.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setLocation("/profile")} className="rounded-full bg-primary text-black font-semibold hover:bg-primary/90">
                  <span className="flex items-center gap-2">View Dashboard <ArrowRight className="w-4 h-4" /></span>
                </Button>
                <Button onClick={() => { setScanState({ status: "idle" }); setSelectedPlan(null); }} variant="outline" className="rounded-full border-white/15 hover:bg-white/5">
                  New Scan
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
