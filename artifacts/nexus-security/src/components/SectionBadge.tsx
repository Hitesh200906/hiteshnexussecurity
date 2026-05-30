import type { LucideIcon } from "lucide-react";

export function SectionBadge({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-primary text-[11px] font-mono tracking-[0.2em] uppercase">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </div>
  );
}
