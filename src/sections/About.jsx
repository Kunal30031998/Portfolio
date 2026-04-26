import React, { useRef } from 'react';
import { useInView } from '../hooks/useInView';
import { CountUp } from '../components/CountUp';
import { config } from '../data/content';

export function About() {
  const ref = useRef(null);
  const inView = useInView(ref);
  const statsRef = useRef(null);
  const statsIn = useInView(statsRef);

  const { bioLines, stats, availabilityText, eyebrow } = config.about;

  const lines = bioLines;

  const stats_ = stats;

  return (
    <section id="about" ref={ref} className="section-scrim section-shell tall">
      <div className="section-inner">
        <div className="reading-rail">
          <div className="section-eyebrow">{eyebrow}</div>
          <div className="font-display" style={{
            fontSize: 'clamp(1.55rem, 3vw, 2.4rem)',
            fontWeight: 500,
            lineHeight: 1.35,
            color: 'var(--text)',
            textShadow: '0 10px 40px rgba(0,0,0,0.55)',
            maxWidth: 620,
          }}>
            {lines.map((l, i) => (
              <div key={i} className={`reveal-line ${inView ? 'in' : ''}`}>
                <span style={{ transitionDelay: `${i * 170}ms` }}>{l}</span>
              </div>
            ))}
          </div>

          <div className="skeuo-pill" style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            marginTop: '2rem', padding: '10px 18px',
            border: '1px solid rgba(130,227,176,0.45)', borderRadius: 999,
          }}>
            <span className="skeuo-led green pulse-dot" style={{ width: 10, height: 10, borderRadius: '50%' }} />
            <span className="font-mono" style={{ color: 'var(--green)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              {availabilityText}
            </span>
          </div>

          <div ref={statsRef} style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
            gap: '0.85rem', marginTop: '2.25rem'
          }}>
            {stats_.map((st, i) => (
              <div
                key={i}
                className="glass-card railed"
                style={{
                  padding: '1.1rem 1.15rem 1.1rem 1.4rem',
                  opacity: statsIn ? 1 : 0,
                  animation: statsIn ? `fadeInUp 0.8s ease-out ${i * 0.08}s forwards` : 'none',
                }}
              >
                <div className="font-display" style={{ fontSize: '2.1rem', fontWeight: 500, lineHeight: 1, color: 'var(--text)' }}>
                  <CountUp to={st.value} suffix={st.suffix} trigger={statsIn} />
                </div>
                <div className="font-mono" style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 10, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
