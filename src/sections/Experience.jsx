import React, { useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import { EXPERIENCE } from '../data/content';

function ExperienceCard({ n, i, inView, onOpenExperience, onHoverBtn, onUnhover }) {
  const cardRef = useRef(null);
  const onMove = (e) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.transform = `translateX(0) perspective(1100px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
  };
  const leave = () => {
    if (cardRef.current) cardRef.current.style.transform = 'translateX(0) perspective(1100px) rotateY(0) rotateX(0)';
    onUnhover?.();
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={onHoverBtn}
      onMouseLeave={leave}
      onClick={() => onOpenExperience?.(n)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenExperience?.(n); }}
      className="card-tilt glass-card"
      style={{
        position: 'relative',
        marginBottom: '1rem',
        padding: '1.1rem 1.25rem',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateX(0)' : 'translateX(22px)',
        transition: `opacity .6s ${0.2 + i * 0.18}s, transform .6s ${0.2 + i * 0.18}s`,
        cursor: 'none',
        willChange: 'transform',
      }}
    >
      <span className="skeuo-led" style={{
        position: 'absolute', left: -28, top: 18,
        width: 12, height: 12, borderRadius: '50%',
        border: '2px solid rgba(2,4,10,0.9)'
      }} />
      <div className="font-mono" style={{
        color: 'var(--accent)', fontSize: 10.5,
        letterSpacing: '0.22em', textTransform: 'uppercase',
      }}>{n.when}</div>
      <div className="font-display" style={{
        fontSize: '1.1rem', fontWeight: 600, margin: '6px 0 8px',
        color: 'var(--text)', letterSpacing: '-0.005em',
      }}>{n.title}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.65 }}>{n.body}</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          type="button"
          onMouseEnter={onHoverBtn}
          onMouseLeave={(e) => { e.stopPropagation(); onUnhover?.(); }}
          onClick={(e) => { e.stopPropagation(); onOpenExperience?.(n); }}
          className="skeuo-btn warp font-mono"
          style={{
            padding: '8px 12px',
            borderRadius: 999,
            cursor: 'none',
            color: 'var(--warp)',
            letterSpacing: '0.2em',
            fontSize: 10.5,
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Warp In
          <ArrowUpRight size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

export function Experience({ onOpenExperience, onHoverBtn, onUnhover }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.1 });
  return (
    <section id="experience" className="fade-during-dive section-scrim section-shell">
      <div className="section-inner" style={{ justifyContent: 'flex-start' }}>
        <div className="reading-rail">
          <div className="section-eyebrow">04 — Journey</div>
          <h2 className="section-title">Signal log.</h2>
          <p className="section-kicker" style={{ marginBottom: '2rem' }}>
            Six years. Three companies. Each node opens a warp log with the scope, the wins, and the stack.
          </p>

          <div ref={ref} style={{ position: 'relative', paddingLeft: 34 }}>
            <div style={{
              position: 'absolute', left: 12, top: 0, width: 2,
              background: 'linear-gradient(to bottom, var(--accent), rgba(167,231,243,0.18))',
              height: inView ? '100%' : '0%', transition: 'height 1.6s ease-out'
            }} />

            {EXPERIENCE.map((n, i) => (
              <ExperienceCard
                key={n.id}
                n={n}
                i={i}
                inView={inView}
                onOpenExperience={onOpenExperience}
                onHoverBtn={onHoverBtn}
                onUnhover={onUnhover}
              />
            ))}

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span className="skeuo-led green pulse-dot" style={{ width: 10, height: 10, borderRadius: '50%' }} />
              <span className="font-mono" style={{ color: 'var(--green)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Currently shipping →
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
