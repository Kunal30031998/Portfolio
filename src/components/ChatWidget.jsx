import React, { useEffect, useRef, useState } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { CHAT_SUGGESTIONS as SUGGESTIONS, SYSTEM_PROMPT, localBrain } from '../data/content';

/* AI chat launcher + draggable panel. Calls Anthropic directly if an API
   key is exposed via window.ANTHROPIC_API_KEY or localStorage; otherwise
   falls back to the deterministic local brain. */
export function ChatWidget({ onHoverBtn, onUnhover, scrollTo }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: "> kunal.ai online. ask me about my stack, projects, or experience." }]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const dragState = useRef({ dragging: false, ox: 0, oy: 0 });
  const [pos, setPos] = useState({ x: null, y: null });
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (msg) => {
    const userMessage = (msg ?? input).trim();
    if (!userMessage || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMessage }]);
    setLoading(true);

    const apiKey = (typeof window !== 'undefined') && (window.ANTHROPIC_API_KEY || localStorage.getItem('ANTHROPIC_API_KEY'));
    let parsed;
    if (apiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }]
          })
        });
        const data = await response.json();
        parsed = JSON.parse(data.content[0].text);
      } catch (e) {
        console.warn('Claude call failed, falling back:', e);
        parsed = localBrain(userMessage);
      }
    } else {
      // No key in browser — fall back to local brain (and note it)
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      parsed = localBrain(userMessage);
    }

    setMessages(m => [...m, { role: 'assistant', text: '> ' + parsed.message }]);
    setLoading(false);
    if (parsed.scrollTo && parsed.scrollTo !== 'null') {
      setTimeout(() => scrollTo(parsed.scrollTo), 400);
    }
  };

  /* Drag */
  const onDragStart = (e) => {
    const r = panelRef.current.getBoundingClientRect();
    dragState.current = { dragging: true, ox: e.clientX - r.left, oy: e.clientY - r.top };
    const move = (ev) => {
      if (!dragState.current.dragging) return;
      setPos({ x: ev.clientX - dragState.current.ox, y: ev.clientY - dragState.current.oy });
    };
    const up = () => {
      dragState.current.dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const panelStyle = {
    position:'fixed',
    right: pos.x === null ? 24 : 'auto',
    bottom: pos.y === null ? 24 : 'auto',
    left: pos.x !== null ? pos.x : 'auto',
    top: pos.y !== null ? pos.y : 'auto',
    width: 'min(420px, 92vw)', height: 520,
    zIndex: 9000
  };

  if (!open) {
    return (
      <button
        onMouseEnter={onHoverBtn} onMouseLeave={onUnhover}
        onClick={() => setOpen(true)}
        className="font-mono skeuo-pill"
        style={{
          position:'fixed',right:24,bottom:24,zIndex:9000,
          padding:'14px 22px',backdropFilter:'blur(14px)',
          border:'1px solid var(--accent)',borderRadius:999,color:'var(--accent)',
          fontSize:13,letterSpacing:'0.1em',cursor:'none',
          display:'inline-flex',alignItems:'center',gap:10
        }}>
        <MessageSquare size={14}/> {'>'} ask kunal anything<span className="blink">_</span>
      </button>
    );
  }

  return (
    <div ref={panelRef} className="chat-panel skeuo-bezel" style={{...panelStyle, display:'flex',flexDirection:'column',
      backdropFilter:'blur(18px)',
      overflow:'hidden',fontFamily:'var(--font-mono)'}}>
      <div onMouseDown={onDragStart} className="skeuo-pill" style={{
        padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',
        border:'1px solid rgba(143,216,232,0.28)',borderRadius:10,cursor:'grab',userSelect:'none'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="skeuo-led green pulse-dot" style={{width:10,height:10,borderRadius:'50%'}}/>
          <span style={{color:'var(--accent)',fontSize:12,letterSpacing:'0.15em'}}>kunal.ai // chat</span>
        </div>
        <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={() => setOpen(false)} style={{background:'transparent',border:0,color:'var(--text-dim)',cursor:'none'}}>
          <X size={16}/>
        </button>
      </div>
      <div className="skeuo-inset" style={{flex:1,overflowY:'auto',padding:'14px',margin:'8px 0',borderRadius:8,fontSize:13,lineHeight:1.6}}>
        {messages.map((m, i) => (
          <div key={i} style={{marginBottom:12,color: m.role === 'user' ? 'var(--text)' : 'var(--accent)'}}>
            {m.role === 'user' ? <span style={{color:'var(--text-dim)'}}>$ </span> : null}{m.text}
          </div>
        ))}
        {loading && <div style={{color:'var(--accent)'}}>&gt; thinking<span className="blink">_</span></div>}
        <div ref={endRef}/>
      </div>
      {messages.length <= 1 && (
        <div style={{padding:'0 4px 10px',display:'flex',flexWrap:'wrap',gap:6}}>
          {SUGGESTIONS.map(s => (
            <button key={s} onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={() => send(s)} className="skeuo-chip" style={{
              padding:'7px 12px',fontSize:11,color:'var(--accent)',
              border:'1px solid rgba(143,216,232,0.38)',borderRadius:999,cursor:'none',fontFamily:'inherit'
            }}>{s}</button>
          ))}
        </div>
      )}
      <div className="skeuo-inset" style={{padding:'10px 14px',borderRadius:10,display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:'var(--accent)',fontSize:13}}>$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="ask me anything..."
          style={{flex:1,background:'transparent',border:0,outline:'none',color:'var(--text)',fontFamily:'inherit',fontSize:13,cursor:'none'}}
        />
        <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={() => send()} style={{background:'transparent',border:0,color:'var(--accent)',cursor:'none'}}>
          <Send size={16}/>
        </button>
      </div>
    </div>
  );
}
