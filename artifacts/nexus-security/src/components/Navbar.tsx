import { Link, useLocation } from "wouter";
import { useGetStatus, useAdminCheck, useLogout } from "@workspace/api-client-react";
import { Shield, LogOut, Settings, User, ArrowRight, Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Features", id: "features" },
  { label: "Pricing", id: "pricing" },
  { label: "Reports", id: "reports" },
  { label: "Contact", id: "contact" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [, setLocation] = useLocation();
  const { data: status } = useGetStatus();
  const { data: adminCheck } = useAdminCheck({ query: { enabled: !!status?.loggedIn, queryKey: ["admin-check"] } });
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    queryClient.clear();
    setLocation("/");
  };

  const firstName = status?.user?.name?.split(" ")[0] || "Profile";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/8 backdrop-blur-xl bg-black/70">
      <div className="container mx-auto px-5 h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <Shield className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
          <span className="font-bold text-sm tracking-widest text-foreground group-hover:text-primary transition-colors duration-300">
            NEXUS SECURITY
          </span>
        </Link>

        {/* Center nav (desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right side (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {status?.loggedIn ? (
            <>
              {adminCheck?.isAdmin && (
                <Link href="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
                  <Settings className="w-3.5 h-3.5" /> Admin
                </Link>
              )}
              <Link href="/profile">
                <motion.div
                  className="relative group cursor-pointer"
                  whileHover="hover"
                  whileTap={{ scale: 0.97 }}
                >
                  <div
                    className="relative flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/50 hover:border-primary text-sm font-semibold rounded-full overflow-hidden select-none transition-colors duration-200"
                  >
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg, transparent 0%, rgba(47,155,155,0.2) 50%, transparent 100%)",
                        translateX: "-100%",
                      }}
                      variants={{ hover: { translateX: "200%" } }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                    <User className="w-3.5 h-3.5 text-primary relative z-10 shrink-0" />
                    <span className="relative z-10 text-foreground">{firstName}</span>
                  </div>
                </motion.div>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 px-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 px-2">
                Login
              </Link>
              <button
                onClick={() => scrollTo("pricing")}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold border border-white/20 rounded-full hover:border-white/40 hover:bg-white/5 transition-all duration-200 text-foreground"
              >
                Start Free Scan <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/8 bg-black/90 overflow-hidden"
          >
            <div className="container mx-auto px-5 py-4 flex flex-col gap-4">
              {NAV_LINKS.map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => { scrollTo(id); setMenuOpen(false); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                >
                  {label}
                </button>
              ))}
              <div className="h-px bg-white/8" />
              {status?.loggedIn ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-sm text-foreground">Profile</Link>
                  <button onClick={handleLogout} className="text-sm text-muted-foreground text-left">Log out</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
                  <button
                    onClick={() => { scrollTo("pricing"); setMenuOpen(false); }}
                    className="flex items-center gap-2 text-sm font-semibold border border-white/20 rounded-full px-5 py-2 hover:border-white/40 text-foreground w-fit"
                  >
                    Start Free Scan <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
