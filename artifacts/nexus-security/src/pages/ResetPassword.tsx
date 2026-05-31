import { useState } from "react";
import { useForgotPassword, useResetPassword } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const forgotMutation = useForgotPassword();
  const resetMutation = useResetPassword();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await forgotMutation.mutateAsync({ data: { email } });
      toast({ title: "Check your email", description: res.message });
      setStep("reset");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Could not send reset code.";
      toast({ title: "Something went wrong", description: msg, variant: "destructive" });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Confirm your new password.", variant: "destructive" });
      return;
    }
    try {
      const res = await resetMutation.mutateAsync({ data: { email, code, newPassword } });
      toast({ title: "Password reset", description: res.message });
      setLocation("/login");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "This code is invalid or expired.";
      toast({ title: "Reset failed", description: msg, variant: "destructive" });
    }
  };

  const backToLogin = (
    <div className="text-center mt-6">
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back-to-login">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to login
      </Link>
    </div>
  );

  // Step 2: enter the emailed code + choose a new password
  if (step === "reset") {
    return (
      <AuthShell title="Set a new password" subtitle={`Enter the code we sent to ${email} and choose a new password.`}>
        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-code" className="text-sm text-muted-foreground">Reset code</Label>
            <Input
              id="reset-code"
              data-testid="input-reset-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-black border-primary/30 focus-visible:ring-primary"
            />
          </div>
          <AuthField
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
            required
            testId="input-new-password"
          />
          <AuthField
            id="confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            testId="input-confirm-password"
          />
          <AuthSubmit pending={resetMutation.isPending} pendingLabel="Saving..." testId="button-reset-password">
            Reset password
          </AuthSubmit>
        </form>
        <div className="flex items-center justify-center mt-5 text-sm">
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Use a different email
          </button>
        </div>
        {backToLogin}
      </AuthShell>
    );
  }

  // Step 1: request a reset code by email
  return (
    <AuthShell title="Reset password" subtitle="We'll email you a 6-digit reset code.">
      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-5">
        <KeyRound className="w-6 h-6 text-primary" />
      </div>
      <form onSubmit={handleRequest} className="space-y-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />
        <AuthSubmit pending={forgotMutation.isPending} pendingLabel="Sending..." testId="button-send-reset">
          Send reset code
        </AuthSubmit>
      </form>
      <div className="flex items-center justify-center mt-5 text-sm">
        <button
          type="button"
          onClick={() => setStep("reset")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          I already have a code
        </button>
      </div>
      {backToLogin}
    </AuthShell>
  );
}
