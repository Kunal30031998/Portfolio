import React, { useRef, useState } from 'react';
import { Rocket, MapPin, Github, Linkedin, Download } from 'lucide-react';
import { Magnetic } from '../components/Magnetic';
import { useTypewriter } from '../hooks/useTypewriter';
import { useInView } from '../hooks/useInView';
import { CountUp } from '../components/CountUp';
import { ParticleMorphText } from '../components/ParticleMorphText';
import { config } from '../data/content';

export function Hero({ onHoverBtn, onUnhover, scrollTo }) {
  const word = useTypewriter(config.hero.typewriterWords);
  const { firstName, lastName, githubUrl, linkedinUrl, available, location } = config.owner;
  const statsRef  = useRef(null);
  const nameRef   = useRef(null);
  const [nameVisible, setNameVisible] = useState(false);
  const statsVisible = useInView(statsRef, { threshold: 0.1 });
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  return (
    <section
      id="hero"
      className="scanlines section-scrim"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '90px 6vw 0',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT: Text content ─────────────────────────────────────── */}
      <div
        className="hero-content"
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
        {/* Eyebrow + availability badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div
            className="font-mono"
            style={{
              color: 'var(--accent-bright)',
              fontSize: 11,
              letterSpacing: '0.40em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span className="skeuo-led warp pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%' }} />
            Portfolio · 2026 · Astral Travel
          </div>
          {available && (
            <div
              className="font-mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px solid rgba(130,227,176,0.35)',
                background: 'rgba(130,227,176,0.08)',
                color: 'var(--green)',
                fontSize: 9.5,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
              }}
            >
              <span className="avail-dot" />
              Available
            </div>
          )}
        </div>

        {/* Name — hidden until particle morph completes, then fades in */}
        <h1
          ref={nameRef}
          className="font-display grad-text"
          style={{
            fontSize: 'clamp(3.2rem, 9vw, 8rem)',
            margin: 0,
            letterSpacing: '-0.022em',
            fontWeight: 700,
            lineHeight: 0.92,
            textAlign: 'left',
          opacity: 1,
          }}
        >
          {firstName}
          <br />
          <span
            className="font-display grad-text-warm"
            style={{ fontWeight: 400, letterSpacing: '-0.022em', display: 'inline-block' }}
          >{lastName}</span>
        </h1>
        {/* Particle morph \u2014 assembles name from dust (desktop only) */}
        {!isMobile && <ParticleMorphText targetRef={nameRef} onDone={() => setNameVisible(true)} />}

        {/* Typewriter + Location tag */}
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap', minHeight: '2em' }}>
          <div
            className="font-mono"
            style={{
              fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
              letterSpacing: '0.04em',
              color: 'var(--text)',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>{'>'} </span>
            <span>{word}</span>
            <span className="blink" style={{ color: 'var(--accent)' }}>_</span>
          </div>
          {location && (
            <div
              className="font-mono"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--text-faint)',
                fontSize: 10,
                letterSpacing: '0.18em',
              }}
            >
              <MapPin size={11} strokeWidth={1.5} style={{ color: 'var(--accent-dim)', flexShrink: 0 }} />
              {location}
            </div>
          )}
        </div>

        {/* Bio */}
        <p
          className="fade-up in font-display"
          style={{
            marginTop: '1.75rem',
            fontSize: 'clamp(0.98rem, 1.2vw, 1.08rem)',
            color: 'var(--text)',
            maxWidth: 540,
            textAlign: 'left',
            animationDelay: '0.3s',
            lineHeight: 1.65,
            fontWeight: 400,
          }}
        >
          Full stack software engineer. 6+ years.
          <br />
          <span style={{ color: 'var(--text-dim)', fontSize: '0.94em' }}>
            Frontend-first. React and TypeScript at the core. Full stack context that makes everything ship cleaner.
          </span>
        </p>

        {/* Stats row */}
        <div
          ref={statsRef}
          style={{ marginTop: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}
        >
          {config.about.stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span
                className="font-display grad-text-warm"
                style={{ fontSize: 'clamp(1.4rem, 2.2vw, 2rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}
              >
                <CountUp to={s.value} suffix={s.suffix} trigger={statsVisible} duration={1400} />
              </span>
              <span className="font-mono" style={{ fontSize: 9.5, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
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
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <a
              href="/Resume.pdf"
              download
              className="skeuo-btn font-mono"
              style={{
                padding: '15px 20px',
                color: 'var(--warm)',
                borderColor: 'rgba(234,191,138,0.35)',
                borderRadius: 10,
                fontSize: 11.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                textDecoration: 'none',
              }}
            >
              <Download size={13} strokeWidth={2} />
              Résumé
            </a>
          </Magnetic>
        </div>

        {/* Social links */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.7rem' }}>
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
                <button
                  className="skeuo-btn font-mono"
                  style={{
                    padding: '10px 14px',
                    color: 'var(--text-dim)',
                    borderRadius: 10,
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    cursor: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <Github size={14} strokeWidth={1.8} />
                  GitHub
                </button>
              </Magnetic>
            </a>
          )}
          {linkedinUrl && (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
                <button
                  className="skeuo-btn font-mono"
                  style={{
                    padding: '10px 14px',
                    color: 'var(--text-dim)',
                    borderRadius: 10,
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    cursor: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <Linkedin size={14} strokeWidth={1.8} />
                  LinkedIn
                </button>
              </Magnetic>
            </a>
          )}
        </div>
      </div>

      {/* ── Bottom rocket ───────────────────────────────────────────── */}
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
