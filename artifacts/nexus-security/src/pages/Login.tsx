import { useState } from "react";
import { useLogin, useSignup } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Mail, Lock, User, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const signupMutation = useSignup();

  const [loginForm, setLoginForm] = useState({ email: "", password: "", rememberMe: false });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ data: loginForm });
      toast({ title: "Access Granted", description: "Welcome back, Operator." });
      setLocation("/profile");
    } catch (error: any) {
      toast({ title: "Access Denied", description: error.message || "Invalid credentials.", variant: "destructive" });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    try {
      await signupMutation.mutateAsync({ data: signupForm });
      toast({ title: "Identity Registered", description: "Your account has been created." });
      setLocation("/profile");
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "Could not create account.", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 w-full min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden bg-background">
      {/* Canvas background placeholder (particles would go here) */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="text-center mb-8">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold brand-text text-foreground tracking-widest uppercase">Nexus Security</h1>
          <p className="text-sm text-primary font-mono tracking-wider mt-2">AUTHENTICATION_GATEWAY_</p>
        </div>

        <Card className="glass-panel border-primary/20 shadow-2xl backdrop-blur-xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 rounded-t-lg rounded-b-none border-b border-border/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono text-xs uppercase tracking-wider">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono text-xs uppercase tracking-wider">Sign Up</TabsTrigger>
            </TabsList>
            <CardContent className="p-6 pt-8">
              <TabsContent value="login" className="m-0 focus-visible:outline-none">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="login-email" 
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
                      <a href="#" className="text-xs text-primary hover:underline font-mono">Forgot password?</a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="login-password" 
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
                  <Button type="submit" disabled={loginMutation.isPending} className="w-full transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary mt-2">
                    <div className="transform skew-x-12 font-bold tracking-wider">
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
                  <a href="/api/login/google">
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </a>
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="m-0 focus-visible:outline-none">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="signup-name" 
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
                        type="password"
                        className="pl-10 bg-black/50 border-border/50"
                        value={signupForm.confirmPassword}
                        onChange={e => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={signupMutation.isPending} className="w-full transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary mt-2">
                    <div className="transform skew-x-12 font-bold tracking-wider">
                      {signupMutation.isPending ? "REGISTERING..." : "ESTABLISH IDENTITY"}
                    </div>
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}
