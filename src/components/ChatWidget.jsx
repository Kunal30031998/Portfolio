import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { CHAT_SUGGESTIONS as SUGGESTIONS, SYSTEM_PROMPT, localBrain } from '../data/content';

/* AI chat launcher + draggable panel. Clara — the portfolio AI — powered by Claude.
   Rebranded as CLARA v2.0: the same system Kunal deployed for CDQN. */
const CLARA_INITIAL_MSG = { role: 'assistant', text: '> CLARA online. Ask me about Kunal\'s stack, projects, or experience.' };
const SESSION_KEY = 'kunal_chat_history';
const CLARA_OPENED_KEY = 'clara_opened';
const MAX_TURNS = 10;

// E7: How-Clara-works easter egg — instant client-side response
const HOW_CLARA_WORKS_REPLY = `I run on Claude Sonnet, wrapped in a system prompt Kunal wrote that gives me his background, personality, and project context. The production version of me at CDQN works the same way — different data, same architecture. Want to see the projects section where Kunal describes building me?`;

// Clara intro animation sequence
const CLARA_INTRO = [
  '> CLARA initializing...',
  '> portfolio mode active.',
  '> Hi — I\'m Clara. Ask me anything about Kunal\'s work,',
  '> or just say "show me something cool."',
];

export function ChatWidget({ onHoverBtn, onUnhover, scrollTo }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [CLARA_INITIAL_MSG];
  });
  const [loading, setLoading] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);
  const panelRef = useRef(null);
  const dragState = useRef({ dragging: false, ox: 0, oy: 0 });
  const dragCleanupRef = useRef(null); // tracks pending window listeners for cleanup
  const unmountedRef = useRef(false);
  const sessionDebounceRef = useRef(null);
  const [pos, setPos] = useState({ x: null, y: null });

  // Cancel drag listeners and debounce timer on unmount
  useEffect(() => () => {
    unmountedRef.current = true;
    dragCleanupRef.current?.();
    if (sessionDebounceRef.current) clearTimeout(sessionDebounceRef.current);
  }, []);
  const endRef = useRef(null);

  // E15: persist chat history — debounced to avoid thrashing on rapid message additions
  useEffect(() => {
    if (sessionDebounceRef.current) clearTimeout(sessionDebounceRef.current);
    sessionDebounceRef.current = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages)); } catch (_) {}
    }, 300);
  }, [messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // E7: Clara intro on first open
  useEffect(() => {
    if (!open) return;
    const alreadyOpened = sessionStorage.getItem(CLARA_OPENED_KEY);
    if (alreadyOpened) return;
    sessionStorage.setItem(CLARA_OPENED_KEY, '1');
    setMessages([]);
    setIntroPlaying(true);
    let cancelled = false;
    (async () => {
      for (const line of CLARA_INTRO) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 600));
        setMessages(m => [...m, { role: 'assistant', text: line }]);
      }
      setIntroPlaying(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  const send = useCallback(async (msg) => {
    if (unmountedRef.current) return;
    const userMessage = (msg ?? input).trim();
    if (!userMessage || loading || introPlaying) return;
    setInput('');
    const nextMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(nextMessages);
    setLoading(true);

    // E7: instant easter egg — how does Clara work?
    const lower = userMessage.toLowerCase();
    if (lower.includes('how do you work') || lower.includes('how were you built') || lower.includes('how was this built') || lower.includes('can i see your code')) {
      await new Promise(r => setTimeout(r, 200));
      setMessages(m => [...m, { role: 'assistant', text: '> ' + HOW_CLARA_WORKS_REPLY }]);
      setLoading(false);
      if (lower.includes('code')) setTimeout(() => scrollTo('terminal'), 400);
      return;
    }

    const apiKey = (typeof window !== 'undefined') && (window.ANTHROPIC_API_KEY || localStorage.getItem('ANTHROPIC_API_KEY'));
    let parsed;
    if (apiKey) {
      try {
        const historyMsgs = nextMessages
          .filter(m => m.role === 'user' || (m.role === 'assistant' && m !== CLARA_INITIAL_MSG))
          .slice(-(MAX_TURNS * 2))
          .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
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
            messages: historyMsgs
          })
        });
        const data = await response.json();
        parsed = JSON.parse(data.content[0].text);
      } catch (e) {
        console.warn('Claude call failed, falling back:', e);
        parsed = localBrain(userMessage);
      }
    } else {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      parsed = localBrain(userMessage);
    }

    setMessages(m => [...m, { role: 'assistant', text: '> ' + parsed.message }]);
    if (unmountedRef.current) return;
    setLoading(false);
    if (parsed.scrollTo && parsed.scrollTo !== 'null') {
      setTimeout(() => scrollTo(parsed.scrollTo), 400);
    }
  }, [input, loading, introPlaying, messages, scrollTo]);

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
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = () => {
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
    width: 'min(420px, 92vw)', height: 'min(520px, 85vh)',
    zIndex: 9000
  };

  if (!open) {
    return (
      <button
        onMouseEnter={onHoverBtn} onMouseLeave={onUnhover}
        onClick={() => setOpen(true)}
        className="font-mono skeuo-pill chat-launcher-btn"
        style={{
          position:'fixed',right:24,bottom:24,zIndex:9000,
          padding:'14px 22px',backdropFilter:'blur(14px)',
          border:'1px solid var(--accent)',borderRadius:999,color:'var(--accent)',
          fontSize:13,letterSpacing:'0.1em',cursor:'none',
          display:'inline-flex',alignItems:'center',gap:10
        }}>
        <MessageSquare size={14}/>
        {' > CLARA'}
        <span style={{fontSize:9,background:'rgba(0,255,200,0.15)',border:'1px solid rgba(0,255,200,0.3)',borderRadius:4,padding:'1px 5px',marginLeft:4,letterSpacing:'0.08em'}}>v2.0</span>
        <span className="blink">_</span>
      </button>
    );
  }

  return (
    <div ref={panelRef} className="chat-panel skeuo-bezel chat-open-panel" style={{
      ...panelStyle, display:'flex', flexDirection:'column',
      backdropFilter:'blur(18px)', overflow:'hidden', fontFamily:'var(--font-mono)',
      // E7: animated gradient border
      border: '1px solid transparent',
      background: 'linear-gradient(var(--bg,#070b14),var(--bg,#070b14)) padding-box, linear-gradient(90deg,#00ffcc,#ff00ff,#00ffcc) border-box',
      backgroundSize: '200% 100%',
      animation: 'claraBorder 4s linear infinite',
    }}>
      <style>{`@keyframes claraBorder{0%{background-position:0% 0%}100%{background-position:200% 0%}}`}</style>
      <div onMouseDown={onDragStart} className="skeuo-pill" style={{
        padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid rgba(0,255,200,0.15)',cursor:'grab',userSelect:'none'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="skeuo-led green pulse-dot" style={{width:10,height:10,borderRadius:'50%'}}/>
          <span style={{color:'var(--accent)',fontSize:12,letterSpacing:'0.15em'}}>CLARA · Portfolio Assistant</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{color:'var(--text-dim)',fontSize:10,letterSpacing:'0.1em'}}>built by Kunal</span>
          <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={() => setOpen(false)} style={{background:'transparent',border:0,color:'var(--text-dim)',cursor:'none'}}>
            <X size={16}/>
          </button>
        </div>
      </div>
      <div className="skeuo-inset" style={{flex:1,overflowY:'auto',padding:'14px',margin:'8px 0',borderRadius:8,fontSize:13,lineHeight:1.6}}>
        {messages.map((m, i) => (
          <div key={i} style={{marginBottom:12,color: m.role === 'user' ? 'var(--text)' : 'var(--accent)'}}>
            {m.role === 'user' ? <span style={{color:'var(--text-dim)'}}>$ </span> : null}{m.text}
          </div>
        ))}
        {/* E7: typing indicator */}
        {loading && (
          <div style={{color:'var(--accent)',display:'flex',gap:4,alignItems:'center'}}>
            <span>&gt;</span>
            {[0,1,2].map(i=>(
              <span key={i} style={{
                width:6,height:6,borderRadius:'50%',background:'var(--accent)',
                display:'inline-block',
                animation:`dotBounce 1.2s ${i*0.2}s ease-in-out infinite`
              }}/>
            ))}
            <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
          </div>
        )}
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
          onChange={e => { setInput(e.target.value); window._sfx?.type(); }}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="ask Clara anything..."
          style={{flex:1,background:'transparent',border:0,outline:'none',color:'var(--text)',fontFamily:'inherit',fontSize:13,cursor:'none'}}
        />
        <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={() => send()} style={{background:'transparent',border:0,color:'var(--accent)',cursor:'none'}}>
          <Send size={16}/>
        </button>
      </div>
    </div>
  );
}

