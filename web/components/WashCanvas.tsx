"use client";

import { useEffect, useRef } from "react";

/** Scroll-linked frame-by-frame luxury wash animation. */
export default function WashCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const maxScroll = Math.max(1, document.body.scrollHeight - innerHeight);
      const p = Math.min(1, scrollY / maxScroll);
      ctx.clearRect(0, 0, w, h);

      // night garage gradient
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0b1018");
      g.addColorStop(1, "#050608");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // floor reflection
      ctx.fillStyle = `rgba(201,162,39,${0.04 + p * 0.08})`;
      ctx.fillRect(0, h * 0.72, w, h * 0.28);

      const cx = w * 0.5;
      const cy = h * 0.58;
      const scale = Math.min(w, h) * 0.0011;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // car body
      ctx.fillStyle = `hsl(${210 + p * 20}, 12%, ${12 + p * 18}%)`;
      roundPath(ctx, -220, -40, 440, 90, 28);
      ctx.fill();
      ctx.fillStyle = "#1a2230";
      roundPath(ctx, -140, -88, 250, 60, 18);
      ctx.fill();

      // windows gleam
      ctx.fillStyle = `rgba(180,210,255,${0.15 + p * 0.35})`;
      ctx.beginPath();
      ctx.moveTo(-120, -78);
      ctx.lineTo(80, -78);
      ctx.lineTo(70, -40);
      ctx.lineTo(-130, -40);
      ctx.closePath();
      ctx.fill();

      // wheels
      wheel(ctx, -140, 55, 38, p);
      wheel(ctx, 140, 55, 38, p);

      // water arcs
      const drops = 40;
      for (let i = 0; i < drops; i++) {
        const t = (i / drops + p * 3) % 1;
        const x = -240 + t * 480 + Math.sin(i * 12 + p * 8) * 20;
        const y = -160 + t * 260;
        ctx.fillStyle = `rgba(180,220,255,${0.15 + (1 - t) * 0.45})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 10, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // foam
      ctx.globalAlpha = Math.min(1, p * 1.4);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.08 + (i % 3) * 0.04})`;
        ctx.beginPath();
        ctx.arc(-180 + i * 22, -20 + Math.sin(p * 12 + i) * 8, 10 + (i % 4) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // gold wash bar moving
      const barX = -260 + p * 520;
      ctx.fillStyle = "rgba(201,162,39,0.85)";
      ctx.fillRect(barX, -120, 8, 200);
      ctx.fillStyle = "rgba(201,162,39,0.15)";
      ctx.fillRect(barX - 40, -120, 80, 200);

      ctx.restore();

      // shine overlay
      ctx.fillStyle = `rgba(255,255,255,${0.02 + p * 0.06})`;
      ctx.fillRect(0, 0, w, h * 0.4);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden />;
}

function roundPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number) {
  ctx.fillStyle = "#0a0a0c";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(201,162,39,${0.4 + p * 0.5})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
}
