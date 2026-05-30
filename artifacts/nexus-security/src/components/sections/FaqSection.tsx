import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionBadge } from "@/components/SectionBadge";

const FAQS = [
  {
    q: "How long does a security scan take?",
    a: "Most scans complete within 24 hours. Starter scans are typically delivered in a few hours, while deep Enterprise audits across many subdomains may take up to a full day.",
  },
  {
    q: "Do I need to prove I own the domain?",
    a: "Yes. To prevent abuse we require ownership verification via either an email confirmation link or a unique code you place anywhere on your site. Our AI crawler then confirms it.",
  },
  {
    q: "What standards do you test against?",
    a: "We cover the full OWASP Top 10, CVSS-scored CVEs, and map findings to PCI-DSS, ISO 27001, HIPAA, and GDPR controls on the Enterprise plan.",
  },
  {
    q: "How do credits work?",
    a: "Each scan consumes credits based on the plan depth. You can top up credits at any time from your dashboard, and unused credits never expire.",
  },
  {
    q: "Is my data kept private?",
    a: "Absolutely. Reports are encrypted at rest, accessible only from your dashboard, and never shared. We are SOC 2 Type II and ISO 27001 aligned.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-24 border-t border-white/8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <div className="flex justify-center mb-5"><SectionBadge>FAQ</SectionBadge></div>
          <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4">
            Frequently asked
            <span className="block text-muted-foreground/70">questions</span>
          </h2>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.q} className="border border-white/8 rounded-xl bg-[#0c0c0c] overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-medium text-foreground text-sm">{faq.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 text-primary">
                    <Plus className="w-5 h-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
