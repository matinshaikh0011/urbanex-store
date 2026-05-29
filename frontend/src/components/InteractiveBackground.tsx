'use client';

import { useEffect, useRef } from 'react';

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const spacing = 80;
    let cols = Math.ceil(width / spacing) + 2;
    let rows = Math.ceil(height / spacing) + 2;

    interface Node {
      ox: number; oy: number;
      x: number;  y: number;
      vx: number; vy: number;
      size: number; alpha: number;
    }

    let nodes: Node[] = [];

    const buildGrid = () => {
      nodes = [];
      cols = Math.ceil(width / spacing) + 2;
      rows = Math.ceil(height / spacing) + 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ox = c * spacing;
          const oy = r * spacing;
          nodes.push({ ox, oy, x: ox, y: oy, vx: 0, vy: 0, size: 1, alpha: 0.03 });
        }
      }
    };

    buildGrid();

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const onMouseLeave = () => { mouseRef.current.active = false; };
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) { canvas.width = width; canvas.height = height; }
      buildGrid();
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const { x: mx, y: my, active } = mouseRef.current;
      const R = 130;

      nodes.forEach(n => {
        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.hypot(dx, dy);
        if (active && dist < R) {
          const f = (R - dist) / R;
          const angle = Math.atan2(dy, dx);
          const tx = n.ox - Math.cos(angle) * f * 14;
          const ty = n.oy - Math.sin(angle) * f * 14;
          n.vx += (tx - n.x) * 0.1;
          n.vy += (ty - n.y) * 0.1;
          n.alpha = 0.03 + f * 0.14;
          n.size  = 1 + f * 1.4;
        } else {
          n.vx += (n.ox - n.x) * 0.06;
          n.vy += (n.oy - n.y) * 0.06;
          n.alpha += (0.03 - n.alpha) * 0.06;
          n.size  += (1 - n.size)  * 0.06;
        }
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx;  n.y += n.vy;
      });

      // Draw grid lines — concrete colour tones
      ctx.lineWidth = 0.6;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = nodes[r * cols + c];
          if (!n) continue;
          const avg = n.alpha;

          if (c < cols - 1) {
            const rn = nodes[r * cols + (c + 1)];
            if (rn) {
              ctx.strokeStyle = `rgba(80,70,60,${(avg + rn.alpha) / 2})`;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(rn.x, rn.y);
              ctx.stroke();
            }
          }
          if (r < rows - 1) {
            const bn = nodes[(r + 1) * cols + c];
            if (bn) {
              ctx.strokeStyle = `rgba(80,70,60,${(avg + bn.alpha) / 2})`;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(bn.x, bn.y);
              ctx.stroke();
            }
          }
        }
      }

      // Draw dots
      nodes.forEach(n => {
        ctx.fillStyle = `rgba(60,50,40,${n.alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
