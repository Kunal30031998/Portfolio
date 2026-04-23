import React, { useRef } from 'react';
import { PROJECTS } from '../data/content';
import { useInView } from '../hooks/useInView';

function ProjectCard({ p, index, onHoverCard, onUnhover, onHoverBtn }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.15 });
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)'; onUnhover && onUnhover(); };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onHoverCard}
      onMouseLeave={leave}
      className="card-tilt fade-up skeuo-surface"
      style={{
        position:'relative',padding:'2rem',border:'1px solid rgba(143,216,232,0.28)',
        backdropFilter:'blur(15px)',borderRadius:14,
        willChange:'transform', opacity: inView?1:0,
        animation: inView ? `fadeInUp 0.9s ease-out ${index*0.15}s forwards` : 'none',
        minHeight:260
      }}>
      <div className="card-inner-glow"/>
      <div className="font-mono" style={{color:'var(--accent)',fontSize:12,marginBottom:12,letterSpacing:'0.1em'}}>{p.problem}</div>
      <h3 className="font-display" style={{fontSize:'1.6rem',fontWeight:700,margin:'0 0 12px',color:'var(--text)'}}>{p.title}</h3>
      <p style={{color:'var(--text-dim)',fontSize:14,lineHeight:1.6,margin:0}}>{p.body}</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:20}}>
        {p.tags.map(t => (
          <span key={t} className="font-mono skeuo-chip" style={{padding:'5px 12px',border:'1px solid rgba(143,216,232,0.32)',color:'var(--accent)',fontSize:11,borderRadius:999,letterSpacing:'0.05em'}}>{t}</span>
        ))}
      </div>
      <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} className="font-mono" style={{marginTop:18,background:'transparent',border:0,color:'var(--accent)',fontSize:12,cursor:'none',letterSpacing:'0.15em'}}>
        {'>'} view_
      </button>
    </div>
  );
}

export function Projects({ onHoverCard, onUnhover, onHoverBtn }) {
  return (
    <section id="projects" className="section-scrim right" style={{position:'relative',padding:'15vh 5vw'}}>
      <div style={{maxWidth:1200,margin:'0 auto'}}>
        <div className="font-mono" style={{color:'var(--text-faint)',fontSize:11,letterSpacing:'0.45em',marginBottom:'1.5rem',textTransform:'uppercase'}}>
          02 / Case Files
        </div>
        <h2 className="font-display" style={{fontSize:'clamp(2rem,4vw,3rem)',fontWeight:700,margin:'0 0 3rem',letterSpacing:'0.01em',lineHeight:1.1,color:'var(--text)'}}>Problems I Solved</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1.5rem'}}>
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.title} p={p} index={i} onHoverCard={onHoverCard} onUnhover={onUnhover} onHoverBtn={onHoverBtn}/>
          ))}
        </div>
      </div>
    </section>
  );
}
