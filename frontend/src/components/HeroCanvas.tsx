'use client';

import { useEffect, useRef } from 'react';

/**
 * HeroCanvas — Redesigned background with flowing gradient mesh,
 * geometric shapes, and neon grid effects.
 */

interface GeoShape {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  type: 'hexagon' | 'circle' | 'diamond' | 'line';
  alpha: number;
  color: [number, number, number];
  pulsePhase: number;
}

interface FlowLine {
  points: { x: number; y: number }[];
  speed: number;
  width: number;
  color: [number, number, number];
  alpha: number;
  offset: number;
}

const SHAPE_COUNT = 18;
const FLOW_LINE_COUNT = 8;
const MOUSE_RADIUS = 250;

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const shapesRef = useRef<GeoShape[]>([]);
  const flowLinesRef = useRef<FlowLine[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const w = () => canvas.width / dpr;
    const h = () => canvas.height / dpr;

    // Color palette
    const shapeColors: [number, number, number][] = [
      [214, 0, 0],     // crimson
      [180, 20, 10],   // deep red
      [40, 40, 40],    // dark grey
      [80, 0, 0],      // dark red
      [160, 155, 145], // warm grey
    ];

    // Initialize geometric shapes
    shapesRef.current = Array.from({ length: SHAPE_COUNT }, () => {
      const types: GeoShape['type'][] = ['hexagon', 'circle', 'diamond', 'line'];
      return {
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 30 + 10,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        type: types[Math.floor(Math.random() * types.length)],
        alpha: Math.random() * 0.08 + 0.02,
        color: shapeColors[Math.floor(Math.random() * shapeColors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    // Initialize flow lines (sinusoidal curves that drift across)
    flowLinesRef.current = Array.from({ length: FLOW_LINE_COUNT }, (_, i) => {
      const pts = [];
      const segments = 20;
      for (let j = 0; j <= segments; j++) {
        pts.push({ x: (j / segments) * 2200 - 100, y: 0 });
      }
      return {
        points: pts,
        speed: Math.random() * 0.3 + 0.1,
        width: Math.random() * 1.5 + 0.3,
        color: i < 3 ? [214, 0, 0] as [number, number, number] : [60, 60, 60] as [number, number, number],
        alpha: Math.random() * 0.06 + 0.01,
        offset: (i / FLOW_LINE_COUNT) * Math.PI * 2,
      };
    });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Draw hexagon
    const drawHexagon = (cx: number, cy: number, size: number, rotation: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + rotation;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // Draw diamond
    const drawDiamond = (cx: number, cy: number, size: number, rotation: number) => {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + rotation;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const animate = () => {
      const cw = w();
      const ch = h();
      ctx.clearRect(0, 0, cw, ch);
      timeRef.current += 1;
      const t = timeRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ========== LAYER 1: Gradient mesh orbs ==========
      // Large soft orbs that drift and blend
      const orbData = [
        { cx: cw * 0.2, cy: ch * 0.3, r: 350, color: [214, 0, 0], phase: 0 },
        { cx: cw * 0.8, cy: ch * 0.6, r: 300, color: [40, 0, 0], phase: 2 },
        { cx: cw * 0.5, cy: ch * 0.8, r: 280, color: [20, 20, 20], phase: 4 },
        { cx: cw * 0.15, cy: ch * 0.7, r: 200, color: [160, 0, 0], phase: 1 },
        { cx: cw * 0.9, cy: ch * 0.2, r: 250, color: [80, 0, 0], phase: 3 },
      ];

      for (const orb of orbData) {
        const drift = Math.sin(t * 0.005 + orb.phase) * 30;
        const driftY = Math.cos(t * 0.004 + orb.phase) * 20;
        const breathe = 1 + Math.sin(t * 0.008 + orb.phase) * 0.15;
        const ox = orb.cx + drift;
        const oy = orb.cy + driftY;
        const or = orb.r * breathe;

        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
        grad.addColorStop(0, `rgba(${orb.color[0]}, ${orb.color[1]}, ${orb.color[2]}, 0.06)`);
        grad.addColorStop(0.5, `rgba(${orb.color[0]}, ${orb.color[1]}, ${orb.color[2]}, 0.025)`);
        grad.addColorStop(1, `rgba(${orb.color[0]}, ${orb.color[1]}, ${orb.color[2]}, 0)`);

        ctx.beginPath();
        ctx.arc(ox, oy, or, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // ========== LAYER 2: Flow lines — sinusoidal curves ==========
      for (const line of flowLinesRef.current) {
        ctx.beginPath();
        ctx.lineWidth = line.width;
        const baseY = ch * 0.5;

        for (let i = 0; i < line.points.length; i++) {
          const pt = line.points[i];
          const nx = (pt.x / cw);
          const flowy = baseY + Math.sin(nx * 4 + t * 0.012 * line.speed + line.offset) * 120
                             + Math.sin(nx * 7 + t * 0.008 + line.offset * 2) * 40;

          if (i === 0) ctx.moveTo(pt.x, flowy);
          else ctx.lineTo(pt.x, flowy);
        }

        ctx.strokeStyle = `rgba(${line.color[0]}, ${line.color[1]}, ${line.color[2]}, ${line.alpha})`;
        ctx.stroke();
      }

      // ========== LAYER 3: Geometric shapes ==========
      const shapes = shapesRef.current;
      for (const s of shapes) {
        const pulse = Math.sin(t * 0.015 + s.pulsePhase);
        const currentAlpha = s.alpha + pulse * 0.02;

        // Mouse interaction — gentle push
        if (mx > 0 && my > 0) {
          const dx = mx - s.x;
          const dy = my - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.015;
            s.vx -= (dx / dist) * force;
            s.vy -= (dy / dist) * force;
          }
        }

        // Update position
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.rotationSpeed;

        // Wrap edges
        if (s.x < -50) s.x = cw + 50;
        if (s.x > cw + 50) s.x = -50;
        if (s.y < -50) s.y = ch + 50;
        if (s.y > ch + 50) s.y = -50;

        // Dampen
        s.vx *= 0.999;
        s.vy *= 0.999;

        ctx.save();
        ctx.globalAlpha = Math.max(0, currentAlpha);

        if (s.type === 'hexagon') {
          drawHexagon(s.x, s.y, s.size, s.rotation);
          ctx.strokeStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 1)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (s.type === 'circle') {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 1)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (s.type === 'diamond') {
          drawDiamond(s.x, s.y, s.size, s.rotation);
          ctx.strokeStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 1)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (s.type === 'line') {
          ctx.beginPath();
          const lx = s.size * 2 * Math.cos(s.rotation);
          const ly = s.size * 2 * Math.sin(s.rotation);
          ctx.moveTo(s.x - lx, s.y - ly);
          ctx.lineTo(s.x + lx, s.y + ly);
          ctx.strokeStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, 1)`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }

        ctx.restore();
      }

      // ========== LAYER 4: Perspective grid floor ==========
      ctx.save();
      const gridY = ch * 0.85;
      const gridFade = 0.04;
      ctx.strokeStyle = `rgba(214, 0, 0, ${gridFade})`;
      ctx.lineWidth = 0.5;

      // Horizontal lines (perspective)
      for (let i = 0; i < 12; i++) {
        const y = gridY + i * (i * 1.5 + 4);
        if (y > ch) break;
        const alpha = gridFade * (1 - i / 12);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.strokeStyle = `rgba(214, 0, 0, ${alpha})`;
        ctx.stroke();
      }

      // Vertical lines (converging to vanishing point)
      const vanishX = cw * 0.5;
      const vanishY = gridY - 50;
      for (let i = -8; i <= 8; i++) {
        const bottomX = vanishX + i * 120;
        const alpha = gridFade * (1 - Math.abs(i) / 8) * 0.7;
        ctx.beginPath();
        ctx.moveTo(vanishX + i * 10, vanishY);
        ctx.lineTo(bottomX, ch);
        ctx.strokeStyle = `rgba(214, 0, 0, ${alpha})`;
        ctx.stroke();
      }
      ctx.restore();

      // ========== LAYER 5: Mouse interaction — connection web ==========
      if (mx > 0 && my > 0) {
        for (const s of shapes) {
          const dx = mx - s.x;
          const dy = my - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS) {
            const alpha = (1 - dist / MOUSE_RADIUS) * 0.08;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(214, 0, 0, ${alpha})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }

        // Mouse glow
        const mouseGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 60);
        mouseGrad.addColorStop(0, 'rgba(214, 0, 0, 0.06)');
        mouseGrad.addColorStop(1, 'rgba(214, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(mx, my, 60, 0, Math.PI * 2);
        ctx.fillStyle = mouseGrad;
        ctx.fill();
      }

      // ========== LAYER 6: Subtle light flares ==========
      const flareCount = 3;
      for (let i = 0; i < flareCount; i++) {
        const fx = cw * (0.2 + i * 0.3) + Math.sin(t * 0.003 + i * 2) * 100;
        const fy = ch * 0.3 + Math.cos(t * 0.004 + i) * 60;
        const fAlpha = (Math.sin(t * 0.01 + i * 1.5) * 0.5 + 0.5) * 0.03;
        const fSize = 80 + Math.sin(t * 0.007 + i) * 30;

        const flareGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fSize);
        flareGrad.addColorStop(0, `rgba(255, 200, 180, ${fAlpha})`);
        flareGrad.addColorStop(0.4, `rgba(214, 0, 0, ${fAlpha * 0.4})`);
        flareGrad.addColorStop(1, 'rgba(214, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
        ctx.fillStyle = flareGrad;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 0,
      }}
    />
  );
}
