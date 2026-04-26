import React, { useEffect, useRef, useState } from 'react';
import { TERMINAL_SCRIPT } from '../data/content';
import { useInView } from '../hooks/useInView';

// E8: format relative time
function formatRelativeTime(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  return `${Math.floor(diff/86400)}d ago`;
}

async function fetchCurrentActivity(username) {
  const FALLBACK = [
    { repo: 'portfolio', message: 'feat: orbit-lock planet spotlight system', timestamp: new Date(), sha: 'a1b2c3d' },
    { repo: 'cdqn-app', message: 'fix: clara ai response latency', timestamp: new Date(Date.now() - 3600000), sha: 'e4f5g6h' },
    { repo: 'cloud-infra', message: 'chore: update k8s node autoscaler config', timestamp: new Date(Date.now() - 86400000), sha: 'i7j8k9l' },
  ];
  try {
    const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=10`);
    if (!res.ok) return FALLBACK;
    const events = await res.json();
    const pushEvents = events.filter(e => e.type === 'PushEvent').slice(0, 3);
    if (!pushEvents.length) return FALLBACK;
    return pushEvents.map(e => ({
      repo: e.repo.name.split('/')[1],
      message: e.payload.commits?.[0]?.message?.split('\n')[0] || 'update',
      timestamp: new Date(e.created_at),
      sha: e.payload.commits?.[0]?.sha?.slice(0, 7) || 'unknown'
    }));
  } catch {
    return FALLBACK;
  }
}

export function Terminal({ onViewSource }) {
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const [lines, setLines] = useState([]);
  const [userLine, setUserLine] = useState('');
  const [started, setStarted] = useState(false);
  const [activity, setActivity] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    fetchCurrentActivity('kugautam').then(setActivity);
    const poll = setInterval(() => fetchCurrentActivity('kugautam').then(setActivity), 5 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

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
          if (i > 0) window._sfx?.type();
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
      else if (cmd === 'help') out = '> try: sudo hire kunal · ls projects · whoami · clear · view source · cd wormhole';
      else if (cmd === 'whoami') out = '> you — and you have good taste in portfolios.';
      else if (cmd === 'clear') { setLines([]); setUserLine(''); return; }
      else if (cmd === 'cd wormhole') out = '> destination unknown. stability: 73%. enter at own risk.';
      else if (cmd === 'view source' || cmd === 'viewsource') {
        setLines(prev => [...prev, { type: 'cmd', text: '$ ' + userLine }, { type: 'out', text: '> opening source viewer...' }]);
        setUserLine('');
        if (onViewSource) onViewSource();
        return;
      }
      else if (cmd === '') return;
      setLines(prev => [...prev, { type: 'cmd', text: '$ ' + userLine }, { type: 'out', text: out }]);
      setUserLine('');
    }
  };

  return (
    <section id="terminal" ref={ref} className="fade-during-dive section-scrim section-shell">
      <div className="section-inner">
        <div className="reading-rail wide">
          <div style={{padding:0}}>
            <div className="section-eyebrow">05 — Deep Field</div>
            <h2 className="section-title">Access the terminal.</h2>
            <p className="section-kicker" style={{marginBottom:'1.5rem'}}>
              Try <span style={{color:'var(--accent)'}}>help</span>, <span style={{color:'var(--accent)'}}>ls projects</span>, or the hidden hire command.
            </p>
            <div className="glass-card" style={{position:'relative', padding:0}}>
          <div style={{position:'absolute',top:6,left:10}}><span className="skeuo-screw"/></div>
          <div style={{position:'absolute',top:6,right:10}}><span className="skeuo-screw"/></div>
          <div style={{position:'absolute',bottom:6,left:10}}><span className="skeuo-screw"/></div>
          <div style={{position:'absolute',bottom:6,right:10}}><span className="skeuo-screw"/></div>
          <div className="scanlines skeuo-inset" style={{
            position:'relative',borderRadius:10,
            padding:'1.5rem',fontFamily:'var(--font-mono)',color:'var(--accent)',minHeight:420
          }}>
          <div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center'}}>
            <span className="mac-btn mac-close" title="close" />
            <span className="mac-btn mac-min" title="minimise" />
            <span className="mac-btn mac-max" title="maximise" />
            <span className="font-mono" style={{marginLeft:'auto',fontSize:10,color:'var(--text-dim)',letterSpacing:'0.2em'}}>kunal@portfolio — /dev/tty</span>
          </div>
          <div style={{fontSize:14,lineHeight:1.7,position:'relative',zIndex:3,maxHeight:320,overflowY:'auto'}} onClick={() => document.getElementById('terminput')?.focus()}>
            {lines.map((l, i) => (
              <div key={i} style={{color: l.type === 'cmd' ? 'var(--accent)' : 'var(--text)'}}>{l.text}</div>
            ))}
            <div>
              <span style={{color:'var(--accent)'}}>$ </span>
              <input id="terminput" value={userLine} onChange={e => { setUserLine(e.target.value); window._sfx?.type(); }} onKeyDown={handleKey}
                style={{background:'transparent',border:0,outline:'none',color:'var(--text)',fontFamily:'inherit',fontSize:14,width:'60%',cursor:'none'}}
                placeholder="type 'help'"/>
              <span className="blink" style={{color:'var(--accent)'}}>█</span>
            </div>
            <div ref={endRef}/>
          </div>
          {/* E8: git log live feed — always visible below the interactive area */}
          <div style={{marginTop:20,borderTop:'1px solid rgba(167,231,243,0.12)',paddingTop:14}}>
            <div style={{color:'var(--accent)',fontFamily:'var(--font-mono)',fontSize:11,marginBottom:10,letterSpacing:'0.18em',opacity:0.7}}>
              $ git log --oneline --live
            </div>
            {activity.map((item, i) => (
              <div key={i} style={{display:'flex',gap:12,marginBottom:7,fontSize:11,flexWrap:'wrap',alignItems:'center'}}>
                <span style={{color:'#e6c97a',opacity:0.85,fontFamily:'var(--font-mono)',minWidth:54}}>{item.sha}</span>
                <span style={{color:'var(--warp)',fontFamily:'var(--font-mono)',minWidth:80,opacity:0.8}}>{item.repo}</span>
                <span style={{color:'var(--text)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.message}</span>
                <span style={{color:'var(--text-faint)',whiteSpace:'nowrap',fontSize:10}}>{formatRelativeTime(item.timestamp)}</span>
              </div>
            ))}
            <div style={{color:'var(--text-faint)',fontSize:9.5,marginTop:10,letterSpacing:'0.18em',textTransform:'uppercase',fontFamily:'var(--font-mono)'}}>
              ● live · polls every 5 min
            </div>
          </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </section>
  );
}

