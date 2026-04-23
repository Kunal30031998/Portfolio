import React, { useEffect, useRef, useState } from 'react';
import { TERMINAL_SCRIPT } from '../data/content';
import { useInView } from '../hooks/useInView';

export function Terminal() {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const [lines, setLines] = useState([]);
  const [userLine, setUserLine] = useState('');
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!inView || started) return;
    setStarted(true);
    let cancelled = false;
    (async () => {
      for (const step of TERMINAL_SCRIPT) {
        for (let i = 0; i <= step.cmd.length; i++) {
          if (cancelled) return;
          setLines(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { type: 'cmd', text: step.cmd.slice(0, i) };
            return copy;
          });
          await new Promise(r => setTimeout(r, 50 + Math.random() * 70));
          if (i === 0) setLines(prev => [...prev, { type: 'cmd', text: '' }]);
        }
        await new Promise(r => setTimeout(r, 250));
        setLines(prev => [...prev, { type: 'out', text: step.out }]);
        await new Promise(r => setTimeout(r, 200));
      }
    })();
    return () => { cancelled = true; };
  }, [inView, started]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [lines, userLine]);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      const cmd = userLine.trim().toLowerCase();
      let out = '> command not found. but I appreciate the curiosity.';
      if (cmd === 'sudo hire kunal') out = '> access granted. reach me at kunal.gautam.570@gmail.com.';
      else if (cmd === 'ls projects') out = '> admin-dashboard  ui-component-library  cloud-microservices  ci-cd  real-time-learning  canvas-ui';
      else if (cmd === 'help') out = '> try: sudo hire kunal · ls projects · whoami · clear';
      else if (cmd === 'whoami') out = '> you — and you have good taste in portfolios.';
      else if (cmd === 'clear') { setLines([]); setUserLine(''); return; }
      else if (cmd === '') return;
      setLines(prev => [...prev, { type: 'cmd', text: '$ ' + userLine }, { type: 'out', text: out }]);
      setUserLine('');
    }
  };

  return (
    <section id="terminal" ref={ref} className="fade-during-dive section-scrim" style={{position:'relative',padding:'15vh 5vw'}}>
      <div style={{maxWidth:1000,margin:'0 auto'}}>
        <div className="font-mono" style={{color:'var(--text-faint)',fontSize:11,letterSpacing:'0.45em',marginBottom:'1.5rem',textTransform:'uppercase'}}>
          05 / Deep Field
        </div>
        <h2 className="font-display" style={{fontSize:'clamp(1.5rem,2.8vw,2rem)',fontWeight:700,margin:'0 0 1.5rem',letterSpacing:'0.01em',lineHeight:1.1,color:'var(--text)'}}>Access the terminal.</h2>
        <div className="skeuo-bezel" style={{position:'relative'}}>
          <div style={{position:'absolute',top:6,left:10}}><span className="skeuo-screw"/></div>
          <div style={{position:'absolute',top:6,right:10}}><span className="skeuo-screw"/></div>
          <div style={{position:'absolute',bottom:6,left:10}}><span className="skeuo-screw"/></div>
          <div style={{position:'absolute',bottom:6,right:10}}><span className="skeuo-screw"/></div>
          <div className="scanlines skeuo-inset" style={{
            position:'relative',borderRadius:10,
            padding:'1.5rem',fontFamily:'var(--font-mono)',color:'var(--accent)',minHeight:420,overflow:'hidden'
          }}>
          <div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center'}}>
            <span style={{width:12,height:12,borderRadius:'50%',background:'radial-gradient(circle at 30% 25%, #ffbfba 0%, #ff5f57 40%, #7a1612 100%)',boxShadow:'inset 0 1px 1px rgba(255,255,255,0.5), 0 0 6px rgba(255,95,87,0.5)'}}/>
            <span style={{width:12,height:12,borderRadius:'50%',background:'radial-gradient(circle at 30% 25%, #ffe7a8 0%, #febc2e 40%, #7a5a0d 100%)',boxShadow:'inset 0 1px 1px rgba(255,255,255,0.5), 0 0 6px rgba(254,188,46,0.5)'}}/>
            <span style={{width:12,height:12,borderRadius:'50%',background:'radial-gradient(circle at 30% 25%, #c9f7cc 0%, #28c840 40%, #0d5a18 100%)',boxShadow:'inset 0 1px 1px rgba(255,255,255,0.5), 0 0 6px rgba(40,200,64,0.5)'}}/>
            <span className="font-mono" style={{marginLeft:'auto',fontSize:10,color:'var(--text-dim)',letterSpacing:'0.2em'}}>kunal@portfolio — /dev/tty</span>
          </div>
          <div style={{fontSize:14,lineHeight:1.7,position:'relative',zIndex:3}} onClick={() => document.getElementById('terminput')?.focus()}>
            {lines.map((l, i) => (
              <div key={i} style={{color: l.type === 'cmd' ? 'var(--accent)' : 'var(--text)'}}>{l.text}</div>
            ))}
            <div>
              <span style={{color:'var(--accent)'}}>$ </span>
              <input id="terminput" value={userLine} onChange={e => setUserLine(e.target.value)} onKeyDown={handleKey}
                style={{background:'transparent',border:0,outline:'none',color:'var(--text)',fontFamily:'inherit',fontSize:14,width:'60%',cursor:'none'}}
                placeholder="type 'help'"/>
              <span className="blink" style={{color:'var(--accent)'}}>█</span>
            </div>
            <div ref={endRef}/>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
