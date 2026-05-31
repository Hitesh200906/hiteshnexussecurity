import { useState } from "react";
import { useRequestPasswordReset, useResetPassword } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch, Link } from "wouter";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthShell, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  const { toast } = useToast();

  const requestMutation = useRequestPasswordReset();
  const resetMutation = useResetPassword();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await requestMutation.mutateAsync({ data: { email } });
      setSent(true);
      toast({ title: "Check your email", description: res.message });
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Could not send reset link.";
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
      const res = await resetMutation.mutateAsync({ data: { token: token!, newPassword } });
      toast({ title: "Password reset", description: res.message });
      setLocation("/login");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "This link is invalid or expired.";
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

  // Mode 2: token present — set a new password
  if (token) {
    return (
      <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
        <form onSubmit={handleReset} className="space-y-5">
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
        {backToLogin}
      </AuthShell>
    );
  }

  // Mode 1 (success): link sent confirmation
  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="If an account exists for that email, a secure reset link is on its way.">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-2">
          <MailCheck className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          The link expires in 30 minutes. Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </p>
        {backToLogin}
      </AuthShell>
    );
  }

  // Mode 1: request a reset link
  return (
    <AuthShell title="Reset password" subtitle="We'll email you a secure reset link.">
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
        <AuthSubmit pending={requestMutation.isPending} pendingLabel="Sending..." testId="button-send-reset">
          Send reset link
        </AuthSubmit>
      </form>
      {backToLogin}
    </AuthShell>
  );
}
