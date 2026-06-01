'use client';

import { useEffect, useRef, useCallback } from 'react';

/* ========== 暗色模式：星空 ========== */

const STAR_COLORS = [
  { r: 155, g: 176, b: 255, w: 0.08 },
  { r: 170, g: 191, b: 255, w: 0.12 },
  { r: 202, g: 215, b: 255, w: 0.15 },
  { r: 248, g: 247, b: 255, w: 0.20 },
  { r: 255, g: 244, b: 234, w: 0.25 },
  { r: 255, g: 210, b: 161, w: 0.12 },
  { r: 255, g: 180, b: 130, w: 0.08 },
];

const DEPTH_LAYERS = [
  { count: 800,  speed: 0.008, size: [0.2, 0.6], glow: 0 },
  { count: 500,  speed: 0.018, size: [0.4, 1.0], glow: 0 },
  { count: 250,  speed: 0.04,  size: [0.8, 2.0], glow: 1 },
  { count: 100,  speed: 0.08,  size: [1.2, 2.8], glow: 1 },
  { count: 40,   speed: 0.15,  size: [1.8, 4.0], glow: 2 },
];

/** 移动端星星数量比例 */
const MOBILE_STAR_RATIO = 0.35;

interface Star {
  x: number; y: number; z: number;
  size: number;
  cr: number; cg: number; cb: number;
  twinklePhase: number;
  twinkleSpeed: number;
  twinkleSpeed2: number;
  twinkleAmp2: number;
  driftAmpX: number; driftAmpY: number;
  driftFreq: number;
  clusterOffX: number; clusterOffY: number;
}

interface ShootingStar {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  trail: { x: number; y: number }[];
  trailLen: number;
  color: { r: number; g: number; b: number };
}

interface CosmicDust {
  x: number; y: number; z: number;
  size: number;
  alpha: number;
  drift: number;
  phase: number;
}

function pickColor(): { r: number; g: number; b: number } {
  const v = Math.random();
  let c = 0;
  for (const s of STAR_COLORS) { c += s.w; if (v <= c) return { r: s.r, g: s.g, b: s.b }; }
  return { r: 255, g: 244, b: 234 };
}

const CLUSTERS = [
  { cx: 0.3, cy: 0.4, r: 0.25 },
  { cx: 0.7, cy: 0.3, r: 0.2 },
  { cx: 0.5, cy: 0.7, r: 0.3 },
  { cx: 0.15, cy: 0.8, r: 0.15 },
  { cx: 0.85, cy: 0.6, r: 0.18 },
];

function makeStars(w: number, h: number, isMobile = false): Star[] {
  const out: Star[] = [];
  const ratio = isMobile ? MOBILE_STAR_RATIO : 1;
  for (let z = 0; z < DEPTH_LAYERS.length; z++) {
    const L = DEPTH_LAYERS[z];
    const count = Math.round(L.count * ratio);
    for (let i = 0; i < count; i++) {
      const c = pickColor();
      const cl = CLUSTERS[Math.floor(Math.random() * CLUSTERS.length)];
      const theta = Math.random() * Math.PI * 2;
      const rad = Math.random() * cl.r;
      const gx = (cl.cx + Math.cos(theta) * rad) * w;
      const gy = (cl.cy + Math.sin(theta) * rad) * h;
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const blend = 0.3 + Math.random() * 0.7;

      out.push({
        x: gx * blend + rx * (1 - blend),
        y: gy * blend + ry * (1 - blend),
        z,
        size: L.size[0] + Math.random() * (L.size[1] - L.size[0]),
        cr: c.r, cg: c.g, cb: c.b,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.2 + Math.random() * 2.8,
        twinkleSpeed2: 1.5 + Math.random() * 4,
        twinkleAmp2: 0.05 + Math.random() * 0.2,
        driftAmpX: (Math.random() - 0.5) * 40,
        driftAmpY: (Math.random() - 0.5) * 40,
        driftFreq: 0.0003 + Math.random() * 0.003,
        clusterOffX: (cl.cx - 0.5) * 2,
        clusterOffY: (cl.cy - 0.5) * 2,
      });
    }
  }
  return out;
}

function makeCosmicDust(w: number, h: number, isMobile = false): CosmicDust[] {
  const out: CosmicDust[] = [];
  const count = isMobile ? Math.round(200 * MOBILE_STAR_RATIO) : 200;
  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random(),
      size: 15 + Math.random() * 40,
      alpha: 0.005 + Math.random() * 0.015,
      drift: (Math.random() - 0.5) * 0.01,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return out;
}

/* ========== 亮色模式：侦探案卷板 ========== */

interface CasePin {
  x: number; y: number;
  color: 'red' | 'yellow' | 'blue';
  pulsePhase: number;
  pulseSpeed: number;
}

interface CaseThread {
  from: number; to: number;
  wobble: number;
  wobbleSpeed: number;
  thickness: number;
}

interface DustMote {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  phase: number;
}

function makeCaseBoard(w: number, h: number, isMobile = false): { pins: CasePin[]; threads: CaseThread[] } {
  const pinCount = isMobile ? 12 : 25 + Math.floor(Math.random() * 10);
  const pins: CasePin[] = [];
  const colors: CasePin['color'][] = ['red', 'yellow', 'blue'];

  for (let i = 0; i < pinCount; i++) {
    pins.push({
      x: 50 + Math.random() * (w - 100),
      y: 80 + Math.random() * (h - 160),
      color: colors[Math.floor(Math.random() * colors.length)],
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.5 + Math.random() * 1.5,
    });
  }

  const threads: CaseThread[] = [];
  // 连接相邻的 pins 形成线索网络
  for (let i = 0; i < pins.length; i++) {
    let connections = 0;
    for (let j = i + 1; j < pins.length && connections < 3; j++) {
      const dx = pins[i].x - pins[j].x;
      const dy = pins[i].y - pins[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < Math.min(w, h) * 0.4 && dist > 40) {
        threads.push({
          from: i, to: j,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.3 + Math.random() * 0.8,
          thickness: 0.5 + Math.random() * 1.2,
        });
        connections++;
      }
    }
  }

  return { pins, threads };
}

function makeDustMotes(w: number, h: number, isMobile = false): DustMote[] {
  const out: DustMote[] = [];
  const count = isMobile ? 25 : 60;
  for (let i = 0; i < count; i++) {
    out.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.3,
      size: 0.5 + Math.random() * 2,
      alpha: 0.05 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return out;
}

/* ========== 亮色模式渲染 — 侦探案卷板 ========== */
const renderLight = (
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number,
  mx: number, my: number,
  boardRef: { current: { pins: CasePin[]; threads: CaseThread[] } | null }
) => {
  // 1) 软木/案卷板底色 — 温暖纸张色调
  ctx.fillStyle = '#f2efe8';
  ctx.fillRect(0, 0, w, h);

  // 2) 微妙纹理 — 模拟纸张/软木纤维
  // 水平细纹
  ctx.strokeStyle = 'rgba(180, 170, 155, 0.12)';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < h; y += 4 + (y * 0.01 % 3)) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.05) * 0.5);
    ctx.lineTo(w, y + Math.sin(y * 0.05 + 1) * 0.5);
    ctx.stroke();
  }

  // 3) 微弱网格 — 案卷标注网格
  ctx.strokeStyle = 'rgba(180, 170, 155, 0.08)';
  ctx.lineWidth = 0.5;
  const gridSize = 80;
  for (let x = gridSize; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = gridSize; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const board = boardRef.current;
  if (!board) return;

  // 4) 红线连接线索
  for (const thread of board.threads) {
    const p1 = board.pins[thread.from];
    const p2 = board.pins[thread.to];
    if (!p1 || !p2) continue;

    const wobbleOffset = Math.sin(t * thread.wobbleSpeed + thread.wobble) * 3;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2 + wobbleOffset;

    ctx.strokeStyle = `rgba(190, 50, 50, ${0.25 + 0.05 * Math.sin(t * 0.5 + thread.wobble)})`;
    ctx.lineWidth = thread.thickness;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 5) 推针
  const pinColors: Record<CasePin['color'], { fill: string; shadow: string; headR: number }> = {
    red:    { fill: '#c0392b', shadow: 'rgba(192, 57, 43, 0.4)', headR: 6 },
    yellow: { fill: '#d4a853', shadow: 'rgba(212, 168, 83, 0.4)', headR: 6 },
    blue:   { fill: '#5b8abf', shadow: 'rgba(91, 138, 191, 0.4)', headR: 6 },
  };

  for (const pin of board.pins) {
    const pulse = 0.8 + 0.2 * Math.sin(t * pin.pulseSpeed + pin.pulsePhase);
    const col = pinColors[pin.color];

    // 针影
    ctx.beginPath();
    ctx.ellipse(pin.x + 2, pin.y + 3, col.headR * 0.8, col.headR * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fill();

    // 针头
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, col.headR * pulse, 0, Math.PI * 2);
    ctx.fillStyle = col.fill;
    ctx.fill();

    // 针头高光
    ctx.beginPath();
    ctx.arc(pin.x - 1.5, pin.y - 1.5, col.headR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();

    // 针杆
    ctx.beginPath();
    ctx.moveTo(pin.x, pin.y + col.headR * pulse);
    ctx.lineTo(pin.x, pin.y + col.headR * pulse + 4);
    ctx.strokeStyle = 'rgba(120, 110, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 6) 漂浮尘埃（阳光从窗户照进来的感觉）
  const dustMotes = (window as any).__caseDustMotes;
  if (dustMotes) {
    for (const dm of dustMotes) {
      dm.x += dm.vx + Math.sin(t * 0.5 + dm.phase) * 0.1;
      dm.y += dm.vy;
      const flicker = 0.6 + 0.4 * Math.sin(t * 1.5 + dm.phase);
      const alpha = dm.alpha * flicker;

      // 边缘反弹
      if (dm.x < 0 || dm.x > w) dm.vx *= -1;
      if (dm.y < 0) { dm.y = h; dm.x = Math.random() * w; }

      ctx.beginPath();
      ctx.arc(dm.x, dm.y, dm.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 190, 160, ${alpha})`;
      ctx.fill();
    }
  }

  // 7) 鼠标跟随聚光灯 — 侦探用放大镜查看的感觉
  const spotR = 180;
  const spotGrad = ctx.createRadialGradient(mx * w, my * h, 0, mx * w, my * h, spotR);
  spotGrad.addColorStop(0, 'rgba(255, 250, 230, 0.06)');
  spotGrad.addColorStop(0.5, 'rgba(255, 248, 225, 0.03)');
  spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(mx * w - spotR, my * h - spotR, spotR * 2, spotR * 2);

  // 8) 四角暗角 — 模拟老式台灯照明
  const cornerGrad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(w, h) * 0.6);
  cornerGrad1.addColorStop(0, 'rgba(0,0,0,0.06)');
  cornerGrad1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cornerGrad1;
  ctx.fillRect(0, 0, w, h);

  const cornerGrad2 = ctx.createRadialGradient(w, 0, 0, w, 0, Math.min(w, h) * 0.6);
  cornerGrad2.addColorStop(0, 'rgba(0,0,0,0.04)');
  cornerGrad2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cornerGrad2;
  ctx.fillRect(0, 0, w, h);
};

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const shootingRef = useRef<ShootingStar[]>([]);
  const dustRef = useRef<CosmicDust[]>([]);
  const caseBoardRef = useRef<{ pins: CasePin[]; threads: CaseThread[] } | null>(null);
  const dustMotesRef = useRef<DustMote[]>([]);
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 });
  const visibleRef = useRef(true);
  const darkRef = useRef(true);
  const prevDarkRef = useRef(true);

  // 暴露给 renderLight 使用
  (window as any).__caseDustMotes = dustMotesRef.current;

  /* ---- 暗色模式渲染 ---- */
  const renderDark = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const mx = mouseRef.current;
    mx.x += (mx.tx - mx.x) * 0.04;
    mx.y += (mx.ty - mx.y) * 0.04;
    const offX = (mx.x - 0.5) * 2;
    const offY = (mx.y - 0.5) * 2;

    // 动态背景
    const bgGrad = ctx.createLinearGradient(0, 0, w * 0.5 + Math.sin(t * 0.05) * w * 0.1, h);
    const shift = Math.sin(t * 0.08) * 5;
    bgGrad.addColorStop(0, `rgb(${10 + shift}, ${10 + shift * 0.5}, ${26 + shift})`);
    bgGrad.addColorStop(0.5, `rgb(${8 + shift * 0.3}, ${12 + shift}, ${30 + shift})`);
    bgGrad.addColorStop(1, `rgb(${10 + shift}, ${8 + shift * 0.3}, ${22 + shift * 0.5})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 宇宙尘埃
    for (const d of dustRef.current) {
      const dx = offX * d.z * 8 + Math.sin(t * d.drift + d.phase) * 3;
      const dy = offY * d.z * 8 + Math.cos(t * d.drift * 0.7 + d.phase) * 3;
      const pulseAlpha = d.alpha * (0.7 + 0.3 * Math.sin(t * 0.3 + d.phase));
      const dg = ctx.createRadialGradient(d.x + dx, d.y + dy, 0, d.x + dx, d.y + dy, d.size);
      dg.addColorStop(0, `rgba(80, 90, 160, ${pulseAlpha})`);
      dg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dg;
      ctx.fillRect(d.x + dx - d.size, d.y + dy - d.size, d.size * 2, d.size * 2);
    }

    // 星云
    const nebulae = [
      { x: w * 0.2, y: h * 0.25, r: 350, c: [70, 60, 180], p: 0 },
      { x: w * 0.7, y: h * 0.5, r: 280, c: [140, 60, 200], p: 2.5 },
      { x: w * 0.5, y: h * 0.75, r: 320, c: [40, 100, 200], p: 5 },
      { x: w * 0.85, y: h * 0.15, r: 200, c: [200, 60, 120], p: 1.2 },
      { x: w * 0.15, y: h * 0.65, r: 250, c: [60, 150, 180], p: 3.8 },
      { x: w * 0.4, y: h * 0.4, r: 150, c: [100, 80, 200], p: 4.2 },
      { x: w * 0.6, y: h * 0.2, r: 180, c: [180, 80, 150], p: 6.1 },
    ];
    for (const n of nebulae) {
      const pulse = 0.012 + 0.018 * Math.sin(t * 0.2 + n.p);
      const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      ng.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${pulse})`);
      ng.addColorStop(0.4, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},${pulse * 0.5})`);
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, w, h);
    }

    // 星星
    for (const s of starsRef.current) {
      const layer = DEPTH_LAYERS[s.z];
      const px = offX * layer.speed * 60 + s.clusterOffX * layer.speed * 15;
      const py = offY * layer.speed * 60 + s.clusterOffY * layer.speed * 15;
      const dt = t * s.driftFreq * 1000;
      const dx = Math.sin(dt + s.twinklePhase) * s.driftAmpX * 0.02;
      const dy = Math.cos(dt * 0.7 + s.twinklePhase) * s.driftAmpY * 0.02;
      const sx = s.x + px + dx;
      const sy = s.y + py + dy;

      const tw1 = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
      const tw2 = s.twinkleAmp2 * Math.sin(t * s.twinkleSpeed2 + s.twinklePhase * 1.3);
      const twinkle = Math.max(0.15, Math.min(1, tw1 + tw2));

      if (layer.glow > 0 || s.size > 1.5) {
        const bloomR = s.size * (layer.glow === 2 ? 6 : 3.5) * (0.8 + twinkle * 0.4);
        const bloomAlpha = twinkle * (layer.glow === 2 ? 0.18 : 0.08);
        const gg = ctx.createRadialGradient(sx, sy, 0, sx, sy, bloomR);
        gg.addColorStop(0, `rgba(${s.cr},${s.cg},${s.cb},${bloomAlpha})`);
        gg.addColorStop(0.3, `rgba(${s.cr},${s.cg},${s.cb},${bloomAlpha * 0.4})`);
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(sx - bloomR, sy - bloomR, bloomR * 2, bloomR * 2);
      }

      if (s.z >= 4 && twinkle > 0.65) {
        const intensity = (twinkle - 0.65) / 0.35;
        ctx.strokeStyle = `rgba(${s.cr},${s.cg},${s.cb},${intensity * 0.35})`;
        ctx.lineWidth = 0.5;
        const cl = s.size * (4 + intensity * 4);
        ctx.beginPath();
        ctx.moveTo(sx - cl, sy); ctx.lineTo(sx + cl, sy);
        ctx.moveTo(sx, sy - cl); ctx.lineTo(sx, sy + cl);
        ctx.moveTo(sx - cl * 0.6, sy - cl * 0.6); ctx.lineTo(sx + cl * 0.6, sy + cl * 0.6);
        ctx.moveTo(sx + cl * 0.6, sy - cl * 0.6); ctx.lineTo(sx - cl * 0.6, sy + cl * 0.6);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, s.size * twinkle, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.cr},${s.cg},${s.cb},${0.15 + twinkle * 0.85})`;
      ctx.fill();

      if (twinkle > 0.7 && s.size > 2) {
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(twinkle - 0.7) * 0.8})`;
        ctx.fill();
      }
    }

    // 流星
    shootingRef.current = shootingRef.current.filter(ss => {
      ss.life++;
      ss.x += ss.vx; ss.y += ss.vy;
      ss.vx *= 1.002; ss.vy *= 1.002;
      const p = ss.life / ss.maxLife;
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > ss.trailLen) ss.trail.shift();

      const { r, g, b } = ss.color;
      for (let i = 0; i < ss.trail.length; i++) {
        const frac = i / ss.trail.length;
        const a = frac * (1 - p) * 0.85;
        const sz = frac * 2.2;
        ctx.beginPath();
        ctx.arc(ss.trail[i].x, ss.trail[i].y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fill();
      }
      if (p < 0.92) {
        const headAlpha = (1 - p) * 0.9;
        const hg = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 8);
        hg.addColorStop(0, `rgba(255,255,255,${headAlpha})`);
        hg.addColorStop(0.3, `rgba(${r},${g},${b},${headAlpha * 0.5})`);
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(ss.x - 8, ss.y - 8, 16, 16);
      }
      return p < 1;
    });

    if (Math.random() < 0.012) {
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.8;
      const spd = 5 + Math.random() * 10;
      const isColorful = Math.random() < 0.3;
      shootingRef.current.push({
        x: Math.random() * w * 0.8, y: Math.random() * h * 0.3,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0, maxLife: 40 + Math.random() * 50, trail: [],
        trailLen: 25 + Math.floor(Math.random() * 25),
        color: isColorful
          ? pickColor()
          : { r: 220 + Math.floor(Math.random() * 35), g: 220 + Math.floor(Math.random() * 35), b: 255 },
      });
    }
  }, []);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cw = rect.width * dpr;
    const ch = rect.height * dpr;

    // Re-scale canvas if DPR changed (e.g. moving between displays)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    timeRef.current += 0.016;
    const t = timeRef.current;

    if (darkRef.current) {
      ctx.save();
      ctx.scale(dpr, dpr);
      renderDark(ctx, rect.width, rect.height, t);
      ctx.restore();
    } else {
      ctx.save();
      ctx.scale(dpr, dpr);
      renderLight(ctx, rect.width, rect.height, t, mouseRef.current.x, mouseRef.current.y, caseBoardRef);
      ctx.restore();
    }

    animRef.current = requestAnimationFrame(loop);
  }, [renderDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const isMobile = rect.width < 768;
      if (darkRef.current) {
        starsRef.current = makeStars(rect.width, rect.height, isMobile);
        dustRef.current = makeCosmicDust(rect.width, rect.height, isMobile);
        shootingRef.current = [];
      } else {
        caseBoardRef.current = makeCaseBoard(rect.width, rect.height, isMobile);
        dustMotesRef.current = makeDustMotes(rect.width, rect.height, isMobile);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    try {
      const sf = localStorage.getItem('starfield-enabled');
      if (sf !== null) visibleRef.current = sf === 'true';
    } catch {}

    const checkTheme = () => {
      const isDark = !document.documentElement.classList.contains('light');
      if (darkRef.current !== isDark) {
        prevDarkRef.current = darkRef.current;
        darkRef.current = isDark;
        const rect = canvas.getBoundingClientRect();
        const isMobile = rect.width < 768;
        if (isDark) {
          starsRef.current = makeStars(rect.width, rect.height, isMobile);
          dustRef.current = makeCosmicDust(rect.width, rect.height, isMobile);
          shootingRef.current = [];
        } else {
          caseBoardRef.current = makeCaseBoard(rect.width, rect.height, isMobile);
          dustMotesRef.current = makeDustMotes(rect.width, rect.height, isMobile);
        }
      }
    };
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const onMove = (e: MouseEvent) => {
      mouseRef.current.tx = e.clientX / window.innerWidth;
      mouseRef.current.ty = e.clientY / window.innerHeight;
    };
    window.addEventListener('mousemove', onMove);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'starfield-enabled') visibleRef.current = e.newValue === 'true';
    };
    window.addEventListener('storage', onStorage);

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('storage', onStorage);
      obs.disconnect();
      delete (window as any).__caseDustMotes;
    };
  }, [loop]);

  if (!visibleRef.current) return null;

  return (
    <canvas
      ref={canvasRef}
      className="starfield"
      aria-hidden="true"
      suppressHydrationWarning
    />
  );
}
