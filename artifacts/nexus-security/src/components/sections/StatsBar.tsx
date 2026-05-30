import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

type Stat = { value: number; suffix: string; decimals?: number; label: string };

const STATS: Stat[] = [
  { value: 95, suffix: "%", label: "Accuracy Rate" },
  { value: 24, suffix: "h", label: "Average Delivery" },
  { value: 99.9, suffix: "%", decimals: 1, label: "System Uptime" },
];

function Counter({ value, suffix, decimals = 0, run }: Stat & { run: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!run) return;
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, value]);

  const formatted =
    value >= 1000
      ? Math.round(display).toLocaleString()
      : display.toFixed(decimals);

  return (
    <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary font-mono tabular-nums">
      {formatted}{suffix}
    </span>
  );
}

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-20 border-y border-white/8 bg-[#070707]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-10 gap-x-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center"
            >
              <Counter {...s} run={inView} />
              <div className="mt-2 text-[11px] font-mono tracking-[0.2em] text-muted-foreground/70 uppercase">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
