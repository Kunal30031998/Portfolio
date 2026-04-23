import React from 'react';

/* Full-screen KUNAL + progress bar shown while CDN scripts load. */
export function LoadingScreen({ progress, done }) {
  return (
    <div style={{
      position:'fixed',inset:0,background:'#020408',zIndex:10000,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      opacity: done?0:1, pointerEvents: done?'none':'auto',
      transition:'opacity .5s'
    }}>
      <div className="font-display" style={{fontSize:'clamp(2rem,5vw,3.5rem)',letterSpacing:'0.45em',color:'var(--text)',fontWeight:400}}>
        KUNAL
      </div>
      <div style={{marginTop:'2rem',width:'min(320px,60vw)',height:1,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
        <div style={{width:`${progress}%`,height:'100%',background:'var(--accent)',transition:'width .4s ease-out'}}/>
      </div>
      <div className="font-mono" style={{marginTop:'1.25rem',fontSize:10,color:'var(--text-faint)',letterSpacing:'0.35em',textTransform:'uppercase'}}>
        Loading · {Math.round(progress)}%
      </div>
    </div>
  );
}
