import { useState } from "react";
import { useRegister } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, GoogleButton, OrDivider, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    try {
      await registerMutation.mutateAsync({ data: { name, email, password, confirmPassword: password } });
      toast({ title: "Check your email", description: "We sent you a 6-digit verification code." });
      setLocation(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Could not create your account.";
      toast({ title: "Sign up failed", description: msg, variant: "destructive" });
    }
  };

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
