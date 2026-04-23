import React from 'react';

export function Footer() {
  return (
    <footer style={{position:'relative',padding:'3rem 5vw',textAlign:'center'}}>
      <div className="font-mono" style={{color:'var(--text-dim)',fontSize:12,letterSpacing:'0.15em',display:'inline-flex',alignItems:'center',gap:10}}>
        <span className="skeuo-led pulse-dot" style={{width:8,height:8,borderRadius:'50%'}}/>
        // built by kunal gautam · {new Date().getFullYear()} · react + three.js + gsap
      </div>
    </footer>
  );
}
