import { Link, useLocation } from "wouter";
import { useGetStatus, useAdminCheck, useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { data: status } = useGetStatus();
  const { data: adminCheck } = useAdminCheck({ query: { enabled: !!status?.loggedIn, queryKey: ["admin-check"] } });
  const logout = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    queryClient.clear();
    setLocation("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-primary/20 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <Shield className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 w-6 h-6 text-primary blur-sm opacity-0 group-hover:opacity-60 transition-opacity duration-300">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <span className="brand-text font-bold text-xl tracking-widest text-foreground group-hover:text-primary transition-colors duration-300">
            NEXUS SECURITY
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">
            Home
          </Link>

          {status?.loggedIn ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Link>
              {adminCheck?.isAdmin && (
                <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Admin
                </Link>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="h-9 px-4 border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <motion.div
                className="relative group cursor-pointer"
                whileHover="hover"
                whileTap="tap"
              >
                {/* Outer glow ring */}
                <motion.div
                  className="absolute -inset-0.5 rounded-sm bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-0 blur-sm"
                  variants={{ hover: { opacity: 1 }, tap: { opacity: 0.8 } }}
                  transition={{ duration: 0.2 }}
                />

                {/* Button body */}
                <motion.div
                  className="relative flex items-center gap-2 px-5 py-2.5 bg-black border border-primary/70 text-primary font-bold text-sm tracking-widest overflow-hidden"
                  style={{ clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)" }}
                  variants={{
                    hover: { borderColor: "rgba(47,155,155,1)", backgroundColor: "rgba(47,155,155,0.08)" },
                    tap: { scale: 0.97 },
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full"
                    variants={{ hover: { translateX: "200%" } }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />

                  {/* Scanning line */}
                  <motion.div
                    className="absolute left-0 top-0 h-full w-0.5 bg-primary/70"
                    initial={{ scaleY: 0, opacity: 0 }}
                    variants={{
                      hover: { scaleY: [0, 1, 1, 0], opacity: [0, 1, 1, 0], x: [0, 0, 200, 200] },
                    }}
                    transition={{ duration: 0.5, ease: "linear" }}
                  />

                  {/* Corner accents */}
                  <div className="absolute top-0 left-2 w-2 h-0.5 bg-primary" />
                  <div className="absolute bottom-0 right-2 w-2 h-0.5 bg-primary" />

                  {/* Pulsing dot */}
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <span className="relative z-10">ACCESS SYSTEM</span>

                  {/* Right arrow that slides in on hover */}
                  <motion.span
                    className="relative z-10 text-primary"
                    initial={{ opacity: 0, x: -6 }}
                    variants={{ hover: { opacity: 1, x: 0 } }}
                    transition={{ duration: 0.2 }}
                  >
                    _
                  </motion.span>
                </motion.div>
              </motion.div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
