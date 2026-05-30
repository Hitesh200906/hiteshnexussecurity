import { useEffect, useRef } from "react";

type Particle = { bx: number; by: number; bz: number; sz: number; ph: number };
type OrbParticle = { angle: number; lat: number; speed: number; dist: number };

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

    const orbs: OrbParticle[] = Array.from({ length: 9 }, () => ({
      angle: Math.random() * Math.PI * 2,
      lat: (Math.random() - 0.5) * 1.4,
      speed: 0.007 + Math.random() * 0.014,
      dist: 1.1 + Math.random() * 0.14,
    }));

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

      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
      grd.addColorStop(0, "rgba(47,155,155,0.08)");
      grd.addColorStop(0.55, "rgba(30,100,100,0.03)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

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

      ctx.lineWidth = 0.5;
      for (let i = 0; i < pp.length; i++) {
        const a = pp[i];
        if (a.vis < 0.1) continue;
        for (let j = i + 1; j < pp.length; j++) {
          const b = pp[j];
          if (b.vis < 0.1) continue;
          const dx = a.p.bx - b.p.bx;
          const dy = a.p.by - b.p.by;
          const dz = a.p.bz - b.p.bz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 0.054) {
            const alpha = Math.min(a.vis, b.vis) * (1 - d2 / 0.054) * 0.14 * Math.min(a.wave, b.wave);
            ctx.strokeStyle = `rgba(47,210,210,${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.stroke();
          }
        }
      }

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

      for (const orb of orbs) {
        orb.angle += orb.speed;
        const ox = Math.cos(orb.angle) * Math.cos(orb.lat) * orb.dist;
        const oy = Math.sin(orb.lat) * orb.dist;
        const oz = Math.sin(orb.angle) * Math.cos(orb.lat) * orb.dist;
        const { rx, rz } = rotY(ox, oz, rot);
        if (rz < -0.1) continue;
        const persp = 1.9 / (1.9 + rz * 0.26);
        const sx = cx + rx * R * persp;
        const sy = cy + oy * R * persp;
        const vis = (rz + 1) * 0.5;
        const gr2 = ctx.createRadialGradient(sx, sy, 0, sx, sy, 4);
        gr2.addColorStop(0, `rgba(100,255,255,${(vis * 0.85).toFixed(3)})`);
        gr2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gr2;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 0.4;
      const gridY = h * 0.66;
      const spacing = 58;
      for (let gx = 0; gx < w; gx += spacing) {
        const wv = Math.sin(t * 0.35 + gx * 0.007) * 7;
        ctx.strokeStyle = "rgba(47,155,155,0.055)";
        ctx.beginPath();
        ctx.moveTo(gx, gridY + wv);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = gridY; gy < h; gy += spacing) {
        const wv = Math.sin(t * 0.22 + gy * 0.009) * 5;
        ctx.strokeStyle = "rgba(47,155,155,0.045)";
        ctx.beginPath();
        ctx.moveTo(0, gy + wv);
        ctx.lineTo(w, gy + wv);
        ctx.stroke();
      }

      const fadeGrd = ctx.createLinearGradient(0, h * 0.85, 0, h);
      fadeGrd.addColorStop(0, "rgba(0,0,0,0)");
      fadeGrd.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = fadeGrd;
      ctx.fillRect(0, h * 0.85, w, h * 0.15);

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
