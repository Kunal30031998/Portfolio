import React, { useRef } from 'react';
import { useInView } from '../hooks/useInView';
import { CountUp } from '../components/CountUp';

export function About() {
  const ref = useRef(null);
  const inView = useInView(ref);
  const statsRef = useRef(null);
  const statsIn = useInView(statsRef);

  const lines = [
    "Full stack software engineer with 6+ years shipping cloud-native, high-traffic web apps.",
    "I work across the stack — React and TypeScript on the frontend, Node.js and Java on the backend, AWS and GCP underneath.",
    "Specialized in microservices, frontend performance, and end-to-end product ownership.",
    "Currently a Software Developer II at Hashedin By Deloitte, leading features for 50,000+ concurrent users."
  ];

  const stats = [
    { v: 6, s: '+', label: 'Years Experience' },
    { v: 50, s: 'K+', label: 'Concurrent Users' },
    { v: 3, s: '', label: 'Companies Shipped' },
    { v: 4, s: '', label: 'Engineers Mentored' }
  ];

  return (
    <section id="about" ref={ref} className="section-scrim" style={{
      position:'relative',padding:'15vh 5vw',minHeight:'100vh'
    }}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div className="font-mono" style={{color:'var(--text-faint)',fontSize:11,letterSpacing:'0.45em',marginBottom:'1.5rem',textTransform:'uppercase'}}>
          01 / About
        </div>
        <div className="font-display" style={{fontSize:'clamp(2rem,4vw,3rem)',fontWeight:700,lineHeight:1.35,maxWidth:900,color:'var(--text)'}}>
          {lines.map((l, i) => (
            <div key={i} className={`reveal-line ${inView ? 'in' : ''}`}>
              <span style={{transitionDelay: `${i * 200}ms`}}>{l}</span>
            </div>
          ))}
        </div>

        <div className="skeuo-pill" style={{display:'inline-flex',alignItems:'center',gap:12,marginTop:'3rem',padding:'12px 22px',border:'1px solid rgba(126,217,166,0.55)',borderRadius:999}}>
          <span className="skeuo-led green pulse-dot" style={{width:10,height:10,borderRadius:'50%',display:'inline-block'}}/>
          <span className="font-mono" style={{color:'var(--green)',fontSize:11,letterSpacing:'0.2em'}}>LIVE — OPEN TO OPPORTUNITIES</span>
        </div>

        <div ref={statsRef} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1.5rem',marginTop:'4rem'}}>
          {stats.map((st, i) => (
            <div key={i} className="fade-up skeuo-surface" style={{position:'relative',animationDelay:`${i*0.1}s`,animationPlayState:statsIn?'running':'paused', border:'1px solid rgba(143,216,232,0.22)',padding:'1.5rem',borderRadius:12, opacity: statsIn ? 1 : 0, animation: statsIn ? `fadeInUp 0.8s ease-out ${i*0.1}s forwards` : 'none'}}>
              <div className="font-display" style={{fontSize:'2.5rem',fontWeight:300,lineHeight:1,color:'var(--text)'}}>
                <CountUp to={st.v} suffix={st.s} trigger={statsIn}/>
              </div>
              <div className="font-mono" style={{color:'var(--text-dim)',fontSize:11,marginTop:10,letterSpacing:'0.18em',textTransform:'uppercase'}}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
