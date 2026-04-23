import React, { useRef } from 'react';
import { useInView } from '../hooks/useInView';

export function Experience() {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.1 });
  const nodes = [
    { when: 'May 2022 — now', title: 'Software Developer II · Hashedin By Deloitte', body: 'Full-stack features with React, TypeScript, Node.js, and GraphQL for 50,000+ concurrent users. Led frontend architecture, CI/CD with GitHub Actions + Jenkins + Terraform, and mentored 3–4 junior developers.' },
    { when: 'Nov 2021 — May 2022', title: 'Frontend Engineer · Extramarks', body: 'Built live e-learning modules in React + Redux serving thousands of concurrent students. Integrated WebSocket classroom features and refactored legacy code to modern Hooks + Context.' },
    { when: 'Feb 2020 — Nov 2021', title: 'Associate Frontend Developer · Ingenuity Gaming', body: 'Shipped Canvas/WebGL-backed interactive apps with high-FPS rendering, integrated REST APIs for transactional flows, and tuned performance across the stack.' },
    { when: '2020', title: 'B.Tech, IT · Galgotias College of Engineering & Technology', body: 'Graduated with a B.Tech in Information Technology.' }
  ];
  return (
    <section id="experience" className="fade-during-dive section-scrim right" style={{position:'relative',padding:'15vh 5vw'}}>
      <div style={{maxWidth:900,margin:'0 auto',position:'relative'}}>
        <div className="font-mono" style={{color:'var(--text-faint)',fontSize:11,letterSpacing:'0.45em',marginBottom:'1.5rem',textTransform:'uppercase'}}>
          04 / Journey
        </div>
        <h2 className="font-display" style={{fontSize:'clamp(2rem,4vw,3rem)',fontWeight:700,margin:'0 0 3rem',letterSpacing:'0.01em',lineHeight:1.1,color:'var(--text)'}}>Experience</h2>
        <div ref={ref} style={{position:'relative',paddingLeft:40}}>
          <div style={{
            position:'absolute',left:14,top:0,width:2,background:'linear-gradient(to bottom, var(--accent), rgba(143,216,232,0.22))',
            height: inView ? '100%' : '0%', transition:'height 1.6s ease-out'
          }}/>
          {nodes.map((n, i) => (
            <div key={i} style={{
              position:'relative',marginBottom:'2.5rem',
              opacity: inView ? 1 : 0, transform: inView ? 'translateX(0)' : 'translateX(30px)',
              transition:`opacity .6s ${0.2 + i*0.2}s, transform .6s ${0.2 + i*0.2}s`
            }}>
              <span className="skeuo-led" style={{position:'absolute',left:-32,top:6,width:14,height:14,borderRadius:'50%'}}/>
              <div className="font-mono" style={{color:'var(--accent)',fontSize:12,letterSpacing:'0.15em'}}>{n.when}</div>
              <div className="font-display" style={{fontSize:'1.3rem',fontWeight:700,margin:'6px 0'}}>{n.title}</div>
              <div style={{color:'var(--text-dim)',fontSize:14,lineHeight:1.6}}>{n.body}</div>
            </div>
          ))}
          <div style={{display:'inline-flex',alignItems:'center',gap:10,marginTop:10}}>
            <span className="skeuo-led green pulse-dot" style={{width:10,height:10,borderRadius:'50%'}}/>
            <span className="font-mono" style={{color:'var(--green)',fontSize:12,letterSpacing:'0.15em'}}>CURRENTLY SHIPPING →</span>
          </div>
        </div>
      </div>
    </section>
  );
}
