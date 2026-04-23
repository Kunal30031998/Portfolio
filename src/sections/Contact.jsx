import React, { useState } from 'react';
import { Github, Linkedin, Mail, Check } from 'lucide-react';
import { Magnetic } from '../components/Magnetic';

export function Contact({ onHoverBtn, onUnhover }) {
  const [copied, setCopied] = useState(false);
  const email = 'kunal.gautam.570@gmail.com';
  const copy = async () => {
    try { await navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  return (
    <section id="contact" className="fade-during-dive section-scrim" style={{position:'relative',padding:'20vh 5vw',minHeight:'100vh',textAlign:'center'}}>
      <div style={{maxWidth:900,margin:'0 auto'}}>
        <div className="font-mono" style={{color:'var(--text-faint)',fontSize:11,letterSpacing:'0.45em',marginBottom:'2rem',textTransform:'uppercase'}}>
          End Transmission
        </div>
        <h2 className="font-display" style={{fontSize:'clamp(2.5rem,7vw,5.5rem)',fontWeight:800,margin:0,color:'var(--text-faint)',letterSpacing:'0.01em',lineHeight:1.05}}>
          that's the story so far.
        </h2>
        <div className="font-display" style={{fontSize:'clamp(1.3rem,2.5vw,2rem)',marginTop:'1.25rem',letterSpacing:'0.02em',fontWeight:600,color:'var(--text)'}}>
          let's write the next chapter.
        </div>

        <div style={{display:'flex',gap:'1.5rem',justifyContent:'center',marginTop:'3rem',flexWrap:'wrap'}}>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <button onClick={copy} className="skeuo-btn font-mono" style={{
              padding:'16px 26px',
              color: copied ? 'var(--green)' : 'var(--accent)',
              borderColor: copied ? 'var(--green)' : 'rgba(143,216,232,0.55)',
              borderRadius:12, fontSize:13, letterSpacing:'0.15em', cursor:'none', display:'inline-flex',alignItems:'center',gap:8
            }}>
              {copied ? <><Check size={16}/> copied</> : <><Mail size={16}/> {email}</>}
            </button>
          </Magnetic>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="skeuo-btn font-mono" style={{
              padding:'16px 22px',color:'var(--accent)',
              borderRadius:12,display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none',cursor:'none',fontSize:13,letterSpacing:'0.15em'
            }}><Github size={18}/> GitHub</a>
          </Magnetic>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="skeuo-btn font-mono" style={{
              padding:'16px 22px',color:'var(--accent)',
              borderRadius:12,display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none',cursor:'none',fontSize:13,letterSpacing:'0.15em'
            }}><Linkedin size={18}/> LinkedIn</a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
