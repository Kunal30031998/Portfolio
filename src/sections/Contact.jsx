import React, { useState } from 'react';
import { Github, Linkedin, Mail, Check } from 'lucide-react';
import { Magnetic } from '../components/Magnetic';
import { config } from '../data/content';

export function Contact({ onHoverBtn, onUnhover }) {
  const [copied, setCopied] = useState(false);
  const { email, githubUrl, linkedinUrl } = config.owner;
  const { eyebrow, heading, subheading } = config.contact;
  const copy = async () => {
    try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  return (
    <section id="contact" className="fade-during-dive section-scrim section-shell tall">
      <div className="section-inner" style={{ justifyContent: 'flex-end' }}>
        <div className="reading-rail right">
          <div className="section-eyebrow">{eyebrow}</div>

          <div className="glass-card railed" style={{ padding: '2rem 2rem 2rem 2.2rem' }}>
            <h2 className="font-display grad-text" style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 600,
              margin: 0,
              letterSpacing: '-0.01em',
              lineHeight: 1.08,
              textShadow: '0 10px 40px rgba(0,0,0,0.55)',
            }}>
              {heading}
            </h2>
            <div className="font-display" style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
              marginTop: '0.75rem',
              fontWeight: 400,
              color: 'var(--text-dim)',
              letterSpacing: '0.005em',
            }}>
              {subheading}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
              <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
                <button onClick={copy} className="skeuo-btn font-mono" style={{
                  padding: '13px 16px',
                  color: copied ? 'var(--green)' : 'var(--accent)',
                  borderColor: copied ? 'var(--green)' : 'rgba(167,231,243,0.38)',
                  borderRadius: 10,
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  cursor: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {copied ? <><Check size={15} /> copied</> : <><Mail size={15} /> {email}</>}
                </button>
              </Magnetic>
              <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
                <a href={githubUrl} target="_blank" rel="noreferrer" className="skeuo-btn font-mono" style={{
                  padding: '13px 15px', color: 'var(--accent)',
                  borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 10,
                  textDecoration: 'none', cursor: 'none', fontSize: 11.5, letterSpacing: '0.14em',
                }}><Github size={16} /> GitHub</a>
              </Magnetic>
              <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
                <a href={linkedinUrl} target="_blank" rel="noreferrer" className="skeuo-btn font-mono" style={{
                  padding: '13px 15px', color: 'var(--accent)',
                  borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 10,
                  textDecoration: 'none', cursor: 'none', fontSize: 11.5, letterSpacing: '0.14em',
                }}><Linkedin size={16} /> LinkedIn</a>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
