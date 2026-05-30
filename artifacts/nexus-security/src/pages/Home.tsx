import { useState, useRef } from "react";
import { useGetPlanPrices, useRequestScan, useVerifyCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Lock, Code, FileText, Activity, Terminal,
  ArrowRight, CheckCircle2, Copy, Check, Globe, Cpu, BarChart2,
  AlertTriangle, Eye, Layers, ChevronRight, Github, Linkedin, Twitter,
  Zap, Target, Brain, FileSearch, BadgeCheck, Wifi, ScanSearch, Clock,
  ShieldCheck, Mail, MessageSquare, Phone, Fingerprint
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import recon from "@assets/ChatGPT_Image_May_25,_2026,_11_47_50_PM_1779733105196.png";
import crawl from "@assets/ChatGPT_Image_May_25,_2026,_11_50_39_PM_1779733273375.png";
import detection from "@assets/ChatGPT_Image_May_25,_2026,_11_53_49_PM_1779733438254.png";
import reporting from "@assets/ChatGPT_Image_May_25,_2026,_11_55_56_PM_1779733563869.png";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScanRequestPlan, ScanRequestVerificationMethod, PlanPrices } from "@workspace/api-client-react";
import type { LucideIcon } from "lucide-react";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Role is required"),
  companyName: z.string().min(2, "Company name is required"),
  email: z.string().email("Invalid email"),
  websiteUrl: z.string().url("Invalid URL — include https://"),
  businessEmail: z.string().email("Invalid business email"),
});

type PlanDetail = {
  name: string;
  tag: string;
  tagColor: string;
  icon: LucideIcon;
  description: string;
  features: string[];
  notIncluded: string[];
};

const PLAN_DETAILS: Record<ScanRequestPlan, PlanDetail> = {
  basic: {
    name: "Basic",
    tag: "Free",
    tagColor: "text-slate-400 bg-slate-400/10 border-slate-400/30",
    icon: Activity,
    description: "Ideal for quick checks and first-time users.",
    features: [
      "Surface-level scan of first 2–3 pages",
      "Open port detection and service fingerprinting",
      "Missing security headers analysis (CSP, HSTS, X-Frame)",
      "Basic SSL/TLS certificate validation",
    ],
    notIncluded: [
      "Deep crawl and OWASP Top 10",
      "Critical CVE detection",
    ],
  },
  advanced: {
    name: "Advanced",
    tag: "Most Popular",
    tagColor: "text-primary bg-primary/10 border-primary/30",
    icon: Cpu,
    description: "Full website crawl. The choice of serious security teams.",
    features: [
      "Complete website crawl — every page and endpoint",
      "Full OWASP Top 10 coverage including injection flaws",
      "XSS, CSRF, SSRF, and open redirect detection",
      "API endpoint discovery and fuzzing",
      "Severity-sorted HTML report with CVSS scores",
      "Developer-friendly remediation guide per finding",
    ],
    notIncluded: [
      "Critical/zero-day CVE scanning",
      "Compliance mapping (PCI-DSS, ISO 27001)",
    ],
  },
  protection: {
    name: "Protection+",
    tag: "Enterprise Grade",
    tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    icon: Lock,
    description: "Maximum depth. Critical vulnerabilities and compliance.",
    features: [
      "Everything in Advanced, plus:",
      "Deep scan — all subdomains and APIs",
      "Critical CVEs: SQL injection, RCE, LFI detection",
      "Zero-day threat intelligence (CVE database)",
      "Sensitive data exposure and PII leak detection",
      "Compliance mapping: PCI-DSS, HIPAA, ISO 27001, GDPR",
      "Executive summary + technical report",
      "Vulnerability timeline and risk scoring",
      "Priority support with 12-hour response SLA",
    ],
    notIncluded: [],
  },
};

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const { data: plans } = useGetPlanPrices();
  const [selectedPlan, setSelectedPlan] = useState<ScanRequestPlan | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<ScanRequestVerificationMethod | null>(null);
  const requestScan = useRequestScan();
  const verifyCodeMutation = useVerifyCode();
  const { toast } = useToast();
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
    <div className="flex-1 w-full bg-background relative overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-[#080808]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgba(47,155,155,0.06)_0%,transparent_70%)]" />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-6 w-full max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-muted-foreground mb-10 text-xs font-mono tracking-widest uppercase">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              System Online
            </div>

            {/* Headline */}
            <h1 className="font-bold text-center leading-[1.0] tracking-tight mb-7"
              style={{ fontSize: "clamp(3.5rem, 9vw, 7.5rem)" }}>
              <span className="block text-white">AI-Powered</span>
              <span
                className="block"
                style={{
                  background: "linear-gradient(180deg, #c8c8c8 0%, #3a3a3a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Security Analysis
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Detect vulnerabilities before attackers do. Get detailed, actionable security reports
              powered by AI and industry-leading security methodologies.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <button
                onClick={() => scrollTo("pricing")}
                className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200"
              >
                Start Security Scan <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="flex items-center gap-2.5 px-7 py-3.5 border border-white/20 text-foreground font-semibold text-sm rounded-full hover:border-white/40 hover:bg-white/5 transition-all duration-200"
              >
                View Plans
              </button>
            </div>

            {/* Compliance badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {[
                "SOC 2 TYPE II",
                "ISO 27001",
                "OWASP VERIFIED",
                "GDPR COMPLIANT",
              ].map((badge, i, arr) => (
                <div key={badge} className="flex items-center gap-5">
                  <span className="text-xs font-mono tracking-widest text-muted-foreground/50 uppercase">{badge}</span>
                  {i < arr.length - 1 && <span className="text-muted-foreground/25 text-xs">·</span>}
                </div>
              ))}
            </div>

          </motion.div>
        </div>
      </section>

      {/* ── FEATURES — Scan Type Overview ── */}
      <section id="features" className="py-20 border-y border-border/40">
        <div className="container mx-auto px-4">

          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary mb-5 text-xs font-mono tracking-widest uppercase">
              <Shield className="w-3.5 h-3.5" /> Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Built for every security need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three scan depths, one platform. From quick surface checks to deep enterprise-grade audits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Activity,
                title: "Basic Scan",
                sub: "Ideal for quick checks",
                desc: "Rapid passive reconnaissance on first 2–3 pages. Detects obvious misconfigurations, open ports, and exposed services. Free — delivered by email.",
              },
              {
                icon: Cpu,
                title: "Advanced Scan",
                sub: "Most popular",
                desc: "Full website crawl covering OWASP Top 10, injection flaws, XSS, CSRF, and complex logic vulnerabilities. Detailed developer guide included.",
                glow: true,
              },
              {
                icon: Lock,
                title: "Protection+ Scan",
                sub: "Enterprise grade",
                desc: "Deep scan of every endpoint and subdomain. All vulnerability severities including critical CVEs, compliance mapping (PCI-DSS, ISO 27001, GDPR), executive report.",
              },
            ].map(({ icon: Icon, title, sub, desc, glow }) => (
              <Card key={title}
                className={`border rounded-xl transition-all duration-300 bg-[#0d0d0d]
                  ${glow ? "border-primary/40 shadow-[0_0_32px_rgba(47,155,155,0.1)]" : "border-white/8 hover:border-primary/30"}`}>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base font-semibold">{title}</CardTitle>
                  <CardDescription className="text-primary/70 font-mono text-[11px] uppercase tracking-wider">{sub}</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm leading-relaxed">{desc}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW OUR AI WORKS ── */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(47,155,155,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(rgba(47,155,155,0.06) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary mb-5 text-xs font-mono tracking-widest uppercase">
              <Terminal className="w-3.5 h-3.5" /> Methodology
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How Our AI Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              A four-phase methodology that mirrors a real penetration test — automated, accurate, and relentless.
            </p>
          </div>

          <div className="space-y-28">
            {[
              {
                n: "01", tag: "RECONNAISSANCE", img: recon,
                title: <>Mapping the full <span className="text-primary">attack surface</span></>,
                desc: "We map every exposed entry point across your digital footprint — from subdomains and open ports to tech stack fingerprinting and hidden admin panels.",
                reverse: false,
              },
              {
                n: "02", tag: "PAGE-BY-PAGE CRAWL", img: crawl,
                title: <>Deep crawl. <span className="text-primary">No page left behind.</span></>,
                desc: "We crawl every endpoint, form, API route, and JavaScript-rendered page to uncover hidden vulnerabilities others miss.",
                reverse: true,
              },
              {
                n: "03", tag: "VULNERABILITY DETECTION", img: detection,
                title: <>AI-driven tests. <span className="text-primary">Real threats.</span></>,
                desc: "We test every attack vector using AI-driven payloads and validate against OWASP Top 10, CVE database, and proprietary threat signatures.",
                reverse: false,
              },
              {
                n: "04", tag: "SMART REPORTING", img: reporting,
                title: <>Clear findings. <span className="text-primary">Actionable fixes.</span></>,
                desc: "CVSS-scored findings, severity tiers, line-by-line remediation steps, and a fix roadmap ordered by risk impact.",
                reverse: true,
              },
            ].map(({ n, tag, img, title, desc, reverse }) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? "lg:[direction:rtl]" : ""}`}
              >
                <div className={`${reverse ? "lg:[direction:ltr]" : ""}`}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary mb-5 text-xs font-mono tracking-widest">
                    <span className="text-primary/40">{n}</span> {tag}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold leading-tight mb-5">{title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed mb-6">{desc}</p>
                  <div className="h-px bg-gradient-to-r from-primary/40 to-transparent w-24" />
                </div>

                <motion.div
                  className={`relative ${reverse ? "lg:[direction:ltr]" : ""}`}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="rounded-xl overflow-hidden border border-white/8">
                    <img src={img} alt={tag} className="w-full h-auto block" loading="lazy" />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary mb-5 text-xs font-mono tracking-widest uppercase">
              <BarChart2 className="w-3.5 h-3.5" /> Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Choose Your Plan</h2>
            <p className="text-muted-foreground">Select the scan depth that fits your security needs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {(["basic", "advanced", "protection"] as ScanRequestPlan[]).map(planKey => {
              const detail = PLAN_DETAILS[planKey];
              const Icon = detail.icon;
              const price = planPrice(planKey);
              const isSelected = selectedPlan === planKey;
              const isPopular = planKey === "advanced";

              return (
                <motion.div key={planKey} whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="min-w-0">
                  <Card className={`border rounded-xl h-full flex flex-col transition-all duration-300 relative bg-[#0d0d0d]
                    ${isSelected ? "border-primary shadow-[0_0_24px_rgba(47,155,155,0.15)]" : isPopular ? "border-primary/40" : "border-white/8 hover:border-primary/25"}`}>

                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-black text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <CardHeader className="pt-7 pb-3 px-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center">
                          <Icon className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${detail.tagColor}`}>
                          {detail.tag}
                        </span>
                      </div>
                      <CardTitle className="text-base">{detail.name}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">{detail.description}</CardDescription>
                      <div className="mt-3">
                        <span className="text-3xl font-bold font-mono text-foreground">{price}</span>
                        <span className="text-muted-foreground text-xs ml-1.5">
                          {price === 0 ? "credits (Free)" : "credits"}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col gap-3 px-5 pb-5">
                      <ul className="space-y-1.5">
                        {detail.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span className={f.startsWith("Everything") ? "text-primary font-medium" : "text-muted-foreground"}>{f}</span>
                          </li>
                        ))}
                        {detail.notIncluded.map((f, i) => (
                          <li key={`no-${i}`} className="flex items-start gap-2 text-xs opacity-35">
                            <div className="w-3.5 h-3.5 shrink-0 mt-0.5 flex items-center justify-center">
                              <div className="w-2.5 h-px bg-muted-foreground" />
                            </div>
                            <span className="text-muted-foreground line-through">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto pt-4">
                        <Button
                          data-testid={`button-select-plan-${planKey}`}
                          onClick={() => handleSelectPlan(planKey)}
                          size="sm"
                          className={`w-full font-semibold tracking-wide text-xs rounded-full ${isSelected
                            ? "bg-primary text-black hover:bg-primary/90"
                            : "bg-transparent border border-primary/40 text-primary hover:bg-primary/10"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select Plan"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* ── SCAN FORM ── */}
          <AnimatePresence>
            {selectedPlan && scanState.status === "idle" && (
              <motion.div
                ref={formRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="mt-16 max-w-3xl mx-auto"
              >
                <Card className="border border-white/10 rounded-2xl bg-[#0d0d0d] relative overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
                        <ScanSearch className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Scan Request</h3>
                        <p className="text-xs text-primary font-mono mt-0.5 uppercase tracking-widest">
                          Plan: {PLAN_DETAILS[selectedPlan].name} — {planPrice(selectedPlan)} credits
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

                        {/* Verification method */}
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

            {/* ── EMAIL SENT STATE ── */}
            {scanState.status === "email_sent" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-16 max-w-2xl mx-auto"
              >
                <Card className="border border-primary/30 rounded-2xl bg-[#0d0d0d] p-8 text-center">
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

            {/* ── MANUAL CODE PANEL ── */}
            {scanState.status === "verifying_code" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-16 max-w-2xl mx-auto"
              >
                <Card className="border border-primary/30 rounded-2xl bg-[#0d0d0d]">
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

            {/* ── SUCCESS ── */}
            {scanState.status === "completed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-16 max-w-2xl mx-auto"
              >
                <Card className="border border-primary/30 rounded-2xl bg-[#0d0d0d] p-8 text-center">
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
                    Track progress and download your report from the Profile dashboard once scanning is complete.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => window.location.href = "/profile"} className="rounded-full bg-primary text-black font-semibold hover:bg-primary/90">
                      <span className="flex items-center gap-2">View Profile <ArrowRight className="w-4 h-4" /></span>
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
      </section>

      {/* ── REPORTS ── */}
      <section id="reports" className="relative py-24 overflow-hidden border-t border-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(47,155,155,0.04)_0%,transparent_70%)]" />
        <div className="container mx-auto px-4 relative z-10">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary mb-5 text-xs font-mono tracking-widest uppercase">
              <FileSearch className="w-3.5 h-3.5" /> Reports
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Security reports you can <span className="text-primary">act on</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Beautifully structured, executive-ready reports with CVSS scoring, evidence screenshots, and clear remediation steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                title: "CVSS Scoring",
                desc: "Every finding scored by severity — critical, high, medium, low — using the industry-standard CVSS framework.",
              },
              {
                icon: FileText,
                title: "Evidence Included",
                desc: "Screenshots, request/response pairs, and reproduction steps so your team can verify and fix fast.",
              },
              {
                icon: Target,
                title: "Remediation Guide",
                desc: "Line-by-line fix instructions for developers, ordered by risk impact and effort required.",
              },
              {
                icon: BadgeCheck,
                title: "Compliance Ready",
                desc: "Findings mapped to PCI-DSS, ISO 27001, HIPAA, and GDPR controls for audit-ready documentation.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6 border border-white/8 rounded-xl bg-[#0d0d0d] hover:border-primary/25 transition-all duration-300 h-full">
                  <div className="w-10 h-10 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 border-t border-border/40">
        <div className="container mx-auto px-4">

          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/5 text-primary mb-5 text-xs font-mono tracking-widest uppercase">
                <MessageSquare className="w-3.5 h-3.5" /> Contact
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Talk to our security team</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Request a custom audit, get answers about pricing, or discuss compliance needs with our experts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
              {[
                {
                  icon: Mail,
                  title: "Email Us",
                  value: "security@nexussecurity.com",
                  desc: "Typical response within 4 hours",
                },
                {
                  icon: MessageSquare,
                  title: "Live Chat",
                  value: "Available 9am–6pm EST",
                  desc: "Talk to a security analyst directly",
                },
                {
                  icon: Phone,
                  title: "Enterprise Line",
                  value: "+1 (800) NEXUS-SEC",
                  desc: "For teams with 50+ seats",
                },
              ].map(({ icon: Icon, title, value, desc }) => (
                <div key={title} className="p-6 border border-white/8 rounded-xl bg-[#0d0d0d] text-center hover:border-primary/25 transition-all duration-300">
                  <div className="w-12 h-12 rounded-full border border-primary/25 bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-primary font-mono mb-1">{value}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>

            <div className="p-8 border border-white/8 rounded-2xl bg-[#0d0d0d] text-center">
              <Fingerprint className="w-12 h-12 text-primary/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Ready to secure your application?</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Join thousands of engineering teams who trust Nexus Security to find vulnerabilities before attackers do.
              </p>
              <button
                onClick={() => scrollTo("pricing")}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200"
              >
                Start Your Free Scan <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 bg-[#050505]">
        <div className="container mx-auto px-6 pt-14 pb-0">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pb-12">

            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm tracking-widest text-foreground">NEXUS SECURITY</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5 max-w-[220px]">
                AI-powered security analysis built for modern engineering teams. Detect vulnerabilities before attackers do.
              </p>
              <div className="flex items-center gap-2">
                {[
                  { icon: Twitter, label: "Twitter" },
                  { icon: Linkedin, label: "LinkedIn" },
                  { icon: Github, label: "GitHub" },
                ].map(({ icon: Icon, label }) => (
                  <a key={label} href="#" aria-label={label}
                    className="w-8 h-8 border border-white/10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Basic Scan", href: "#pricing" },
                  { label: "Advanced Scan", href: "#pricing" },
                  { label: "Protection+ Scan", href: "#pricing" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: "About Us", href: "#" },
                  { label: "Reports", href: "#reports" },
                  { label: "Blog", href: "#" },
                  { label: "Contact", href: "#contact" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-3">
                {[
                  { label: "Support Center", href: "#" },
                  { label: "Case Studies", href: "#" },
                  { label: "Security Blog", href: "#" },
                  { label: "Community", href: "#" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="h-px bg-white/8" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-5 text-[11px] text-muted-foreground">
            <p>&copy; 2026 Nexus Security. All rights reserved.</p>

            <div className="flex items-center gap-5">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(l => (
                <a key={l} href="#" className="hover:text-foreground transition-colors duration-200">{l}</a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {["GDPR", "ISO 27001", "SOC 2"].map(label => (
                <div key={label} className="flex items-center gap-1 px-2 py-1 border border-white/10 rounded-full">
                  <BadgeCheck className="w-3 h-3 text-primary" />
                  <span className="font-mono text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
