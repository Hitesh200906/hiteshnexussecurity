import { useState } from "react";
import { useVerifyEmail, useResendVerification } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch, Link } from "wouter";
import { KeyRound, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStatusQueryKey, getAdminCheckQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, AuthSubmit } from "@/components/auth/AuthShell";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const email = new URLSearchParams(search).get("email") ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verifyEmailMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  const [code, setCode] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyEmailMutation.mutateAsync({ data: { email, code } });
      queryClient.invalidateQueries({ queryKey: getGetStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminCheckQueryKey() });
      toast({ title: "Account verified", description: "Welcome to Nexus Security." });
      setLocation("/dashboard");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Invalid or expired code.";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    }
  };

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync({ data: { email } });
      toast({ title: "Code resent", description: "A new code is on its way." });
    } catch {
      toast({ title: "Could not resend", description: "Please try again.", variant: "destructive" });
    }
  };

  if (!email) {
    return (
      <AuthShell title="Verify your email" subtitle="We couldn't find an email to verify.">
        <p className="text-sm text-muted-foreground text-center">
          Please{" "}
          <Link href="/signup" className="text-primary hover:underline">sign up</Link>{" "}
          or{" "}
          <Link href="/login" className="text-primary hover:underline">sign in</Link>{" "}
          again.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code we sent to ${email}.`}>
      <motion.form
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
          <Link
            href="/login"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendMutation.isPending}
            className="text-primary hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
      </motion.form>
    </AuthShell>
  );
}
