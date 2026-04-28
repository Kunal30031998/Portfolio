import React, { useEffect, useRef, useState } from 'react';
import { TERMINAL_SCRIPT, config } from '../data/content';
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
    { repo: 'Hash_AD_KunalGautam_FoundryTraining', message: 'feat: add foundry training modules', timestamp: new Date(Date.now() - 3600000), sha: 'a1b2c3d' },
    { repo: 'palantir-covid-project', message: 'feat: covid data pipeline setup', timestamp: new Date(Date.now() - 7200000), sha: 'e4f5g6h' },
    { repo: 'instagram-stories', message: 'feat: instagram stories clone', timestamp: new Date(Date.now() - 86400000), sha: 'i7j8k9l' },
  ];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=10`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return FALLBACK;
    const events = await res.json();
    const relevant = events
      .filter(e => ['PushEvent', 'CreateEvent', 'IssuesEvent', 'PullRequestEvent', 'ReleaseEvent', 'PublicEvent'].includes(e.type))
      .slice(0, 4);
    if (!relevant.length) return FALLBACK;
    return relevant.map(e => {
      if (e.type === 'PushEvent') {
        const sha = (e.payload.commits?.[0]?.sha || e.payload.head || '').slice(0, 7) || 'unknown';
        return {
          repo: e.repo.name.split('/')[1],
          message: e.payload.commits?.[0]?.message?.split('\n')[0] || 'push to ' + (e.payload.ref?.split('/').pop() || 'main'),
          timestamp: new Date(e.created_at),
          sha,
        };
      }
      if (e.type === 'CreateEvent') {
        return {
          repo: e.repo.name.split('/')[1],
          message: `create: ${e.payload.ref_type} ${e.payload.ref || ''}`.trim(),
          timestamp: new Date(e.created_at),
          sha: e.payload.ref_type.slice(0, 7).padEnd(7, '-'),
        };
      }
      if (e.type === 'PublicEvent') {
        return {
          repo: e.repo.name.split('/')[1],
          message: 'repo: made public',
          timestamp: new Date(e.created_at),
          sha: 'public-',
        };
      }
      if (e.type === 'PullRequestEvent') {
        return {
          repo: e.repo.name.split('/')[1],
          message: `pr ${e.payload.action}: ${e.payload.pull_request?.title || ''}`.slice(0, 72),
          timestamp: new Date(e.created_at),
          sha: String(e.payload.number).padStart(7, '0'),
        };
      }
      if (e.type === 'IssuesEvent') {
        return {
          repo: e.repo.name.split('/')[1],
          message: `issue ${e.payload.action}: ${e.payload.issue?.title || ''}`.slice(0, 72),
          timestamp: new Date(e.created_at),
          sha: String(e.payload.issue?.number).padStart(7, '0'),
        };
      }
      return {
        repo: e.repo.name.split('/')[1],
        message: e.type.replace('Event', '').toLowerCase() + ': ' + (e.payload.action || 'activity'),
        timestamp: new Date(e.created_at),
        sha: e.type.slice(0, 7).toLowerCase(),
      };
    });
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
  const [cwd, setCwd] = useState('~/portfolio');
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const DIRS = {
    '~': ['portfolio'],
    '~/portfolio': ['projects', 'skills.json', 'about.md', 'resume.pdf', 'hire.sh', 'README.md'],
    '~/portfolio/projects': ['admin-dashboard', 'ui-library', 'cloud-microservices', 'ci-cd-pipeline', 'realtime-elearning', 'canvas-ui'],
  };

  const ALL_COMMANDS = [
    'whoami','pwd','ls','ls -la','ls -lah','date','uptime','uname -a',
    'cat README.md','cat about.md','cat skills.json','cat resume.pdf',
    'git log','git log --oneline','git status','git branch','git diff',
    'npm run build','npm run dev','npm test','npm audit',
    'ps aux','top','df -h','free -h','env',
    'ping kunal','curl kunal.dev','ssh hire@kunal',
    'cd projects','cd skills','cd ..','cd ~',
    'help','clear','history','sudo hire kunal',
    'vim','nano','cat /dev/null','echo $USER',
    'node --version','npm --version','docker ps',
    'kunal --role','kunal --stack','kunal --scale','kunal --why','kunal --status',
    'open --contact','./hire.sh','view source',
  ];

  const { email, phone } = config.owner;

  const OUTPUT = {
    'whoami':             'kunal gautam  —  senior frontend engineer · full stack · 6+ years',
    'pwd':                () => cwd,
    'date':               () => new Date().toString(),
    'uptime':             () => `up ${Math.floor(Math.random()*9999)} days,  load avg: 0.${Math.floor(Math.random()*99)}`,
    'uname -a':           'Darwin portfolio.local 23.4.0 arm64 React/18.3.1',
    'env':                'NODE_ENV=production\nUSER=kunal\nSHELL=/bin/zsh\nEDITOR=vim\nPORTFOLIO=live',
    'echo $USER':         'kunal',
    'node --version':     'v20.11.0',
    'npm --version':      '10.4.0',
    'ps aux': `PID  CMD\n 1   portfolio --serve\n 2   three.js --webgl\n 3   gsap --animate\n 4   lenis --scroll\n 5   claude --chat`,
    'top':                'CPU:  2.1%    MEM: 142MB    GPU: WebGL active\nthree.js: 60fps    lenis: smooth    vite: idle',
    'df -h':              'Filesystem    Size  Used Avail\n/dev/ideas     ∞     6yr   ∞\n/dev/passion  100%  100%   0%',
    'free -h':            'total   used   free\n  ∞      6yr    ∞   (ideas never run out)',
    'git status':         'On branch main\nYour branch is up to date with origin/main.\n\nnothing to commit, working tree clean',
    'git branch':         '* main\n  feat/webgl-scene\n  perf/compositor-only\n  feat/ai-chat',
    'git diff':           '(working tree clean — all good in production)',
    'git log':            'commit a3f91c2  feat: add WebGL solar system\ncommit b7d204e  perf: reduce draw calls 40%\ncommit c1e8a01  feat: AI chat with claude\ncommit 9fa3310  refactor: compositor-only CSS\ncommit 2bc771d  chore: deploy cloudflare workers',
    'git log --oneline':  'a3f91c2 feat: WebGL solar system scene\nb7d204e perf: three.js draw calls -40%\nc1e8a01 feat: claude AI chat widget\n9fa3310 refactor: compositor animations\n2bc771d chore: cloudflare workers deploy',
    'npm run build':      'vite v6.4.2 building for production...\n✓ 847 modules transformed\ndist/assets/index.js    142 kB │ gzip: 46 kB\ndist/assets/three.js    470 kB │ gzip: 121 kB\n✓ built in 1.28s',
    'npm run dev':        'VITE v6.4.2  ready in 312ms\n➜  Local:   http://localhost:5173/\n➜  Network: http://192.168.1.5:5173/',
    'npm test':           'PASS  src/components (12 tests)\nPASS  src/hooks (8 tests)\n✓ 20 tests passed  0 failed  coverage: 84%',
    'npm audit':          'found 0 vulnerabilities in 847 packages',
    'docker ps':          'CONTAINER ID   IMAGE              STATUS\na1b2c3d4e5f6   portfolio:latest   Up 6 years\nb7c8d9e0f1a2   nginx:alpine       Up 6 years',
    'cat README.md':      '# Kunal Gautam\nSenior Frontend Engineer · Full Stack · 6+ yrs\n\nReact · TypeScript · Node.js · GraphQL · AWS\nShipped 50K+ concurrent user products.\n\n$ ./hire.sh  to get in touch',
    'cat about.md':       '# About\nSoftware Developer II @ HashedIn by Deloitte\nFrontend lead. Full stack delivery ownership.\nMentored 4 engineers. 12+ products delivered.',
    'cat skills.json':    '{\n  "frontend": ["React","TypeScript","Next.js","Redux","GSAP","Three.js"],\n  "backend":  ["Node.js","Express","GraphQL","WebSockets","Postgres"],\n  "cloud":    ["AWS","GCP","Docker","Terraform","GitHub Actions"],\n  "testing":  ["Jest","RTL","Storybook","Playwright"]\n}',
    'cat resume.pdf':     '╔══════════════════════════════════════╗\n║  binary file — run: open --contact   ║\n╚══════════════════════════════════════╝',
    'kunal --role':       'software developer ii @ hashedin by deloitte\nfrontend lead + full stack delivery · may 2022 – present',
    'kunal --stack':      'frontend  react · typescript · next.js · vite · gsap · three.js\nbackend   node.js · express · graphql · websockets · postgres\ncloud     aws · gcp · docker · terraform · github actions',
    'kunal --scale':      '50,000+ concurrent users  ·  12+ products shipped\n4 engineers mentored  ·  6+ years production experience',
    'kunal --why':        '"I own the UI layer and understand what\'s below it.\nThat\'s the difference between shipping and guessing."',
    'kunal --status':     '● open to senior frontend, tech lead, and full-stack roles\n● remote-first · open to relocation · available now',
    'open --contact':     `email  ${email}\nphone  ${phone}\ngithub github.com/Kunal30031998`,
    './hire.sh':          `📡 sending signal...\n✓ email: ${email}\n✓ status: available for senior / lead roles\naccess granted. let's build something.`,
    'ping kunal':         'PING kunal.gautam (available)\n64 bytes from kunal: icmp_seq=0 ttl=64 time=0.1ms\nresponse time: immediate',
    'curl kunal.dev':     '< HTTP/2 200\n< content-type: text/human\n< x-available: true\n\nSenior Frontend Engineer · Open to work',
    'ssh hire@kunal':     `connecting to kunal@portfolio...\n✓ auth: portfolio accepted\nWelcome. contact: ${email}`,
    'sudo hire kunal':    `[sudo] password for recruiter:\naccess granted ✓\ncontact: ${email}`,
    'history':            () => historyStack.slice(-10).map((c,i) => `${String(i+1).padStart(4)}  ${c}`).join('\n') || '(no history yet)',
    'vim':                ':q  (no config files were harmed)',
    'nano':               '^X to exit  (just use vim)',
    'cat /dev/null':      '(silence)',
    'view source':        '__VIEW_SOURCE__',
    'viewsource':         '__VIEW_SOURCE__',
    'help': `available commands:\n─────────────────────────────────────────\n  whoami  pwd  ls  date  uptime  uname -a\n  cat README.md  cat about.md  cat skills.json\n  git log  git status  git branch\n  npm run build  npm test  npm audit\n  ps aux  top  df -h  docker ps\n  kunal --role  --stack  --scale  --why  --status\n  ping kunal  curl kunal.dev  ssh hire@kunal\n  sudo hire kunal  ./hire.sh  open --contact\n  history  clear  view source\n─────────────────────────────────────────`,
  };

  useEffect(() => {
    const username = 'Kunal30031998';
    fetchCurrentActivity(username).then(setActivity);
    const poll = setInterval(() => fetchCurrentActivity(username).then(setActivity), 5 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!inView || started) return;
    setStarted(true);
    let cancelled = false;
    (async () => {
      for (const step of TERMINAL_SCRIPT) {
        if (cancelled) return;
        setLines(prev => [...prev, { type: 'cmd', text: '' }]);
        for (let i = 0; i <= step.cmd.length; i++) {
          if (cancelled) return;
          setLines(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { type: 'cmd', text: step.cmd.slice(0, i) };
            return copy;
          });
          if (i > 0) window._sfx?.type();
          await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
        }
        await new Promise(r => setTimeout(r, 200));
        // split multi-line output into separate line entries
        const outLines = step.out.split('\n');
        setLines(prev => [...prev, ...outLines.map(t => ({ type: 'out', text: t }))]);
        await new Promise(r => setTimeout(r, 150));
      }
    })();
    return () => { cancelled = true; };
  }, [inView, started]);


  const runCommand = (raw) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    // history push
    setHistoryStack(prev => [...prev, raw.trim()]);
    setHistoryIdx(-1);

    if (cmd === 'clear') {
      setLines([]);
      return;
    }

    // cd handling
    if (cmd.startsWith('cd ') || cmd === 'cd ~' || cmd === 'cd ..') {
      const target = raw.trim().slice(3).trim();
      let next = cwd;
      if (!target || target === '~') next = '~/portfolio';
      else if (target === '..') next = cwd.includes('/') ? cwd.split('/').slice(0,-1).join('/') || '~' : '~';
      else {
        const base = cwd.endsWith('/') ? cwd : cwd + '/';
        const candidate = base + target;
        next = DIRS[candidate] ? candidate : cwd;
        if (!DIRS[candidate]) {
          setLines(prev => [...prev,
            { type: 'cmd', text: `${cwd} $ ${raw.trim()}` },
            { type: 'err', text: `cd: ${target}: No such directory` }
          ]);
          return;
        }
      }
      setCwd(next);
      setLines(prev => [...prev, { type: 'cmd', text: `${cwd} $ ${raw.trim()}` }]);
      return;
    }

    // ls — show directory contents
    if (cmd === 'ls' || cmd === 'ls -la' || cmd === 'ls -lah') {
      const entries = DIRS[cwd] || ['(empty)'];
      const detailed = cmd !== 'ls';
      const out = detailed
        ? entries.map(e => `${e.includes('.') ? '-rw-r--r--' : 'drwxr-xr-x'}  kunal  ${e}`).join('\n')
        : entries.join('  ');
      setLines(prev => [...prev,
        { type: 'cmd', text: `${cwd} $ ${raw.trim()}` },
        ...out.split('\n').map(t => ({ type: 'out', text: t }))
      ]);
      return;
    }

    const handler = OUTPUT[cmd] ?? OUTPUT[raw.trim().toLowerCase()];
    if (handler === '__VIEW_SOURCE__') {
      setLines(prev => [...prev,
        { type: 'cmd', text: `${cwd} $ ${raw.trim()}` },
        { type: 'out', text: 'opening source viewer...' }
      ]);
      if (onViewSource) onViewSource();
      return;
    }

    const result = typeof handler === 'function' ? handler() : handler;
    const out = result ?? `command not found: ${cmd}\ntype 'help' to see available commands`;

    setLines(prev => [
      ...prev,
      { type: 'cmd', text: `${cwd} $ ${raw.trim()}` },
      ...String(out).split('\n').map(t => ({ type: 'out', text: t }))
    ]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      runCommand(userLine);
      setUserLine('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!historyStack.length) return;
      const idx = historyIdx < 0 ? historyStack.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(idx);
      setUserLine(historyStack[idx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx < 0) return;
      const idx = historyIdx + 1;
      if (idx >= historyStack.length) { setHistoryIdx(-1); setUserLine(''); }
      else { setHistoryIdx(idx); setUserLine(historyStack[idx]); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const partial = userLine.toLowerCase();
      if (!partial) return;
      const match = ALL_COMMANDS.find(c => c.startsWith(partial));
      if (match) setUserLine(match);
    }
  };

  return (
    <section id="terminal" ref={ref} className="fade-during-dive section-scrim section-shell">
      <div className="section-inner">
        <div className="reading-rail wide">
          <div style={{padding:0}}>
            <div className="section-eyebrow">{config.sections.terminal.eyebrow}</div>
            <h2 className="section-title">{config.sections.terminal.title}</h2>
            <p className="section-kicker" style={{marginBottom:'1.5rem'}}>
              Interactive shell — try <span style={{color:'var(--accent)'}}>help</span>, <span style={{color:'var(--accent)'}}>ls -la</span>, <span style={{color:'var(--accent)'}}>git log</span>, or <span style={{color:'var(--accent)'}}>sudo hire kunal</span>. Tab to complete, ↑↓ for history.
            </p>
            <div className="glass-card" style={{position:'relative', padding:0}}>
              <div style={{position:'absolute',top:6,left:10}}><span className="skeuo-screw"/></div>
              <div style={{position:'absolute',top:6,right:10}}><span className="skeuo-screw"/></div>
              <div style={{position:'absolute',bottom:6,left:10}}><span className="skeuo-screw"/></div>
              <div style={{position:'absolute',bottom:6,right:10}}><span className="skeuo-screw"/></div>
              <div className="scanlines skeuo-inset" style={{
                position:'relative',borderRadius:10,
                padding:'1.5rem',fontFamily:'var(--font-mono)',color:'var(--accent)',minHeight:460
              }}>
                {/* Title bar */}
                <div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center'}}>
                  <span className="mac-btn mac-close" title="close" />
                  <span className="mac-btn mac-min" title="minimise" />
                  <span className="mac-btn mac-max" title="maximise" />
                  <span className="font-mono" style={{marginLeft:'auto',fontSize:10,color:'var(--text-dim)',letterSpacing:'0.2em'}}>kunal@portfolio — {cwd}</span>
                </div>

                {/* Output area */}
                <div
                  style={{fontSize:13,lineHeight:1.75,position:'relative',zIndex:3,maxHeight:360,overflowY:'auto',paddingRight:4}}
                  onClick={() => inputRef.current?.focus()}
                >
                  {lines.map((l, i) => (
                    <div key={i} style={{
                      color: l.type === 'cmd' ? 'var(--accent)' : l.type === 'err' ? '#ff6b6b' : 'var(--text)',
                      paddingLeft: l.type === 'cmd' ? 0 : '0.5rem',
                      opacity: l.type === 'out' ? 0.9 : 1,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>{l.text}</div>
                  ))}
                  {/* Active input line */}
                  <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                    <span style={{color:'var(--accent)',whiteSpace:'nowrap',flexShrink:0}}>
                      <span style={{color:'var(--warp)',opacity:0.7}}>{cwd}</span>
                      {' $ '}
                    </span>
                    <input
                      ref={inputRef}
                      id="terminput"
                      value={userLine}
                      onChange={e => { setUserLine(e.target.value); window._sfx?.type(); }}
                      onKeyDown={handleKey}
                      style={{background:'transparent',border:0,outline:'none',color:'var(--text)',fontFamily:'inherit',fontSize:13,flex:1,cursor:'none',minWidth:0}}
                      placeholder="type 'help' or press Tab"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className="blink" style={{color:'var(--accent)'}}>█</span>
                  </div>
                  <div ref={endRef}/>
                </div>

                {/* Live git log feed */}
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

