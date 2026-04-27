import React, { useEffect, useState } from 'react';
import { config } from '../data/content';

/* Full-screen name + progress bar shown while CDN scripts load + GPU compiles. */
export function LoadingScreen({ progress, done, onSkip }) {
  const { firstName } = config.owner;
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShowSkip(true), 3500);
    return () => clearTimeout(t);
  }, [done]);

  // progress 0-100 = CDN scripts; once scripts are done we wait for sceneReady (done=true).
  // Show a "Compiling shaders" phase when scripts are at 100% but scene isn't ready yet.
  const compiling = progress >= 100 && !done;
  const label = compiling ? 'Compiling shaders\u2026' : `Loading \u00b7 ${Math.round(progress)}%`;
  // Drive the bar to 100% while compiling, then hold until fade
  const barWidth = compiling || done ? 100 : progress;

  return (
    <div style={{
      position:'fixed',inset:0,background:'#020408',zIndex:10000,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      opacity: done ? 0 : 1, pointerEvents: done ? 'none' : 'auto',
      transition: 'opacity .6s ease-in-out',
    }}>
      <div className="font-display" style={{fontSize:'clamp(2rem,5vw,3.5rem)',letterSpacing:'0.45em',color:'var(--text)',fontWeight:400}}>
        {firstName.toUpperCase()}
      </div>
      <div style={{marginTop:'2rem',width:'min(320px,60vw)',height:1,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
        <div style={{width:`${barWidth}%`,height:'100%',background:'var(--accent)',transition:'width .4s ease-out'}}/>
      </div>
      <div className="font-mono" style={{marginTop:'1.25rem',fontSize:10,color:'var(--text-faint)',letterSpacing:'0.35em',textTransform:'uppercase',transition:'opacity .3s'}}>
        {label}
      </div>
      {showSkip && !done && (
        <button
          onClick={onSkip}
          className="font-mono"
          style={{
            marginTop:'2rem', background:'transparent', border:'1px solid rgba(167,231,243,0.25)',
            color:'var(--text-dim)', padding:'8px 20px', borderRadius:999, fontSize:10,
            letterSpacing:'0.28em', textTransform:'uppercase', cursor:'pointer',
            transition:'border-color .2s, color .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(167,231,243,0.6)'; e.currentTarget.style.color='var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(167,231,243,0.25)'; e.currentTarget.style.color='var(--text-dim)'; }}
        >
          Skip Intro →
        </button>
      )}
    </div>
  );
}
