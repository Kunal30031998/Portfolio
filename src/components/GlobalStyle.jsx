import React from 'react';

/* ---------------------------------------------------------------------------
   Global CSS for the portfolio — theme tokens, section utilities, minimal
   surface layer, rocket scrollbar, and reduced-motion respect.
   Rendered once from <Portfolio/> so the styles live with the component.
   --------------------------------------------------------------------------- */
export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
    :root{
      --bg:#020408;
      --surface:rgba(10,15,25,0.85);
      /* Primary accent — dusty teal, a muted cousin of ice-cyan that sits
         naturally against the galaxy backdrop instead of fighting it. */
      --accent:#8fd8e8;
      --accent-bright:#d8ecf2;
      --accent-dim:#3a6a78;
      --accent-glow:rgba(143,216,232,0.18);
      /* Warm counterpoint — galactic-dust amber, used sparingly for emphasis */
      --warm:#e8a76b;
      --warm-glow:rgba(232,167,107,0.22);
      /* Body text — cool off-white that reads as luminous dust rather than
         stark white; every tier steps slightly deeper into the indigo shadow. */
      --text:#dde5f2;
      --text-dim:#8494b0;
      --text-faint:#556480;
      --magenta:#d97fc0;
      --green:#7ed9a6;
      --gold:#e8c87a;
      --font-display:'Orbitron', monospace;
      --font-mono:'JetBrains Mono', monospace;
      --content-fade:1;
    }
    *{box-sizing:border-box}
    html,body{background:var(--bg);color:var(--text);font-family:var(--font-mono);}
    body{
      /* Cinematic page-level scrim — vignette corners + subtle horizontal
         letterbox gradient, painted ABOVE the WebGL canvas but BELOW the
         HTML content. Keeps the eye centered on the solar system / galaxy
         reveal without dimming the actual artwork. */
      position:relative;
    }
    body::before{
      content:'';position:fixed;inset:0;pointer-events:none;z-index:1;
      background:radial-gradient(ellipse 120% 80% at 50% 50%, transparent 55%, rgba(2,4,8,0.45) 100%);
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
    .scanlines::before{display:none}

    /* ---------- ROCKET SCROLLBAR ----------
       The thumb is a Lucide-style rocket SVG, nose-down, riding a thin
       trail. Works in Chrome/Safari/Edge via -webkit-scrollbar; Firefox
       gets a simple dusty-teal thumb via scrollbar-color. */
    html{scrollbar-color: #8fd8e8 rgba(143,216,232,0.08); scrollbar-width: thin;}
    ::-webkit-scrollbar{width:28px;background:transparent}
    ::-webkit-scrollbar-track{
      background:
        linear-gradient(to bottom,
          transparent 0,
          rgba(143,216,232,0.10) 8%,
          rgba(143,216,232,0.18) 50%,
          rgba(143,216,232,0.10) 92%,
          transparent 100%) center / 2px 100% no-repeat,
        transparent;
    }
    ::-webkit-scrollbar-thumb{
      background-color: transparent;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238fd8e8' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'><g transform='rotate(180 12 12)'><path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z'/><path d='m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'/><path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'/><path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'/></g></svg>");
      background-repeat:no-repeat;
      background-position:center;
      background-size:22px 22px;
      border:none;
      min-height:36px;
      filter: drop-shadow(0 0 6px rgba(143,216,232,0.55));
    }
    ::-webkit-scrollbar-thumb:hover{
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d8ecf2' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><g transform='rotate(180 12 12)'><path d='M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z'/><path d='m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'/><path d='M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'/><path d='M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'/></g></svg>");
      filter: drop-shadow(0 0 10px rgba(232,167,107,0.7));
    }
    ::-webkit-scrollbar-button{display:none;height:0;width:0}
    ::-webkit-scrollbar-corner{background:transparent}
    @keyframes blink {0%,50%{opacity:1}51%,100%{opacity:0}}
    .blink{animation:blink 1s steps(1) infinite}
    @keyframes pulseDot {0%,100%{box-shadow:0 0 0 0 var(--accent-glow)}50%{box-shadow:0 0 0 8px transparent}}
    .pulse-dot{animation:pulseDot 1.6s ease-out infinite}
    @keyframes shimmerSweep {
      0%{background-position:-200% 0}
      100%{background-position:200% 0}
    }
    .shimmer:hover{background:rgba(143,216,232,0.08)}
    @keyframes popIn {0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
    .pop-in{animation:popIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards}
    @keyframes chevBounce {0%,100%{transform:translateY(0);opacity:0.3}50%{transform:translateY(6px);opacity:1}}
    .chev{animation:chevBounce 1.4s ease-in-out infinite}
    .chev:nth-child(2){animation-delay:.2s}.chev:nth-child(3){animation-delay:.4s}
    /* Rocket scroll indicator — rocket "descending" with an ion-flame trail. */
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
    /* Gradient text — restrained, for hero + section headings only */
    .grad-text{
      background:linear-gradient(180deg, #eef3fa 0%, #b9d7e0 70%, #8fd8e8 100%);
      -webkit-background-clip:text;background-clip:text;
      -webkit-text-fill-color:transparent;color:transparent;
    }
    /* Section scrim — disabled so every section shares the same backdrop. */
    .section-scrim{position:relative}
    .section-scrim::before{display:none}
    .section-scrim.right::before{display:none}
    .section-scrim > *{position:relative;z-index:1}
    .card-tilt{transition:transform .3s ease, border-color .25s ease}
    .card-tilt:hover{border-color:var(--accent) !important}
    .card-inner-glow{display:none}
    .card-tilt:hover .card-inner-glow{opacity:1}
    .magnetic{transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
    .reveal-line{display:block;overflow:hidden}
    .reveal-line>span{display:inline-block;transform:translateY(30px);opacity:0;transition:transform .9s cubic-bezier(.22,1,.36,1), opacity .9s}
    .reveal-line.in>span{transform:translateY(0);opacity:1}
    @keyframes fadeInUp {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .fade-up{opacity:0}
    .fade-up.in{animation:fadeInUp .8s ease-out forwards}
    .nav-pill{transition:transform .4s cubic-bezier(.34,1.56,.64,1), filter .3s, opacity .4s}
    .chat-panel{background:rgba(8,12,22,0.85);border:1px solid rgba(255,255,255,0.08)}
    .btn-cta{transition:background .3s, color .3s, box-shadow .3s, transform .15s}

    /* ---------- MINIMAL SURFACE LAYER ----------
       Flat, hairline-bordered, low-contrast surfaces. No bevels, gloss,
       or heavy shadow stacks — lets the galaxy backdrop breathe. */

    .skeuo-noise{background:none}

    /* Flat card / panel */
    .skeuo-surface{
      background:rgba(8,12,22,0.55);
      border:1px solid rgba(255,255,255,0.06);
      backdrop-filter:blur(6px);
      -webkit-backdrop-filter:blur(6px);
    }
    .skeuo-surface::before,.skeuo-surface::after{display:none}

    /* Flat button */
    .skeuo-btn{
      background:transparent;
      border:1px solid rgba(143,216,232,0.35);
      transition:background .2s ease, color .2s ease, border-color .2s ease;
    }
    .skeuo-btn::before{display:none}
    .skeuo-btn:hover{
      background:rgba(143,216,232,0.08);
      border-color:var(--accent);
      color:var(--accent-bright) !important;
    }
    .skeuo-btn:active{background:rgba(143,216,232,0.14)}
    .skeuo-btn.warm{border-color:rgba(232,167,107,0.4)}
    .skeuo-btn.warm:hover{background:rgba(232,167,107,0.08);border-color:var(--warm);color:#ffe9ce !important}

    /* Flat inset (inputs, terminal body) */
    .skeuo-inset{
      background:rgba(4,7,14,0.7);
      border:1px solid rgba(255,255,255,0.05);
    }

    /* Flat pill (nav, chat launcher) */
    .skeuo-pill{
      background:rgba(8,12,22,0.55);
      border:1px solid rgba(255,255,255,0.08);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
    }

    /* Flat chip */
    .skeuo-chip{
      background:transparent;
      border:1px solid rgba(143,216,232,0.22);
    }

    /* Simple dot indicators */
    .skeuo-led{background:var(--accent);box-shadow:0 0 6px rgba(143,216,232,0.6)}
    .skeuo-led.green{background:var(--green);box-shadow:0 0 6px rgba(126,217,166,0.6)}
    .skeuo-led.warm{background:var(--warm);box-shadow:0 0 6px rgba(232,167,107,0.6)}

    /* Flat bezel */
    .skeuo-bezel{
      padding:0;border-radius:10px;
      background:rgba(4,7,14,0.85);
      border:1px solid rgba(255,255,255,0.06);
    }

    /* Hide decorative screws */
    .skeuo-screw{display:none}

    /* Minimal sheen for headings */
    .skeuo-text{
      color:var(--text);
      background:none;-webkit-text-fill-color:currentColor;
      filter:none;
    }

    @media (prefers-reduced-motion: reduce){
      *,*::before,*::after{animation:none!important;transition:none!important}
    }
  `}</style>
);
