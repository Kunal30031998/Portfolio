import React, { useRef } from 'react';
import { SKILL_GROUPS } from '../data/content';
import { useInView } from '../hooks/useInView';

function SkillGroup({ group, baseDelay, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.2 });
  const title = group.title.replace(/^\/\/\s*/, '').replace(/_/g, ' ');
  return (
    <div
      ref={ref}
      className="glass-card railed"
      style={{
        padding: '1.25rem 1.3rem 1.25rem 1.6rem',
        opacity: inView ? 1 : 0,
        animation: inView ? `fadeInUp 0.8s ease-out ${index * 0.08}s forwards` : 'none',
      }}
    >
      <div className="font-mono" style={{
        color: 'var(--accent)', fontSize: 10.5,
        letterSpacing: '0.28em', textTransform: 'uppercase',
        marginBottom: 14
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {group.items.map((s, i) => (
          <span key={s} className="font-mono shimmer skeuo-chip" style={{
            display: 'inline-block',
            padding: '7px 13px',
            color: 'var(--accent)',
            borderRadius: 8,
            fontSize: 11.5,
            letterSpacing: '0.06em',
            transform: inView ? 'scale(1)' : 'scale(0.7)',
            opacity: inView ? 1 : 0,
            transition: `transform .6s cubic-bezier(.34,1.56,.64,1) ${baseDelay + i * 0.04}s, opacity .5s ${baseDelay + i * 0.04}s`
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export function Skills() {
  return (
    <section id="skills" className="section-scrim section-shell">
      <div className="section-inner">
        <div className="reading-rail wide">
          <div className="section-eyebrow">03 — Arsenal</div>
          <h2 className="section-title">What I reach for.</h2>
          <p className="section-kicker" style={{ marginBottom: '2rem' }}>
            The instruments I trust — from the metal to the glass.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.9rem',
          }}>
            {SKILL_GROUPS.map((g, i) => (
              <SkillGroup key={g.title} group={g} baseDelay={i * 0.08} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
