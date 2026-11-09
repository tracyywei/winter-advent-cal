"use client";

import { useEffect, useRef } from "react";

type Flake = { x: number; y: number; r: number; vy: number; sway: number; swaySpeed: number };

export default function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let flakes: Flake[] = [];

    const flake = (anywhere: boolean): Flake => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r: 1 + Math.random() * 2.6,
      vy: (0.35 + Math.random() * 0.8) * (reduce ? 0.3 : 1),
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.006 + Math.random() * 0.012,
    });

    const resize = () => {
      const widthChanged = innerWidth !== w;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Mobile browsers resize height while scrolling; only reseed on real width changes.
      if (widthChanged) {
        const count = Math.min(220, Math.round((w * h) / (reduce ? 40000 : 7000)));
        flakes = Array.from({ length: count }, () => flake(true));
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.vy;
        f.sway += f.swaySpeed;
        if (f.y > h + 6) Object.assign(f, flake(false));
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${0.45 + f.r / 7})`;
        ctx.arc(f.x + Math.sin(f.sway) * 14, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="va-snow" aria-hidden="true" />;
}
