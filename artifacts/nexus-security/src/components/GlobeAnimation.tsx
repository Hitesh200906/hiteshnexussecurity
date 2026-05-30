import { useEffect, useRef } from "react";

type Particle = { bx: number; by: number; bz: number; sz: number; ph: number };

export function GlobeAnimation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let rot = 0;
    let t = 0;

    const N = 280;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    const pts: Particle[] = Array.from({ length: N }, (_, i) => {
      const by = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - by * by);
      const th = goldenAngle * i;
      return {
        bx: Math.cos(th) * r,
        by,
        bz: Math.sin(th) * r,
        sz: 0.7 + Math.random() * 1.4,
        ph: Math.random() * Math.PI * 2,
      };
    });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rotY = (x: number, z: number, a: number) => ({
      rx: x * Math.cos(a) - z * Math.sin(a),
      rz: x * Math.sin(a) + z * Math.cos(a),
    });

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      rot += 0.0022;
      t += 0.018;

      const R = Math.min(w, h) * 0.4;
      const cx = w * 0.5;
      const cy = h * 0.44;

      type PP = { sx: number; sy: number; depth: number; p: Particle; wave: number; vis: number };
      const pp: PP[] = pts.map(p => {
        const { rx, rz } = rotY(p.bx, p.bz, rot);
        const persp = 1.9 / (1.9 + rz * 0.26);
        const sx = cx + rx * R * persp;
        const sy = cy + p.by * R * persp;
        const vis = Math.max(0, (rz + 1) * 0.5);
        const wave = 0.4 + 0.6 * Math.sin(p.ph + t + p.by * 3.8 + p.bx * 2.2);
        return { sx, sy, depth: rz, p, wave, vis };
      });

      for (const { sx, sy, p, wave, vis } of pp) {
        if (vis < 0.05) continue;
        const alpha = vis * wave;
        const sz = p.sz * vis;
        if (wave > 0.7) {
          const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 4.5);
          gr.addColorStop(0, `rgba(60,230,230,${(alpha * 0.5).toFixed(3)})`);
          gr.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(sx, sy, sz * 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(47,215,215,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, sz), 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ pointerEvents: "none" }} />;
}
