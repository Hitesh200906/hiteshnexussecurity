import { useState } from "react";
import { useGetPlanPrices, useRequestScan, useVerifyCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Zap, Lock, Code, FileText, Activity, Terminal, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScanRequestPlan, ScanRequestVerificationMethod } from "@workspace/api-zod";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Role is required"),
  companyName: z.string().min(2, "Company name is required"),
  email: z.string().email("Invalid email"),
  websiteUrl: z.string().url("Invalid URL"),
  businessEmail: z.string().email("Invalid business email"),
});

export default function Home() {
  const { data: plans } = useGetPlanPrices();
  const [selectedPlan, setSelectedPlan] = useState<ScanRequestPlan | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<ScanRequestVerificationMethod | null>(null);
  const requestScan = useRequestScan();
  const verifyCodeMutation = useVerifyCode();
  const { toast } = useToast();
  
  const [scanState, setScanState] = useState<{
    status: 'idle' | 'verifying_code' | 'completed';
    jobId?: string;
    verificationId?: string;
    verificationCode?: string;
  }>({ status: 'idle' });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      role: "",
      companyName: "",
      email: "",
      websiteUrl: "",
      businessEmail: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedPlan || !verificationMethod) {
      toast({ title: "Please select a plan and verification method", variant: "destructive" });
      return;
    }
    
    try {
      const res = await requestScan.mutateAsync({
        data: {
          ...values,
          plan: selectedPlan,
          verificationMethod,
        }
      });
      
      toast({ title: "Scan Requested", description: res.message });
      
      if (verificationMethod === "manual" && res.verificationCode) {
        setScanState({
          status: 'verifying_code',
          jobId: res.jobId,
          verificationId: res.verificationId || undefined,
          verificationCode: res.verificationCode
        });
      } else {
        setScanState({ status: 'completed', jobId: res.jobId });
      }
    } catch (error: any) {
      toast({ title: "Error requesting scan", description: error.message || "Unknown error", variant: "destructive" });
    }
  }

  const handleVerifyCode = async () => {
    if (!scanState.verificationId) return;
    try {
      await verifyCodeMutation.mutateAsync({
        data: {
          verificationId: scanState.verificationId,
          websiteUrl: form.getValues("websiteUrl"),
        }
      });
      toast({ title: "Verification Successful", description: "Your scan will now begin." });
      setScanState(prev => ({ ...prev, status: 'completed' }));
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message || "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 w-full bg-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary mb-8 text-sm font-mono tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>SYSTEM_ONLINE_</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-foreground brand-text">
            AI-Powered <span className="text-primary glow-primary inline-block">Scan</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Professional vulnerability scanner for security-conscious developers, SMBs, and enterprises. Precise, powerful, and slightly intimidating.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>
              <div className="transform skew-x-12 font-bold tracking-wider flex items-center gap-2">
                INITIATE SCAN <ArrowRight className="w-5 h-5" />
              </div>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Scan Types */}
      <section className="py-24 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="glass-panel border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Activity className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Basic Recon</CardTitle>
                <CardDescription>Surface-level intelligence gathering</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Rapid passive reconnaissance identifying obvious misconfigurations, open ports, and exposed services without aggressive probing.
              </CardContent>
            </Card>
            <Card className="glass-panel border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Code className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Advanced Audit</CardTitle>
                <CardDescription>Deep vulnerability assessment</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Comprehensive automated pentesting covering OWASP Top 10, injection flaws, and complex logic vulnerabilities.
              </CardContent>
            </Card>
            <Card className="glass-panel border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Lock className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Protection+</CardTitle>
                <CardDescription>Continuous defensive posture</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                AI-driven analysis combined with continuous monitoring, zero-day threat intelligence mapping, and architectural review.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold brand-text mb-4">Select Target Vectors</h2>
            <p className="text-muted-foreground">Choose scan intensity and payload depth.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className={`glass-panel border-2 transition-all cursor-pointer ${selectedPlan === 'basic' ? 'border-primary' : 'border-border/50 hover:border-primary/30'}`} onClick={() => setSelectedPlan('basic')}>
              <CardHeader>
                <CardTitle>Basic</CardTitle>
                <CardDescription>Standard security check</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono mb-2">{plans?.basic ?? 0} <span className="text-lg text-muted-foreground font-sans font-normal">CRD</span></div>
              </CardContent>
            </Card>

            <Card className={`glass-panel border-2 transition-all cursor-pointer relative ${selectedPlan === 'advanced' ? 'border-primary shadow-[0_0_30px_rgba(47,155,155,0.2)]' : 'border-primary/50'} animate-pulse-glow`} onClick={() => setSelectedPlan('advanced')}>
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
              </div>
              <CardHeader>
                <CardTitle>Advanced</CardTitle>
                <CardDescription>Deep vulnerability scan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono mb-2">{plans?.advanced ?? 10} <span className="text-lg text-muted-foreground font-sans font-normal">CRD</span></div>
              </CardContent>
            </Card>

            <Card className={`glass-panel border-2 transition-all cursor-pointer ${selectedPlan === 'protection' ? 'border-primary' : 'border-border/50 hover:border-primary/30'}`} onClick={() => setSelectedPlan('protection')}>
              <CardHeader>
                <CardTitle>Protection+</CardTitle>
                <CardDescription>Enterprise grade analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-mono mb-2">{plans?.protection ?? 25} <span className="text-lg text-muted-foreground font-sans font-normal">CRD</span></div>
              </CardContent>
            </Card>
          </div>

          <AnimatePresence>
            {selectedPlan && scanState.status === 'idle' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-16 max-w-3xl mx-auto"
              >
                <Card className="glass-panel border-primary/30 p-8 relative overflow-hidden">
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                  
                  <h3 className="text-2xl font-bold brand-text mb-6">Target Parameters</h3>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" className="bg-card/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <FormControl>
                                <Input placeholder="Security Engineer" className="bg-card/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Acme Corp" className="bg-card/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="john@example.com" className="bg-card/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="websiteUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Website URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com" className="bg-card/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="businessEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Email</FormLabel>
                              <FormControl>
                                <Input placeholder="security@example.com" className="bg-card/50" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="pt-6 border-t border-border/50">
                        <Label className="mb-4 block text-lg font-bold brand-text">Verification Method</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Card className={`glass-panel border-2 cursor-pointer transition-all ${verificationMethod === 'email' ? 'border-primary' : 'border-border/50 hover:border-primary/30'}`} onClick={() => setVerificationMethod('email')}>
                            <CardHeader className="p-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Email Verification
                              </CardTitle>
                              <CardDescription className="text-xs">Send a link to target domain email</CardDescription>
                            </CardHeader>
                          </Card>
                          <Card className={`glass-panel border-2 cursor-pointer transition-all ${verificationMethod === 'manual' ? 'border-primary' : 'border-border/50 hover:border-primary/30'}`} onClick={() => setVerificationMethod('manual')}>
                            <CardHeader className="p-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Code className="w-4 h-4" /> Manual Code
                              </CardTitle>
                              <CardDescription className="text-xs">Place a TXT record or HTML tag</CardDescription>
                            </CardHeader>
                          </Card>
                        </div>
                      </div>

                      <Button type="submit" disabled={requestScan.isPending} className="w-full h-12 transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary mt-8">
                        <div className="transform skew-x-12 font-bold tracking-wider text-lg">
                          {requestScan.isPending ? "INITIALIZING..." : "EXECUTE SCAN"}
                        </div>
                      </Button>
                    </form>
                  </Form>
                </Card>
              </motion.div>
            )}

            {scanState.status === 'verifying_code' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-16 max-w-2xl mx-auto"
              >
                <Card className="glass-panel border-primary/50 p-8 text-center">
                  <Shield className="w-12 h-12 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-bold brand-text mb-4">Ownership Verification</h3>
                  <p className="text-muted-foreground mb-6">
                    Add the following code to a <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">nexus-verify.txt</code> file at the root of your domain.
                  </p>
                  
                  <div className="bg-black/50 p-4 rounded-md border border-border flex items-center justify-between mb-8 font-mono text-sm">
                    <span className="text-foreground">{scanState.verificationCode}</span>
                    <Button variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard.writeText(scanState.verificationCode || '');
                      toast({ title: "Copied to clipboard" });
                    }}>Copy</Button>
                  </div>

                  <Button onClick={handleVerifyCode} disabled={verifyCodeMutation.isPending} className="w-full transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                    <div className="transform skew-x-12 font-bold tracking-wider">
                      {verifyCodeMutation.isPending ? "VERIFYING..." : "CONFIRM VERIFICATION"}
                    </div>
                  </Button>
                </Card>
              </motion.div>
            )}

            {scanState.status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-16 max-w-2xl mx-auto"
              >
                <Card className="glass-panel border-primary/50 p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
                  <h3 className="text-2xl font-bold brand-text mb-4">Scan Initiated</h3>
                  <p className="text-muted-foreground mb-6">
                    Target parameters accepted. The vulnerability scanner is now analyzing your domain.
                    You will be notified when the report is ready.
                  </p>
                  <Button onClick={() => setScanState({ status: 'idle' })} variant="outline" className="transform -skew-x-12 border-primary/50 text-foreground hover:bg-primary/20">
                    <div className="transform skew-x-12">NEW SCAN</div>
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card/30 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold brand-text mb-12">How Our AI Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-bold font-mono">01</div>
              <h4 className="font-bold mb-2">Reconnaissance</h4>
              <p className="text-sm text-muted-foreground">Mapping the attack surface using passive and active footprinting.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-bold font-mono">02</div>
              <h4 className="font-bold mb-2">Analysis</h4>
              <p className="text-sm text-muted-foreground">AI models identify non-standard patterns and logic flaws.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-bold font-mono">03</div>
              <h4 className="font-bold mb-2">Exploitation (Safe)</h4>
              <p className="text-sm text-muted-foreground">Testing identified vectors with zero impact on production stability.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary font-bold font-mono">04</div>
              <h4 className="font-bold mb-2">Reporting</h4>
              <p className="text-sm text-muted-foreground">Generating actionable, developer-friendly remediation steps.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-black py-12 text-center text-muted-foreground">
        <div className="container mx-auto px-4">
          <Shield className="w-8 h-8 text-primary mx-auto mb-6" />
          <p className="brand-text font-bold text-foreground mb-4">NEXUS SECURITY</p>
          <p className="text-sm">Defending the digital frontier.</p>
        </div>
      </footer>
    </div>
  );
}
