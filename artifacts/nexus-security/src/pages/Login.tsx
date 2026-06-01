import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStatusQueryKey, getAdminCheckQueryKey } from "@workspace/api-client-react";
import { AuthShell, GoogleButton, OrDivider, AuthField, AuthSubmit } from "@/components/auth/AuthShell";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ data: { email, password, rememberMe: true } });
      await queryClient.invalidateQueries({ queryKey: getGetStatusQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminCheckQueryKey() });
      setLocation("/");
    } catch (error: any) {
      if (error?.data?.needsVerification) {
        toast({ title: "Verify your email", description: "Enter the code we sent to finish signing in." });
        setLocation(`/verify-email?email=${encodeURIComponent(error?.data?.email || email)}`);
        return;
      }
      const msg = error?.data?.error || error?.message || "Invalid email or password.";
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your dashboard.">
      <GoogleButton label="Continue with Google" />
      <OrDivider />
      <form onSubmit={handleLogin} className="space-y-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          required
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />
        <AuthSubmit pending={loginMutation.isPending} pendingLabel="Signing in...">
          Sign in
        </AuthSubmit>
      </form>

      <div className="flex items-center justify-between mt-6 text-sm">
        <Link href="/reset-password" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-forgot-password">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-create-account">
          Create account &rarr;
        </Link>
      </div>
    </AuthShell>
  );
}
