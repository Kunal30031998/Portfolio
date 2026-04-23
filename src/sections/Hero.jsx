import React from 'react';
import { Rocket } from 'lucide-react';
import { Magnetic } from '../components/Magnetic';
import { useTypewriter } from '../hooks/useTypewriter';

export function Hero({ onHoverBtn, onUnhover, scrollTo }) {
  const word = useTypewriter(['Full Stack Engineer', 'React + Node', 'Cloud-Native', 'Performance-Obsessed']);
  return (
    <section id="hero" className="scanlines section-scrim" style={{
      position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',
      padding:'0 6vw',overflow:'hidden'
    }}>
      {/* Left-anchored content stack — leaves center/right free so the
          solar system scene is clearly visible in the middle of the view. */}
      <div style={{
        display:'flex',flexDirection:'column',alignItems:'flex-start',
        maxWidth:'min(46vw, 620px)', textAlign:'left'
      }}>
        <div className="font-mono" style={{
          color:'var(--text-faint)', fontSize:11, letterSpacing:'0.45em',
          marginBottom:'1.5rem', textTransform:'uppercase'
        }}>
          Portfolio / 2026
        </div>
        <h1 className="font-display" style={{
          fontSize:'clamp(3rem, 8.5vw, 7.5rem)', margin:0, letterSpacing:'0.04em', fontWeight:700,
          lineHeight:0.95, textAlign:'left', color:'var(--text)'
        }}>
          KUNAL
        </h1>
        <div className="font-mono" style={{marginTop:'1.5rem',fontSize:'clamp(0.95rem,1.3vw,1.1rem)',letterSpacing:'0.06em',color:'var(--text-dim)'}}>
          <span style={{color:'var(--accent)'}}>{'>'} </span>
          <span>{word}</span>
          <span className="blink" style={{color:'var(--accent)'}}>_</span>
        </div>
        <p className="fade-up in" style={{marginTop:'1.75rem',fontSize:'clamp(0.95rem,1.2vw,1.05rem)',color:'var(--text-dim)',maxWidth:520,textAlign:'left',animationDelay:'2s',lineHeight:1.65}}>
          Full stack software engineer. 6+ years.
          <br/>
          <span style={{color:'var(--text-faint)',fontSize:'0.92em'}}>
            React, Node, and cloud infrastructure for apps that scale to 50,000+ concurrent users.
          </span>
        </p>
        <div style={{marginTop:'2.5rem',display:'flex',gap:'1rem',flexWrap:'wrap',justifyContent:'flex-start'}}>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <button onClick={() => scrollTo('projects')} className="skeuo-btn font-mono" style={{
              padding:'16px 28px', color:'var(--accent)',
              borderRadius:10, fontSize:13, letterSpacing:'0.2em',
              textTransform:'uppercase', cursor:'none'
            }}>View My Work</button>
          </Magnetic>
          <Magnetic onHover={onHoverBtn} onLeave={onUnhover}>
            <button onClick={() => scrollTo('contact')} className="skeuo-btn font-mono" style={{
              padding:'16px 28px', color:'var(--text)',
              borderColor:'rgba(159,177,207,0.55)',
              borderRadius:10, fontSize:13, letterSpacing:'0.2em',
              textTransform:'uppercase', cursor:'none'
            }}>Get In Touch</button>
          </Magnetic>
        </div>
      </div>
      <div style={{position:'absolute',bottom:36,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',color:'var(--accent)',opacity:0.85}}>
        <div className="font-mono" style={{fontSize:10,letterSpacing:'0.4em',marginBottom:10,color:'var(--text-faint)'}}>SCROLL</div>
        <Rocket className="rocket-scroll" size={20} strokeWidth={1.5}/>
        <span className="rocket-flame"/>
      </div>
    </section>
  );
}
