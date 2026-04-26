import React from 'react';

/* ---------------------------------------------------------------------------
   Global CSS — ActiveTheory-inspired cinematic system. Every surface is a
   translucent glass rail so the WebGL galaxy stays the hero.
   --------------------------------------------------------------------------- */
export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap');

    :root{
      --bg:#020309;
      --surface:rgba(8,13,22,0.34);
      --surface-strong:rgba(8,13,22,0.52);
      --surface-faint:rgba(8,13,22,0.18);

      --accent:#a7e7f3;
      --accent-bright:#e6f6fb;
      --accent-dim:#4a7f8e;
      --accent-glow:rgba(167,231,243,0.16);

      --warp:#c0a5ff;
      --warp-glow:rgba(192,165,255,0.22);

      --warm:#eabf8a;
      --warm-glow:rgba(234,191,138,0.22);

      --text:#eaf1fb;
      --text-dim:#95a5c2;
      --text-faint:#5d6c8a;

      --green:#82e3b0;
      --gold:#eacf89;
      --magenta:#e69fd2;

      --font-display:'Space Grotesk', system-ui, sans-serif;
      --font-mono:'JetBrains Mono', ui-monospace, monospace;
      --font-label:'JetBrains Mono', ui-monospace, monospace;

      --hair: 1px solid rgba(255,255,255,0.07);
      --hair-accent: 1px solid rgba(167,231,243,0.22);

      --radius-lg:16px;
      --radius-md:12px;
      --radius-sm:8px;
      --content-fade:1;
    }

    *{box-sizing:border-box}
    html,body{background:var(--bg);color:var(--text);font-family:var(--font-display);font-weight:400;}
    body{
      position:relative;
      font-size:16px;
      line-height:1.6;
      letter-spacing:0.003em;
      -webkit-font-smoothing:antialiased;
      text-rendering:optimizeLegibility;
    }
    h1,h2,h3{
      font-family:var(--font-display);
      font-weight:700;
      letter-spacing:-0.022em;
      line-height:1.05;
      margin:0;
    }
    h4,h5,h6{
      font-family:var(--font-display);
      font-weight:600;
      letter-spacing:-0.01em;
      margin:0;
    }
    p{
      font-family:var(--font-display);
      font-size:clamp(15px,1.1vw,17px);
      line-height:1.65;
      font-weight:400;
    }

    /* Vignette — center-weighted, keeps the scene bright */
    body::before{
      content:'';position:fixed;inset:0;pointer-events:none;z-index:1;
      background:
        radial-gradient(ellipse 140% 90% at 50% 50%, transparent 55%, rgba(2,4,10,0.38) 100%),
        linear-gradient(180deg, rgba(2,4,10,0.18) 0%, transparent 12%, transparent 88%, rgba(2,4,10,0.22) 100%);
    }
    body::after{display:none}

    .fade-during-dive{
      opacity:var(--content-fade, 1);
      transition:opacity 180ms ease-out;
      pointer-events:auto;
    }
    .fade-during-dive[data-dive="1"]{ pointer-events:none; }
    body{cursor:none}
    @media (hover:none){ body{cursor:auto} }
    .font-display{font-family:var(--font-display)}
    .font-mono{font-family:var(--font-mono)}
    .font-label{font-family:var(--font-label); letter-spacing:0.32em; text-transform:uppercase}

    .scanlines::before{display:none}

    /* Scrollbar — rocket thumb */
    html{scrollbar-color: #a7e7f3 rgba(167,231,243,0.08); scrollbar-width: thin;}
    ::-webkit-scrollbar{width:26px;background:transparent}
    ::-webkit-scrollbar-track{
      background:
        linear-gradient(to bottom,
          transparent 0,
          rgba(167,231,243,0.10) 8%,
          rgba(167,231,243,0.18) 50%,
          rgba(167,231,243,0.10) 92%,
          transparent 100%) center / 2px 100% no-repeat,
        transparent;
    }
    ::-webkit-scrollbar-thumb{
      background-color: transparent;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a7e7f3' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><g transform='rotate(180 12 12)'><path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z'/><path d='m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'/><path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'/><path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'/></g></svg>");
      background-repeat:no-repeat;
      background-position:center;
      background-size:20px 20px;
      border:none;
      min-height:36px;
      filter: drop-shadow(0 0 6px rgba(167,231,243,0.55));
    }
    ::-webkit-scrollbar-thumb:hover{ filter: drop-shadow(0 0 10px rgba(234,191,138,0.7)); }
    ::-webkit-scrollbar-button{display:none;height:0;width:0}
    ::-webkit-scrollbar-corner{background:transparent}

    @keyframes blink {0%,50%{opacity:1}51%,100%{opacity:0}}
    .blink{animation:blink 1s steps(1) infinite}
    @keyframes pulseDot {0%,100%{box-shadow:0 0 0 0 var(--accent-glow)}50%{box-shadow:0 0 0 8px transparent}}
    .pulse-dot{animation:pulseDot 1.6s ease-out infinite}
    @keyframes popIn {0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
    .pop-in{animation:popIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards}
    @keyframes chevBounce {0%,100%{transform:translateY(0);opacity:0.3}50%{transform:translateY(6px);opacity:1}}
    .chev{animation:chevBounce 1.4s ease-in-out infinite}
    .chev:nth-child(2){animation-delay:.2s}.chev:nth-child(3){animation-delay:.4s}
    @keyframes rocketDescend {
      0%,100%{transform:translateY(0) rotate(180deg)}
      50%    {transform:translateY(8px) rotate(180deg)}
    }
    @keyframes rocketFlame {
      0%,100%{transform:scaleY(0.85);opacity:0.55}
      50%    {transform:scaleY(1.25);opacity:1}
    }
    .rocket-scroll{animation:rocketDescend 1.6s ease-in-out infinite;transform-origin:center}
    .rocket-flame{
      width:2px;height:14px;margin-top:2px;border-radius:2px;
      background:linear-gradient(to bottom, var(--warm) 0%, var(--accent) 60%, transparent 100%);
      filter:blur(0.5px);
      animation:rocketFlame 0.35s ease-in-out infinite;transform-origin:top center;
    }
    .glow-text{color:var(--text)}
    .grad-text{
      background:linear-gradient(180deg, #f3f8ff 0%, #c9e3ec 55%, #a7e7f3 100%);
      -webkit-background-clip:text;background-clip:text;
      -webkit-text-fill-color:transparent;color:transparent;
    }
    .grad-text-warm{
      background:linear-gradient(135deg, #eabf8a 0%, #f0d4a0 35%, #a7e7f3 100%);
      -webkit-background-clip:text;background-clip:text;
      -webkit-text-fill-color:transparent;color:transparent;
    }
    .grad-text-warp{
      background:linear-gradient(180deg, #f3eaff 0%, #d4c2ff 50%, #a7e7f3 100%);
      -webkit-background-clip:text;background-clip:text;
      -webkit-text-fill-color:transparent;color:transparent;
    }

    .section-scrim{position:relative}
    .section-scrim::before{display:none}
    .section-scrim.right::before{display:none}
    .section-scrim > *{position:relative;z-index:1}

    .card-tilt{transition:transform .4s ease, border-color .3s ease, background .3s ease}
    .card-tilt:hover{border-color:rgba(167,231,243,0.5) !important}
    .card-inner-glow{display:none}

    .magnetic{transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
    .reveal-line{display:block;overflow:hidden}
    .reveal-line>span{display:inline-block;transform:translateY(30px);opacity:0;transition:transform .9s cubic-bezier(.22,1,.36,1), opacity .9s}
    .reveal-line.in>span{transform:translateY(0);opacity:1}
    @keyframes fadeInUp {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .fade-up{opacity:0}
    .fade-up.in{animation:fadeInUp .8s ease-out forwards}

    .nav-pill{transition:transform .5s cubic-bezier(.22,1,.36,1), filter .35s, opacity .45s}
    /* Top-edge scrim: masks content scrolling under the fixed nav */
    .nav-top-scrim{
      position:fixed; top:0; left:0; right:0;
      height:90px; pointer-events:none; z-index:49;
      background:linear-gradient(to bottom, rgba(6,10,18,0.92) 0%, rgba(6,10,18,0.55) 50%, transparent 100%);
    }
    .chat-panel{background:rgba(8,12,22,0.55);border:1px solid rgba(255,255,255,0.08)}
    .btn-cta{transition:background .3s, color .3s, box-shadow .3s, transform .15s}

    /* ---------- GLASS SURFACES ---------- */
    .skeuo-noise{background:none}

    .glass-card{
      background:rgba(8,12,22,0.32);
      border:var(--hair);
      backdrop-filter: blur(14px) saturate(125%);
      -webkit-backdrop-filter: blur(14px) saturate(125%);
      border-radius:var(--radius-lg);
      position:relative;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        0 30px 60px -40px rgba(0,0,0,0.6);
    }
    .glass-card.railed{ padding-left:22px; }
    .glass-card.railed::before{
      content:'';
      position:absolute;
      left:10px; top:14px; bottom:14px;
      width:2px;
      background:linear-gradient(180deg,
        rgba(167,231,243,0.0) 0%,
        rgba(167,231,243,0.55) 15%,
        rgba(167,231,243,0.9) 50%,
        rgba(167,231,243,0.55) 85%,
        rgba(167,231,243,0.0) 100%);
      border-radius:2px;
      box-shadow:0 0 10px rgba(167,231,243,0.35);
      opacity:0.85;
    }

    .skeuo-surface{
      background:rgba(8,12,22,0.28);
      border:var(--hair);
      backdrop-filter: blur(10px) saturate(120%);
      -webkit-backdrop-filter: blur(10px) saturate(120%);
    }
    .skeuo-surface::before,.skeuo-surface::after{display:none}

    .skeuo-btn{
      background:transparent;
      border:1px solid rgba(167,231,243,0.32);
      transition:background .25s ease, color .25s ease, border-color .25s ease, transform .15s;
    }
    .skeuo-btn::before{display:none}
    .skeuo-btn:hover{
      background:rgba(167,231,243,0.07);
      border-color:var(--accent);
      color:var(--accent-bright) !important;
    }
    .skeuo-btn:active{background:rgba(167,231,243,0.14); transform:scale(0.98)}
    .skeuo-btn.warm{border-color:rgba(234,191,138,0.4)}
    .skeuo-btn.warm:hover{background:rgba(234,191,138,0.08);border-color:var(--warm);color:#ffe9ce !important}
    .skeuo-btn.warp{border-color:rgba(192,165,255,0.38)}
    .skeuo-btn.warp:hover{background:rgba(192,165,255,0.08);border-color:var(--warp);color:#efe6ff !important}

    .skeuo-inset{
      background:rgba(3,6,12,0.58);
      border:1px solid rgba(255,255,255,0.05);
    }

    .skeuo-pill{
      background:rgba(6,10,18,0.72);
      border:var(--hair);
      backdrop-filter:blur(24px) saturate(150%);
      -webkit-backdrop-filter:blur(24px) saturate(150%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.05),
        0 20px 50px -30px rgba(0,0,0,0.7);
    }

    .skeuo-chip{
      background:transparent;
      border:1px solid rgba(167,231,243,0.22);
      transition:background .2s, border-color .2s, color .2s;
    }
    .skeuo-chip:hover{background:rgba(167,231,243,0.06); border-color:rgba(167,231,243,0.45)}

    .skeuo-led{background:var(--accent);box-shadow:0 0 6px rgba(167,231,243,0.6)}
    .skeuo-led.green{background:var(--green);box-shadow:0 0 6px rgba(130,227,176,0.6)}
    .skeuo-led.warm{background:var(--warm);box-shadow:0 0 6px rgba(234,191,138,0.6)}
    .skeuo-led.warp{background:var(--warp);box-shadow:0 0 8px rgba(192,165,255,0.7)}

    .skeuo-bezel{padding:0;border-radius:10px;background:rgba(3,6,12,0.58);border:1px solid rgba(255,255,255,0.06);}
    /* macOS traffic light buttons */
    .mac-btn{
      display:inline-flex; align-items:center; justify-content:center;
      width:13px; height:13px; border-radius:50%;
      border:0.5px solid rgba(0,0,0,0.25);
      position:relative; cursor:default; font-size:0;
      transition:filter .15s;
    }
    .mac-close{ background:radial-gradient(circle at 35% 30%, #ff8f84 0%, #ff5f57 45%, #c0352d 100%); box-shadow:0 0 5px rgba(255,95,87,0.4); }
    .mac-min{   background:radial-gradient(circle at 35% 30%, #ffe07a 0%, #febc2e 45%, #b87b00 100%); box-shadow:0 0 5px rgba(254,188,46,0.4); }
    .mac-max{   background:radial-gradient(circle at 35% 30%, #8de897 0%, #28c840 45%, #148b27 100%); box-shadow:0 0 5px rgba(40,200,64,0.4); }
    .mac-close:hover::after{ content:'✕'; }
    .mac-min:hover::after{   content:'−'; }
    .mac-max:hover::after{   content:'+'; }
    .mac-btn::after{
      position:absolute; font-size:8px; font-weight:700; line-height:1;
      color:rgba(0,0,0,0.55); font-family:system-ui;
    }
    .mac-btn:hover{ filter:brightness(1.15); }
      display:inline-block;
      width:8px; height:8px;
      border-radius:50%;
      background:radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18) 0%, rgba(120,140,160,0.25) 50%, rgba(20,30,45,0.8) 100%);
      border:1px solid rgba(255,255,255,0.07);
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.5);
      position:relative;
    }
    .skeuo-screw::after{
      content:'';
      position:absolute;
      inset:2px;
      background:linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
      border-radius:50%;
    }
    .skeuo-text{color:var(--text);background:none;-webkit-text-fill-color:currentColor;filter:none;}

    /* shimmer passthrough for chips */
    .shimmer:hover{background:rgba(167,231,243,0.06)}

    @media (prefers-reduced-motion: reduce){
      *,*::before,*::after{animation:none!important;transition:none!important}
    }

    /* ---------- SECTION LAYOUT ---------- */
    .section-shell{
      position:relative;
      padding: min(18vh, 160px) 5vw;
      scroll-margin-top: 80px;
    }
    .section-shell.tall{ min-height: 100vh; }
    .section-inner{
      max-width: 1240px;
      margin: 0 auto;
      display: flex;
      justify-content: flex-start;
    }
    .reading-rail{ width: min(620px, 92vw); }
    .reading-rail.right{ margin-left: auto; }
    .reading-rail.wide{ width: min(900px, 94vw); }

    .section-eyebrow{
      display:inline-flex; align-items:center; gap:10px;
      position:relative;
      color:var(--text-faint);
      font-family:var(--font-mono); font-size:10.5px;
      letter-spacing:0.38em; text-transform:uppercase;
      margin-bottom:1.25rem;
    }
    .section-eyebrow::before{
      content:''; display:inline-block; width:24px; height:1px;
      background:linear-gradient(90deg, var(--accent), transparent);
    }
    @keyframes wormholeRing {
      0%   { transform:scale(0.65); opacity:0.9; }
      45%  { opacity:0.55; }
      100% { transform:scale(2.8); opacity:0; }
    }
    .section-eyebrow.wh-active::after {
      content:'';
      position:absolute; inset:-7px -14px;
      border:1.5px solid rgba(167,231,243,0.65);
      border-radius:8px;
      box-shadow: 0 0 14px rgba(167,231,243,0.35), inset 0 0 8px rgba(167,231,243,0.08);
      pointer-events:none;
      animation: wormholeRing 1.4s cubic-bezier(.15,.85,.2,1) forwards;
    }
    .section-title{
      font-family:var(--font-display);
      font-weight:700;
      font-size:clamp(2rem, 4vw, 3rem);
      line-height:1.05;
      letter-spacing:-0.022em;
      color:var(--text);
      margin:0 0 1.5rem;
      text-shadow:0 10px 40px rgba(0,0,0,0.55);
    }
    .section-kicker{
      font-family:var(--font-display);
      font-size:clamp(15px,1.1vw,17px);
      color:var(--text-dim);
      line-height:1.65;
      letter-spacing:0.003em;
      font-weight:400;
      max-width:52ch;
    }

    /* rail-panel now frameless — just a container, no visual weight */
    .rail-panel{background:transparent;border:0;padding:0;}
    .rail-plain{background:transparent;border:0;padding:0;backdrop-filter:none;-webkit-backdrop-filter:none;}

    /* ---------- DETAIL PAGE ---------- */
    @keyframes detailIn {
      0%   { opacity:0; transform: translateY(20px) scale(0.997); filter: blur(4px); }
      100% { opacity:1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    @keyframes detailOut {
      0%   { opacity:1; transform: translateY(0) scale(1); filter: blur(0); }
      100% { opacity:0; transform: translateY(20px) scale(0.997); filter: blur(4px); }
    }
    @keyframes sectionsReveal {
      0%   { opacity:0; }
      100% { opacity:1; }
    }
    .sections-revealing {
      animation: sectionsReveal 480ms cubic-bezier(.2,.9,.2,1) forwards;
    }
    .detail-wrap{
      position:fixed; inset:0; z-index:9999;
      overflow-y:auto; -webkit-overflow-scrolling:touch;
      overscroll-behavior: contain;
      background: transparent;
      animation: detailIn 500ms cubic-bezier(.2,.9,.2,1) 80ms both;
    }
    .detail-wrap.is-closing{
      animation: detailOut 480ms cubic-bezier(.4,0,.8,.2) forwards;
      pointer-events: none;
    }
    /* Subtle planet-color tint on the right so content is readable over the live 3D scene */
    .detail-wrap::before{
      content:'';
      position:fixed; inset:0; z-index:-1; pointer-events:none;
      background:
        radial-gradient(ellipse 55% 75% at 78% 50%,
          rgba(var(--pr,150), var(--pg,120), var(--pb,220), 0.06),
          transparent 60%
        );
    }
    @media (max-width: 800px){
      .detail-wrap::before{
        background:
          radial-gradient(ellipse 80% 38% at 50% 26%,
            rgba(var(--pr,150), var(--pg,120), var(--pb,220), 0.07),
            transparent 52%
          );
      }
    }
    /* Fixed nav dock — spans full width */
    .detail-dock{
      position:fixed; top:14px; left:18px; right:18px;
      display:flex; align-items:center; justify-content:space-between;
      gap:14px;
      padding:8px 10px;
      background:rgba(5,8,16,0.64);
      border:var(--hair);
      border-radius:999px;
      backdrop-filter:blur(20px) saturate(140%);
      -webkit-backdrop-filter:blur(20px) saturate(140%);
      box-shadow:0 16px 48px -20px rgba(0,0,0,0.8);
      z-index:10001;
    }
    /* Right-side content column — left ~45% is the live planet stage */
    .detail-side{
      margin-left: 50%;
      padding: 74px 5vw 80px 28px;
      min-height: 100vh;
    }
    @media (max-width: 800px){
      .detail-side{
        margin-left: 0;
        padding: 44vh 5vw 60px;
      }
    }
    .detail-side .detail-grid{ margin:0; max-width:100%; }
    .detail-side .detail-grid.pillars{ grid-template-columns:1fr; }
    .detail-grid{max-width:1120px; margin:0 auto; display:grid; grid-template-columns: 1fr; gap:18px;}
    @media (min-width: 900px){
      .detail-grid.pillars{ grid-template-columns: repeat(3, minmax(0,1fr)); }
      .detail-grid .span-3{ grid-column: 1 / -1; }
    }

    .detail-hero{ padding:28px 26px 24px; }
    .detail-eyebrow{
      font-family:var(--font-mono);
      font-size:11px; letter-spacing:0.38em; text-transform:uppercase;
      color:var(--warp);
      display:inline-flex; align-items:center; gap:10px;
    }
    .detail-eyebrow::before{
      content:''; width:28px; height:1px;
      background:linear-gradient(90deg, var(--warp), transparent);
    }
    .detail-title{
      font-family:var(--font-display);
      font-weight:600;
      font-size:clamp(2.2rem, 5.5vw, 3.6rem);
      line-height:1.02;
      letter-spacing:-0.015em;
      margin:14px 0 0;
      color:var(--text);
      text-shadow:0 16px 60px rgba(0,0,0,0.6);
    }
    .detail-headline{
      font-family:var(--font-display);
      font-weight:400;
      font-size:clamp(1rem, 1.4vw, 1.15rem);
      line-height:1.55;
      color:var(--text-dim);
      max-width:62ch;
      margin-top:14px;
    }
    .detail-meta-row{
      margin-top:18px;
      display:flex; flex-wrap:wrap; gap:8px; align-items:center;
    }
    .pillar{ padding:22px 22px; }
    .pillar-label{
      font-family:var(--font-mono);
      font-size:10.5px; letter-spacing:0.32em; text-transform:uppercase;
      color:var(--accent);
      display:inline-flex; align-items:center; gap:8px;
    }
    .pillar-label .dot{
      width:6px;height:6px;border-radius:50%;
      background:var(--accent);
      box-shadow:0 0 8px var(--accent-glow);
    }
    .pillar-list{margin:14px 0 0; padding:0; list-style:none; display:flex; flex-direction:column; gap:10px;}
    .pillar-list li{
      color:var(--text);
      font-family:var(--font-display);
      font-weight:400;
      font-size:14px;
      line-height:1.6;
      padding-left:18px;
      position:relative;
    }
    .pillar-list li::before{
      content:''; position:absolute; left:0; top:10px;
      width:8px; height:1px;
      background:var(--accent);
      opacity:0.7;
    }
    .pillar-problem { border-color: rgba(234,191,138,0.22) !important; }
    .pillar-problem .pillar-label{ color:var(--warm) }
    .pillar-problem .pillar-label .dot{ background:var(--warm); box-shadow:0 0 8px var(--warm-glow); }
    .pillar-problem .pillar-list li::before{ background:var(--warm); }

    .pillar-impact { border-color: rgba(130,227,176,0.22) !important; }
    .pillar-impact .pillar-label{ color:var(--green) }
    .pillar-impact .pillar-label .dot{ background:var(--green); box-shadow:0 0 8px rgba(130,227,176,0.4); }
    .pillar-impact .pillar-list li::before{ background:var(--green); }

    /* Planet / sun name labels */
    .planet-label{
      position:absolute;
      font-family:var(--font-mono);
      font-size:9px;
      font-weight:500;
      letter-spacing:0.18em;
      text-transform:uppercase;
      pointer-events:none;
      white-space:nowrap;
      transform:translateX(-50%);
      opacity:0;
      /* only opacity fades — left/top track the planet synchronously each frame */
      transition:opacity 0.2s ease;
      will-change:left, top, opacity;
      user-select:none;
      -webkit-user-select:none;
    }

    body.detail-open{ overflow:hidden; }

    /* Nav — scroll progress rail */
    .nav-progress-track{
      position:absolute; left:16px; right:16px; bottom:4px; height:1px;
      background:rgba(255,255,255,0.06); overflow:hidden; border-radius:2px;
    }
    .nav-progress-fill{
      height:100%;
      background:linear-gradient(90deg, var(--accent), var(--warp));
      transform-origin:left center;
      transition:transform 120ms linear;
      box-shadow:0 0 10px var(--accent-glow);
    }

    .orbital{width:14px; height:14px; position:relative; display:inline-block;}
    .orbital::before{
      content:''; position:absolute; inset:0; border-radius:50%;
      border:1px dashed rgba(167,231,243,0.5);
      animation: orbitalSpin 6s linear infinite;
    }
    .orbital::after{
      content:''; position:absolute; width:4px; height:4px; border-radius:50%;
      top:1px; left:50%; margin-left:-2px;
      background:var(--accent); box-shadow:0 0 6px var(--accent-glow);
      animation: orbitalSpin 3s linear infinite;
      transform-origin: 2px 6px;
    }
    @keyframes orbitalSpin { to { transform: rotate(360deg); } }
  `}</style>
);
