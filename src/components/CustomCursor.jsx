import React, { useEffect, useRef } from 'react';

/* Custom dot + ring cursor. Ring morphs based on `mode`:
     'default' → circle, 'button' → filled, 'card' → rounded-rect
   Color override forwarded so the WebGL tube trail can tint it. */
export function CustomCursor({ mode, color }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  // Track current scale so the RAF loop can include it in transform (avoids overwriting CSS transition)
  const scaleRef = useRef(0.6);

  useEffect(() => {
    const move = (e) => {
      pos.current.tx = e.clientX;
      pos.current.ty = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX - 3}px, ${e.clientY - 3}px, 0)`;
      }
    };
    window.addEventListener('mousemove', move);
    let raf;
    const loop = () => {
      pos.current.x += (pos.current.tx - pos.current.x) * 0.12;
      pos.current.y += (pos.current.ty - pos.current.y) * 0.12;
      if (ringRef.current) {
        // Offset is half of fixed 50px ring size; scale is composited via CSS transition
        ringRef.current.style.transform = `translate3d(${pos.current.x - 25}px, ${pos.current.y - 25}px, 0) scale(${scaleRef.current})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
  }, []);

  // Ring is always 50×50px; scale drives the apparent size (30px=0.6×, 50px=1×).
  // This keeps width/height constant — no layout-triggering transitions.
  const ringScale = mode === 'button' ? 1 : 0.6;
  scaleRef.current = ringScale;
  const ringRadius = mode === 'card' ? '12px' : '50%';
  const ringBg = mode === 'button' ? 'rgba(143,216,232,0.22)' : 'transparent';
  const borderColor = color || 'var(--accent)';

  return (
    <>
      <div ref={dotRef} style={{
        position:'fixed',width:6,height:6,borderRadius:'50%',background:borderColor,
        pointerEvents:'none',zIndex:2147483647,top:0,left:0,mixBlendMode:'screen'
      }}/>
      <div ref={ringRef} style={{
        position:'fixed',width:50,height:50,border:`1.5px solid ${borderColor}`,
        borderRadius:ringRadius,background:ringBg,pointerEvents:'none',zIndex:2147483646,top:0,left:0,
        transition:'transform .25s, border-radius .25s, background .25s, border-color .25s'
      }}/>
    </>
  );
}
