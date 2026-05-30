import { motion } from "framer-motion";
import { SectionBadge } from "@/components/SectionBadge";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  badge, badgeIcon, title, subtitle, children,
}: {
  badge: string;
  badgeIcon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative pt-36 pb-16 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(46,194,179,0.08)_0%,transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="flex justify-center mb-6"><SectionBadge icon={badgeIcon}>{badge}</SectionBadge></div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] mb-5">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-lg leading-relaxed">{subtitle}</p>}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
