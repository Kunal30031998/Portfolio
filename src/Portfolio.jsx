import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CDN, loadScript, PROJECTS, EXPERIENCE } from './data/content';
import { GlobalStyle } from './components/GlobalStyle';
import { CustomCursor } from './components/CustomCursor';
import { LoadingScreen } from './components/LoadingScreen';
import { NavPill } from './components/NavPill';
import { ChatWidget } from './components/ChatWidget';
import { DetailPage } from './components/DetailPage';
import { Hero } from './sections/Hero';
import { About } from './sections/About';
import { Projects } from './sections/Projects';
import { Skills } from './sections/Skills';
import { Experience } from './sections/Experience';
import { Terminal } from './sections/Terminal';
import { Contact } from './sections/Contact';
import { Footer } from './sections/Footer';

/* =========================================================================
   KUNAL — Active-Theory-inspired cinematic WebGL portfolio.
   Orchestrator: loads CDN scripts, owns the Three.js scene, wires cursor
   modes + scroll helpers, and composes section modules.
   ========================================================================= */

/* ---------- Planet data — maps each project / experience to a solar body ---------- */
const PLANET_LORE = [
  { name: 'Mercury', symbol: '\u263F', rgb: [154, 143, 125],
    facts: ['1st \u00b7 closest to the Sun', 'Rocky, gray, heavily cratered', 'Exosphere: O\u2082 Na H\u2082 He', 'Surface: \u2212180\u00b0C to 430\u00b0C', '88-day orbit'] },
  { name: 'Venus',   symbol: '\u2640', rgb: [232, 194, 138],
    facts: ['2nd planet · rocky terrestrial', 'Dense CO₂ atmosphere (90 atm)', 'Hottest planet · avg 465°C', 'Retrograde slow rotation', '225-day year'] },
  { name: 'Earth',   symbol: '♁', rgb: [ 70, 130, 180],
    facts: ['3rd · the Blue Planet', 'Only known life-bearing world', 'Liquid water ocean covers 71%', '23.5° axial tilt · seasons', '365.25-day year'] },
  { name: 'Mars',    symbol: '\u2642', rgb: [200, 107,  60],
    facts: ['4th \u00b7 the Red Planet', 'Iron oxide + polar ice caps', 'Thin CO\u2082 atmosphere', 'Olympus Mons: tallest known volcano', '687-day year'] },
  { name: 'Jupiter', symbol: '\u2643', rgb: [217, 181, 143],
    facts: ['5th \u00b7 largest gas giant', 'Great Red Spot: 350-year storm', '95 known moons (Io, Europa\u2026)', 'Strongest magnetic field', '12-year orbit'] },
  { name: 'Saturn',  symbol: '\u2644', rgb: [230, 200, 136],
    facts: ['6th \u00b7 iconic ring system', 'Rings: 99% water ice', 'Least dense planet', '146 known moons', '29-year orbit'] },
  { name: 'Uranus',  symbol: '\u26E2', rgb: [154, 219, 230],
    facts: ['7th \u00b7 ice giant', '98\u00b0 axial tilt \u2014 orbits on its side', 'Methane haze \u2192 blue-green hue', '28 known moons', '84-year orbit'] },
  { name: 'Neptune', symbol: '\u2646', rgb: [ 74, 127, 217],
    facts: ['8th \u00b7 farthest from the Sun', 'Strongest winds: 2,100\u00a0km/h', 'Largest moon: Triton (retrograde)', 'Avg surface: \u2212214\u00b0C', '165-year orbit'] },
];

/* =========================================================================
   E9 — Inline Source Viewer component
   ========================================================================= */
function syntaxHighlight(code, lang) {
  const keywords = lang === 'glsl'
    ? ['uniform','varying','void','float','vec2','vec3','vec4','mat4','int','sampler2D','in','out','main','return','if','for','mix','length','normalize','dot','cross','pow','sin','cos','smoothstep','clamp','abs']
    : ['const','let','var','function','return','if','else','for','while','new','class','import','export','async','await','true','false','null'];
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\/\/.*/g, m=>`<span style="color:#6b7a99">${m}</span>`)
    .replace(/\/\*[\s\S]*?\*\//g, m=>`<span style="color:#6b7a99">${m}</span>`)
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, m=>`<span style="color:#00ff88">${m}</span>`)
    .replace(/\b(\d+\.?\d*)\b/g,`<span style="color:#ffcc00">$1</span>`)
    .replace(new RegExp(`\\b(${keywords.join('|')})\\b`,'g'),m=>`<span style="color:#00ffff">${m}</span>`);
}

const SOURCE_TABS = [
  { id:'sun', label:'sun.glsl', lang:'glsl', code:`// Sun Surface Shader — FBM granulation + plasma channels
uniform float uTime;
varying float vDisp; varying vec3 vPos;
float fbm(vec3 p){ float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; } return v; }
float ridged(vec3 p){ return 1.0 - abs(fbm(p)*2.0 - 1.0); }
void main(){
  float gran = fbm(vPos*7.0 + uTime*0.3);
  float chan = ridged(vPos*1.6 - uTime*0.15);
  float h = smoothstep(0.30, 0.95, vDisp*0.6 + gran*0.5 + chan*0.35);
  vec3 col = mix(cCool, cMid, smoothstep(0.15, 0.55, h));
  col = mix(col, cHot, smoothstep(0.55, 0.80, h));
  float fres = pow(1.0 - clamp(dot(vViewNormal, vec3(0,0,1)), 0.0, 1.0), 3.0);
  col += fres * vec3(1.0, 0.65, 0.25) * 1.5;
  gl_FragColor = vec4(col, 1.0);
}` },
  { id:'orbital', label:'orbital.js', lang:'js', code:`// Ecliptic orbital mechanics — Kepler's 3rd law
// yf = sin(60°) = 0.866, zf = cos(60°) = 0.5
// orbit is a TRUE CIRCLE in a tilted 3D plane
const ECL_YF = 0.866, ECL_ZF = 0.5;
orbs.forEach((p, i) => {
  const u = p.userData;
  const a = t * u.speed + u.phase; // angular position
  p.position.x = cx + Math.cos(a) * u.radius;
  p.position.y = cy + Math.sin(a) * u.radius * u.yf;
  p.position.z = cz + Math.sin(a) * u.radius * u.zf;
  p.rotation.y += u.spin;
  p.material.uniforms.uSunPos.value.copy(sunWorldPos);
});` },
  { id:'dof', label:'dof.js', lang:'js', code:`// Depth of Field — focal pull during planet fly-in
if (dofEffect) {
  const flyProg = threeRef.current.fly?.prog ?? 0;
  const targetFocusDistance = flyProg > 0.1 ? flyProg * 0.22 : 0.0;
  dofEffect.cocMaterial.uniforms.focusDistance.value +=
    (targetFocusDistance - dofEffect.cocMaterial.uniforms.focusDistance.value) * 0.05;
}
// FOV breathing — pulls wide on zoom, narrows at rest
camera.fov = 38 + Math.sin(t * 0.17) * 0.6 + flyProg * 2.5;
camera.updateProjectionMatrix();` },
  { id:'sss', label:'sss.glsl', lang:'glsl', code:`// E4: Subsurface Scattering — terminator glow + backscatter
uniform vec3 uSSSColor; uniform float uSSSIntensity;
// thickness: thin at limb (where light can scatter through)
float sssThick = pow(1.0 - abs(NdotV), 2.5);
// backscatter: light coming from behind the planet
float backScatter = pow(max(0.0, dot(-L, V)), 3.0) * 0.4;
// strongest at terminator (day/night boundary)
float sssTerminator = smoothstep(-0.15, 0.15, rawNL);
float sssStrength = (1.0 - sssTerminator) * sssThick * 0.6
                  + backScatter * sssThick;
lit += uSSSColor * sssStrength * uRimStrength * 0.3 * uSSSIntensity;` },
  { id:'wormhole', label:'wormhole.glsl', lang:'glsl', code:`// E1: Ray-marched wormhole tunnel — FBM noise + radial color
vec3 tunnelColor(vec3 rd) {
  float t = 0.0;
  for(int i = 0; i < 80; i++) {
    vec3 p = rd * t;
    float r = length(p.xy);
    // FBM-displaced tunnel wall
    float tunnel = r - 1.0 + fbm(vec3(p.xy*0.5, p.z*0.3 - uTime*0.8)) * 0.4;
    if(tunnel < 0.01) {
      float angle = atan(p.y, p.x);
      float stripe = sin(angle*8.0 + p.z*2.0 - uTime*3.0);
      vec3 col = mix(vec3(0,0.8,1), vec3(0.8,0,1), fbm(p*0.8+uTime*0.2));
      col += vec3(stripe*0.3) * (sin(p.z*0.5 - uTime*2.0)*0.5+0.5);
      return col;
    }
    t += max(tunnel * 0.5, 0.02);
  }
  return vec3(0);
}` },
];

function SourceViewer({ onClose, onHoverBtn, onUnhover }) {
  const [tab, setTab] = useState('sun');
  const [copied, setCopied] = useState(false);
  const current = SOURCE_TABS.find(t => t.id === tab) ?? SOURCE_TABS[0];

  const handleCopy = () => {
    navigator.clipboard?.writeText(current.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-mono)',
    }} onClick={onClose}>
      <div style={{
        width:'min(860px,95vw)', maxHeight:'80vh',
        border:'1px solid rgba(0,255,200,0.2)', borderRadius:12,
        background:'rgba(5,10,20,0.95)', display:'flex', flexDirection:'column',
        overflow:'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid rgba(0,255,200,0.1)'}}>
          <span style={{color:'rgba(0,255,200,0.6)',fontSize:11,letterSpacing:'0.15em'}}>// VIEW SOURCE</span>
          <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={onClose}
            style={{background:'transparent',border:0,color:'rgba(0,255,200,0.5)',cursor:'none',fontSize:16}}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(0,255,200,0.1)',overflowX:'auto'}}>
          {SOURCE_TABS.map(t => (
            <button key={t.id} onMouseEnter={onHoverBtn} onMouseLeave={onUnhover}
              onClick={() => setTab(t.id)}
              style={{
                padding:'10px 18px', background:'transparent', border:0,
                borderBottom: t.id === tab ? '2px solid #00ffcc' : '2px solid transparent',
                color: t.id === tab ? '#00ffcc' : 'rgba(0,255,200,0.4)',
                cursor:'none', fontSize:12, whiteSpace:'nowrap', letterSpacing:'0.05em',
              }}>{t.label}</button>
          ))}
          <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={handleCopy}
            style={{marginLeft:'auto',padding:'10px 18px',background:'transparent',border:0,
              color: copied ? '#00ff88' : 'rgba(0,255,200,0.4)', cursor:'none', fontSize:12,whiteSpace:'nowrap'}}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        {/* Code */}
        <div style={{overflow:'auto',flex:1,padding:'20px'}}>
          <pre style={{margin:0,display:'flex',gap:0}}>
            <div style={{color:'rgba(100,120,140,0.5)',userSelect:'none',paddingRight:20,textAlign:'right',minWidth:36,fontSize:12,lineHeight:1.7}}>
              {current.code.split('\n').map((_,i) => <div key={i}>{i+1}</div>)}
            </div>
            <code style={{fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap',wordBreak:'break-word'}}
              dangerouslySetInnerHTML={{__html: syntaxHighlight(current.code, current.lang)}}/>
          </pre>
        </div>
        <div style={{padding:'10px 20px',borderTop:'1px solid rgba(0,255,200,0.1)',color:'rgba(0,255,200,0.3)',fontSize:10}}>
          Press Esc or click outside to close
        </div>
      </div>
    </div>
  );
}

/* ===========================================================================
   MAIN COMPONENT
   =========================================================================== */
export default function Portfolio() {
  const canvasRef = useRef(null);
  const threeRef = useRef({}); // holds scene/camera/renderer/etc
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [cursorMode, setCursorMode] = useState('default');
  const [cursorColor, setCursorColor] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeId, setActiveId] = useState('hero');
  const [detail, setDetail] = useState(null); // { kind: 'project'|'experience', item, planetIdx }
  const [sectionsRevealing, setSectionsRevealing] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [paused, setPaused] = useState(false);
  const lensTexture = React.useMemo(() => {
    // E9: dirty lens texture generated once on mount
    try {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const ctx = c.getContext('2d');
      ctx.clearRect(0,0,512,512);
      for (let i=0;i<14;i++){
        const x=Math.random()*512,y=Math.random()*512,r=20+Math.random()*80,a=0.015+Math.random()*0.04;
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(0.4,`rgba(255,255,255,${a*0.5})`);g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      for (let i=0;i<5;i++){
        const x1=Math.random()*512,y1=Math.random()*512,x2=x1+(Math.random()-0.5)*200,y2=y1+(Math.random()-0.5)*200;
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
        ctx.strokeStyle=`rgba(255,255,255,${0.02+Math.random()*0.03})`;ctx.lineWidth=0.5+Math.random();ctx.stroke();
      }
      return c.toDataURL();
    } catch(_e){ return null; }
  }, []);
  const scrollRestore = useRef({ y: 0 });
  const labelsRef = useRef(null); // container div for planet/sun name labels
  const letterboxTopRef = useRef(null);   // E7 cinematic bars
  const letterboxBottomRef = useRef(null);
  const warpCanvasRef = useRef(null);
  const pausedRef = useRef(false);        // E13 pause mirror for RAF loop
  const autoScrollRef = useRef(true);     // auto-scroll mirror for RAF loop
  const lenisStoppedRef = useRef(false);  // true when lenis.stop() called (detail open)
  const sectionsWrapRef = useRef(null);   // E10 CSS 3D perspective wrapper
  const wormholeTooltipRef = useRef(null); // E1 removed — kept to avoid undefined ref errors
  const kunalTooltipRef = useRef(null);    // E10 sprite hover tooltip
  const _dismissRafRef = useRef(null);     // dismissDetail poll RAF id
  const _dismissTmoRef = useRef(null);     // dismissDetail setTimeout id
  const [showSourceViewer, setShowSourceViewer] = useState(false); // E9
  const [isOffline, setIsOffline] = useState(false); // E6
  const [currentBuilding, setCurrentBuilding] = useState(null); // E8
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef(null);

  /* ---- Load CDN scripts sequentially ---- */
  useEffect(() => {
    // Prevent browser scroll restoration BEFORE any content renders
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    let cancelled = false;
    (async () => {
      for (let i = 0; i < CDN.length; i++) {
        try { await loadScript(CDN[i]); } catch (e) { console.error(e); }
        if (cancelled) return;
        setProgress(((i + 1) / CDN.length) * 100);
      }
      if (!cancelled) {
        setReady(true);
        // E6: register Service Worker for offline caching
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch(() => { /* SW optional */ });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---- Init Three.js + Lenis + ScrollTrigger ---- */
  useEffect(() => {
    if (!ready) return;
    const THREE = window.THREE;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const Lenis = window.Lenis;
    if (!THREE || !gsap || !Lenis) return;
    gsap.registerPlugin(ScrollTrigger);

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    /* Lenis smooth scroll */
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const _gsapTickerFn = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(_gsapTickerFn);
    gsap.ticker.lagSmoothing(0);
    threeRef.current.lenis = lenis;
    // Environment mode for scene transitions (main <-> detail)
    threeRef.current.envMode = threeRef.current.envMode || 'main';
    const env = { mix: 0 }; // 0 main space, 1 detail black hole

    /* Force the page to start at the top on load — browsers (and Lenis)
       will otherwise restore the previous scroll position on reload. */
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    lenis.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);

    /* Scene */
    const scene = new THREE.Scene();
    scene.fog = null; // vacuum of space — stars stay crisp at distance

    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 6000);
    camera.position.set(-18, 9, 8);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false; // space — no ground shadows

    /* E1 — EffectComposer post-processing pipeline */
    let composer = null;
    let bloomEffect = null, caEffect = null, dofEffect = null;
    let godRaysPass = null;
    const PP = window.POSTPROCESSING;
    if (PP && !reducedMotion) {
      try {
        const { EffectComposer, RenderPass, EffectPass,
                BloomEffect, ChromaticAberrationEffect, VignetteEffect,
                NoiseEffect, DepthOfFieldEffect, BlendFunction, Effect } = PP;

        composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        bloomEffect = new BloomEffect({
          intensity: 1.4,
          luminanceThreshold: 0.85,
          luminanceSmoothing: 0.4,
          radius: 0.4
        });

        caEffect = new ChromaticAberrationEffect({
          offset: new THREE.Vector2(0.0005, 0.0005)
        });

        dofEffect = new DepthOfFieldEffect(camera, {
          focusDistance: 0.0,
          focalLength: 0.048,
          bokehScale: 2.0
        });

        const vignetteEffect = new VignetteEffect({ offset: 0.35, darkness: 0.7 });
        const noiseEffect = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
        noiseEffect.blendMode.opacity.value = 0.035;

        const effectPass = new EffectPass(camera,
          bloomEffect, caEffect, dofEffect, vignetteEffect, noiseEffect
        );
        composer.addPass(effectPass);

        // E5 — God Rays custom pass (radial blur centered on sun screen pos)
        try {
          const godRaysFrag = `
            uniform sampler2D inputBuffer;
            uniform vec2 uSunScreenPos;
            uniform float uIntensity;
            uniform float uDecay;
            uniform float uDensity;
            uniform float uWeight;
            const int NUM_SAMPLES = 32;
            void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
              vec2 coord = uv;
              vec2 dir = coord - uSunScreenPos;
              dir *= (1.0 / float(NUM_SAMPLES)) * uDensity;
              float decay = 1.0;
              vec4 acc = vec4(0.0);
              for (int i = 0; i < NUM_SAMPLES; i++) {
                coord -= dir;
                vec4 s = texture2D(inputBuffer, clamp(coord, 0.001, 0.999));
                s *= decay * uWeight;
                acc += s;
                decay *= uDecay;
              }
              outputColor = inputColor + acc * uIntensity;
            }`;
          class GodRaysEffect extends Effect {
            constructor() {
              super('GodRaysEffect', godRaysFrag, {
                uniforms: new Map([
                  ['uSunScreenPos', { value: new THREE.Vector2(0.5, 0.5) }],
                  ['uIntensity',    { value: 0.08 }],
                  ['uDecay',        { value: 0.97 }],
                  ['uDensity',      { value: 0.96 }],
                  ['uWeight',       { value: 0.4  }],
                ])
              });
            }
          }
          godRaysPass = new EffectPass(camera, new GodRaysEffect());
          threeRef.current._godRaysEffect = godRaysPass.effects?.[0];
          composer.addPass(godRaysPass);
        } catch (_grErr) { console.warn('GodRays init failed', _grErr); }

        // E8 — Gravitational lens warp (screen-space radial distortion during orbit lock)
        try {
          const gravLensFrag = `
            uniform vec2 uGLCenter;
            uniform float uGLStrength;
            uniform float uGLRadius;
            void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
              if (uGLStrength < 0.001) { outputColor = inputColor; return; }
              vec2 delta = uv - uGLCenter;
              float dist = length(delta);
              float falloff = max(0.0, 1.0 - dist / uGLRadius);
              falloff = falloff * falloff;
              vec2 warpedUv = uv - normalize(delta + vec2(0.00001)) * falloff * uGLStrength;
              outputColor = texture2D(inputBuffer, clamp(warpedUv, 0.001, 0.999));
            }`;
          class GravLensEffect extends Effect {
            constructor() {
              super('GravLensEffect', gravLensFrag, {
                uniforms: new Map([
                  ['uGLCenter',   { value: new THREE.Vector2(0.28, 0.5) }],
                  ['uGLStrength', { value: 0.0 }],
                  ['uGLRadius',   { value: 0.55 }],
                ])
              });
            }
          }
          const gravLensPass = new EffectPass(camera, new GravLensEffect());
          threeRef.current._gravLensEffect = gravLensPass.effects?.[0];
          composer.addPass(gravLensPass);
        } catch (_glErr) { console.warn('GravLens init failed', _glErr); }

        threeRef.current.composer = composer;
        threeRef.current.bloomEffect = bloomEffect;
        threeRef.current.caEffect = caEffect;
        threeRef.current.dofEffect = dofEffect;
      } catch (_ppErr) {
        console.warn('Post-processing unavailable (likely version mismatch):', _ppErr);
        composer = null; bloomEffect = null; caEffect = null; dofEffect = null;
      }
    }

    /* Sky color is lerped from deep space \u2192 dawn \u2192 daylight blue as
       the user scrolls (approaches Earth). We drive it through
       scene.background so every frame renders over a tinted clear. */
    const skyDeep    = new THREE.Color(0x01010a); // launch: deep space (vacuum black)
    const skyMeso    = new THREE.Color(0x0c1035); // mesopause: deep indigo
    const skyStrato  = new THREE.Color(0x0a2a58); // stratosphere: royal night blue
    const skyTropo   = new THREE.Color(0x2d5c8c); // troposphere: pre-dawn blue
    const skyDawn    = new THREE.Color(0xd57b46); // horizon sunset orange
    const skySunset  = new THREE.Color(0xf2a766); // warm low-sun amber
    scene.background = skyDeep.clone();

    /* ===== COSMIC / SOLAR-SYSTEM SCENE =====
       Deep starfield, nebula backdrop, central sun with shader corona,
       orbiting planets (one with saturn-style rings), asteroid belt,
       light-trail comets, shooting stars, cosmic dust. */

    const floatGroup = new THREE.Group(); // parallax group (planets + asteroids)
    floatGroup.position.set(8, 4, 0); // Fix 1: shift solar system right so hero text gets left half
    scene.add(floatGroup);
    threeRef.current.scene = scene;
    threeRef.current.floatGroup = floatGroup;
    const disposables = [];
    const palette = [0x00ffff, 0xff00ff, 0x00ff88, 0xffcc00];
    const planetPalette = [0x4da6ff, 0xff6b9d, 0xffd166, 0x9d7cff, 0x64f5d4, 0xff8c42];

    // mouse NDC for parallax
    const mouseNDC = new THREE.Vector2(0, 0);
    let _prevMx = 0, _prevMy = 0, _prevMoveT = 0;
    // Minimal mousemove — only update NDC coords for parallax; Rapier is disabled
    const onMouseNDC = (e) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseNDC, { passive: true });

    /* ---------- BLACK HOLE "DETAIL" ENV ----------
       A lightweight shader ring + dark core that we fade in during detail pages. */
    const blackHole = new THREE.Group();
    blackHole.visible = false;
    scene.add(blackHole);

    const bhCoreGeo = new THREE.SphereGeometry(1.1, 48, 48);
    const bhCoreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bhCore = new THREE.Mesh(bhCoreGeo, bhCoreMat);
    blackHole.add(bhCore);

    const bhRingGeo = new THREE.RingGeometry(1.3, 3.2, 96, 1);
    const bhRingMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFade: { value: 0 },
        uA: { value: new THREE.Color(0xc0a5ff) },
        uB: { value: new THREE.Color(0xa7e7f3) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uFade;
        uniform vec3 uA;
        uniform vec3 uB;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main(){
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float ang = atan(p.y, p.x);
          float swirl = sin(ang * 6.0 + uTime * 1.2) * 0.5 + 0.5;
          float band = smoothstep(0.10, 0.0, abs(r - (0.55 + swirl * 0.06)));
          float noise = hash(vec2(floor(ang * 18.0), floor(r * 24.0)));
          vec3 col = mix(uA, uB, swirl);
          float a = band * (0.25 + noise * 0.35) * uFade;
          a *= smoothstep(1.0, 0.2, r);
          gl_FragColor = vec4(col, a);
        }`,
    });
    const bhRing = new THREE.Mesh(bhRingGeo, bhRingMat);
    bhRing.rotation.x = -Math.PI / .25;
    blackHole.add(bhRing);
    blackHole.position.set(0, 0.8, -120);
    disposables.push({ geo: bhCoreGeo, mat: bhCoreMat }, { geo: bhRingGeo, mat: bhRingMat });

    /* ---------- LIGHTS ---------- */
    const ambient = new THREE.AmbientLight(0x1a1a3a, 0.5);
    scene.add(ambient);
    // sun acts as a warm directional-ish point light
    const sunLight = new THREE.PointLight(0xffcc66, 3.5, 80, 1.2);
    sunLight.position.set(0, 1, -4);
    scene.add(sunLight);
    // cool rim light
    const rimLight = new THREE.PointLight(0x4488ff, 1.5, 60);
    rimLight.position.set(-8, 4, 6);
    scene.add(rimLight);
    // kept references used elsewhere
    const pLight = sunLight;
    const sLight = rimLight;

    /* ---------- 1. STARFIELD (deep-space backdrop) ----------
       Big sphere of 4000+ points with per-vertex color + size via attributes. */
    const starCount = isMobile ? 1500 : 4500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSize = new Float32Array(starCount);
    const starTwinkle = new Float32Array(starCount);
    const tmpStarColor = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      // uniform on sphere
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 60 + Math.random() * 20;
      starPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      starPos[i*3+1] = r * Math.cos(phi);
      starPos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
      // Spectral class distribution modeled after the Hertzsprung-Russell
      // main sequence (roughly: M>K>G>F>A>B>O). Exact numbers tuned for
      // visual variety over strict astrophysical accuracy.
      const roll = Math.random();
      if      (roll < 0.55) tmpStarColor.setHex(0xffd2a1); // M — red/orange dwarf (majority)
      else if (roll < 0.78) tmpStarColor.setHex(0xffe9c4); // K — warm amber
      else if (roll < 0.90) tmpStarColor.setHex(0xfff4d8); // G — sun-like yellow-white
      else if (roll < 0.96) tmpStarColor.setHex(0xf7f7ff); // F/A — bright white
      else if (roll < 0.99) tmpStarColor.setHex(0xc8daff); // B — blue-white
      else                   tmpStarColor.setHex(0x9ab8ff); // O — rare hot blue giant
      starCol[i*3] = tmpStarColor.r; starCol[i*3+1] = tmpStarColor.g; starCol[i*3+2] = tmpStarColor.b;
      // Size follows a long-tailed distribution — most dim, occasional giant.
      const sizeRoll = Math.random();
      starSize[i] = sizeRoll < 0.015 ? 2.8 + Math.random() * 2.2
                  : sizeRoll < 0.08  ? 1.4 + Math.random() * 1.0
                  :                    0.25 + Math.random() * 0.8;
      starTwinkle[i] = Math.random() * Math.PI * 2;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
    starGeo.setAttribute('aTwinkle', new THREE.BufferAttribute(starTwinkle, 1));
    const starMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPxRatio: { value: renderer.getPixelRatio() }, uFade: { value: 1.0 } },
      vertexShader: `
        attribute float aSize; attribute float aTwinkle;
        varying vec3 vCol; varying float vTwk; varying float vStretch;
        uniform float uTime; uniform float uPxRatio;
        void main(){
          vCol = color; vTwk = 0.6 + 0.4*sin(uTime*2.0 + aTwinkle*1.7);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          float sz = aSize * uPxRatio * (300.0 / -mv.z);
          vStretch = 0.0;
          gl_PointSize = sz;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vTwk; varying float vStretch;
        uniform float uFade;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          // E6: squash UV perpendicular so star elongates radially
          float sq = mix(1.0, 0.15, vStretch);
          c.y *= (1.0 / max(sq, 0.05));
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          float flare = smoothstep(0.5, 0.0, abs(c.x)*4.0) + smoothstep(0.5, 0.0, abs(c.y)*4.0);
          flare *= 0.15;
          gl_FragColor = vec4(vCol * (a + flare) * vTwk * uFade, (a + flare) * vTwk * uFade);
        }`
    });
    starMat.vertexColors = true;
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
    disposables.push({geo: starGeo, mat: starMat});

    /* ---------- 2. NEBULA BACKDROP (far shader plane) ---------- */
    const nebulaGeo = new THREE.PlaneGeometry(180, 120);
    const nebulaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColA: { value: new THREE.Color(0x3b0b66) },  // deep violet
        uColB: { value: new THREE.Color(0x00446b) },  // teal
        uColC: { value: new THREE.Color(0xff3b8b) },  // magenta accent
        uFade: { value: 1.0 }
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime;
        uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC;
        uniform float uFade;
        // 2d value noise
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p); vec2 f=fract(p);
          float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
          vec2 u=f*f*(3.0-2.0*f);
          return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
        }
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5;} return v; }
        void main(){
          vec2 uv = vUv*2.0 - 1.0;
          float t = uTime*0.03;
          float n1 = fbm(uv*1.8 + vec2(t, -t*0.7));
          float n2 = fbm(uv*3.2 - vec2(t*0.6, t));
          float cloud = smoothstep(0.35, 1.0, n1*0.7 + n2*0.5);
          vec3 col = mix(uColA, uColB, n2);
          col += uColC * smoothstep(0.55, 0.95, n1) * 0.6;
          float vign = smoothstep(1.25, 0.2, length(uv));
          gl_FragColor = vec4(col, cloud*vign*0.55*uFade);
        }`
    });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebula.position.set(0, 2, -80);
    scene.add(nebula);
    disposables.push({geo: nebulaGeo, mat: nebulaMat});

    /* ---------- 3. SUN (central star) ---------- */
    // Hyper-realistic sun: layered FBM granulation + turbulent plasma veins
    // + hot rim halo. Displacement gives it a molten, roiling surface.
    const sunGeo = new THREE.IcosahedronGeometry(1.6, isMobile ? 4 : 6);
    const sunMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal; varying vec3 vViewNormal; varying float vDisp; varying vec3 vPos;
        // hash + value noise
        float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        float vnoise(vec3 p){
          vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
          float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
          float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
          return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
        }
        float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; } return v; }
        void main(){
          vPos = position;
          vNormal = normalize(normal);
          vViewNormal = normalize(normalMatrix * normal);
          // roiling surface: two noise layers at different speeds
          float n1 = fbm(position*1.4 + vec3(uTime*0.25));
          float n2 = fbm(position*3.0 - vec3(uTime*0.4));
          float d = (n1*0.7 + n2*0.3) * 0.15;
          vDisp = n1;
          vec3 p = position + normal * d;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal; varying vec3 vViewNormal; varying float vDisp; varying vec3 vPos;
        uniform float uTime;
        float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        float vnoise(vec3 p){
          vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
          float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
          float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
          return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
        }
        float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; } return v; }
        // turbulent plasma veins via ridged noise
        float ridged(vec3 p){ float v = abs(fbm(p)*2.0 - 1.0); return 1.0 - v; }
        void main(){
          // Blackbody-ish sun palette: deep core → white-hot → yellow → orange → red sunspot
          vec3 cCore   = vec3(1.00, 0.95, 0.80);
          vec3 cHot    = vec3(1.00, 0.80, 0.35);
          vec3 cMid    = vec3(1.00, 0.55, 0.15);
          vec3 cCool   = vec3(0.70, 0.18, 0.05);
          // granulation (small cell pattern)
          float gran = fbm(vPos*7.0 + uTime*0.3);
          // plasma channels (large dark/bright ridges)
          float chan = ridged(vPos*1.6 - uTime*0.15);
          // combined brightness: granulation + channels
          float h = smoothstep(0.30, 0.95, vDisp*0.6 + gran*0.5 + chan*0.35);
          vec3 col = mix(cCool, cMid, smoothstep(0.15, 0.55, h));
          col = mix(col, cHot, smoothstep(0.55, 0.80, h));
          col = mix(col, cCore, smoothstep(0.80, 1.00, h));
          // sunspot dimming: rare dark pockets where ridged is near 0
          float spot = smoothstep(0.15, 0.0, chan);
          col = mix(col, vec3(0.15, 0.05, 0.02), spot * 0.45);
          // limb-brightening rim — bright halo on silhouette
          float fres = pow(1.0 - clamp(dot(vViewNormal, vec3(0.0,0.0,1.0)), 0.0, 1.0), 3.0);
          col += fres * vec3(1.0, 0.65, 0.25) * 1.5;
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 1.5, -4);
    sun.userData.name = 'Sun';
    sun.userData.size = 1.6; // IcosahedronGeometry radius
    floatGroup.add(sun);
    const morphMesh = sun; const morphMat = sunMat;  // compatibility alias for tick loop

    // E3: GPU fluid simulation on the sun (WebGL2 + desktop only)
    const _fluidEnabled = renderer.capabilities.isWebGL2 && !isMobile;
    let _fluidRtA = null, _fluidRtB = null, _fluidSimMat = null, _fluidSimScene = null, _fluidSimCam = null;
    if (_fluidEnabled) {
      const _FW = 256, _FH = 256;
      const _rtOpts = { format: THREE.RGBAFormat, type: THREE.FloatType,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
      _fluidRtA = new THREE.WebGLRenderTarget(_FW, _FH, _rtOpts);
      _fluidRtB = new THREE.WebGLRenderTarget(_FW, _FH, _rtOpts);
      _fluidSimScene = new THREE.Scene();
      _fluidSimCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      _fluidSimMat = new THREE.ShaderMaterial({
        uniforms: { uPrev: { value: null }, uTime: { value: 0 } },
        vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `
          precision highp float;
          uniform sampler2D uPrev; uniform float uTime;
          vec2 uv(){ return gl_FragCoord.xy / vec2(256.0); }
          float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          void main(){
            vec2 st = uv();
            vec4 prev = texture2D(uPrev, st);
            // buoyancy: hot fluid rises, cool sinks
            float temp = prev.z;
            vec2 vel = prev.xy;
            // advect velocity
            vec2 advSt = st - vel * (1.0/256.0);
            advSt = clamp(advSt, 0.0, 1.0);
            vec4 advPrev = texture2D(uPrev, advSt);
            vec2 newVel = advPrev.xy * 0.97; // damping
            // buoyancy force: hot rises (y+)
            newVel.y += (temp - 0.5) * 0.12;
            // heat injection near center
            float d = length(st - 0.5);
            float inject = smoothstep(0.3, 0.0, d) * (0.5 + 0.5 * sin(uTime * 1.3 + hash(st)*6.2832));
            float newTemp = advPrev.z * 0.985 + inject * 0.08;
            newTemp = clamp(newTemp, 0.0, 1.0);
            // pressure (w channel) — simplified divergence reduction
            float newPressure = advPrev.w * 0.9;
            newVel = clamp(newVel, -0.5, 0.5);
            gl_FragColor = vec4(newVel, newTemp, newPressure);
          }`,
        depthTest: false, depthWrite: false,
      });
      const _fluidQuad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), _fluidSimMat);
      _fluidSimScene.add(_fluidQuad);
      // Add uFluid to sunMat and patch shader
      sunMat.uniforms.uFluid = { value: _fluidRtA.texture };
      // Patch sun fragment shader to blend fluid temperature with FBM heat
      const origSunFrag = sunMat.fragmentShader;
      // Inject fluid uniform and blend after main FBM calculation
      sunMat.fragmentShader = origSunFrag
        .replace('void main(){', `uniform sampler2D uFluid;\nvoid main(){`)
        .replace(
          '// === E4: SUBSURFACE SCATTERING ===',
          `// E3: blend fluid temperature into surface heat
          float fluidTemp = texture2D(uFluid, vUv * 0.5 + 0.5).z;
          h = mix(h, h * (1.0 + fluidTemp * 1.8), 0.4);
          // === E4: SUBSURFACE SCATTERING ===`
        );
      sunMat.needsUpdate = true;
      threeRef.current.fluidEnabled = true;
      threeRef.current.fluidRtA = _fluidRtA;
      threeRef.current.fluidRtB = _fluidRtB;
      threeRef.current.fluidSimMat = _fluidSimMat;
      threeRef.current.fluidSimScene = _fluidSimScene;
      threeRef.current.fluidSimCam = _fluidSimCam;
    }

    // Layered corona — two additive billboards (inner sharp + outer diffuse)
    // plus subtle prominence tendrils via FBM streaks.
    const coronaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
          return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<3;i++){ v+=a*noise(p); p*=2.05; a*=0.5;} return v; }
        void main(){
          vec2 p = vUv - 0.5;
          float d = length(p);
          float ang = atan(p.y, p.x);
          // Two falloff layers: inner bright ring + outer diffuse halo
          float inner = exp(-d * 8.0) * 1.3;
          float outer = exp(-d * 3.0) * 0.6;
          // Radial streak tendrils (prominence-like)
          float streaks = fbm(vec2(ang*6.0 + uTime*0.3, d*12.0 - uTime*0.2));
          float tendril = smoothstep(0.55, 0.9, streaks) * smoothstep(0.5, 0.08, d);
          float pulse = 0.85 + 0.15*sin(uTime*1.7);
          vec3 colCore = vec3(1.0, 0.92, 0.55);
          vec3 colFlame = vec3(1.0, 0.55, 0.18);
          vec3 col = mix(colFlame, colCore, inner);
          float a = (inner + outer * 0.6 + tendril * 0.4) * pulse;
          // Hard circular mask so the plane edges never form a visible box
          a *= smoothstep(0.5, 0.42, d);
          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }`
    });
    const coronaGeo = new THREE.PlaneGeometry(7.5, 7.5);
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    corona.position.copy(sun.position);
    floatGroup.add(corona);
    disposables.push({geo: sunGeo, mat: sunMat}, {geo: coronaGeo, mat: coronaMat});

    /* ---------- GALAXY FIELD ----------
       A bubble of procedural galaxies populated far from the solar system.
       As the camera pulls back during scroll, our sun shrinks to a dot and
       we see spiral, elliptical, and irregular galaxies drift into view —
       each a point cloud (~millions of stars implied), with a bright bulge
       and (for spirals) a faint SMBH dark-core glow at the center.
       Types: 'spiral', 'elliptical', 'irregular' */
    const galaxyGroup = new THREE.Group();
    scene.add(galaxyGroup);

    const galaxyVertex = `
      attribute float aSize;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vAlpha;
      void main(){
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        // size attenuated by distance; clamp so distant galaxies still render
        float d = -mv.z;
        gl_PointSize = clamp(aSize * (320.0 / max(d, 1.0)), 1.0, 24.0);
        vAlpha = clamp(1.6 - d * 0.00015, 0.2, 1.0);
      }`;
    const galaxyFragment = `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uFade;
      void main(){
        // circular soft point
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d = dot(uv, uv);
        if (d > 1.0) discard;
        float a = exp(-d * 3.5);
        gl_FragColor = vec4(vColor, a * vAlpha * uFade);
      }`;
    const galaxyMat = new THREE.ShaderMaterial({
      uniforms: { uFade: { value: 0.0 } },
      vertexShader: galaxyVertex,
      fragmentShader: galaxyFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    disposables.push({ geo: null, mat: galaxyMat });

    // Colors for different galaxy populations
    const pickGalaxyPalette = (type) => {
      if (type === 'spiral') return {
        core: new THREE.Color(1.0, 0.92, 0.7),     // yellow-white bulge
        mid:  new THREE.Color(0.75, 0.82, 1.0),    // pale blue arms
        edge: new THREE.Color(0.45, 0.55, 0.9)     // deep blue tips
      };
      if (type === 'elliptical') return {
        core: new THREE.Color(1.0, 0.88, 0.65),    // amber
        mid:  new THREE.Color(0.9, 0.72, 0.48),    // warm tan
        edge: new THREE.Color(0.55, 0.40, 0.30)    // dim warm
      };
      // irregular
      return {
        core: new THREE.Color(0.95, 0.78, 0.95),   // magenta-ish starbursts
        mid:  new THREE.Color(0.6, 0.8, 1.0),      // cool blue
        edge: new THREE.Color(0.3, 0.5, 0.8)
      };
    };

    // Build a galaxy geometry depending on type; returns Points mesh.
    const buildGalaxy = (type, size) => {
      const COUNT = type === 'spiral' ? (isMobile ? 1200 : 2200)
                  : type === 'elliptical' ? (isMobile ? 900 : 1500)
                  : (isMobile ? 1000 : 1700);
      const positions = new Float32Array(COUNT * 3);
      const colors    = new Float32Array(COUNT * 3);
      const sizes     = new Float32Array(COUNT);
      const pal = pickGalaxyPalette(type);
      const rand = (a, b) => a + Math.random() * (b - a);
      const gaussian = () => {
        // Box-Muller
        const u = Math.max(1e-6, Math.random());
        const v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      };

      for (let i = 0; i < COUNT; i++) {
        let x = 0, y = 0, z = 0, tRadius = 0;
        if (type === 'spiral') {
          // 2-arm logarithmic spiral in a thin disk
          const arm = Math.floor(Math.random() * 2);
          const r = Math.pow(Math.random(), 0.55) * size;
          const angle = arm * Math.PI + r * 0.9 + gaussian() * 0.35;
          const spread = (1 - r / size) * 0.35 + 0.05;
          x = Math.cos(angle) * r + gaussian() * spread;
          z = Math.sin(angle) * r + gaussian() * spread;
          // thin disk; bulge thicker at center
          const bulge = Math.exp(-r * 2.0 / size);
          y = gaussian() * (0.04 + bulge * 0.4) * size * 0.25;
          tRadius = r / size;
        } else if (type === 'elliptical') {
          // 3D gaussian ellipsoid
          const ax = 1.0, ay = 0.65, az = 0.85;
          const rs = size * 0.6;
          x = gaussian() * rs * ax;
          y = gaussian() * rs * ay;
          z = gaussian() * rs * az;
          tRadius = Math.min(1, Math.sqrt(x*x+y*y+z*z) / size);
        } else {
          // irregular — a few clumpy blobs
          const blobs = [
            { x: 0, y: 0, z: 0, w: 0.55 },
            { x: size * 0.35, y: size * 0.05, z: -size * 0.15, w: 0.22 },
            { x: -size * 0.25, y: -size * 0.1, z: size * 0.25, w: 0.23 },
          ];
          let pick = Math.random(), b = blobs[0];
          for (const bb of blobs) { pick -= bb.w; if (pick <= 0) { b = bb; break; } }
          const r = size * 0.35;
          x = b.x + gaussian() * r;
          y = b.y + gaussian() * r * 0.6;
          z = b.z + gaussian() * r;
          tRadius = Math.min(1, Math.sqrt((x-b.x)**2 + (y-b.y)**2 + (z-b.z)**2) / (size * 0.5));
        }
        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        // Color blend: core -> mid -> edge by radius
        const c = new THREE.Color();
        if (tRadius < 0.3) c.copy(pal.core).lerp(pal.mid, tRadius / 0.3);
        else               c.copy(pal.mid).lerp(pal.edge, Math.min(1, (tRadius - 0.3) / 0.7));
        // Random twinkle variance
        const tw = 0.85 + Math.random() * 0.3;
        // HII star-forming regions — ~6% of spiral-arm stars are bright
        // H-alpha pink/magenta knots, clustered in the mid-radius arms.
        let sizeMul = 1.0;
        if (type === 'spiral' && tRadius > 0.25 && tRadius < 0.9 && Math.random() < 0.06) {
          c.setRGB(1.0, 0.55, 0.75); // H-alpha pink
          sizeMul = 2.4;
        }
        colors[i * 3]     = c.r * tw;
        colors[i * 3 + 1] = c.g * tw;
        colors[i * 3 + 2] = c.b * tw;
        // Star size (bright at core, smaller at edges)
        sizes[i] = rand(0.6, 1.8) * (1.4 - tRadius * 0.8) * sizeMul;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
      const pts = new THREE.Points(geo, galaxyMat);
      disposables.push({ geo, mat: null });
      return pts;
    };

    // SMBH accretion core — tiny additive disc at galaxy center.
    const bhTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0.00, 'rgba(255,255,255,1)');
      g.addColorStop(0.15, 'rgba(255,220,150,0.9)');
      g.addColorStop(0.40, 'rgba(255,120,60,0.4)');
      g.addColorStop(1.00, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    // Scatter galaxies in a forward-biased spherical shell.
    const galaxyCount = isMobile ? 18 : 36;
    const galaxyTypes = ['spiral', 'spiral', 'spiral', 'elliptical', 'irregular'];
    for (let i = 0; i < galaxyCount; i++) {
      const type = galaxyTypes[Math.floor(Math.random() * galaxyTypes.length)];
      // distance band: some near (reveal first), some far
      const band = Math.random();
      const dist = band < 0.25 ? 120 + Math.random() * 180
                 : band < 0.60 ? 320 + Math.random() * 420
                 :               780 + Math.random() * 1400;
      // spherical position, biased toward forward hemisphere (-Z)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(1 - Math.random() * 1.5); // bias upward/forward
      const px = Math.sin(phi) * Math.cos(theta) * dist;
      const py = (Math.random() - 0.5) * dist * 0.6;
      const pz = -Math.abs(Math.sin(phi) * Math.sin(theta) * dist) - 40;
      const size = 14 + Math.random() * 26 + (dist > 600 ? 20 : 0);
      const gx = buildGalaxy(type, size);
      gx.position.set(px, py, pz);
      // random orientation
      gx.rotation.set(
        (Math.random() - 0.5) * Math.PI,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * Math.PI * 0.6
      );
      gx.userData = {
        type,
        spin: (Math.random() - 0.5) * (type === 'spiral' ? 0.04 : 0.01),
        dist,
        // Staggered reveal as the camera pulls out: near galaxies emerge
        // first (just past the hero), mid-range during projects, far deep
        // field only once we're well out of the solar system.
        appearAt: dist < 300 ? 0.08 : dist < 700 ? 0.20 : 0.34,
        fullAt:   dist < 300 ? 0.20 : dist < 700 ? 0.34 : 0.50
      };
      galaxyGroup.add(gx);
      gx.visible = false; // start hidden; tick loop fades them in on scroll

      // Supermassive black hole / bright core — additive sprite at center.
      const bhMat = new THREE.SpriteMaterial({
        map: bhTex,
        color: type === 'spiral' ? 0xfff2c0 : type === 'elliptical' ? 0xffd08a : 0xd0b0ff,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const bh = new THREE.Sprite(bhMat);
      bh.scale.setScalar(size * 0.35);
      gx.add(bh);
      gx.userData.bhSprite = bh; // cache ref — avoids children.forEach every frame
      disposables.push({ geo: null, mat: bhMat });
    }
    disposables.push({ geo: null, mat: null, tex: bhTex });

    // Pre-warm all galaxy geometry buffers on GPU right now (at load time) so
    // the first-scroll reveal never causes a multi-frame GPU upload spike.
    // We render once with all galaxies temporarily visible, then re-hide them.
    {
      galaxyGroup.children.forEach(g => { g.visible = true; });
      renderer.render(scene, camera);
      galaxyGroup.children.forEach(g => { g.visible = false; });
    }


    // Real solar-system planets (Earth handled separately at radius 6).
    // Sizes are scaled for visibility, not to astronomical accuracy.
    //   Mercury (r=2.2) → Venus (4) → [Earth=6] → Mars (8.5)
    //   → Jupiter (12) → Saturn (15) → Uranus (17.5) → Neptune (20)
    // Speeds: Kepler's 3rd law ω ∝ r^{-3/2}, k = 0.47 × 2.2^1.5 ≈ 1.533
    // Ecliptic plane: all planets share the same orbital plane defined by
    //   e1 = (1,0,0)  and  e2 = (0, sin60°, cos60°) = (0, 0.866, 0.5)
    // e2 is a unit vector → orbit is a TRUE CIRCLE in a tilted 3D plane
    // (not a parametric ellipse). The camera viewing ~60° off the plane
    // projects the circle to an ellipse with aspect ratio ≈ 0.5.
    // yf = 0.866, zf = 0.5  (√3/2, 1/2) — same for all planets (ecliptic).
    const ECL_YF = 0.866, ECL_ZF = 0.5; // ecliptic plane factors, ||(0,yf,zf)|| = 1
    const SOLAR_PLANETS = [
      { name: 'mercury', radius:  2.2, size: 0.14, color: 0x9a8f7d, emissive: 0x2a2218, speed: 0.470, yf: ECL_YF, zf: ECL_ZF, style: 'rocky' },
      { name: 'venus',   radius:  4.0, size: 0.22, color: 0xe8c28a, emissive: 0x3a2a12, speed: 0.192, yf: ECL_YF, zf: ECL_ZF, style: 'cloudy' },
      { name: 'earth',   radius:  6.0, size: 0.22, color: 0x4a7fd9, emissive: 0x0a1a2a, speed: 0.104, yf: ECL_YF, zf: ECL_ZF, style: 'earth' },
      { name: 'mars',    radius:  8.5, size: 0.18, color: 0xc86b3c, emissive: 0x3a1a0a, speed: 0.062, yf: ECL_YF, zf: ECL_ZF, style: 'mars' },
      { name: 'jupiter', radius: 12.0, size: 0.55, color: 0xd9b58f, emissive: 0x332418, speed: 0.037, yf: ECL_YF, zf: ECL_ZF, style: 'bands' },
      { name: 'saturn',  radius: 15.0, size: 0.45, color: 0xe6c888, emissive: 0x332a18, speed: 0.026, yf: ECL_YF, zf: ECL_ZF, style: 'bands', hasRing: true },
      { name: 'uranus',  radius: 17.5, size: 0.30, color: 0x9adbe6, emissive: 0x1a3038, speed: 0.021, yf: ECL_YF, zf: ECL_ZF, style: 'ice' },
      { name: 'neptune', radius: 20.0, size: 0.30, color: 0x4a7fd9, emissive: 0x101f3a, speed: 0.017, yf: ECL_YF, zf: ECL_ZF, style: 'ice' },
    ];

    // Procedural planet material factory — one shader, different parameters.
    // Lit by the sun (world-space position) with proper day/night terminator,
    // fresnel rim glow (stronger for gas giants), procedural surface detail.
    // E4 — Subsurface scattering color per planet style
    const SSS_COLORS = {
      rocky: new THREE.Color(0.8, 0.4, 0.1),
      cloudy: new THREE.Color(0.9, 0.7, 0.3),
      mars:   new THREE.Color(0.9, 0.3, 0.1),
      bands:  new THREE.Color(0.8, 0.6, 0.3),
      ice:    new THREE.Color(0.4, 0.7, 1.0),
      earth:  new THREE.Color(0.3, 0.6, 1.0),
    };
    const makePlanetMaterial = (cfg) => {
      const color = new THREE.Color(cfg.color);
      const accent = new THREE.Color(cfg.color).multiplyScalar(0.55);
      const highlight = new THREE.Color(cfg.color).lerp(new THREE.Color(0xffffff), 0.45);
      const styleIdx = { rocky: 0, cloudy: 1, mars: 2, bands: 3, ice: 4, earth: 5 }[cfg.style] ?? 0;
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime:       { value: 0 },
          uSunPos:     { value: new THREE.Vector3(0, 1.5, -4) },
          uColor:      { value: color },
          uAccent:     { value: accent },
          uHighlight:  { value: highlight },
          uRimStrength:{ value: cfg.style === 'bands' || cfg.style === 'ice' ? 1.1 : 0.45 },
          uStyle:      { value: styleIdx },
          uDetailMode: { value: 0.0 },
          uSSSColor:   { value: SSS_COLORS[cfg.style] ?? new THREE.Color(0.8, 0.5, 0.2) },
          uSSSIntensity: { value: 1.0 },
        },
        vertexShader: `
          varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vPosL; varying vec3 vViewN;
          void main(){
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vPosW = wp.xyz; vPosL = position;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewN   = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: `
          varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vPosL; varying vec3 vViewN;
          uniform float uTime; uniform vec3 uSunPos; uniform vec3 uColor;
          uniform vec3 uAccent; uniform vec3 uHighlight;
          uniform float uRimStrength; uniform int uStyle; uniform float uDetailMode;
          uniform vec3 uSSSColor; uniform float uSSSIntensity;

          float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
          float vnoise(vec3 p){
            vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
            float a=hash(i),b=hash(i+vec3(1,0,0)),c=hash(i+vec3(0,1,0)),d=hash(i+vec3(1,1,0));
            float e=hash(i+vec3(0,0,1)),g=hash(i+vec3(1,0,1)),h=hash(i+vec3(0,1,1)),k=hash(i+vec3(1,1,1));
            return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z);
          }
          // 6-octave FBM — higher freq octaves weighted by uDetailMode so detail appears on zoom
          float fbm(vec3 p){
            float v=0.0,a=0.5;
            v+=a*vnoise(p); p*=2.03; a*=0.5;
            v+=a*vnoise(p); p*=2.03; a*=0.5;
            v+=a*vnoise(p); p*=2.03; a*=0.5;
            v+=a*vnoise(p); p*=2.03; a*=0.5;
            v+=a*vnoise(p)*mix(0.5,1.0,uDetailMode); p*=2.03; a*=0.5;
            v+=a*vnoise(p)*uDetailMode;
            return v;
          }

          void main(){
            vec3 n = normalize(vNormalW);
            vec3 L = normalize(uSunPos - vPosW);
            vec3 V = normalize(cameraPosition - vPosW);
            vec3 H = normalize(L + V);

            // Soft physically-correct terminator (no harsh clamp)
            float rawNL   = dot(n, L);
            float NdotL   = smoothstep(-0.18, 0.28, rawNL);
            float NdotH   = max(0.0, dot(n, H));
            float NdotV   = max(0.0, dot(n, V));
            float nightSide = clamp(-rawNL, 0.0, 1.0);

            vec3  base        = uColor;
            float specularity = 0.0;
            float shininess   = 32.0;
            vec3  specColor   = vec3(1.0);
            vec3  atmoColor   = uHighlight * 0.5;
            float atmoThick   = 1.0;

            if(uStyle == 0){
              // MERCURY — charcoal iron, heavy cratering, no atmosphere
              float n1 = fbm(vPosL*6.0);
              float n2 = fbm(vPosL*22.0+5.3);
              float crater = smoothstep(0.46,0.52,n2)*(1.0-smoothstep(0.3,0.6,n1));
              float highland = smoothstep(0.58,0.72,n1);
              base = mix(uAccent*0.9, uColor, n1*0.8+0.2);
              base = mix(base, uAccent*0.35, crater*0.9);
              base = mix(base, uHighlight*0.75, highland*0.28);
              float micro = fbm(vPosL*48.0+77.0)*0.18;
              base += micro*mix(vec3(0.06),vec3(0.20),n1);
              specularity=0.02; shininess=10.0; atmoThick=0.0;

            } else if(uStyle==1){
              // VENUS — dense sulfuric acid clouds, yellowish-white
              float t=uTime*0.04;
              float s1=fbm(vPosL*2.5+vec3(t,0.0,0.0));
              float s2=fbm(vPosL*6.0-vec3(t*1.3,0.0,0.0));
              float s3=fbm(vPosL*14.0+vec3(0.0,t*0.7,0.0));
              float combined=s1*0.5+s2*0.3+s3*0.2;
              vec3 cTop=mix(vec3(0.96,0.90,0.65),vec3(0.86,0.72,0.40),s2*0.8);
              vec3 cDark=mix(vec3(0.60,0.48,0.28),vec3(0.50,0.40,0.22),s1);
              base=mix(cDark,cTop,smoothstep(0.38,0.72,combined));
              base=mix(base,vec3(1.0,0.98,0.90),smoothstep(0.70,0.94,combined)*0.7*uDetailMode);
              specularity=0.12; shininess=80.0; specColor=vec3(1.0,0.97,0.88);
              atmoColor=vec3(0.95,0.78,0.40); atmoThick=3.0;

            } else if(uStyle==2){
              // MARS — iron oxide, canyons, dust, polar CO2 ice
              float n1=fbm(vPosL*3.5);
              float n2=fbm(vPosL*8.0+4.3);
              float n3=fbm(vPosL*18.0+vec3(uTime*0.008,0.0,0.0));
              float canyon=smoothstep(0.42,0.48,abs(n2-0.50))*(1.0-abs(n1-0.5)*2.0);
              float dust=fbm(vPosL*1.5+vec3(uTime*0.006,0.0,0.0));
              vec3 rock=mix(vec3(0.55,0.19,0.07),vec3(0.82,0.38,0.18),n1);
              base=mix(rock,vec3(0.90,0.55,0.32),smoothstep(0.55,0.76,dust)*0.55);
              base=mix(base,vec3(0.26,0.10,0.04),canyon*0.65);
              base+=vec3(n3*0.50,n3*0.20,n3*0.08);
              float polar=smoothstep(0.78,0.96,abs(normalize(vPosL).y));
              base=mix(base,vec3(0.95,0.94,0.97),polar);
              specularity=0.015; shininess=8.0;
              atmoColor=vec3(0.94,0.62,0.36); atmoThick=0.55;

            } else if(uStyle==3){
              // GAS GIANT — banded belts, storms, GRS
              vec3 sp=normalize(vPosL);
              float t=uTime*0.04;
              float bands=sin(sp.y*20.0+fbm(vPosL*3.0)*2.5)*0.5+0.5;
              float turb1=fbm(vPosL*5.0+vec3(t,0.0,0.0));
              float turb2=fbm(vPosL*12.0-vec3(t*0.8,t*0.3,0.0));
              float wave=fbm(vec3(sp.y*8.0,sp.x*5.0,t*0.3)+vPosL*0.5);
              vec3 belt=mix(uAccent,uColor,bands);
              belt=mix(belt,uHighlight*0.75,smoothstep(0.55,0.92,turb1)*0.45);
              float grs=smoothstep(0.12,0.01,distance(sp,normalize(vec3(0.85,-0.15,0.4))));
              float oval=smoothstep(0.07,0.005,distance(sp,normalize(vec3(-0.65,0.28,0.7))));
              belt=mix(belt,vec3(0.75,0.25,0.12),grs*0.9);
              belt=mix(belt,vec3(0.88,0.82,0.58),oval*0.75);
              base=mix(belt,uHighlight*0.88,smoothstep(0.45,0.55,wave)*0.18);
              base=mix(base,uHighlight,smoothstep(0.74,0.96,turb2)*0.30*uDetailMode);
              specularity=0.06; shininess=48.0;
              atmoColor=uHighlight*0.65; atmoThick=2.0;

            } else if(uStyle==5){
              // EARTH — photorealistic blue marble
              float t=uTime*0.01;
              float land1=fbm(vPosL*1.8+7.3);
              float land2=fbm(vPosL*4.2+2.1);
              float elevation=fbm(vPosL*8.0+4.7);
              float biome=fbm(vPosL*2.6+12.3);
              float latN=normalize(vPosL).y;
              float continent=smoothstep(0.46,0.56,land1);
              // Ocean depth variation
              float od=fbm(vPosL*5.0+1.1);
              vec3 ocean=mix(vec3(0.01,0.04,0.18),vec3(0.03,0.20,0.44),smoothstep(0.3,0.7,od));
              // Land biomes by latitude + noise
              float absLat=abs(latN);
              vec3 jungle=vec3(0.04,0.18,0.06);
              vec3 forest=vec3(0.06,0.24,0.10);
              vec3 grass=vec3(0.22,0.42,0.16);
              vec3 savanna=vec3(0.52,0.50,0.20);
              vec3 desert=vec3(0.72,0.58,0.32);
              vec3 mountain=vec3(0.40,0.34,0.28);
              vec3 snow=vec3(0.90,0.92,0.95);
              vec3 landC=mix(jungle,forest,smoothstep(0.0,0.3,absLat));
              landC=mix(landC,grass,smoothstep(0.2,0.5,absLat));
              landC=mix(landC,savanna,smoothstep(0.3,0.55,biome)*smoothstep(0.0,0.45,absLat));
              landC=mix(landC,desert,smoothstep(0.55,0.80,biome));
              landC=mix(landC,mountain,smoothstep(0.60,0.85,elevation)*0.7);
              landC=mix(landC,snow,smoothstep(0.78,0.95,elevation+land2*0.15)*0.9);
              float polar=smoothstep(0.72,0.93,absLat);
              vec3 surface=mix(ocean,landC,continent);
              surface=mix(surface,vec3(0.93,0.96,0.99),polar);
              // Clouds with self-shadow on surface below
              float c1=fbm(vPosL*2.2+vec3(t,0.0,0.0));
              float c2=fbm(vPosL*5.0-vec3(t*1.4,0.0,0.0));
              float c3=fbm(vPosL*11.0+vec3(0.0,t*0.8,0.0));
              float clouds=clamp(smoothstep(0.52,0.80,c1)*0.9+smoothstep(0.58,0.92,c2)*0.6,0.0,1.0);
              float cshadow=fbm(vPosL*2.2+vec3(t+0.04,0.0,0.04));
              surface*=(1.0-smoothstep(0.55,0.78,cshadow)*(1.0-clouds)*0.30);
              vec3 cloudColor=mix(vec3(0.95,0.96,0.99),vec3(1.0),smoothstep(0.7,0.95,c3)*0.3);
              base=mix(surface,cloudColor,clouds);
              // Ocean specular — water glints sharply, land does not
              float oceanMask=(1.0-continent)*(1.0-polar)*(1.0-clouds);
              specularity=mix(0.04,0.85,oceanMask*oceanMask);
              shininess=mix(20.0,260.0,oceanMask);
              specColor=mix(vec3(1.0),vec3(0.78,0.92,1.0),oceanMask);
              atmoColor=vec3(0.38,0.62,1.0); atmoThick=2.6;

            } else {
              // ICE GIANT — Uranus / Neptune, methane-blue smooth
              float f1=fbm(vPosL*2.2+vec3(uTime*0.025,0.0,0.0));
              float f2=fbm(vPosL*6.0-vec3(uTime*0.015,0.0,0.0));
              float bandN=sin(normalize(vPosL).y*10.0+f1*1.5)*0.5+0.5;
              base=mix(uAccent,uColor,smoothstep(0.3,0.8,f1));
              base=mix(base,uHighlight*0.85,smoothstep(0.65,0.92,f2)*0.5);
              base=mix(base,uColor*1.15,bandN*0.25*uDetailMode);
              specularity=0.15; shininess=90.0;
              specColor=vec3(0.80,0.95,1.0); atmoColor=uColor*0.85; atmoThick=1.6;
            }

            // ---- CINEMATIC LIGHTING ----
            // Lambert diffuse with physically soft terminator
            vec3 diffuse = base * (0.18 + NdotL * 1.08);

            // Blinn-Phong specular — scales with detail so it blooms on zoom
            float specFactor = pow(NdotH, shininess) * specularity * NdotL;
            vec3 specLight = specColor * specFactor * (1.5 + uDetailMode * 3.0);

            // Atmospheric limb glow — Rayleigh scattering approximation
            float rimPow = 2.5 + (1.0 - min(atmoThick, 2.0));
            float rim = pow(1.0 - NdotV, rimPow);
            float rimSun = 0.5 + 0.5 * dot(n, L);
            vec3 rimGlow = rim * atmoColor * uRimStrength * atmoThick * (0.45 + 0.55*rimSun);

            // Night side — faint ambient + Earth city lights
            vec3 nightAmb = base * 0.020 * nightSide;
            if(uStyle == 5){
              float city = vnoise(vPosL*38.0)*vnoise(vPosL*24.0+5.3);
              city = smoothstep(0.66, 0.78, city) * nightSide * uDetailMode;
              nightAmb += vec3(1.0,0.82,0.48)*city*0.50;
            }

            vec3 lit = diffuse + specLight + rimGlow + nightAmb;

            // === E4: SUBSURFACE SCATTERING ===
            float sssThick = pow(1.0 - abs(NdotV), 2.5);
            float backScatter = pow(max(0.0, dot(-L, V)), 3.0) * 0.4;
            float sssTerminator = smoothstep(-0.15, 0.15, rawNL);
            float sssStrength = (1.0 - sssTerminator) * sssThick * 0.6 + backScatter * sssThick;
            lit += uSSSColor * sssStrength * uRimStrength * 0.3 * uSSSIntensity;
            // === END SSS ===

            // Reinhard tone mapping — prevents blown-out highlights
            lit = lit / (lit + vec3(0.55));
            // Saturation boost + contrast lift in detail mode (cinematic grade)
            float luma = dot(lit, vec3(0.299,0.587,0.114));
            lit = mix(vec3(luma), lit, 1.0 + uDetailMode*0.30);
            lit = mix(lit, pow(max(lit,vec3(0.001)), vec3(0.88)), uDetailMode*0.45);

            gl_FragColor = vec4(clamp(lit,0.0,1.0), 1.0);
          }`
      });
    };

    const activePlanets = isMobile ? SOLAR_PLANETS.slice(0, 4) : SOLAR_PLANETS;
    const orbs = []; // keep name for tick loop compatibility
    const planetCount = activePlanets.length;
    for (let i = 0; i < planetCount; i++) {
      const P = activePlanets[i];
      const color = P.color;
      const size = P.size;
      const geo = new THREE.SphereGeometry(size, 32, 32);
      const mat = makePlanetMaterial(P);
      const planet = new THREE.Mesh(geo, mat);
      const radius = P.radius;
      planet.userData = {
        name: P.name,
        radius,
        speed: P.speed,
        phase: (i / planetCount) * Math.PI * 2, // spread them out at start
        yf: P.yf, // orbital inclination Y factor (same as orbit ring)
        zf: P.zf, // orbital inclination Z factor (same as orbit ring)
        spin: 0.01 + Math.random() * 0.02,
        size: P.size, // sphere geometry radius for label offset
      };
      floatGroup.add(planet);
      orbs.push(planet);
      disposables.push({geo, mat});

      if (!threeRef.current.orbitRings) threeRef.current.orbitRings = [];

      // orbit ring (thin line)
      const segs = 128;
      const orbitPts = new Float32Array((segs + 1) * 3);
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        // Camera-facing ellipse (matches planet motion plane): mostly X/Y with tiny Z sway
        orbitPts[s*3]   = Math.cos(a) * radius;
        orbitPts[s*3+1] = Math.sin(a) * radius * P.yf; // per-planet inclination
        orbitPts[s*3+2] = Math.sin(a) * radius * P.zf;
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute('position', new THREE.BufferAttribute(orbitPts, 3));
      const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 });
      const orbitLine = new THREE.LineLoop(ringGeo, ringMat);
      orbitLine.position.copy(sun.position);
      floatGroup.add(orbitLine);
      threeRef.current.orbitRings.push(orbitLine);
      disposables.push({geo: ringGeo, mat: ringMat});

      // Saturn-style ring disc — banded shader (Cassini division included)
      if (P.hasRing) {
        const rInner = size * 1.8, rOuter = size * 3.2;
        const discGeo = new THREE.RingGeometry(rInner, rOuter, 128, 1);
        const discMat = new THREE.ShaderMaterial({
          transparent: true, side: THREE.DoubleSide, depthWrite: false,
          uniforms: {
            uInner: { value: rInner },
            uOuter: { value: rOuter },
          },
          vertexShader: `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            varying vec2 vUv; varying vec3 vPos;
            uniform float uInner; uniform float uOuter;
            float hash(float n){ return fract(sin(n)*43758.5453); }
            void main(){
              float r = length(vPos.xy);
              float t = (r - uInner) / (uOuter - uInner); // 0..1 across the ring
              // Concentric bands of varying brightness
              float band = sin(t * 42.0) * 0.5 + 0.5;
              band *= 0.7 + 0.3 * sin(t * 11.0 + 1.3);
              // Cassini division — a dark gap around t ≈ 0.55
              float cassini = 1.0 - smoothstep(0.02, 0.0, abs(t - 0.55));
              // Encke gap — thin darker band at t ≈ 0.82
              float encke = 1.0 - smoothstep(0.012, 0.0, abs(t - 0.82));
              band *= cassini * (0.85 + encke * 0.15);
              // Dust/grain
              float dust = hash(floor(t * 900.0));
              float a = smoothstep(0.15, 0.9, band) * (0.55 + dust * 0.3);
              // Warm cream color with subtle tone shift across ring
              vec3 col = mix(vec3(0.85, 0.72, 0.48), vec3(1.0, 0.93, 0.75), t);
              // Soft edges
              a *= smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.95, 1.0, t));
              gl_FragColor = vec4(col, a);
            }`
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = -Math.PI / 2.3;
        planet.add(disc);
        disposables.push({geo: discGeo, mat: discMat});
      }
    }

    // Expose orb refs
    threeRef.current.orbs = orbs;

    /* -------- ORBIT LOCK — halo sprite + pulsing rings -------- */
    {
      // Halo: soft additive glow sprite
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = haloCanvas.height = 256;
      const hCtx = haloCanvas.getContext('2d');
      const hg = hCtx.createRadialGradient(128,128,0, 128,128,128);
      hg.addColorStop(0,   'rgba(255,255,255,0.95)');
      hg.addColorStop(0.18,'rgba(220,210,255,0.7)');
      hg.addColorStop(0.45,'rgba(167,231,243,0.35)');
      hg.addColorStop(0.75,'rgba(130,160,255,0.1)');
      hg.addColorStop(1,   'rgba(0,0,0,0)');
      hCtx.fillStyle = hg;
      hCtx.beginPath(); hCtx.arc(128,128,128,0,Math.PI*2); hCtx.fill();
      const haloTex = new THREE.CanvasTexture(haloCanvas);
      const haloMat = new THREE.SpriteMaterial({
        map: haloTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0,
      });
      const haloSprite = new THREE.Sprite(haloMat);
      haloSprite.scale.setScalar(0);
      scene.add(haloSprite);
      threeRef.current.lockHalo = haloSprite;
      threeRef.current.lockHaloMat = haloMat;
      disposables.push({ mat: haloMat, tex: haloTex });

      // Helper: create a canvas ring sprite (thick, visible at any scale)
      const _makeRingSprite = (hexColor, lineWidthFraction) => {
        const rc = document.createElement('canvas');
        rc.width = rc.height = 512;
        const rx = rc.getContext('2d');
        const cx = 256, cy = 256, radius = 220;
        const lw = Math.round(512 * lineWidthFraction);
        // Outer glow pass
        rx.beginPath(); rx.arc(cx, cy, radius, 0, Math.PI * 2);
        const r = (hexColor >> 16) & 0xff;
        const g = (hexColor >> 8)  & 0xff;
        const b =  hexColor        & 0xff;
        rx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        rx.lineWidth = lw * 3.5;
        rx.stroke();
        // Sharp ring
        rx.beginPath(); rx.arc(cx, cy, radius, 0, Math.PI * 2);
        rx.strokeStyle = `rgba(${r},${g},${b},1.0)`;
        rx.lineWidth = lw;
        rx.stroke();
        const tex = new THREE.CanvasTexture(rc);
        const mat = new THREE.SpriteMaterial({
          map: tex, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, opacity: 0,
        });
        const spr = new THREE.Sprite(mat);
        spr.renderOrder = 998;
        spr.scale.setScalar(0);
        scene.add(spr);
        disposables.push({ mat, tex });
        return { spr, mat };
      };

      const { spr: lockRing,  mat: lockRingMat  } = _makeRingSprite(0xa7e7f3, 0.032);
      const { spr: outerRing, mat: outerRingMat } = _makeRingSprite(0xc0a5ff, 0.024);
      threeRef.current.lockRing     = lockRing;
      threeRef.current.lockRingMat  = lockRingMat;
      threeRef.current.outerRing    = outerRing;
      threeRef.current.outerRingMat = outerRingMat;

      // orbitLock state — written by open/close callbacks, read by tick loop
      threeRef.current.orbitLock = {
        active: false, planetIdx: -1, prog: 0,
        detached: false, // true while planet is removed from floatGroup and lives in scene
      };
    }
    /* -------- END ORBIT LOCK -------- */

    /* -------- E10 — PIXEL ART KUNAL SPRITE (removed) -------- */
    // Sprite removed — no longer attached to Mercury
    /* -------- END E10 -------- */

    // ---- Name labels for sun + each planet (DOM spans, positioned imperatively each tick) ----
    const planetLabelEls = [];
    if (labelsRef.current) {

    /* E14 — Constellation mode: KUNAL star map stored for toggle */
    const KUNAL_STARS = [
      // K
      [-14, 6, -8], [-14, 3, -8], [-14, 0, -8], [-14, -3, -8], [-14, -6, -8],
      [-14, 3, -8], [-11, 6, -8], [-11, -6, -8],
      // U
      [-8, 6, -8], [-8, 0, -8], [-8, -6, -8], [-5, 6, -8], [-5, 0, -8], [-5, -6, -8], [-6.5, -6, -8],
      // N
      [-2, 6, -8], [-2, 0, -8], [-2, -6, -8], [1, 6, -8], [1, 0, -8], [1, -6, -8], [-0.5, 3, -8],
      // A
      [4, -6, -8], [6.5, 6, -8], [9, -6, -8], [5.5, 0, -8], [7.5, 0, -8],
      // L
      [12, 6, -8], [12, 0, -8], [12, -6, -8], [15, -6, -8],
    ];
    const KUNAL_LINES = [
      // K strokes
      [0,1],[1,2],[2,3],[3,4],[1,5],[5,6],[5,7],
      // U strokes
      [8,9],[9,10],[10,14],[11,12],[12,13],[13,14],
      // N strokes
      [15,16],[16,17],[18,19],[19,20],[20,21],[16,22],[22,19],
      // A strokes
      [23,24],[24,25],[26,27],
      // L strokes
      [27,28],[28,29],[29,30],
    ];
    const _constellGeo = new THREE.BufferGeometry();
    const _csPositions = new Float32Array(KUNAL_STARS.length * 3);
    KUNAL_STARS.forEach((p, i) => { _csPositions[i*3]=p[0]; _csPositions[i*3+1]=p[1]; _csPositions[i*3+2]=p[2]; });
    _constellGeo.setAttribute('position', new THREE.BufferAttribute(_csPositions, 3));
    const _csSizes = new Float32Array(KUNAL_STARS.length).fill(1);
    _constellGeo.setAttribute('aSize', new THREE.BufferAttribute(_csSizes, 1));
    const _csMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0 });
    const _csPoints = new THREE.Points(_constellGeo, _csMat);
    _csPoints.position.set(floatGroup.position.x, floatGroup.position.y, floatGroup.position.z);
    scene.add(_csPoints);
    // Lines
    const _csLinePositions = [];
    KUNAL_LINES.forEach(([a,b]) => {
      _csLinePositions.push(...KUNAL_STARS[a], ...KUNAL_STARS[b]);
    });
    const _csLineGeo = new THREE.BufferGeometry();
    _csLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_csLinePositions), 3));
    let _csLineSegments = null;
    try {
      _csLineSegments = new THREE.LineSegments(_csLineGeo, new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0 }));
      _csLineSegments.position.copy(_csPoints.position);
      scene.add(_csLineSegments);
    } catch(_) {}
    threeRef.current._constellation = { points: _csPoints, lines: _csLineSegments, active: false };
    disposables.push({ geo: _constellGeo, mat: _csMat });
    disposables.push({ geo: _csLineGeo, mat: _csLineSegments?.material });
    // End of constellation block

      const _lc = labelsRef.current;
      const _mkLbl = (text, col, glow) => {
        const el = document.createElement('span');
        el.className = 'planet-label';
        el.textContent = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        el.style.color = col;
        el.style.textShadow = `0 0 10px ${glow}`;
        _lc.appendChild(el);
        return el;
      };
      planetLabelEls.push({ el: _mkLbl('Sol', 'rgba(255,218,90,0.9)', 'rgba(255,165,40,0.7)'), obj: sun });
      activePlanets.forEach((P, i) => {
        const _pc = new THREE.Color(P.color);
        const _pr = Math.round(_pc.r*255), _pg = Math.round(_pc.g*255), _pb = Math.round(_pc.b*255);
        planetLabelEls.push({
          el: _mkLbl(P.name, `rgba(${_pr},${_pg},${_pb},0.9)`, `rgba(${_pr},${_pg},${_pb},0.55)`),
          obj: orbs[i], orbIdx: i,
        });
      });
    }

    // E12 narration removed
    const _narrationEls = [];

    /* ---------- ASTEROID BELT (hyper-real: C/S/M spectral types) ----------
       Real asteroids split roughly into three spectral classes:
         C-type (carbonaceous) ~75% — dark, very rough, low albedo
         S-type (silicate)     ~17% — tan/grey, stony, moderate roughness
         M-type (metallic)      ~8% — nickel-iron, subtly reflective
       Each family gets its own pre-displaced icosahedron so no two rocks
       read as a clean polyhedron, plus per-instance color jitter. */
    const swarmCount = isMobile ? 60 : 180;
    const asteroidTypes = [
      { key: 'C', share: 0.72,
        color: new THREE.Color(0x3a3632), tint: 0.18,
        mat: new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.95, metalness: 0.02,
          emissive: 0x050403, emissiveIntensity: 0.12, flatShading: true }) },
      { key: 'S', share: 0.20,
        color: new THREE.Color(0x8b7a62), tint: 0.22,
        mat: new THREE.MeshStandardMaterial({ color: 0x8b7a62, roughness: 0.85, metalness: 0.08,
          emissive: 0x100a05, emissiveIntensity: 0.18, flatShading: true }) },
      { key: 'M', share: 0.08,
        color: new THREE.Color(0xa8a094), tint: 0.15,
        mat: new THREE.MeshStandardMaterial({ color: 0xa8a094, roughness: 0.55, metalness: 0.55,
          emissive: 0x0a0806, emissiveIntensity: 0.22, flatShading: true }) }
    ];
    // Build a distinct, irregular geometry for each type so the silhouette
    // varies at a glance — random vertex displacement breaks the polyhedron.
    const buildRockGeo = (seedMix) => {
      const g = new THREE.IcosahedronGeometry(0.09, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        // Low-freq lumps + high-freq chunks for cratered silhouette
        const n = 0.55
          + 0.35 * Math.sin(x * 4 + y * 3.2)
          + 0.18 * Math.cos(y * 6.7 + z * 5.1)
          + 0.12 * Math.sin(z * 9.3 + x * 7.8);
        const k = 0.55 + n * 0.55 * seedMix; // per-type amplitude
        pos.setXYZ(i, x * k, y * k, z * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const swarmMeshes = [];
    const cubeData = []; // flat list across all swarms for tick loop
    let remaining = swarmCount;
    asteroidTypes.forEach((t, idx) => {
      const count = idx === asteroidTypes.length - 1
        ? remaining
        : Math.round(swarmCount * t.share);
      remaining -= count;
      if (count <= 0) return;
      const geo = buildRockGeo(0.55 + idx * 0.15);
      const mesh = new THREE.InstancedMesh(geo, t.mat, count);
      // Per-instance color jitter — each rock a slightly different shade.
      const tmpC = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const jitter = (Math.random() - 0.5) * t.tint;
        tmpC.copy(t.color).offsetHSL(0, 0, jitter);
        mesh.setColorAt(i, tmpC);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      floatGroup.add(mesh);
      swarmMeshes.push({ mesh, count, baseCount: count, startIdx: cubeData.length });
      disposables.push({ geo, mat: t.mat });

      // Per-instance orbit + tumble parameters
      for (let i = 0; i < count; i++) {
        const ringR = 5.0 + (Math.random() - 0.5) * 1.4; // between Mars(4.0) and Jupiter(6.0)
        const a = Math.random() * Math.PI * 2;
        cubeData.push({
          orbitR: ringR,
          orbitA: a,
          orbitSpeed: 0.06 + Math.random() * 0.05,
          yBase: (Math.random() - 0.5) * 0.6,
          phase: Math.random() * Math.PI * 2,
          amp: 0.15 + Math.random() * 0.25,
          rot: new THREE.Vector3(
            (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.04,
            (Math.random() - 0.5) * 0.04
          ),
          scale: 0.5 + Math.random() * 1.5,
          basePos: new THREE.Vector3()
        });
      }
    });
    const cubeDummy = new THREE.Object3D();
    // Expose for E16 (GitHub activity density)
    threeRef.current.swarmMeshes = swarmMeshes;

    /* ---- E2: Rapier Physics — removed ---- */
    const _rapierFloaters = [];
    threeRef.current.rapierFloaters = _rapierFloaters;
    threeRef.current.rapierWorld = null;
    if (false) { // disabled

    // Each floater has a unique tint; shader does the rest
    const _icosParams = [
      { hue: 0.72, roughness: 0.08, metalness: 0.96, emissive: new THREE.Color(0x2a0060) },  // deep violet metal
      { hue: 0.56, roughness: 0.04, metalness: 1.00, emissive: new THREE.Color(0x001833) },  // polished chrome-blue
      { hue: 0.06, roughness: 0.12, metalness: 0.92, emissive: new THREE.Color(0x1a0a00) },  // hot copper
      { hue: 0.33, roughness: 0.06, metalness: 0.98, emissive: new THREE.Color(0x001a08) },  // oxidised silver-green
      { hue: 0.88, roughness: 0.10, metalness: 0.94, emissive: new THREE.Color(0x1a0015) },  // rose gold
      { hue: 0.14, roughness: 0.05, metalness: 0.99, emissive: new THREE.Color(0x0d0a00) },  // brushed gold
    ];

    // Shared hyper-realistic icosahedron shader
    // — flat-shaded facets via dFdx/dFdy normals
    // — Cook-Torrance GGX specular + Schlick fresnel
    // — procedural iridescence (thin-film interference)
    // — rim glow + inner edge highlight
    // — three scene lights baked in
    const _icoVertShader = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main(){
        vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos4.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos4.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos4;
      }`;

    const _icoFragShader = `
      precision highp float;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;

      uniform vec3  uBaseColor;
      uniform vec3  uEmissive;
      uniform float uRoughness;
      uniform float uMetalness;
      uniform float uTime;
      uniform vec3  uLightPos0;
      uniform vec3  uLightCol0;
      uniform vec3  uLightPos1;
      uniform vec3  uLightCol1;
      uniform vec3  uLightPos2;
      uniform vec3  uLightCol2;

      // --- GGX / Cook-Torrance helpers ---
      float D_GGX(float NdH, float a){
        float a2 = a*a; float d = NdH*NdH*(a2-1.0)+1.0;
        return a2 / (3.14159265*d*d + 1e-7);
      }
      float G_Smith(float NdV, float NdL, float a){
        float k = a*0.5;
        float gv = NdV/(NdV*(1.0-k)+k);
        float gl = NdL/(NdL*(1.0-k)+k);
        return gv*gl;
      }
      vec3 F_Schlick(float VdH, vec3 F0){
        return F0 + (1.0-F0)*pow(clamp(1.0-VdH,0.0,1.0),5.0);
      }

      // --- Thin-film iridescence ---
      vec3 iridescence(float cosTheta, float thickness){
        float phi = 2.0*3.14159265*thickness*cosTheta;
        vec3 rainbow = vec3(
          0.5+0.5*cos(phi),
          0.5+0.5*cos(phi + 2.094),
          0.5+0.5*cos(phi + 4.189)
        );
        float str = pow(1.0-cosTheta, 2.5);
        return rainbow * str * 0.7;
      }

      // Flat-shaded face normal from position derivatives
      vec3 faceNormal(){ return normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos))); }

      vec3 shade(vec3 N, vec3 V, vec3 Lpos, vec3 Lcol){
        vec3 L = normalize(Lpos - vWorldPos);
        float dist2 = dot(Lpos - vWorldPos, Lpos - vWorldPos);
        float atten = 1.0 / (1.0 + dist2 * 0.04);
        vec3  H = normalize(V + L);
        float NdL = max(dot(N,L), 0.0);
        float NdV = max(dot(N,V), 1e-4);
        float NdH = max(dot(N,H), 0.0);
        float VdH = max(dot(V,H), 0.0);

        float alpha = uRoughness * uRoughness;
        vec3 F0 = mix(vec3(0.04), uBaseColor, uMetalness);

        float  D  = D_GGX(NdH, alpha);
        float  G  = G_Smith(NdV, NdL, alpha);
        vec3   F  = F_Schlick(VdH, F0);
        vec3 spec = (D*G*F) / (4.0*NdV*NdL + 1e-7);

        vec3 kd   = (1.0 - F) * (1.0 - uMetalness);
        vec3 diff = kd * uBaseColor / 3.14159265;

        return (diff + spec * 3.0) * Lcol * NdL * atten;
      }

      void main(){
        vec3 N = faceNormal();            // flat-shaded, faceted look
        vec3 V = normalize(vViewDir);

        // PBR shading from 3 lights
        vec3 color = uEmissive * 0.6;
        color += shade(N, V, uLightPos0, uLightCol0);
        color += shade(N, V, uLightPos1, uLightCol1);
        color += shade(N, V, uLightPos2, uLightCol2);

        // Ambient IBL approximation
        float NdV = max(dot(N,V),0.0);
        vec3 envUp   = vec3(0.04,0.06,0.12);
        vec3 envDown = vec3(0.01,0.01,0.02);
        vec3 ibl     = mix(envDown, envUp, N.y*0.5+0.5) * uBaseColor * (1.0-uRoughness);
        color += ibl * 0.5;

        // Thin-film iridescence on glancing angles
        color += iridescence(NdV, 0.38 + 0.2*sin(uTime*0.4 + vWorldPos.x)) * (1.0 - uRoughness);

        // Rim / edge backlight glow
        float rim = pow(1.0 - NdV, 3.5);
        color += rim * uBaseColor * 1.4;

        // Facet edge highlight — bright flash on very flat angles to N
        float edge = pow(abs(dot(N, vec3(0.0,1.0,0.0))), 12.0);
        color += edge * 0.6 * uBaseColor;

        // Tonemapping (ACES filmic approx)
        color = color * (color + 0.0245786) / (color * (0.983729 * color + 0.4329510) + 0.238081);
        color = pow(max(color, 0.0), vec3(1.0/2.2));  // gamma

        gl_FragColor = vec4(color, 1.0);
      }`;

    for (let _ri = 0; _ri < 6; _ri++) {
      const _p   = _icosParams[_ri];
      const _col = new THREE.Color().setHSL(_p.hue, 0.85, 0.55);
      const _icoGeo = new THREE.IcosahedronGeometry(0.19 + Math.random() * 0.11, 0);
      // Need flat-shaded geometry (each face has own vertices for dFdx normals to work)
      _icoGeo.computeVertexNormals();
      const _icoMat = new THREE.ShaderMaterial({
        vertexShader:   _icoVertShader,
        fragmentShader: _icoFragShader,
        uniforms: {
          uBaseColor: { value: _col },
          uEmissive:  { value: _p.emissive },
          uRoughness: { value: _p.roughness },
          uMetalness: { value: _p.metalness },
          uTime:      { value: 0 },
          uLightPos0: { value: new THREE.Vector3(0, 1, -4) },   // sun light
          uLightCol0: { value: new THREE.Vector3(3.5, 2.6, 1.0) },
          uLightPos1: { value: new THREE.Vector3(-8, 4, 6) },   // rim light
          uLightCol1: { value: new THREE.Vector3(0.4, 0.6, 1.5) },
          uLightPos2: { value: new THREE.Vector3(6, -2, 4) },   // fill
          uLightCol2: { value: new THREE.Vector3(0.15, 0.15, 0.25) },
        },
        extensions: { derivatives: true },
      });
      const _icoMesh = new THREE.Mesh(_icoGeo, _icoMat);
      _icoMesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 8
      );
      _icoMesh.userData.driftPhase = Math.random() * Math.PI * 2;
      _icoMesh.userData.driftAmp  = 0.3 + Math.random() * 0.3;
      _icoMesh.userData.driftFreq = 0.4 + Math.random() * 0.4;
      floatGroup.add(_icoMesh);
      _rapierFloaters.push({ mesh: _icoMesh, body: null, initPos: _icoMesh.position.clone() });
    }
    } // end disabled block
    if (false && !isMobile) { // Rapier disabled
      (async () => {
        try {
          await new Promise((res, rej) => {
            const _s = document.createElement('script');
            _s.src = _RAPIER_CDN; _s.onload = res; _s.onerror = rej;
            document.head.appendChild(_s);
          });
          const RAPIER = window.RAPIER;
          if (!RAPIER) return;
          await RAPIER.init();
          const _world = new RAPIER.World({ x:0.0, y:0.0, z:0.0 });
          for (const _rf of _rapierFloaters) {
            const _rbDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(
              _rf.initPos.x, _rf.initPos.y, _rf.initPos.z
            ).setLinearDamping(0.8).setAngularDamping(0.6);
            const _rb = _world.createRigidBody(_rbDesc);
            const _collDesc = RAPIER.ColliderDesc.ball(0.22);
            _world.createCollider(_collDesc, _rb);
            _rf.body = _rb;
          }
          threeRef.current.rapierWorld = _world;
          threeRef.current.RAPIER = RAPIER;
        } catch (_rapierErr) { /* Rapier optional */ }
      })();
    }

    /* ---------- 7. SHOOTING STARS (bright head + alpha-graded tail) ---------- */
    const shootingStars = [];
    const spawnShootingStar = () => {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        6 + Math.random() * 4,
        -15 - Math.random() * 8
      );
      const end = start.clone().add(new THREE.Vector3(-8 - Math.random() * 6, -4 - Math.random() * 2, 4 + Math.random() * 4));
      // Multi-segment line so we can taper color + alpha along the streak.
      const SEG = 14;
      const posArr = new Float32Array(SEG * 3);
      const colArr = new Float32Array(SEG * 3);
      // Slight hue variance per meteor — mostly white, occasional green/blue.
      const hue = Math.random() < 0.85
        ? new THREE.Color(1, 1, 1)
        : (Math.random() < 0.5 ? new THREE.Color(0x9fd6ff) : new THREE.Color(0xc9ffb6));
      for (let i = 0; i < SEG; i++) {
        const k = i / (SEG - 1);
        posArr[i*3]   = start.x + (end.x - start.x) * k;
        posArr[i*3+1] = start.y + (end.y - start.y) * k;
        posArr[i*3+2] = start.z + (end.z - start.z) * k;
        // Head (k=0) bright, tail (k=1) fades to near-black; additive blending
        // turns the fade transparent.
        const f = Math.pow(1 - k, 2.2);
        colArr[i*3]   = hue.r * f;
        colArr[i*3+1] = hue.g * f;
        colArr[i*3+2] = hue.b * f;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      const m = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const line = new THREE.Line(g, m);
      scene.add(line);
      shootingStars.push({ line, mat: m, geo: g, born: performance.now(), life: 900 + Math.random() * 400 });
    };

    /* ---------- 8. COSMIC DUST (close-field motes) ---------- */
    const dustCount = isMobile ? 400 : 1200;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos   = new Float32Array(dustCount * 3); // base positions (immutable after init)
    const dustColor = new Float32Array(dustCount * 3);
    const dustDrift = new Float32Array(dustCount * 3); // per-particle drift phase offsets
    const tmpCol = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 12 + 2;
      const z = (Math.random() - 0.5) * 20 - 4;
      dustPos[i*3] = x; dustPos[i*3+1] = y; dustPos[i*3+2] = z;
      dustDrift[i*3] = i * 0.3; dustDrift[i*3+1] = i * 0.4; dustDrift[i*3+2] = i * 0.5;
      const roll = Math.random();
      if (roll < 0.6) tmpCol.setHex(0xbfd6ff);
      else if (roll < 0.85) tmpCol.setHex(0xffd59a);
      else tmpCol.setHex(0xff9fd8);
      dustColor[i*3] = tmpCol.r; dustColor[i*3+1] = tmpCol.g; dustColor[i*3+2] = tmpCol.b;
    }
    dustGeo.setAttribute('position',   new THREE.BufferAttribute(dustPos,   3));
    dustGeo.setAttribute('color',      new THREE.BufferAttribute(dustColor, 3));
    dustGeo.setAttribute('aDriftPhase',new THREE.BufferAttribute(dustDrift, 3));
    // GPU-driven drift — eliminates 1200+ CPU Math.sin/cos calls per frame
    const dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0.6 },
        uPxRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute vec3 aDriftPhase;
        uniform float uTime;
        uniform float uPxRatio;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec3 p = position;
          p.x += sin(uTime * 0.15 + aDriftPhase.x) * 0.3;
          p.y += cos(uTime * 0.20 + aDriftPhase.y) * 0.3;
          p.z += sin(uTime * 0.12 + aDriftPhase.z) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 0.035 * uPxRatio * (300.0 / -mv.z);
        }`,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = dot(c, c) * 4.0;
          float a = max(0.0, 1.0 - d);
          gl_FragColor = vec4(vColor * a, a * uOpacity);
        }`,
    });
    dustMat.vertexColors = true;
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    disposables.push({geo: dustGeo, mat: dustMat});

    // legacy placeholders so older cleanup code stays valid
    const floaters = [];
    const knots = [];

    const walls = [];
    const wallMat = { dispose(){} };


    /* Camera scroll chapters — one progress value drives a smooth lerp
       along waypoints inside the RAF loop. This avoids 7 competing
       ScrollTrigger tweens writing to camera.position every frame,

    /* Camera scroll chapters — one progress value drives a smooth lerp
       along waypoints inside the RAF loop. This avoids 7 competing
       ScrollTrigger tweens writing to camera.position every frame,
       which caused visible jank on the floaters during scroll. */
    // Camera chapters: zoom OUT through scroll. Start close to the solar
    // system (hero) and gradually pull back to reveal galaxies — spirals,
    // ellipticals, irregulars — each with a bright SMBH-like core.
    // Camera chapters: camera X stays LEFT (negative) while solar system
    // sits at world (8,4,0) — this keeps the system in the right ~40% of
    // the screen, clear of the HTML content that lives on the left side.
    // Rule of thumb: camera.x ≈ -(solarSystem.x * 0.75) until Z is so large
    // the system is pixel-sized and only galaxies fill the frame.
    const chapters = [
      { pos: new THREE.Vector3(-18,  9,   8), look: new THREE.Vector3(-1,  3,   -3) },  // hero:       cam far-left → system on far right
      { pos: new THREE.Vector3( -8,  3,  28), look: new THREE.Vector3(-5,  1.5, -4) },  // about:      cam left → system occupies right 40%
      { pos: new THREE.Vector3( -6,  2.5, 90), look: new THREE.Vector3(-4,  1,   -8) }, // projects:   system still clearly right, pulling back
      { pos: new THREE.Vector3( -3,  1.5,200), look: new THREE.Vector3(-2,  0.5,-20) }, // skills:     system small, still right half
      { pos: new THREE.Vector3(  0,  0,  520), look: new THREE.Vector3( 0,  0,  -60) }, // experience: galactic scale — center fine
      { pos: new THREE.Vector3(  0,  0, 1200), look: new THREE.Vector3( 0,  0, -200) }, // terminal:   deep field
      { pos: new THREE.Vector3(  0,  0, 2400), look: new THREE.Vector3( 0,  0, -500) }, // contact:    cosmic web
    ];
    const desiredPos = new THREE.Vector3().copy(chapters[0].pos);
    const desiredLook = new THREE.Vector3().copy(chapters[0].look);
    const currentLook = new THREE.Vector3().copy(chapters[0].look);
    const scrollProg = { value: 0 }; // 0 = deep space (top), 1 = daylight at Earth (bottom)
    // Expose live scene refs on threeRef so open/close handlers can snapshot state
    threeRef.current.camera = camera;
    threeRef.current.currentLook = currentLook;
    threeRef.current.scrollProg = scrollProg;
    threeRef.current.chapters = chapters;
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const smooth = (x) => x * x * (3 - 2 * x); // smoothstep

    /* -------- E5 — WEB WORKER: off-thread orbital mechanics -------- */
    const _workerCode = `
const ECL_YF=0.866, ECL_ZF=0.5;
let planets=[], asteroids=[], workerTime=0;
self.onmessage=function(e){
  const{type,data}=e.data;
  if(type==='init'){ planets=data.planets; asteroids=data.asteroids; }
  if(type==='tick'){
    workerTime=data.time; const dt=data.delta;
    const planetPositions=planets.map(p=>{
      p.phase+=p.speed*dt;
      return{x:Math.cos(p.phase)*p.radius, y:Math.sin(p.phase)*p.radius*ECL_YF, z:Math.sin(p.phase)*p.radius*ECL_ZF, phase:p.phase};
    });
    const astPos=new Float32Array(asteroids.length*3);
    asteroids.forEach((a,i)=>{
      a.phase+=a.speed*0.01;
      astPos[i*3]=Math.cos(a.phase+a.tilt)*a.radius;
      astPos[i*3+1]=Math.sin(a.phase+a.tilt)*a.radius*ECL_YF+a.yBase+Math.sin(workerTime*0.6+a.phase)*a.amp;
      astPos[i*3+2]=Math.sin(a.phase+a.tilt)*a.radius*ECL_ZF;
    });
    self.postMessage({type:'positions',planetPositions,astPos:astPos.buffer,phases:planets.map(p=>p.phase)},[astPos.buffer]);
  }
};`;
    const _workerBlob = new Blob([_workerCode], { type:'application/javascript' });
    const _workerUrl = URL.createObjectURL(_workerBlob);
    const orbitalWorker = new Worker(_workerUrl);
    threeRef.current.orbitalWorker = orbitalWorker;
    // Latest worker positions — applied each frame if available
    const _latestOrbPos = { planets: null, astPos: null };
    orbitalWorker.onmessage = (e) => {
      if (e.data.type === 'positions') {
        _latestOrbPos.planets = e.data.planetPositions;
        _latestOrbPos.astPos = new Float32Array(e.data.astPos);
      }
    };
    // Init worker with planet + asteroid data
    orbitalWorker.postMessage({ type:'init', data: {
      planets: activePlanets.map((p, i) => ({
        radius: p.radius, speed: p.speed,
        phase: (i / activePlanets.length) * Math.PI * 2,
      })),
      asteroids: cubeData.map(d => ({
        radius: d.orbitR, speed: d.orbitSpeed,
        phase: d.orbitA, tilt: 0,
        yBase: d.yBase, amp: d.amp,
      })),
    }});
    /* -------- END E5 -------- */

    const updateDesiredFromScroll = () => {
      // Freeze camera while a detail page is open — scrolling inside the panel must not move the scene
      if (threeRef.current.orbitLock?.active) return;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(Math.max(window.scrollY / max, 0), 1);
      scrollProg.value = p;
      const scaled = p * (chapters.length - 1);
      const idx = Math.floor(scaled);
      const frac = smooth(scaled - idx);
      const a = chapters[idx];
      const b = chapters[Math.min(idx + 1, chapters.length - 1)];
      tmpA.copy(a.pos).lerp(b.pos, frac);
      tmpB.copy(a.look).lerp(b.look, frac);
      desiredPos.copy(tmpA);
      desiredLook.copy(tmpB);
    };
    updateDesiredFromScroll();
    // Update on scroll via Lenis (already wired) — no ScrollTrigger needed
    lenis.on('scroll', updateDesiredFromScroll);
    window.addEventListener('resize', updateDesiredFromScroll);

    // Pre-build flat material list for solar-system fade — avoids traverse each frame
    const _solarMats = [];
    floatGroup.traverse((o) => {
      if (o.material && o.material.opacity !== undefined && o.material !== sunMat && o.material !== coronaMat) {
        // Store base opacity directly on the material so the flat-array loop can find it
        o.material._baseOpacity = o.material.opacity || 1;
        o.material.transparent = true;
        _solarMats.push(o.material);
      }
    });

    // Pre-allocated reusable objects — avoid per-frame allocations / GC pressure
    const _detailSky        = new THREE.Color(0x05031a);
    const _sunWorld         = new THREE.Vector3();
    const _lwp              = new THREE.Vector3(); // label world-pos projection
    const _lndc             = new THREE.Vector3(); // label NDC result
    const _reuseSunNDCv     = new THREE.Vector3(); // sun NDC for god rays
    const _sprRaycaster     = new THREE.Raycaster(); // sprite hover (E10)
    // Orbit-lock reusable vectors (prevent 5+ allocations per frame during lock)
    const _reuseScaleVec    = new THREE.Vector3();
    const _reuseNDC         = new THREE.Vector3();
    const _reuseRayDir      = new THREE.Vector3();
    const _reuseTargetWorld = new THREE.Vector3();
    const _reuseGLVec       = new THREE.Vector3();
    const _reuseGLCenter    = new THREE.Vector2();
    const _reuseDetachWP    = new THREE.Vector3();
    const _reuseOrbLocal    = new THREE.Vector3();

    /* Animate */
    const clock = new THREE.Clock();
    let raf;
    let frameCount = 0;
    let lastDiveState = '0';
    const parallax = { x: 0, y: 0 };
    let nextShootingStarAt = performance.now() + 1500;
    // 60fps cap: skip frames on 120/144/240Hz displays to halve CPU+GPU load
    let _lastRafTime = 0;
    const tick = () => {
      const now = performance.now();
      if (now - _lastRafTime < 14) { raf = requestAnimationFrame(tick); return; }
      _lastRafTime = now;
      // getDelta() FIRST so it returns true frame delta; elapsedTime is updated by it
      const _delta = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const targetMix = (threeRef.current.envMode === 'detail') ? 1 : 0;
      env.mix += (targetMix - env.mix) * 0.10;
      const m = env.mix;

      // ---------- SKY / ENV ----------
      // Blend to a deep indigo/violet "hyperspace" environment for detail pages.
      const p = scrollProg.value;
      scene.background.copy(skyDeep).lerp(_detailSky, m * 0.92);
      // Fade fully to 0 by the time m ≈ 0.72 so stars are gone before blackout lifts
      starMat.uniforms.uFade.value   = Math.max(0, 1 - m * 1.4);
      nebulaMat.uniforms.uFade.value = Math.max(0, 1 - m * 1.4);
      dustMat.uniforms.uOpacity.value  = Math.max(0, 0.6 * (1 - m * 1.4));
      ambient.intensity = 0.5;
      ambient.color.setRGB(0.10 + m * 0.04, 0.10, 0.22 + m * 0.08);
      sunLight.color.setRGB(1.0 - m * 0.3, 0.80 - m * 0.2, 0.40 + m * 0.5);

      // Black hole visibility + animation
      blackHole.visible = m > 0.02;
      bhRingMat.uniforms.uTime.value = t;
      bhRingMat.uniforms.uFade.value = m;
      bhRing.rotation.z += 0.002 + m * 0.01;

      // Hide section content only during the brief "inside atmosphere" window.
      // Keep experience/terminal visible longer on either side of the dive
      // so users can actually read them before and after the plunge.
      // Content always visible — no atmospheric dive to hide it.

      // Sun + planets fade out during detail mode.
      const sunFade = Math.max(0, 1 - m * 1.15);
      const effectiveSunFade = sunFade;
      sunMat.uniforms.uDay = sunMat.uniforms.uDay || { value: 0 };
      sun.visible = effectiveSunFade > 0.02;
      corona.visible = effectiveSunFade > 0.02;
      sun.scale.setScalar((1 + Math.sin(t * 0.7) * 0.04) * effectiveSunFade);
      corona.material.uniforms.uFade = corona.material.uniforms.uFade || { value: 1 };
      corona.material.uniforms.uFade.value = effectiveSunFade;

      // Planets + asteroids + earth all ride the same fade.
      // Use pre-built flat array instead of traverse() every frame.
      const warpShrink = Math.max(0.01, sunFade);
      floatGroup.visible = sunFade > 0.02;
      floatGroup.scale.setScalar(warpShrink);
      // Only update individual material opacities when there is actually a change
      if (m > 0.005 || m < 0.995) {
        for (let _i = 0; _i < _solarMats.length; _i++) {
          _solarMats[_i].opacity = (_solarMats[_i]._baseOpacity ?? 1) * sunFade;
        }
      }

      // Galaxies — staggered reveal keyed to scroll progress.
      const galaxyGlobalFade = Math.min(1, Math.max(0, (p - 0.04) / 0.14));
      galaxyMat.uniforms.uFade.value = galaxyGlobalFade;
      // Skip per-galaxy updates entirely when nothing is visible yet
      if (galaxyGlobalFade > 0) {
        const _gxList = galaxyGroup.children;
        for (let _gi = 0; _gi < _gxList.length; _gi++) {
          const gx = _gxList[_gi];
          const u = gx.userData;
          if (!u) continue;
          const gf = Math.min(1, Math.max(0, (p - u.appearAt) / Math.max(0.01, u.fullAt - u.appearAt)));
          const _shouldShow = gf > 0.01;
          gx.visible = _shouldShow;
          if (_shouldShow) {
            if (u.spin) gx.rotation.y += u.spin * 0.01;
            // Cached SMBH sprite — no children traversal needed
            if (u.bhSprite) u.bhSprite.material.opacity = gf;
          }
        }
      }

      // Shader uniforms
      sunMat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      nebulaMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;

      // Sun — slow spin + breathing scale
      sun.rotation.y = t * 0.12;
      const sunPulse = 1 + Math.sin(t * 0.7) * 0.04;
      sun.scale.setScalar(sunPulse * effectiveSunFade);
      // Corona billboard — always face camera, slow scale breathing
      corona.lookAt(camera.position);
      const coronaPulse = 1 + Math.sin(t * 0.9) * 0.08;
      corona.scale.setScalar(coronaPulse * effectiveSunFade);
      coronaMat.uniforms.uTime.value = t;

      // Nebula — gently track behind the camera so it stays as backdrop
      nebula.lookAt(camera.position);

      // Starfield — very slow rotation for parallax of the universe
      // During warp, briefly speed it up so stars feel like they streak past.
      starField.rotation.y = t * 0.005 + m * t * 0.02;
      starField.rotation.x = Math.sin(t * 0.01) * 0.05;

      // Planets — skip all orbital math when solar system is invisible (in warp mode)
      sun.getWorldPosition(_sunWorld);
      // E5: send tick to orbital worker — only when solar system is visible
      if (floatGroup.visible && threeRef.current.orbitalWorker) {
        threeRef.current.orbitalWorker.postMessage({ type:'tick', data:{ time: t, delta: _delta } });
      }
      const _lockedIdx = (threeRef.current.orbitLock?.active || threeRef.current.orbitLock?.prog > 0)
        ? (threeRef.current.orbitLock?.planetIdx ?? -1) : -1;
      if (floatGroup.visible) orbs.forEach((p, _oi) => {
        // Skip orbital position update for the locked planet — orbit-lock tick owns its position
        if (_oi === _lockedIdx) { p.rotation.y += p.userData.spin; return; }
        const u = p.userData;
        // E5: use worker positions when available, fall back to inline
        if (_latestOrbPos.planets?.[_oi]) {
          const wp = _latestOrbPos.planets[_oi];
          const cx = sun.position.x, cy = sun.position.y, cz = sun.position.z;
          p.position.x = cx + wp.x;
          p.position.y = cy + wp.y;
          p.position.z = cz + wp.z;
          u.phase = wp.phase;
        } else {
          const a = t * u.speed + u.phase;
          const cx = sun.position.x, cy = sun.position.y, cz = sun.position.z;
          p.position.x = cx + Math.cos(a) * u.radius;
          p.position.y = cy + Math.sin(a) * u.radius * u.yf;
          p.position.z = cz + Math.sin(a) * u.radius * u.zf;
        }
        p.rotation.y += u.spin;
        // Feed sun world-pos + time into per-planet shader
        if (p.material && p.material.uniforms) {
          if (p.material.uniforms.uSunPos) p.material.uniforms.uSunPos.value.copy(_sunWorld);
          if (p.material.uniforms.uTime) p.material.uniforms.uTime.value = t;
        }

      });

      // E10 — sprite removed

      // ---- ORBIT LOCK animation ----
      {
        const _ol = threeRef.current.orbitLock;
        const _halo = threeRef.current.lockHalo;
        const _haloMat = threeRef.current.lockHaloMat;
        const _ring = threeRef.current.lockRing;
        const _ringMat = threeRef.current.lockRingMat;
        const _outerRing = threeRef.current.outerRing;
        const _outerRingMat = threeRef.current.outerRingMat;
        if (_ol && _halo && _ring && _outerRing) {
          const _orbLocked = _ol.planetIdx >= 0 ? orbs[_ol.planetIdx] : null;

          if (_ol.active && _orbLocked) {
            // --- On first lock tick: detach planet from floatGroup into scene (world space) ---
            if (!_ol.detached) {
              _orbLocked.getWorldPosition(_reuseDetachWP);
              floatGroup.remove(_orbLocked);
              _orbLocked.position.copy(_reuseDetachWP);
              scene.add(_orbLocked);
              _ol.detached = true;
            }

            _ol.prog = Math.min(1, _ol.prog + 0.022);
            const _ep = _ol.prog * _ol.prog * (3 - 2 * _ol.prog); // smoothstep

            // Target: screen left 28%, vertical center — in world space (planet in scene, not floatGroup)
            const _tw = (_ol.targetScreenX ?? 0.28) * 2 - 1; // NDC x
            _reuseNDC.set(_tw, 0, 0.5).unproject(camera);
            const _planetDist = camera.position.distanceTo(_orbLocked.position);
            _reuseRayDir.copy(_reuseNDC).sub(camera.position).normalize();
            _reuseTargetWorld.copy(camera.position).addScaledVector(_reuseRayDir, _planetDist);

            // Lerp in world space — no floatGroup matrix confusion
            _orbLocked.position.lerp(_reuseTargetWorld, 0.05);

            // Scale up — experience gets 2× extra zoom via zoomMult
            const _zoomMult = _ol.zoomMult ?? 1.0;
            const _targetScale = 1 + _ep * 19.0 * _zoomMult;
            _reuseScaleVec.set(_targetScale, _targetScale, _targetScale);
            _orbLocked.scale.lerp(_reuseScaleVec, 0.09);

            // Keep planet shader uniforms alive — reuse _sunWorld already computed above
            if (_orbLocked.material?.uniforms?.uSunPos) {
              _orbLocked.material.uniforms.uSunPos.value.copy(_sunWorld);
            }
            if (_orbLocked.material?.uniforms?.uTime) _orbLocked.material.uniforms.uTime.value = t;

            // Planet world pos is now simply .position (it lives in scene)
            const _pWP = _orbLocked.position;

            // Halo
            const _pSize = (_orbLocked.userData.size ?? 0.14) * _targetScale * 18;
            _halo.position.copy(_pWP);
            _halo.scale.setScalar(_pSize * (1 + _ep * 0.3));
            _haloMat.opacity = _ep * 0.55;

            // Inner ring sprite — radius pulses, auto-billboards
            const _rScale = (_orbLocked.userData.size ?? 0.14) * _targetScale * (4.5 + Math.sin(t * 3.5) * 0.6);
            _ring.position.copy(_pWP);
            _ring.scale.setScalar(_rScale);
            _ringMat.opacity = _ep * (0.7 + Math.sin(t * 3.5) * 0.3);

            // Outer ring sprite — slower pulse, wider
            const _orScale = (_orbLocked.userData.size ?? 0.14) * _targetScale * (7.0 + Math.sin(t * 1.8 + 1.2) * 1.0);
            _outerRing.position.copy(_pWP);
            _outerRing.scale.setScalar(_orScale);
            _outerRingMat.opacity = _ep * (0.45 + Math.sin(t * 1.8 + 1.2) * 0.2);

            // E8 — Gravitational lens: project planet to screen UV, drive warp strength
            { const _gl = threeRef.current._gravLensEffect; if (_gl?.uniforms) {
              _reuseGLVec.copy(_pWP).project(camera);
              _reuseGLCenter.set(_reuseGLVec.x * 0.5 + 0.5, -_reuseGLVec.y * 0.5 + 0.5);
              const _setU = (k, v) => { const u = _gl.uniforms.get ? _gl.uniforms.get(k) : _gl.uniforms[k]; if (u) u.value = v; };
              _setU('uGLCenter', _reuseGLCenter);
              _setU('uGLStrength', _ep * 0.10);
            }}

          } else if (!_ol.active && _ol.planetIdx >= 0 && _ol.prog > 0) {
            // Release — fade out rings/halo, shrink planet back, glide toward orbit
            _ol.prog = Math.max(0, _ol.prog - 0.035);
            const _ep = _ol.prog * _ol.prog * (3 - 2 * _ol.prog);
            const _releaseOrb = orbs[_ol.planetIdx];

            _haloMat.opacity = _ep * 0.55;
            _ringMat.opacity = _ep * 0.55;
            _outerRingMat.opacity = _ep * 0.3;
            // E8 — fade lens out as planet returns
            { const _gl = threeRef.current._gravLensEffect; if (_gl?.uniforms) {
              const _setU = (k, v) => { const u = _gl.uniforms.get ? _gl.uniforms.get(k) : _gl.uniforms[k]; if (u) u.value = v; };
              _setU('uGLStrength', _ep * 0.10);
            }}

            if (_releaseOrb) {
              const _ts = 1 + _ep * 19.0;
              _releaseOrb.scale.setScalar(_ts);

              // Glide planet back toward its live orbital world position
              const _u = _releaseOrb.userData;
              const _a = t * _u.speed + (_u.phase ?? 0);
              // Compute orbital pos in floatGroup local space, then transform to world
              _reuseOrbLocal.set(
                sun.position.x + Math.cos(_a) * _u.radius,
                sun.position.y + Math.sin(_a) * _u.radius * (_u.yf ?? 0.866),
                sun.position.z + Math.sin(_a) * _u.radius * (_u.zf ?? 0.5),
              );
              floatGroup.updateMatrixWorld(false);
              _reuseOrbLocal.applyMatrix4(floatGroup.matrixWorld);
              // Lerp faster as prog falls to 0 — snappy return
              _releaseOrb.position.lerp(_reuseOrbLocal, 0.055 + (1 - _ol.prog) * 0.04);

              // Keep rings/halo tracking the planet
              const _rWP = _releaseOrb.position;
              _ring.position.copy(_rWP);
              _ring.scale.setScalar((_releaseOrb.userData.size ?? 0.14) * _ts * (4.5 + Math.sin(t * 3.5) * 0.6));
              _outerRing.position.copy(_rWP);
              _outerRing.scale.setScalar((_releaseOrb.userData.size ?? 0.14) * _ts * (7.0 + Math.sin(t * 1.8 + 1.2) * 1.0));
              _halo.position.copy(_rWP);
            }

            if (_ol.prog <= 0) {
              // Re-attach planet to floatGroup
              if (_ol.detached && _releaseOrb) {
                scene.remove(_releaseOrb);
                floatGroup.updateMatrixWorld(true);
                const _localPos = floatGroup.worldToLocal(_releaseOrb.position.clone());
                floatGroup.add(_releaseOrb);
                _releaseOrb.position.copy(_localPos);
                _ol.detached = false;
              }
              if (_releaseOrb) _releaseOrb.scale.setScalar(1);
              _halo.scale.setScalar(0);
              _haloMat.opacity = 0;
              _ringMat.opacity = 0;
              _outerRingMat.opacity = 0;
              _ol.planetIdx = -1;
            }

          } else if (!_ol.active) {
            _haloMat.opacity = 0;
            _ringMat.opacity = 0;
            _outerRingMat.opacity = 0;
            // E8 — ensure lens is fully off when idle
            { const _gl = threeRef.current._gravLensEffect; if (_gl?.uniforms) {
              const _setU = (k, v) => { const u = _gl.uniforms.get ? _gl.uniforms.get(k) : _gl.uniforms[k]; if (u) u.value = v; };
              _setU('uGLStrength', 0.0);
            }}
          }
        }
      }
      // ---- END ORBIT LOCK ----

      // Asteroid belt — use worker-computed positions (eliminates ~540 main-thread trig/frame)
      const _wAstPos = _latestOrbPos.astPos;
      if (floatGroup.visible) for (let s = 0; s < swarmMeshes.length; s++) {
        const sw = swarmMeshes[s];
        for (let j = 0; j < sw.count; j++) {
          const d = cubeData[sw.startIdx + j];
          let x, y, z;
          if (_wAstPos) {
            const _ai = (sw.startIdx + j) * 3;
            x = sun.position.x + _wAstPos[_ai];
            y = sun.position.y + _wAstPos[_ai + 1];
            z = sun.position.z + _wAstPos[_ai + 2];
          } else {
            d.orbitA += d.orbitSpeed * 0.01;
            x = sun.position.x + Math.cos(d.orbitA) * d.orbitR;
            y = sun.position.y + Math.sin(d.orbitA) * d.orbitR * 0.866 + d.yBase + Math.sin(t * 0.6 + d.phase) * d.amp;
            z = sun.position.z + Math.sin(d.orbitA) * d.orbitR * 0.500;
          }
          cubeDummy.position.set(x, y, z);
          cubeDummy.rotation.set(
            t * d.rot.x + d.phase,
            t * d.rot.y + d.phase * 0.5,
            t * d.rot.z
          );
          cubeDummy.scale.setScalar(d.scale);
          cubeDummy.updateMatrix();
          sw.mesh.setMatrixAt(j, cubeDummy.matrix);
        }
        sw.mesh.instanceMatrix.needsUpdate = true;
      }  // end floatGroup.visible guard

      // E2: Rapier physics step + sync icosahedra positions + tick uTime for iridescence
      if (threeRef.current.rapierWorld && threeRef.current.rapierFloaters) {
        threeRef.current.rapierWorld.step();
        for (const _rf of threeRef.current.rapierFloaters) {
          if (_rf.body) {
            const _tp = _rf.body.translation();
            _rf.mesh.position.set(_tp.x, _tp.y, _tp.z);
            const _tr = _rf.body.rotation();
            _rf.mesh.quaternion.set(_tr.x, _tr.y, _tr.z, _tr.w);
          } else {
            const _dp = _rf.mesh.userData.driftPhase;
            const _da = _rf.mesh.userData.driftAmp;
            const _df = _rf.mesh.userData.driftFreq;
            _rf.mesh.position.y = _rf.initPos.y + Math.sin(t * _df + _dp) * _da;
            _rf.mesh.rotation.x = t * 0.3;
            _rf.mesh.rotation.z = t * 0.2;
          }
          _rf.mesh.material.uniforms.uTime.value = t;
        }
      } // end Rapier world sync

      frameCount++;

      // Shooting stars — spawn occasionally, fade out
      if (now > nextShootingStarAt) {
        spawnShootingStar();
        nextShootingStarAt = now + 1200 + Math.random() * 2400;
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        const age = (now - s.born) / s.life;
        if (age >= 1) {
          scene.remove(s.line); s.geo.dispose(); s.mat.dispose();
          shootingStars.splice(i, 1);
        } else {
          // fade in then out
          s.mat.opacity = Math.sin(age * Math.PI);
        }
      }

      // Cosmic dust — GPU shader handles drift via aDriftPhase; just update uniforms
      dustMat.uniforms.uTime.value = t;

      // Mouse parallax on the solar system group — gentle lean
      parallax.x += (mouseNDC.x * 0.25 - parallax.x) * 0.04;
      parallax.y += (mouseNDC.y * 0.15 - parallax.y) * 0.04;
      floatGroup.rotation.y = parallax.x + 0.15;
      floatGroup.rotation.x = -parallax.y - 2;
      floatGroup.rotation.z = 0;

      // Lights — steady with tiny pulse so brightness stays consistent
      pLight.intensity = 3.3 + Math.sin(t * 1.2) * 0.25;
      sLight.intensity = 1.6 + Math.sin(t * 0.8 + 1) * 0.15;

      // Smooth camera follow
      camera.position.lerp(desiredPos, 0.08);
      currentLook.lerp(desiredLook, 0.08);
      // heroWeight uses scrollProg which is already up-to-date and avoids scrollHeight read
      const heroWeight = Math.max(0, 1 - scrollProg.value * 6);
      if (heroWeight > 0.01) camera.position.y += Math.sin(t * 0.8) * 0.08 * heroWeight;

      // E8 — FOV breathing + Perlin-noise camera shake
      if (!reducedMotion) {
        camera.fov += (38 + Math.sin(t * 0.17) * 0.6 - camera.fov) * 0.04;
        camera.updateProjectionMatrix();
        const _shakeMag = 0.004;
        camera.position.x += (Math.sin(t * 1.27) + Math.sin(t * 2.13) * 0.4 + Math.sin(t * 5.79) * 0.15) * _shakeMag;
        camera.position.y += (Math.sin(t * 1.61) + Math.sin(t * 2.67) * 0.4 + Math.sin(t * 4.91) * 0.15) * _shakeMag;
      }

      camera.lookAt(currentLook.x, currentLook.y, currentLook.z);

      // E1 — update bloom/CA reactivity (E2/E3)
      if (!reducedMotion) {
        const _wi = 0;

        // E2 — bloom reacts to scroll velocity
        if (bloomEffect) {
          bloomEffect.intensity = 1.4 + _wi * 3.5;
          bloomEffect.luminanceThreshold = Math.max(0.55, 0.85 - _wi * 0.3);
        }
        // E3 — chromatic aberration reacts to scroll velocity
        if (caEffect) {
          const _caStr = 0.0005 + _wi * 0.004;
          if (caEffect.offset) caEffect.offset.set(_caStr, _caStr);
        }
        // E4 — DoF (static, no fly-based pull)
        if (dofEffect) {
          if (dofEffect.cocMaterial?.uniforms?.focusDistance) {
            dofEffect.cocMaterial.uniforms.focusDistance.value += (0.0 - dofEffect.cocMaterial.uniforms.focusDistance.value) * 0.05;
          }
        }
        // E5 — god rays: project sun to screen space
        if (threeRef.current._godRaysEffect) {
          try {
            sun.getWorldPosition(_reuseSunNDCv);
            const _sunNDC = _reuseSunNDCv.project(camera);
            const _sunSX = _sunNDC.x * 0.5 + 0.5;
            const _sunSY = _sunNDC.y * 0.5 + 0.5;
            const _grUni = threeRef.current._godRaysEffect.uniforms;
            if (_grUni) {
              const _posu = _grUni.get ? _grUni.get('uSunScreenPos') : _grUni['uSunScreenPos'];
              if (_posu) _posu.value.set(_sunSX, _sunSY);
              const _iu = _grUni.get ? _grUni.get('uIntensity') : _grUni['uIntensity'];
              if (_iu) _iu.value = Math.max(0, 0.08 - scrollProg.value * 0.1);
            }
          } catch (_) {}
        }

      }

      // E12 narration removed

      // E1 wormhole removed

      // E13 — Pause gate
      if (pausedRef.current) { raf = requestAnimationFrame(tick); return; }

      // Auto-scroll — accumulate sub-pixel offset, only call scrollBy when ≥1px
      if (autoScrollRef.current && !lenisStoppedRef.current) {
        if (!threeRef.current._autoScrollAcc) threeRef.current._autoScrollAcc = 0;
        threeRef.current._autoScrollAcc += 0.5;
        if (threeRef.current._autoScrollAcc >= 1) {
          const _px = Math.floor(threeRef.current._autoScrollAcc);
          threeRef.current._autoScrollAcc -= _px;
          window.scrollBy(0, _px);
        }
      } else {
        threeRef.current._autoScrollAcc = 0;
      }

      // E14 — constellation mode transition
      const _cs = threeRef.current._constellation;
      if (_cs) {
        const _csTarget = _cs.active ? 1 : 0;
        if (_cs.points?.material) {
          _cs.points.material.opacity += (_csTarget - _cs.points.material.opacity) * 0.04;
        }
        if (_cs.lines?.material) {
          _cs.lines.material.opacity += (_csTarget * 0.5 - _cs.lines.material.opacity) * 0.04;
        }
      }

      // E3: GPU fluid sim ping-pong step (every other frame to halve GPU overhead)
      if (threeRef.current.fluidEnabled && frameCount % 2 === 0) {
        const fRef = threeRef.current;
        fRef.fluidSimMat.uniforms.uPrev.value = fRef.fluidRtA.texture;
        fRef.fluidSimMat.uniforms.uTime.value = t;
        const prevAutoClear = renderer.autoClear;
        renderer.autoClear = true;
        renderer.setRenderTarget(fRef.fluidRtB);
        renderer.render(fRef.fluidSimScene, fRef.fluidSimCam);
        renderer.setRenderTarget(null);
        renderer.autoClear = prevAutoClear;
        // swap
        const tmp = fRef.fluidRtA; fRef.fluidRtA = fRef.fluidRtB; fRef.fluidRtB = tmp;
        sunMat.uniforms.uFluid.value = fRef.fluidRtA.texture;
      }

      // Render via EffectComposer if available, else fallback
      if (threeRef.current.composer) {
        try {
          threeRef.current.composer.render();
        } catch (_renderErr) {
          threeRef.current.composer = null; // disable on failure, use fallback henceforth
          renderer.render(scene, camera);
        }
      } else {
        renderer.render(scene, camera);
      }

      // ---- Update planet/sun name label positions ----
      if (planetLabelEls.length) {
        const _lw = window.innerWidth, _lh = window.innerHeight;
        // Pass 1 — project each object to screen; capture cx, cy, screenR and ndcZ (depth)
        const _lpos = [];
        for (let _li = 0; _li < planetLabelEls.length; _li++) {
          const lbl = planetLabelEls[_li];
          const obj = lbl.obj;
          if (!obj || obj.visible === false) { lbl.el.style.opacity = '0'; _lpos.push(null); continue; }
          obj.getWorldPosition(_lwp);
          _lndc.copy(_lwp).project(camera);
          if (_lndc.z >= 1) { lbl.el.style.opacity = '0'; _lpos.push(null); continue; }
          const cx    = (_lndc.x *  0.5 + 0.5) * _lw;
          const cy    = (-_lndc.y * 0.5 + 0.5) * _lh;
          const ndcZ  = _lndc.z; // lower = closer to camera
          // Screen-space radius: use corona half-size for sun so labels behind
          // the visible corona glow are correctly occluded (corona = 7.5×7.5 plane → r=3.75)
          const _sz = (obj === sun ? 3.5 : (obj.userData.size ?? 0.14)) * obj.scale.x;
          _lndc.set(_lwp.x, _lwp.y - _sz, _lwp.z).project(camera);
          const botPx   = (-_lndc.y * 0.5 + 0.5) * _lh;
          const screenR = Math.max(4, botPx - cy);
          // Material-driven opacity (fade matches planet's own visibility)
          let _la = 1;
          if (lbl.orbIdx !== undefined) {
            const _lmat = orbs[lbl.orbIdx]?.material;
            if (_lmat && (_lmat._baseOpacity ?? 1) > 0)
              _la = _lmat.opacity / (_lmat._baseOpacity ?? 1);
          } else if (obj === sun) {
            _la = effectiveSunFade;
          }
          _lpos.push({ li: _li, cx, cy: cy + screenR + 5, labelCy: cy, ndcZ, screenR,
                       opacity: Math.max(0, Math.min(1, _la)) });
        }

        // Pass 2 — occlusion: if a closer object's screen disc covers this label's
        // planet center, the planet is visually behind that object → hide its label.
        for (let _a = 0; _a < _lpos.length; _a++) {
          if (!_lpos[_a] || _lpos[_a].opacity < 0.05) continue;
          for (let _b = 0; _b < _lpos.length; _b++) {
            if (_a === _b || !_lpos[_b] || _lpos[_b].opacity < 0.05) continue;
            // _b is closer than _a?
            if (_lpos[_b].ndcZ >= _lpos[_a].ndcZ) continue;
            // Do their screen discs overlap? (standard 2-circle overlap: dist < r1 + r2)
            const _dx = _lpos[_a].cx - _lpos[_b].cx;
            const _dy = _lpos[_a].labelCy - _lpos[_b].labelCy; // use planet centre Y
            const _distSq = _dx * _dx + _dy * _dy;
            const _radSum = _lpos[_b].screenR + _lpos[_a].screenR;
            if (_distSq < _radSum * _radSum) {
              _lpos[_a].opacity = 0; // planet _a is behind planet _b — hide label
              break;
            }
          }
        }

        // Pass 3 — de-clutter remaining visible labels that still overlap in 2D
        // (e.g. two small distant planets side-by-side). Dim the further one.
        for (let _a = 0; _a < _lpos.length; _a++) {
          if (!_lpos[_a] || _lpos[_a].opacity < 0.05) continue;
          for (let _b = _a + 1; _b < _lpos.length; _b++) {
            if (!_lpos[_b] || _lpos[_b].opacity < 0.05) continue;
            const _dx = Math.abs(_lpos[_a].cx - _lpos[_b].cx);
            const _dy = Math.abs(_lpos[_a].cy - _lpos[_b].cy);
            if (_dx < 58 && _dy < 16) {
              if (_lpos[_a].ndcZ <= _lpos[_b].ndcZ) _lpos[_b].opacity *= 0.08;
              else                                    _lpos[_a].opacity *= 0.08;
            }
          }
        }

        // Pass 4 — write to DOM
        // Hide all labels once the user scrolls into projects or beyond,
        // but always show the label for the currently orbit-locked planet.
        const _hideLabels = ['projects','skills','experience','terminal','contact'].includes(threeRef.current.activeId ?? '');
        const _lockedPlanetIdx = threeRef.current.orbitLock?.active
          ? (threeRef.current.orbitLock?.planetIdx ?? -1) : -1;
        for (let _li = 0; _li < _lpos.length; _li++) {
          const lp = _lpos[_li];
          if (!lp) continue;
          const lbl = planetLabelEls[lp.li];
          lbl.el.style.left = lp.cx + 'px';
          lbl.el.style.top  = lp.cy + 'px';
          const _isLocked = lbl.orbIdx === _lockedPlanetIdx;
          lbl.el.style.opacity = (_hideLabels && !_isLocked) ? '0' : String(lp.opacity);
          // Emphasise the locked planet label
          lbl.el.style.fontWeight = _isLocked ? '600' : '';
          lbl.el.style.color      = _isLocked ? 'var(--accent)' : '';
        }
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (threeRef.current.composer) {
        threeRef.current.composer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', updateDesiredFromScroll);
      window.removeEventListener('mousemove', onMouseNDC);
      // E5: terminate orbital worker
      if (threeRef.current.orbitalWorker) {
        threeRef.current.orbitalWorker.terminate();
        threeRef.current.orbitalWorker = null;
        URL.revokeObjectURL(_workerUrl);
      }
      // E3: dispose fluid render targets
      if (threeRef.current.fluidRtA) { threeRef.current.fluidRtA.dispose(); threeRef.current.fluidRtB.dispose(); }
      ScrollTrigger.getAll().forEach(t => t.kill());
      try { gsap.ticker.remove(_gsapTickerFn); } catch (_) {}
      lenis.destroy();
      shootingStars.forEach(s => { scene.remove(s.line); s.geo.dispose(); s.mat.dispose(); });
      disposables.forEach(({geo, mat, tex}) => { geo?.dispose?.(); mat?.dispose?.(); tex?.dispose?.(); });
      walls.forEach(w => { w.geometry.dispose(); });
      wallMat.dispose();
      planetLabelEls.forEach(l => { try { l.el.remove(); } catch (_e) {} });
      if (threeRef.current.composer) { try { threeRef.current.composer.dispose(); } catch (_) {} }
      renderer.dispose();
    };
  }, [ready]);

  /* ---- Smooth scroll-to helper (used by AI chat) ---- */
  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (threeRef.current.lenis) threeRef.current.lenis.scrollTo(el, { duration: 1.6, offset: -80 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---- E6: Online/offline detection ---- */
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline  = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  /* ---- E16: GitHub activity → asteroid density ---- */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://github-contributions-api.jogruber.de/v4/kugautam?y=last');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        // Sum the last 4 weeks of daily contributions into a weekly total
        const weeks = json.contributions ?? [];
        const recent = weeks.slice(-4);
        const weekTotal = recent.reduce((sum, day) => sum + (day.count ?? 0), 0);
        // Map weekTotal (0–50 typical) to density multiplier (0.5 – 2.0)
        const density = Math.min(2.0, Math.max(0.5, weekTotal / 20));
        // Adjust each asteroid mesh's visible instance count
        const meshes = threeRef.current.swarmMeshes;
        if (meshes?.length) {
          meshes.forEach((sw) => {
            const newCount = Math.round(sw.baseCount * density);
            sw.mesh.count = Math.min(newCount, sw.count);
            sw.mesh.instanceMatrix.needsUpdate = true;
          });
        }
      } catch (_) { /* network error — silently skip */ }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  /* ---- Active section tracking for header ---- */
  useEffect(() => {
    const ids = ['hero', 'about', 'projects', 'skills', 'experience', 'terminal', 'contact'];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        // pick the most visible intersecting entry
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (visible?.target?.id) {
          setActiveId(visible.target.id);
          threeRef.current.activeId = visible.target.id;
        }
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65] }
    );
    els.forEach((el) => obs.observe(el));

    // Wormhole ring — fire once per eyebrow when it scrolls into view
    const eyebrowObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('wh-active'); eyebrowObs.unobserve(e.target); }
      }),
      { threshold: 0.6 }
    );
    document.querySelectorAll('.section-eyebrow').forEach((el) => eyebrowObs.observe(el));

    return () => { obs.disconnect(); eyebrowObs.disconnect(); };
  }, []);

  /* ---- Ambient sound: HTML audio element ---- */
  const soundRef2 = useRef(true); // mirrors soundOn for sync access in gesture handler
  useEffect(() => {
    const audio = new Audio('/deepState.mp3');
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;

    let started = false;
    // Only click / keydown / touch / pointerdown are valid autoplay gestures in all browsers
    const GESTURES = ['click', 'keydown', 'touchstart', 'pointerdown'];
    const tryPlay = () => {
      if (started) return;
      started = true;
      GESTURES.forEach(e => window.removeEventListener(e, tryPlay));
      audio.muted = !soundRef2.current; // respect current mute toggle state
      audio.play().catch(() => { started = false; });
    };
    GESTURES.forEach(e => window.addEventListener(e, tryPlay, { passive: true }));

    return () => {
      GESTURES.forEach(e => window.removeEventListener(e, tryPlay));
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    soundRef2.current = soundOn;
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    audio.muted = !soundOn;
  }, [soundOn]);

  // Global button click sound — catches all skeuo-btn and nav clicks
  useEffect(() => {
    const onGlobalClick = (e) => {
      const el = e.target?.closest('button, [role="button"]');
      if (el) window._sfx?.click();
    };
    window.addEventListener('click', onGlobalClick);
    return () => window.removeEventListener('click', onGlobalClick);
  }, []);
  useEffect(() => {
    if (activeId === 'hero' || activeId === 'about') {
      autoScrollRef.current = true;
    } else if (activeId === 'contact') {
      autoScrollRef.current = false;
    }
  }, [activeId]);

  /* ---- Cursor mode helpers ---- */
  // Tiny SFX engine — attached to window so ChatWidget can also call it
  useEffect(() => {
    let _sfxCtx = null;
    const _getCtx = () => {
      if (!_sfxCtx) _sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (_sfxCtx.state === 'suspended') _sfxCtx.resume();
      return _sfxCtx;
    };
    window._sfx = {
      click: () => {
        try {
          const ctx = _getCtx();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(820, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.07);
          g.gain.setValueAtTime(0.7, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.1);
        } catch(_) {}
      },
      type: () => {
        try {
          const ctx = _getCtx();
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.type = 'square';
          const freq = 260 + Math.random() * 180;
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.7, ctx.currentTime + 0.045);
          g.gain.setValueAtTime(0.7, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.05);
        } catch(_) {}
      },
    };
    return () => { try { _sfxCtx?.close(); } catch(_) {} window._sfx = null; };
  }, []);

  const hoverBtn = () => setCursorMode('button');
  const hoverCard = () => setCursorMode('card');
  const unhover = () => { setCursorMode('default'); setCursorColor(null); };
  const clickBtn = () => { window._sfx?.click(); };

  // Cancel any in-flight dismissDetail poll on unmount
  useEffect(() => () => {
    if (_dismissRafRef.current) cancelAnimationFrame(_dismissRafRef.current);
    if (_dismissTmoRef.current) clearTimeout(_dismissTmoRef.current);
  }, []);

  /* ---- E13: Keyboard navigation ---- */
  useEffect(() => {
    const SECTION_KEYS = { h: 'hero', a: 'about', p: 'projects', s: 'skills', e: 'experience', t: 'terminal', k: 'contact' };
    const onKeyDown = (ev) => {
      // Skip if focus is inside an input/textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const key = ev.key?.toLowerCase();
      if (key === ' ' || ev.key === ' ') {
        ev.preventDefault();
        setPaused((prev) => {
          const next = !prev;
          pausedRef.current = next;
          return next;
        });
      } else if (ev.key === '?') {
        setShowKeyboardHelp((prev) => !prev);
      } else if (key === 'escape') {
        setShowKeyboardHelp(false);
      } else if (key === 'c') {
        // E14 — toggle constellation mode
        const cs = threeRef.current._constellation;
        if (cs) cs.active = !cs.active;
      } else if (SECTION_KEYS[key]) {
        const el = document.getElementById(SECTION_KEYS[key]);
        if (el) {
          if (threeRef.current.lenis) threeRef.current.lenis.scrollTo(el, { duration: 1.6 });
          else el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---- E10: CSS 3D perspective on HTML sections ---- */
  useEffect(() => {
    if (reducedMotion || !ready) return;
    const lenis = threeRef.current.lenis;
    if (!lenis || !sectionsWrapRef.current) return;
    const sections = sectionsWrapRef.current.querySelectorAll('section');
    sections.forEach((sec, i) => {
      sec.style.willChange = 'transform';
      sec.style.backfaceVisibility = 'hidden';
      // Ensure later sections always win pointer events over earlier ones
      // when their 3D-transformed edges visually overlap.
      sec.style.zIndex = String(i + 1);
    });
    const applyDepth = () => {
      sections.forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        const fromCenter = rect.top / window.innerHeight;
        const rotateX = Math.max(-8, Math.min(8, fromCenter * 8));
        // Use inline perspective() so no preserve-3d needed on parent
        sec.style.transform = `perspective(1200px) rotateX(${rotateX}deg)`;
      });
    };
    lenis.on('scroll', applyDepth);
    applyDepth();
    return () => {
      lenis.off('scroll', applyDepth);
      // reset transforms on cleanup
      sections.forEach((sec) => { sec.style.transform = ''; sec.style.willChange = ''; });
    };
  }, [ready, reducedMotion]);

  const openProject = useCallback((p) => {
    const idx = PROJECTS.findIndex((proj) => proj.id === p.id);
    const orbIdx = Math.min(Math.max(0, idx < 0 ? 0 : idx), (threeRef.current.orbs?.length ?? 1) - 1);
    const loreIdx = Math.min(Math.max(0, idx < 0 ? 0 : idx), PLANET_LORE.length - 1);
    // Activate orbit lock — tick loop glides planet to center + shows halo/rings
    const _ol = threeRef.current.orbitLock;
    if (_ol) {
      // If a previous planet is still detached mid-release, force re-attach it now
      if (_ol.detached && _ol.planetIdx >= 0) {
        const _prevOrb = threeRef.current.orbs?.[_ol.planetIdx];
        if (_prevOrb) {
          try {
            const { scene: _sc, floatGroup: _fg } = threeRef.current;
            if (_sc && _fg) {
              _sc.remove(_prevOrb);
              _fg.updateMatrixWorld(true);
              _prevOrb.position.copy(_fg.worldToLocal(_prevOrb.position.clone()));
              _fg.add(_prevOrb);
            }
            _prevOrb.scale.setScalar(1);
          } catch (_e) { /* safe */ }
        }
      }
      _ol.active = true; _ol.planetIdx = orbIdx; _ol.prog = 0; _ol.detached = false; _ol.zoomMult = 1.0;
    }
    try { threeRef.current.lenis?.stop?.(); lenisStoppedRef.current = true; } catch (_e) {}
    setDetail({ kind: 'project', item: p, planetIdx: loreIdx });
  }, []);

  const openExperience = useCallback((e) => {
    const idx = EXPERIENCE.findIndex((exp) => exp.id === e.id);
    const orbOffset = 4 + (idx < 0 ? 0 : idx);
    const orbIdx = Math.min(orbOffset, (threeRef.current.orbs?.length ?? 1) - 1);
    const loreIdx = Math.min(orbOffset, PLANET_LORE.length - 1);
    const _ol = threeRef.current.orbitLock;
    if (_ol) {
      if (_ol.detached && _ol.planetIdx >= 0) {
        const _prevOrb = threeRef.current.orbs?.[_ol.planetIdx];
        if (_prevOrb) {
          try {
            const { scene: _sc, floatGroup: _fg } = threeRef.current;
            if (_sc && _fg) {
              _sc.remove(_prevOrb);
              _fg.updateMatrixWorld(true);
              _prevOrb.position.copy(_fg.worldToLocal(_prevOrb.position.clone()));
              _fg.add(_prevOrb);
            }
            _prevOrb.scale.setScalar(1);
          } catch (_e) { /* safe */ }
        }
      }
      _ol.active = true; _ol.planetIdx = orbIdx; _ol.prog = 0; _ol.detached = false; _ol.zoomMult = 4.0;
    }
    try { threeRef.current.lenis?.stop?.(); lenisStoppedRef.current = true; } catch (_e) {}
    setDetail({ kind: 'experience', item: e, planetIdx: loreIdx });
  }, []);

  // Called immediately on back click — releases the 3D orbit lock so the planet
  // starts returning to orbit at the same moment the overlay begins fading out.
  const releaseOrbitLock = useCallback(() => {
    const _ol = threeRef.current.orbitLock;
    if (_ol) { _ol.active = false; }
  }, []);

  // Called after the detailOut animation finishes (~480ms later) — unmounts the
  // overlay and restores scroll so everything lands cleanly together.
  const dismissDetail = useCallback(() => {
    try { threeRef.current.lenis?.start?.(); lenisStoppedRef.current = false; } catch (_e) {}
    const _poll = () => {
      const _prog = threeRef.current.orbitLock?.prog ?? 0;
      if (_prog <= 0) {
        setSectionsRevealing(true);
        setDetail(null);
        _dismissTmoRef.current = setTimeout(() => setSectionsRevealing(false), 480);
      } else {
        _dismissRafRef.current = requestAnimationFrame(_poll);
      }
    };
    _dismissRafRef.current = requestAnimationFrame(_poll);
  }, []);

  return (
    <>
      <GlobalStyle />
      <LoadingScreen progress={progress} done={ready} />
      <CustomCursor mode={cursorMode} color={cursorColor} />

      {/* Fixed Three canvas */}
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}} />
      {/* Planet/sun name labels — positioned imperatively each tick */}
      <div ref={labelsRef} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:3,overflow:'hidden'}} />

      {/* Content layer — sits above the canvas and the page-level scrim */}
      {/* Top-edge scrim — masks content sliding behind the fixed nav */}
      <div className="nav-top-scrim" aria-hidden="true" />
      <main style={{position:'relative',zIndex:2}}>
        <NavPill onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} activeId={activeId} hide={Boolean(detail)} />
        {/* Keep sections mounted — toggling display avoids unmount/remount burst on each warp */}
        <div
          ref={sectionsWrapRef}
          className={sectionsRevealing ? 'sections-revealing' : ''}
          style={{
            opacity: detail ? 0 : (sectionsRevealing ? undefined : 1),
            pointerEvents: detail ? 'none' : 'auto',
          }}
        >
          <Hero onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} reducedMotion={reducedMotion}/>
          <About />
          <Projects onHoverCard={hoverCard} onUnhover={unhover} onHoverBtn={hoverBtn} onOpenProject={openProject}/>
          <Skills />
          <Experience onOpenExperience={openExperience} onHoverBtn={hoverBtn} onUnhover={unhover} />
          <Terminal onViewSource={() => setShowSourceViewer(true)} />
          <Contact onHoverBtn={hoverBtn} onUnhover={unhover} />
          <Footer />
        </div>
      </main>

      <DetailPage
        open={Boolean(detail)}
        kind={detail?.kind}
        item={detail?.item}
        planet={detail?.planetIdx != null ? PLANET_LORE[detail.planetIdx] : null}
        onBack={releaseOrbitLock}
        onDismiss={dismissDetail}
        onHoverBtn={hoverBtn}
        onUnhover={unhover}
      />

      <ChatWidget onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} />

      {/* E9 — Dirty lens smudge overlay */}
      {lensTexture && (
        <div style={{
          position:'fixed', inset:0, zIndex:4, pointerEvents:'none',
          backgroundImage:`url(${lensTexture})`, backgroundSize:'cover',
          mixBlendMode:'screen', opacity:0.6
        }} />
      )}

      {/* E13 — Keyboard shortcut help overlay */}
      {showKeyboardHelp && (
        <div style={{
          position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.82)',
          display:'flex', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)', fontFamily:'var(--font-mono)',
          color:'rgba(0,255,200,0.9)'
        }} onClick={() => setShowKeyboardHelp(false)}>
          <div style={{
            border:'1px solid rgba(0,255,200,0.25)', borderRadius:12,
            padding:'32px 48px', minWidth:360
          }}>
            <div style={{fontSize:13, marginBottom:20, opacity:0.5, letterSpacing:'0.1em'}}>KEYBOARD SHORTCUTS</div>
            {[
              ['Space', 'Pause / resume animation'],
              ['?', 'Toggle this help panel'],
              ['H', 'Jump to Hero'],
              ['A', 'Jump to About'],
              ['P', 'Jump to Projects'],
              ['S', 'Jump to Skills'],
              ['E', 'Jump to Experience'],
              ['T', 'Jump to Terminal'],
              ['K', 'Jump to Contact'],
              ['C', 'Toggle Constellation mode'],
            ].map(([key, desc]) => (
              <div key={key} style={{display:'flex', gap:24, marginBottom:10, fontSize:12}}>
                <span style={{
                  background:'rgba(0,255,200,0.12)', border:'1px solid rgba(0,255,200,0.3)',
                  borderRadius:4, padding:'2px 8px', minWidth:40, textAlign:'center'
                }}>{key}</span>
                <span style={{opacity:0.7}}>{desc}</span>
              </div>
            ))}
            <div style={{marginTop:20, opacity:0.35, fontSize:11}}>Click anywhere to close</div>
          </div>
        </div>
      )}

      {/* E6 — Offline indicator */}
      {isOffline && (
        <div style={{
          position:'fixed', bottom:16, left:16, zIndex:999,
          background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,200,0,0.4)', borderRadius:6,
          padding:'6px 12px', fontFamily:'var(--font-mono)',
          fontSize:11, color:'#ffcc00',
        }}>◌ viewing offline · cached version</div>
      )}

      {/* Ambient sound toggle */}
      <button
        type="button"
        onMouseEnter={hoverBtn}
        onMouseLeave={unhover}
        onClick={() => setSoundOn(s => !s)}
        title={soundOn ? 'Mute ambient sound' : 'Enable ambient sound'}
        style={{
          position: 'fixed', top: 20, right: 22, zIndex: 50,
          width: 42, height: 42, borderRadius: '50%',
          background: soundOn
            ? 'radial-gradient(circle at 50% 40%, rgba(167,231,243,0.18), rgba(2,4,10,0.88) 70%)'
            : 'rgba(2,4,10,0.72)',
          border: `1px solid ${soundOn ? 'rgba(167,231,243,0.5)' : 'rgba(167,231,243,0.18)'}`,
          boxShadow: soundOn ? '0 0 18px rgba(167,231,243,0.2)' : 'none',
          backdropFilter: 'blur(10px)',
          cursor: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
        aria-pressed={soundOn}
      >
        {soundOn ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 5.5h2.5L8 2.5v11L4.5 10.5H2V5.5z" fill="rgba(167,231,243,0.85)" />
            <path d="M10.5 5a4 4 0 0 1 0 6" stroke="rgba(167,231,243,0.85)" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
            <path d="M12.5 3a7 7 0 0 1 0 10" stroke="rgba(167,231,243,0.45)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 5.5h2.5L8 2.5v11L4.5 10.5H2V5.5z" fill="rgba(167,231,243,0.4)" />
            <line x1="10" y1="6" x2="14" y2="10" stroke="rgba(167,231,243,0.5)" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="14" y1="6" x2="10" y2="10" stroke="rgba(167,231,243,0.5)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* E9 — Source Viewer overlay */}
      {showSourceViewer && (
        <SourceViewer onClose={() => setShowSourceViewer(false)} onHoverBtn={hoverBtn} onUnhover={unhover} />
      )}
    </>
  );
}
