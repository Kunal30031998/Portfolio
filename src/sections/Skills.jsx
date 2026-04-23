import React, { useRef } from 'react';
import { SKILL_GROUPS } from '../data/content';
import { useInView } from '../hooks/useInView';

function SkillGroup({ group, baseDelay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.2 });
  return (
    <div ref={ref}>
      <div className="font-mono" style={{color:'var(--accent)',fontSize:12,letterSpacing:'0.2em',marginBottom:14}}>{group.title}</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        {group.items.map((s, i) => (
          <span key={s} className="font-mono shimmer skeuo-chip" style={{
            display:'inline-block', padding:'9px 16px',
            border:'1px solid rgba(143,216,232,0.45)', color:'var(--accent)',
            borderRadius:10, fontSize:12, letterSpacing:'0.1em',
            transform: inView ? 'scale(1)' : 'scale(0.5)', opacity: inView ? 1 : 0,
            transition:`transform .6s cubic-bezier(.34,1.56,.64,1) ${baseDelay + i*0.08}s, opacity .5s ${baseDelay + i*0.08}s`
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export function Skills() {
  return (
    <section id="skills" className="section-scrim" style={{position:'relative',padding:'15vh 5vw'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div className="font-mono" style={{color:'var(--text-faint)',fontSize:11,letterSpacing:'0.45em',marginBottom:'1.5rem',textTransform:'uppercase'}}>
          03 / Arsenal
        </div>
        <h2 className="font-display" style={{fontSize:'clamp(2rem,4vw,3rem)',fontWeight:700,margin:'0 0 3rem',letterSpacing:'0.01em',lineHeight:1.1,color:'var(--text)'}}>Skills</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'2.5rem'}}>
          {SKILL_GROUPS.map((g, i) => <SkillGroup key={g.title} group={g} baseDelay={i * 0.1}/>)}
        </div>
      </div>
    </section>
  );
}
