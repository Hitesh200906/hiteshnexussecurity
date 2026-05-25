import { Link, useLocation } from "wouter";
import { useGetStatus, useAdminCheck, useLogout } from "@workspace/api-client-react";
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
          </div>
          <span className="brand-text font-bold text-xl tracking-widest text-foreground group-hover:text-primary transition-colors duration-300">
            NEXUS SECURITY
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-base font-semibold text-foreground hover:text-primary transition-colors duration-200 tracking-wide">
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
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 px-4 py-2 rounded-sm"
              >
                <LogOut className="w-3.5 h-3.5" /> Log Out
              </button>
            </>
          ) : (
            <Link href="/login">
              <motion.div
                className="relative group cursor-pointer"
                whileHover="hover"
                whileTap={{ scale: 0.97 }}
              >
                {/* Button body */}
                <div
                  className="relative flex items-center gap-2.5 px-5 py-2.5 bg-primary/10 border border-primary text-primary-foreground font-bold text-sm tracking-widest overflow-hidden select-none"
                  style={{ clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)" }}
                >
                  {/* Shimmer */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(47,155,155,0.25) 50%, transparent 100%)", translateX: "-100%" }}
                    variants={{ hover: { translateX: "200%" } }}
                    transition={{ duration: 0.55, ease: "easeInOut" }}
                  />

                  {/* Pulsing dot */}
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 pointer-events-none"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />

                  <span className="relative z-10 text-foreground font-bold tracking-widest">ACCESS SYSTEM</span>
                </div>
              </motion.div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
