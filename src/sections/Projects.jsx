import React, { useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PROJECTS, config } from '../data/content';
import { useInView } from '../hooks/useInView';

function ProjectCard({ p, index, onHoverCard, onUnhover, onHoverBtn, onOpen }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.15 });
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.transform = `perspective(1100px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateZ(0)`;
    // Holographic shimmer: angle tracks mouse direction, hue shifts left→right
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    el.style.setProperty('--holo-angle', `${angle + 90}deg`);
    el.style.setProperty('--holo-hue', `${185 + x * 75}`);
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = 'perspective(1100px) rotateY(0) rotateX(0)';
    onUnhover && onUnhover();
  };

  const problem = (p.problem || '').replace(/^\/\/\s*problem:\s*/i, '');

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onHoverCard}
      onMouseLeave={leave}
      onClick={() => onOpen?.(p)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen?.(p); }}
      className="card-tilt holo-card glass-card railed"
      style={{
        padding: '1.5rem 1.5rem 1.5rem 1.75rem',
        opacity: inView ? 1 : 0,
        animation: inView ? `fadeInUp 0.9s ease-out ${index * 0.1}s forwards` : 'none',
        cursor: 'none',
        willChange: 'transform',
      }}
    >
      <div className="font-mono" style={{
        color: 'var(--warm)', fontSize: 10.5,
        letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        Problem
      </div>
      <div className="font-display" style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
        {problem}
      </div>

      <h3 className="font-display" style={{
        fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.15,
        margin: 0, color: 'var(--text)', letterSpacing: '-0.005em',
      }}>
        {p.title}
      </h3>

      <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.65, margin: '10px 0 0' }}>
        {p.body}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
        {p.tags.map(t => (
          <span key={t} className="font-mono skeuo-chip" style={{
            padding: '4px 10px', color: 'var(--accent)', fontSize: 10.5,
            borderRadius: 999, letterSpacing: '0.06em',
          }}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <a
          href={`/projects/${p.id}`}
          onMouseEnter={onHoverBtn}
          onMouseLeave={onUnhover}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen?.(p); }}
          className="skeuo-btn warp font-mono"
          style={{
            padding: '9px 14px', borderRadius: 999, cursor: 'none',
            color: 'var(--warp)',
            letterSpacing: '0.2em', fontSize: 10.5, textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
          }}
        >
          Warp In
          <ArrowUpRight size={13} strokeWidth={1.8} />
        </a>
      </div>
    </div>
  );
}

export function Projects({ onHoverCard, onUnhover, onHoverBtn, onOpenProject }) {
  const { eyebrow, title, kicker } = config.sections.projects;
  return (
    <section id="projects" className="section-scrim section-shell">
      <div className="section-inner" style={{ justifyContent: 'flex-start' }}>
        <div className="reading-rail">
          <div className="section-eyebrow">{eyebrow}</div>
          <h2 className="section-title">{title}</h2>
          <p className="section-kicker" style={{ marginBottom: '2rem' }}>
            {kicker}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {PROJECTS.map((p, i) => (
              <ProjectCard
                key={p.title}
                p={p}
                index={i}
                onHoverCard={onHoverCard}
                onUnhover={onUnhover}
                onHoverBtn={onHoverBtn}
                onOpen={onOpenProject}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
