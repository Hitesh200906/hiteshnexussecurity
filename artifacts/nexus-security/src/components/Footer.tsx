import { Link } from "wouter";
import { Shield, Github, Linkedin, Twitter } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Reports", href: "/reports" },
      { label: "Dashboard", href: "/profile" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Customers", href: "/contact" },
      { label: "Security", href: "/features" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Compliance", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#050505]">
      <div className="container mx-auto px-6 pt-16 pb-0">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 pb-12">

          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm tracking-[0.2em] text-foreground">
                NEXUS <span className="text-muted-foreground font-normal">SECURITY</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-[280px]">
              AI-powered security analysis built for modern engineering teams. Detect vulnerabilities before attackers do.
            </p>
            <div className="flex items-center gap-2">
              {[
                { icon: Github, label: "GitHub" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Twitter, label: "Twitter" },
              ].map(({ icon: Icon, label }) => (
                <a key={label} href="#" aria-label={label}
                  className="w-9 h-9 border border-white/10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-foreground mb-4 uppercase tracking-wider">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{label}</Link>
                    ) : (
                      <a href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">{label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px bg-white/8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-6 text-xs text-muted-foreground">
          <p>&copy; 2026 Nexus Security, Inc. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
