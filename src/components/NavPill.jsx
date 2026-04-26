import React, { useEffect, useRef, useState } from 'react';

/* Top center nav pill — cinematic, astral. Left monogram + orbital
   indicator, center section links, right side scroll-progress rail
   under the pill that fills as the user travels through the journey. */
export function NavPill({ onHoverBtn, onUnhover, scrollTo, activeId, hide, detailOpen }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const [progress, setProgress] = useState(0);
  const lastY = useRef(0);
  const hideTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      lastY.current = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress(Math.min(1, Math.max(0, window.scrollY / max)));
      setHidden(false);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setHidden(true), 3000);
    };
    const onMove = (e) => { if (e.clientY < 140) setHidden(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const items = [
    { label: 'Home',     id: 'hero' },
    { label: 'About',    id: 'about' },
    { label: 'Work',     id: 'projects' },
    { label: 'Skills',   id: 'skills' },
    { label: 'Journey',  id: 'experience' },
    { label: 'Terminal', id: 'terminal' },
    { label: 'Contact',  id: 'contact' }
  ];

  return (
    <div
      ref={ref}
      className="nav-pill"
      style={{
        position: 'fixed',
        top: 18,
        left: detailOpen ? '50%' : '50%',
        right: detailOpen ? 0 : 'auto',
        transform: detailOpen ? 'translateY(' + (hide ? -24 : 0) + 'px)' : `translateX(-50%) translateY(${hide ? -24 : 0}px)`,
        zIndex: 50,
        opacity: hide ? 0 : (hidden ? 0 : 1),
        pointerEvents: (hide || hidden) ? 'none' : 'auto',
        transition: 'opacity 300ms ease, transform 300ms ease, left 300ms ease, right 300ms ease',
        maxWidth: detailOpen ? 'calc(50% - 20px)' : 'min(1080px, calc(100vw - 20px))',
        marginRight: detailOpen ? 18 : 'auto',
      }}
    >
      <div
        className="skeuo-pill"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          backdropFilter: `blur(${blur}px) saturate(130%)`,
          WebkitBackdropFilter: `blur(${blur}px) saturate(130%)`,
          border: '1px solid rgba(167,231,243,0.24)',
          borderRadius: 999,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Monogram */}
        <div
          className="font-display"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px 8px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="orbital" aria-hidden="true" />
          <span
            style={{
              color: 'var(--text)',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            KUNAL
          </span>
          <span
            className="font-mono"
            style={{
              color: 'var(--accent)',
              letterSpacing: '0.22em',
              fontSize: 9.5,
              opacity: 0.8,
            }}
          >
            // astral
          </span>
        </div>

        <span style={{ width: 1, height: 18, background: 'rgba(167,231,243,0.18)', margin: '0 2px' }} />

        {/* Items */}
        {items.map((it, i) => {
          const active = hoverIdx === i || activeId === it.id;
          return (
            <button
              key={it.id}
              onClick={() => scrollTo(it.id)}
              onMouseEnter={() => { setHoverIdx(i); onHoverBtn && onHoverBtn(); }}
              onMouseLeave={() => { setHoverIdx(null); onUnhover && onUnhover(); }}
              className="font-display"
              style={{
                position: 'relative',
                padding: '10px 16px',
                border: 0,
                background: active ? 'rgba(167,231,243,0.10)' : 'transparent',
                color: active ? 'var(--accent-bright)' : 'var(--text)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                borderRadius: 999,
                cursor: 'none',
                transition: 'background .3s, color .3s',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
              }}
            >
              {it.label}
              {activeId === it.id && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 2,
                    transform: 'translateX(-50%)',
                    width: 16,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                    borderRadius: 2,
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }}
                />
              )}
            </button>
          );
        })}

        <span style={{ width: 1, height: 18, background: 'rgba(167,231,243,0.18)', margin: '0 4px 0 2px' }} />

        {/* Right-side status */}
        <div
          className="font-mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px 8px 10px',
            color: 'var(--green)',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="skeuo-led green pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%' }} />
          <span style={{ opacity: 0.85 }}>IN&nbsp;ORBIT</span>
        </div>

        {/* Scroll-progress rail */}
        <div className="nav-progress-track" aria-hidden="true">
          <div
            className="nav-progress-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
      </div>
    </div>
  );
}
