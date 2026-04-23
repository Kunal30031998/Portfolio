import React, { useEffect, useRef, useState } from 'react';

/* Top center nav pill. Tracks scroll velocity to stretch + blur itself,
   hides after idle, re-shows on mouse near top or on new scroll. */
export function NavPill({ onHoverBtn, onUnhover, scrollTo }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  const [scaleX, setScaleX] = useState(1);
  const [blur, setBlur] = useState(20);
  const [hoverIdx, setHoverIdx] = useState(null);
  const lastY = useRef(0);
  const lastT = useRef(performance.now());
  const hideTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const now = performance.now();
      const dy = Math.abs(window.scrollY - lastY.current);
      const dt = now - lastT.current || 16;
      const v = dy / dt; // px per ms
      lastY.current = window.scrollY;
      lastT.current = now;
      setScaleX(Math.min(1 + v * 0.4, 1.4));
      setBlur(Math.min(20 + v * 15, 40));
      setHidden(false);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setScaleX(1); setBlur(20); setHidden(true);
      }, 3000);
    };
    const onMove = (e) => { if (e.clientY < 120) { setHidden(false); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove);
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMove); clearTimeout(hideTimer.current); };
  }, []);

  const items = [
    { label: 'Work', id: 'projects' },
    { label: 'About', id: 'about' },
    { label: 'Contact', id: 'contact' }
  ];

  return (
    <div ref={ref} className="nav-pill" style={{
      position:'fixed',top:20,left:'50%',transform:`translateX(-50%) scaleX(${scaleX})`,
      zIndex:50, opacity: hidden ? 0 : 1,
      filter:`blur(${blur > 30 ? (blur-30)*0.1 : 0}px)`,
    }}>
      <div className="skeuo-pill" style={{
        display:'flex',alignItems:'center',gap:2,padding:'6px',
        backdropFilter:`blur(${blur}px)`, WebkitBackdropFilter:`blur(${blur}px)`,
        border:'1px solid rgba(143,216,232,0.35)', borderRadius:999
      }}>
        {items.map((it, i) => (
          <button key={it.id}
            onClick={() => scrollTo(it.id)}
            onMouseEnter={() => { setHoverIdx(i); onHoverBtn && onHoverBtn(); }}
            onMouseLeave={() => { setHoverIdx(null); onUnhover && onUnhover(); }}
            className="font-display"
            style={{
              position:'relative', padding:'10px 22px', border:0,
              background: hoverIdx === i ? 'rgba(143,216,232,0.14)' : 'transparent',
              color: hoverIdx === i ? 'var(--accent)' : 'var(--text)',
              fontSize:11, letterSpacing:'0.25em', textTransform:'uppercase',
              borderRadius:999, cursor:'none', transition:'background .3s, color .3s'
            }}>
            {it.label}
            {i < items.length - 1 && (
              <span style={{position:'absolute',right:-1,top:'50%',transform:'translateY(-50%)',width:1,height:14,background:'rgba(143,216,232,0.22)'}}/>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
