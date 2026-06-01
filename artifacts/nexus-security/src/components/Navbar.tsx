import { Link, useLocation } from "wouter";
import { useGetStatus, useAdminCheck, useLogout } from "@workspace/api-client-react";
import { Shield, LogOut, Settings, User, ArrowRight, Menu, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Features", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
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
    <div className="fixed top-4 left-0 right-0 z-50 px-4">
      <nav
        className={`container mx-auto max-w-5xl border border-white/10 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-[border-radius] ${
          menuOpen ? "rounded-3xl bg-black/95" : "rounded-full bg-black/60"
        }`}
      >
        <div className="px-5 h-14 flex items-center justify-between gap-6">

          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <Shield className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            <span className="font-bold text-sm tracking-[0.18em] text-foreground group-hover:text-primary transition-colors duration-300">
              NEXUS <span className="text-muted-foreground font-normal">SECURITY</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors duration-200 ${location === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {status?.loggedIn ? (
              <>
                {adminCheck?.isAdmin && (
                  <Link href="/admin" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
                    <Settings className="w-3.5 h-3.5" /> Admin
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/40 hover:border-primary text-sm font-semibold rounded-full transition-colors duration-200">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{firstName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out"
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
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-white text-black rounded-full hover:bg-white/90 transition-all duration-200 shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                >
                  Start Free Scan <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10 overflow-hidden bg-black/95 rounded-b-3xl"
            >
              <div className="px-5 py-4 flex flex-col gap-4">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    {label}
                  </Link>
                ))}
                <div className="h-px bg-white/8" />
                {status?.loggedIn ? (
                  <>
                    {adminCheck?.isAdmin && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground">Admin</Link>
                    )}
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-sm text-foreground">Profile</Link>
                    <button onClick={handleLogout} className="text-sm text-muted-foreground text-left">Log out</button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
                    <Link
                      href="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 text-sm font-semibold bg-white text-black rounded-full px-5 py-2 hover:bg-white/90 w-fit"
                    >
                      Start Free Scan <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
}
