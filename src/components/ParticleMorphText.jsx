import React, { useEffect, useRef } from 'react';

/* -------------------------------------------------------------------------
   ParticleMorphText
   On mount, particles scatter across the hero area then fly into formation
   spelling the hero name. Once assembled (~1.8s), the canvas fades out and
   `onDone()` is called so the real <h1> can cross-fade in.

   Props:
     targetRef  — ref to the <h1> DOM node to match size + position
     onDone     — callback fired when particles finish assembling
   ------------------------------------------------------------------------- */
export function ParticleMorphText({ targetRef, onDone }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    // Skip on reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone?.();
      return;
    }

    const canvas = canvasRef.current;
    const target = targetRef?.current;
    if (!canvas || !target) { onDone?.(); return; }

    // Size canvas to full viewport (particles are in screen coords)
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Measure target element
    const rect    = target.getBoundingClientRect();
    const cs      = getComputedStyle(target);
    const fontSize = parseFloat(cs.fontSize);
    const fontWeight = cs.fontWeight || '700';
    const fontFamily = 'Space Grotesk, system-ui, sans-serif';

    // Build offscreen canvas at full viewport size, render the h1 text at its screen position
    const off  = document.createElement('canvas');
    off.width  = W;
    off.height = H;
    const oCtx = off.getContext('2d');
    oCtx.fillStyle = '#fff';
    oCtx.textBaseline = 'top';
    oCtx.textAlign    = 'left';

    // Walk the h1's DOM children to reconstruct the two text lines
    const lines = [];
    const collectText = (node, depth) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.trim();
        if (t) lines.push({ text: t, depth });
      }
      for (const child of node.childNodes) collectText(child, depth + 1);
    };
    collectText(target, 0);
    // dedupe: if lastName span creates a nested line, we get firstName + lastName
    const textLines = [...new Set(lines.map(l => l.text))].slice(0, 2);

    const lh = fontSize * 0.92 * 1.05; // match lineHeight:0.92 + gap
    textLines.forEach((line, i) => {
      oCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      oCtx.fillText(line, rect.left, rect.top + i * lh);
    });

    // Sample pixels from offscreen canvas
    const imgData = oCtx.getImageData(
      Math.floor(rect.left), Math.floor(rect.top),
      Math.ceil(rect.width) + 4,
      Math.ceil(rect.height * textLines.length) + fontSize
    );
    const pxData = imgData.data;
    const targets = [];
    // Adaptive gap: fewer particles on low-end devices (small screens)
    const GAP = Math.max(3, Math.floor(fontSize / (W > 900 ? 24 : 18)));
    const offX = Math.floor(rect.left);
    const offY = Math.floor(rect.top);
    const iW   = Math.ceil(rect.width) + 4;

    for (let dy = 0; dy < imgData.height; dy += GAP) {
      for (let dx = 0; dx < iW; dx += GAP) {
        const idx = (dy * iW + dx) * 4;
        if (pxData[idx + 3] > 100) {
          targets.push({ tx: offX + dx, ty: offY + dy });
        }
      }
    }

    if (!targets.length) { onDone?.(); return; }

    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top  + rect.height * 0.5;

    // Init particles at scattered positions around the hero area
    const particles = targets.map(t => {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 120 + Math.random() * Math.max(W, H) * 0.55;
      return {
        x:  cx + Math.cos(angle) * dist,
        y:  cy + Math.sin(angle) * dist,
        tx: t.tx,
        ty: t.ty,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: 0,
        size:  0.75 + Math.random() * 1.25,
      };
    });

    const MORPH_MS  = 1700; // assembly duration
    const HOLD_MS   = 300;  // hold fully assembled
    const FADE_MS   = 400;  // canvas fade-out
    const TOTAL_MS  = MORPH_MS + HOLD_MS + FADE_MS;
    let startTime   = null;
    let doneFired   = false;

    const tick = (now) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      // Canvas-level fade during the last FADE_MS
      const canvasFade = elapsed < MORPH_MS + HOLD_MS
        ? 1
        : Math.max(0, 1 - (elapsed - MORPH_MS - HOLD_MS) / FADE_MS);

      ctx.clearRect(0, 0, W, H);

      // Easing: ease-out-cubic
      const rawT = Math.min(1, elapsed / MORPH_MS);
      const ease = 1 - Math.pow(1 - rawT, 3);

      for (const p of particles) {
        // Spring-like lerp toward target
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        p.vx = p.vx * 0.82 + dx * 0.06;
        p.vy = p.vy * 0.82 + dy * 0.06;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.min(1, p.alpha + 0.028);

        // Hue: cyan on the left → warp purple on the right
        const hue = 185 + ((p.tx - rect.left) / (rect.width || 1)) * 80;
        const lit = 68 + ease * 8; // brighten as they arrive
        ctx.globalAlpha = p.alpha * canvasFade;
        ctx.fillStyle = `hsl(${hue},90%,${lit}%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (elapsed >= MORPH_MS + HOLD_MS && !doneFired) {
        doneFired = true;
        onDone?.();
      }

      if (elapsed < TOTAL_MS) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    // Small delay so fonts are loaded and layout is settled
    const delayId = setTimeout(() => {
      animRef.current = requestAnimationFrame(tick);
    }, 120);

    return () => {
      clearTimeout(delayId);
      cancelAnimationFrame(animRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top:  0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 8,
      }}
    />
  );
}
