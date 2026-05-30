import { useState } from "react";
import { useLogin, useSignup, useRegister, useVerifyEmail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Mail, Lock, User, Shield, KeyRound, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetStatusQueryKey, getAdminCheckQueryKey } from "@workspace/api-client-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const verifyEmailMutation = useVerifyEmail();

  const [loginForm, setLoginForm] = useState({ email: "", password: "", rememberMe: false });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  // Two-step signup state
  const [signupStep, setSignupStep] = useState<"form" | "verify">("form");
  const [verificationCode, setVerificationCode] = useState("");

  const invalidateAuth = () => {
    queryClient.invalidateQueries({ queryKey: getGetStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getAdminCheckQueryKey() });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ data: loginForm });
      invalidateAuth();
      toast({ title: "Access Granted", description: "Welcome back, Operator." });
      setLocation("/profile");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Invalid credentials.";
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
    }
  };

  // Step 1: Send 6-digit verification code to email
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    try {
      await registerMutation.mutateAsync({ data: signupForm });
      setSignupStep("verify");
      toast({ title: "Code Sent", description: "Check your email for the 6-digit verification code." });
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Could not send verification code.";
      toast({ title: "Registration Failed", description: msg, variant: "destructive" });
    }
  };

  // Step 2: Submit the verification code to create account
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyEmailMutation.mutateAsync({ data: { email: signupForm.email, code: verificationCode } });
      invalidateAuth();
      toast({ title: "Identity Registered", description: "Your account has been created. Welcome." });
      setLocation("/profile");
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Invalid or expired code.";
      toast({ title: "Verification Failed", description: msg, variant: "destructive" });
    }
  };

  const handleResendCode = async () => {
    try {
      await registerMutation.mutateAsync({ data: signupForm });
      toast({ title: "Code Resent", description: "A new verification code has been sent to your email." });
    } catch {
      toast({ title: "Failed", description: "Could not resend code.", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 w-full min-h-screen flex items-center justify-center relative overflow-hidden bg-[#060606] pt-28 pb-16">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(46,194,179,0.1)_0%,transparent_70%)]" />

      {/* Grid lines */}
      <div className="absolute inset-0 z-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#2ec2b3 1px, transparent 1px), linear-gradient(90deg, #2ec2b3 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <Shield className="w-11 h-11 text-primary mx-auto" />
            <motion.div
              className="absolute inset-0 rounded-full border border-primary/40"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome to Nexus Security</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to access your security dashboard</p>
        </div>

        <Card className="border border-white/10 rounded-2xl bg-[#0c0c0c] shadow-2xl backdrop-blur-xl">
          <Tabs defaultValue="login" className="w-full" onValueChange={() => { setSignupStep("form"); setVerificationCode(""); }}>
            <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 rounded-t-2xl rounded-b-none border-b border-white/8">
              <TabsTrigger value="login" data-testid="tab-login" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs uppercase tracking-wider rounded-lg">Login</TabsTrigger>
              <TabsTrigger value="signup" data-testid="tab-signup" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary text-xs uppercase tracking-wider rounded-lg">Sign Up</TabsTrigger>
            </TabsList>

            <CardContent className="p-6 pt-8">
              {/* ──── LOGIN ──── */}
              <TabsContent value="login" className="m-0 focus-visible:outline-none">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        data-testid="input-login-email"
                        type="email"
                        placeholder="operator@domain.com"
                        className="pl-10 bg-black/50 border-border/50 focus-visible:ring-primary"
                        value={loginForm.email}
                        onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Link href="/contact" className="text-xs text-primary hover:underline font-mono">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type="password"
                        className="pl-10 bg-black/50 border-border/50 focus-visible:ring-primary"
                        value={loginForm.password}
                        onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="remember"
                      checked={loginForm.rememberMe}
                      onCheckedChange={(checked) => setLoginForm(prev => ({ ...prev, rememberMe: !!checked }))}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">Remember my clearance</Label>
                  </div>
                  <Button
                    type="submit"
                    data-testid="button-login"
                    disabled={loginMutation.isPending}
                    className="w-full h-11 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 mt-2"
                  >
                    <div className="font-semibold tracking-wide">
                      {loginMutation.isPending ? "AUTHENTICATING..." : "AUTHORIZE"}
                    </div>
                  </Button>
                </form>

                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/50 px-2 text-muted-foreground font-mono">Or continue with</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-6 bg-black/50 border-border/50 hover:bg-white/5 hover:text-foreground" asChild>
                  <a href="/api/login/google" data-testid="button-google-login">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </a>
                </Button>
              </TabsContent>

              {/* ──── SIGN UP ──── */}
              <TabsContent value="signup" className="m-0 focus-visible:outline-none">
                <AnimatePresence mode="wait">
                  {signupStep === "form" ? (
                    <motion.form
                      key="signup-form"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onSubmit={handleRegister}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            data-testid="input-signup-name"
                            placeholder="John Doe"
                            className="pl-10 bg-black/50 border-border/50"
                            value={signupForm.name}
                            onChange={e => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            data-testid="input-signup-email"
                            type="email"
                            placeholder="operator@domain.com"
                            className="pl-10 bg-black/50 border-border/50"
                            value={signupForm.email}
                            onChange={e => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            data-testid="input-signup-password"
                            type="password"
                            className="pl-10 bg-black/50 border-border/50"
                            value={signupForm.password}
                            onChange={e => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="signup-confirm"
                            data-testid="input-signup-confirm"
                            type="password"
                            className="pl-10 bg-black/50 border-border/50"
                            value={signupForm.confirmPassword}
                            onChange={e => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        data-testid="button-signup"
                        disabled={registerMutation.isPending}
                        className="w-full h-11 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 mt-2"
                      >
                        <div className="font-semibold tracking-wide">
                          {registerMutation.isPending ? "SENDING CODE..." : "ESTABLISH IDENTITY"}
                        </div>
                      </Button>

                      <Button variant="outline" className="w-full bg-black/50 border-border/50 hover:bg-white/5" asChild>
                        <a href="/api/login/google" data-testid="button-google-signup">
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          Continue with Google
                        </a>
                      </Button>
                    </motion.form>
                  ) : (
                    /* ── Email verification step ── */
                    <motion.div
                      key="verify-form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                          <KeyRound className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="font-bold text-foreground text-lg tracking-wide">Verify Your Email</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          A 6-digit code was sent to<br />
                          <span className="text-primary font-mono">{signupForm.email}</span>
                        </p>
                      </div>

                      <form onSubmit={handleVerifyEmail} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="verify-code">Verification Code</Label>
                          <Input
                            id="verify-code"
                            data-testid="input-verify-code"
                            placeholder="000000"
                            maxLength={6}
                            className="text-center text-2xl tracking-[0.5em] font-mono bg-black/50 border-primary/30 focus-visible:ring-primary h-14"
                            value={verificationCode}
                            onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          data-testid="button-verify-email"
                          disabled={verifyEmailMutation.isPending || verificationCode.length !== 6}
                          className="w-full h-11 rounded-full bg-primary text-black font-semibold hover:bg-primary/90"
                        >
                          <div className="font-semibold tracking-wide">
                            {verifyEmailMutation.isPending ? "VERIFYING..." : "CONFIRM IDENTITY"}
                          </div>
                        </Button>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => { setSignupStep("form"); setVerificationCode(""); }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                          >
                            <ArrowLeft className="w-3 h-3" /> Back
                          </button>
                          <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={registerMutation.isPending}
                            className="text-xs text-primary hover:underline font-mono disabled:opacity-50"
                          >
                            Resend code
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
          Protected by Nexus Security encryption protocols
        </p>
      </motion.div>
    </div>
  );
}
