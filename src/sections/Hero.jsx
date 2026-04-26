import React from 'react';
import { Rocket } from 'lucide-react';
import { Magnetic } from '../components/Magnetic';
import { useTypewriter } from '../hooks/useTypewriter';
import { config } from '../data/content';

export function Hero({ onHoverBtn, onUnhover, scrollTo }) {
  const word = useTypewriter(config.hero.typewriterWords);
  const { firstName, lastName } = config.owner;
  return (
    <section
      id="hero"
      className="scanlines section-scrim"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6vw',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          maxWidth: 'min(48vw, 660px)',
          textAlign: 'left',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          className="font-mono"
          style={{
            color: 'var(--accent)',
            fontSize: 10.5,
            letterSpacing: '0.48em',
            marginBottom: '1.5rem',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span className="skeuo-led warp pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%' }} />
          Portfolio · 2026 · Astral Travel
        </div>

        <h1
          className="font-display grad-text"
          style={{
            fontSize: 'clamp(3.2rem, 9vw, 8rem)',
            margin: 0,
            letterSpacing: '-0.022em',
            fontWeight: 700,
            lineHeight: 0.92,
            textAlign: 'left',
          }}
        >
          {firstName}
          <br />
          <span
            className="font-display grad-text-warm"
            style={{ fontWeight: 400, letterSpacing: '-0.022em', display: 'inline-block' }}>{lastName}</span>
        </h1>

        <div
          className="font-mono"
          style={{
            marginTop: '1.5rem',
            fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
            letterSpacing: '0.04em',
            color: 'var(--text-dim)',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>{'>'} </span>
          <span>{word}</span>
          <span className="blink" style={{ color: 'var(--accent)' }}>_</span>
        </div>

        <p
          className="fade-up in font-display"
          style={{
            marginTop: '1.75rem',
            fontSize: 'clamp(0.98rem, 1.2vw, 1.08rem)',
            color: 'var(--text-dim)',
            maxWidth: 540,
            textAlign: 'left',
            animationDelay: '1.8s',
            lineHeight: 1.65,
            fontWeight: 400,
          }}
        >
          Full stack software engineer. 6+ years.
          <br />
          <span style={{ color: 'var(--text-faint)', fontSize: '0.94em' }}>
            React, Node, and cloud infrastructure for apps that scale to 50,000+ concurrent users.
          </span>
        </p>

        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <button
              onClick={() => scrollTo('projects')}
              className="skeuo-btn font-mono"
              style={{
                padding: '15px 24px',
                color: 'var(--accent)',
                borderRadius: 10,
                fontSize: 11.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: 'none',
              }}
            >
              View My Work
            </button>
          </Magnetic>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <button
              onClick={() => scrollTo('contact')}
              className="skeuo-btn font-mono"
              style={{
                padding: '15px 24px',
                color: 'var(--text)',
                borderColor: 'rgba(159,177,207,0.45)',
                borderRadius: 10,
                fontSize: 11.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: 'none',
              }}
            >
              Get In Touch
            </button>
          </Magnetic>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: 'var(--accent)',
          opacity: 0.85,
          zIndex: 2,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.46em',
            marginBottom: 10,
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
          }}
        >
          Begin Journey
        </div>
        <Rocket className="rocket-scroll" size={20} strokeWidth={1.5} />
        <span className="rocket-flame" />
      </div>
    </section>
  );
}
