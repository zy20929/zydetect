'use client';

import { useEffect, useRef } from 'react';

/** 通过 CDN 加载 Vue，然后 mount 星空应用 */
export default function StarfieldBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 等待 Vue CDN 加载
    const tryMount = () => {
      const Vue = (window as any).Vue;
      if (!Vue) {
        setTimeout(tryMount, 100);
        return;
      }
      mountStarfield(container, Vue);
    };
    tryMount();

    return () => {
      // 卸载
      const app = (container as any).__vueApp;
      if (app) app.unmount();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="starfield"
      aria-hidden="true"
      suppressHydrationWarning
    />
  );
}

/** Vue 星空组件的 setup 函数 — 定义在 module scope 以避免重复 */
function mountStarfield(container: HTMLElement, Vue: any) {
  // 避免重复 mount
  if ((container as any).__vueApp) return;

  const app = Vue.createApp({
    template: `<canvas ref="canvasRef" class="starfield-canvas" aria-hidden="true"></canvas>`,
    setup() {
      const canvasRef = Vue.ref(null);
      let stars: any[] = [];
      let shootingStars: any[] = [];
      let cosmicDust: any[] = [];
      let animId = 0;
      let time = 0;
      let mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

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
        { count: 800, speed: 0.008, size: [0.2, 0.6], glow: 0 },
        { count: 500, speed: 0.018, size: [0.4, 1.0], glow: 0 },
        { count: 250, speed: 0.04, size: [0.8, 2.0], glow: 1 },
        { count: 100, speed: 0.08, size: [1.2, 2.8], glow: 1 },
        { count: 40, speed: 0.15, size: [1.8, 4.0], glow: 2 },
      ];

      const MOBILE_RATIO = 0.35;

      const CLUSTERS = [
        { cx: 0.3, cy: 0.4, r: 0.25 },
        { cx: 0.7, cy: 0.3, r: 0.2 },
        { cx: 0.5, cy: 0.7, r: 0.3 },
        { cx: 0.15, cy: 0.8, r: 0.15 },
        { cx: 0.85, cy: 0.6, r: 0.18 },
      ];

      function pickColor() {
        const v = Math.random();
        let c = 0;
        for (const s of STAR_COLORS) { c += s.w; if (v <= c) return { r: s.r, g: s.g, b: s.b }; }
        return { r: 255, g: 244, b: 234 };
      }

      function makeStars(w: number, h: number, isMobile: boolean) {
        const out: any[] = [];
        const ratio = isMobile ? MOBILE_RATIO : 1;
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

      function makeCosmicDust(w: number, h: number, isMobile: boolean) {
        const out: any[] = [];
        const count = isMobile ? Math.round(200 * MOBILE_RATIO) : 200;
        for (let i = 0; i < count; i++) {
          out.push({
            x: Math.random() * w, y: Math.random() * h, z: Math.random(),
            size: 15 + Math.random() * 40,
            alpha: 0.005 + Math.random() * 0.015,
            drift: (Math.random() - 0.5) * 0.01,
            phase: Math.random() * Math.PI * 2,
          });
        }
        return out;
      }

      function getDark() {
        return !document.documentElement.classList.contains('light');
      }

      function reinit(w: number, h: number, isMobile: boolean) {
        if (getDark()) {
          stars = makeStars(w, h, isMobile);
          cosmicDust = makeCosmicDust(w, h, isMobile);
          shootingStars = [];
        }
      }

      function render(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        // 亮色模式：清空画布，让 CSS 背景色透出来
        if (!getDark()) {
          ctx.clearRect(0, 0, w, h);
          return;
        }

        const shift = Math.sin(t * 0.08) * 5;
        const bgGrad = ctx.createLinearGradient(0, 0, w * 0.5 + Math.sin(t * 0.05) * w * 0.1, h);
        bgGrad.addColorStop(0, `rgb(${10 + shift}, ${10 + shift * 0.5}, ${26 + shift})`);
        bgGrad.addColorStop(0.5, `rgb(${8 + shift * 0.3}, ${12 + shift}, ${30 + shift})`);
        bgGrad.addColorStop(1, `rgb(${10 + shift}, ${8 + shift * 0.3}, ${22 + shift * 0.5})`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 宇宙尘埃
        for (const d of cosmicDust) {
          const dx = (mouse.x - 0.5) * 2 * d.z * 8 + Math.sin(t * d.drift + d.phase) * 3;
          const dy = (mouse.y - 0.5) * 2 * d.z * 8 + Math.cos(t * d.drift * 0.7 + d.phase) * 3;
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
        for (const s of stars) {
          const layer = DEPTH_LAYERS[s.z];
          const px = (mouse.x - 0.5) * 2 * layer.speed * 60 + s.clusterOffX * layer.speed * 15;
          const py = (mouse.y - 0.5) * 2 * layer.speed * 60 + s.clusterOffY * layer.speed * 15;
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
        shootingStars = shootingStars.filter((ss: any) => {
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
          shootingStars.push({
            x: Math.random() * w * 0.8, y: Math.random() * h * 0.3,
            vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
            life: 0, maxLife: 40 + Math.random() * 50, trail: [],
            trailLen: 25 + Math.floor(Math.random() * 25),
            color: isColorful
              ? pickColor()
              : { r: 220 + Math.floor(Math.random() * 35), g: 220 + Math.floor(Math.random() * 35), b: 255 },
          });
        }
      }

      function loop() {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width * dpr;
        const ch = rect.height * dpr;

        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }

        time += 0.016;
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;

        ctx.save();
        ctx.scale(dpr, dpr);
        render(ctx, rect.width, rect.height, time);
        ctx.restore();

        animId = requestAnimationFrame(loop);
      }

      function onResize() {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        reinit(rect.width, rect.height, rect.width < 768);
      }

      function onMouseMove(e: MouseEvent) {
        mouse.tx = e.clientX / window.innerWidth;
        mouse.ty = e.clientY / window.innerHeight;
      }

      function checkTheme() {
        const dark = getDark();
        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (dark) {
          const rect = canvas.getBoundingClientRect();
          reinit(rect.width, rect.height, rect.width < 768);
        } else {
          // 亮色模式：清空画布 + 清空星星数据
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
          stars = [];
          shootingStars = [];
          cosmicDust = [];
        }
      }

      Vue.onMounted(() => {
        const canvas = canvasRef.value;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        reinit(rect.width, rect.height, rect.width < 768);

        window.addEventListener('resize', onResize);
        window.addEventListener('mousemove', onMouseMove);

        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        animId = requestAnimationFrame(loop);
      });

      Vue.onUnmounted(() => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMouseMove);
      });

      return { canvasRef };
    },
  });

  app.mount(container);
  (container as any).__vueApp = app;
}
