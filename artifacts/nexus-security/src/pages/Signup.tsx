import { useState } from "react";
import { useRegister, useVerifyEmail } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { KeyRound, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStatusQueryKey, getAdminCheckQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, GoogleButton, OrDivider, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const registerMutation = useRegister();
  const verifyEmailMutation = useVerifyEmail();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    try {
      await registerMutation.mutateAsync({ data: { name, email, password, confirmPassword: password } });
      setStep("verify");
      toast({ title: "Check your email", description: "We sent you a 6-digit verification code." });
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Could not create your account.";
      toast({ title: "Sign up failed", description: msg, variant: "destructive" });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyEmailMutation.mutateAsync({ data: { email, code } });
      queryClient.invalidateQueries({ queryKey: getGetStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminCheckQueryKey() });
      toast({ title: "Account created", description: "Welcome to Nexus Security." });
      setLocation("/dashboard");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Invalid or expired code.";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    }
  };

  const handleResend = async () => {
    try {
      await registerMutation.mutateAsync({ data: { name, email, password, confirmPassword: password } });
      toast({ title: "Code resent", description: "A new code is on its way." });
    } catch {
      toast({ title: "Could not resend", description: "Please try again.", variant: "destructive" });
    }
  };

  if (step === "verify") {
    return (
      <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${email}.`}>
        <AnimatePresence mode="wait">
          <motion.form
            key="verify"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleVerify}
            className="space-y-5"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm text-muted-foreground">Verification Code</Label>
              <Input
                id="code"
                data-testid="input-verify-code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-black border-primary/30 focus-visible:ring-primary"
              />
            </div>
            <AuthSubmit pending={verifyEmailMutation.isPending} pendingLabel="Verifying..." testId="button-verify">
              Verify &amp; continue
            </AuthSubmit>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setCode(""); }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={registerMutation.isPending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start your first security scan in under a minute.">
      <GoogleButton label="Continue with Google" />
      <OrDivider />
      <form onSubmit={handleRegister} className="space-y-5">
        <AuthField id="name" label="Full name" autoComplete="name" value={name} onChange={setName} required />
        <AuthField id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} required />
        <AuthField id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={setPassword} required />
        <AuthSubmit pending={registerMutation.isPending} pendingLabel="Creating account..." testId="button-signup">
          Create account
        </AuthSubmit>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline" data-testid="link-signin">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
