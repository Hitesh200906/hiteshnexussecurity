import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";

type Plan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "₹999",
    period: "/scan",
    description: "For founders and indie hackers running their first audit.",
    features: ["Basic Scan", "PDF Report", "Email Support"],
    cta: "Get Started",
    href: "/pricing",
  },
  {
    name: "Professional",
    price: "₹4,999",
    period: "/month",
    description: "Everything growing teams need to stay continuously protected.",
    features: ["Full Security Audit", "Priority Reports", "AI Recommendations", "API Analysis"],
    cta: "Most Popular",
    href: "/pricing",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Dedicated coverage for regulated environments and large estates.",
    features: ["Dedicated Security Team", "Continuous Monitoring", "Compliance Reports", "Custom Integrations"],
    cta: "Contact Sales",
    href: "/contact",
  },
];

export function PricingShowcase() {
  return (
    <section className="relative py-24 overflow-hidden border-t border-white/8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_45%_at_50%_0%,rgba(46,194,179,0.06)_0%,transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="flex justify-center mb-5"><SectionBadge>Pricing</SectionBadge></div>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
            Simple pricing,
            <span className="block text-muted-foreground/70">enterprise depth</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Start with a single scan or scale to continuous monitoring across your estate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.popular
                  ? "border border-primary/50 bg-[#0c0c0c] shadow-[0_0_50px_rgba(46,194,179,0.12)] lg:-mt-4 lg:mb-4"
                  : "border border-white/8 bg-[#0a0a0a]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full bg-primary text-black text-[10px] font-bold tracking-[0.18em] uppercase shadow-[0_0_24px_rgba(46,194,179,0.5)]">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-5">
                {plan.name}
              </div>

              <div className="flex items-end gap-1.5 mb-4">
                <span className="text-5xl font-bold text-foreground leading-none">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-8 min-h-[40px]">
                {plan.description}
              </p>

              <ul className="space-y-3.5 mb-10 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-foreground/90">
                    <span className="w-4 h-4 shrink-0 text-primary">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  plan.popular
                    ? "bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                    : "border border-white/15 bg-white/5 text-foreground hover:bg-white/10 hover:border-white/25"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
