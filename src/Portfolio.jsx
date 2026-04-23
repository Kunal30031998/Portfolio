import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CDN, loadScript } from './data/content';
import { GlobalStyle } from './components/GlobalStyle';
import { CustomCursor } from './components/CustomCursor';
import { LoadingScreen } from './components/LoadingScreen';
import { NavPill } from './components/NavPill';
import { ChatWidget } from './components/ChatWidget';
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
      if (!cancelled) setReady(true);
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
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    threeRef.current.lenis = lenis;

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

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 6000);
    camera.position.set(3, 2.6, 16);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false; // space — no ground shadows

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
    scene.add(floatGroup);
    const disposables = [];
    const palette = [0x00ffff, 0xff00ff, 0x00ff88, 0xffcc00];
    const planetPalette = [0x4da6ff, 0xff6b9d, 0xffd166, 0x9d7cff, 0x64f5d4, 0xff8c42];

    // mouse NDC for parallax
    const mouseNDC = new THREE.Vector2(0, 0);
    const onMouseNDC = (e) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseNDC);

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
        varying vec3 vCol; varying float vTwk;
        uniform float uTime; uniform float uPxRatio;
        void main(){
          vCol = color; vTwk = 0.6 + 0.4*sin(uTime*2.0 + aTwinkle*1.7);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPxRatio * (300.0 / -mv.z);
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vTwk;
        uniform float uFade;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          // cross-shaped flare for bright stars
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
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5;} return v; }
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
    nebula.position.set(0, 2, -40);
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
    floatGroup.add(sun);
    const morphMesh = sun; const morphMat = sunMat;  // compatibility alias for tick loop

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
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.05; a*=0.5;} return v; }
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

    /* ---------- EARTH ----------
       Sits far in front at launch; as the user scrolls, the camera
       glides toward it and the atmosphere lights up. */
    const earthGroup = new THREE.Group();
    scene.add(earthGroup); // outside floatGroup so parallax doesn't warp it
    // Earth surface — procedural ocean + continent shader (no textures needed)
    const earthGeo = new THREE.SphereGeometry(1, 96, 96);
    // Hyper-realistic Earth shader — sun-lit terminator, procedural
    // continents/oceans, animated clouds, specular ocean glint, polar ice,
    // city lights on the night side. Mirrors the other planets' lighting
    // model (uSunPos world-space) so it's consistent with the system.
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:   { value: 0 },
        uSunPos: { value: new THREE.Vector3(0, 1.5, -4) },
        uDay:    { value: 1.0 } // kept for transition tween; shader also computes real terminator
      },
      vertexShader: `
        varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vPosL; varying vec3 vViewN;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vPosL = position;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vPosL; varying vec3 vViewN;
        uniform float uTime; uniform vec3 uSunPos; uniform float uDay;
        float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
        float vnoise(vec3 p){
          vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
          float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
          float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
          return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
        }
        float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<6;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
        void main(){
          vec3 nW = normalize(vNormalW);
          vec3 L  = normalize(uSunPos - vPosW);
          float NdotL = dot(nW, L); // allow negative for night

          // --- continent mask ---
          float land = fbm(vPosL * 1.8);
          float continent = smoothstep(0.48, 0.56, land);
          // --- terrain detail ---
          float detail = fbm(vPosL * 6.0);
          // --- ocean (varied blue) ---
          float shelf = smoothstep(0.42, 0.52, land); // shallow coastal
          vec3 deepOcean = vec3(0.01, 0.06, 0.22);
          vec3 midOcean  = vec3(0.02, 0.22, 0.45);
          vec3 shallow   = vec3(0.10, 0.50, 0.68);
          vec3 ocean = mix(deepOcean, midOcean, 0.5 + 0.5*fbm(vPosL*3.0));
          ocean = mix(ocean, shallow, shelf * (1.0 - continent));
          // --- land palette: desert / forest / mountain ---
          float biome = fbm(vPosL * 2.6 + 12.3);
          vec3 forest = vec3(0.08, 0.28, 0.12);
          vec3 grass  = vec3(0.22, 0.45, 0.18);
          vec3 desert = vec3(0.72, 0.58, 0.32);
          vec3 rock   = vec3(0.45, 0.38, 0.30);
          vec3 land3 = mix(forest, grass, smoothstep(0.35, 0.60, biome));
          land3 = mix(land3, desert, smoothstep(0.62, 0.82, biome));
          // mountain shading via detail noise on high-elevation areas
          float elev = smoothstep(0.55, 0.80, land + detail * 0.15);
          land3 = mix(land3, rock, elev * 0.55);
          // polar ice caps (latitude-based)
          float lat = normalize(vPosL).y;
          float polar = smoothstep(0.72, 0.92, abs(lat));
          vec3 ice = vec3(0.95, 0.96, 1.0);
          vec3 surface = mix(ocean, land3, continent);
          surface = mix(surface, ice, polar * 0.88);

          // --- clouds: two scrolling FBM layers ---
          float c1 = fbm(vPosL * 2.4 + vec3(uTime * 0.015, 0.0, 0.0));
          float c2 = fbm(vPosL * 5.5 - vec3(uTime * 0.025, 0.0, 0.0));
          float clouds = smoothstep(0.55, 0.85, c1) * 0.8 + smoothstep(0.6, 0.9, c2) * 0.4;

          // --- lighting ---
          float dayLit = clamp(NdotL, 0.0, 1.0);
          // soft twilight band around the terminator
          float twilight = smoothstep(-0.25, 0.15, NdotL) * (1.0 - smoothstep(0.1, 0.35, NdotL));
          // base day surface
          vec3 dayCol = surface * (0.08 + dayLit * 1.1);
          // cloud shading (bright on lit side, dim on night)
          dayCol = mix(dayCol, vec3(1.0) * (0.1 + dayLit * 1.1), clouds);
          // ocean specular glint — only where water is, narrow highlight
          vec3 V = normalize(cameraPosition - vPosW);
          vec3 H = normalize(L + V);
          float spec = pow(clamp(dot(nW, H), 0.0, 1.0), 90.0) * (1.0 - continent) * step(0.0, NdotL);
          dayCol += vec3(1.0, 0.95, 0.85) * spec * 0.9;
          // twilight rim (warm orange at terminator on atmosphere)
          dayCol += vec3(1.0, 0.55, 0.30) * twilight * 0.35 * (1.0 - clouds);

          // --- night side ---
          float nightSide = clamp(-NdotL, 0.0, 1.0);
          // city lights on high-continent areas
          float cityMask = smoothstep(0.70, 0.90, land + detail * 0.1);
          // cluster cities near mid-latitudes
          cityMask *= (1.0 - smoothstep(0.55, 0.85, abs(lat)));
          // flicker texture
          float flicker = fbm(vPosL * 60.0) * 0.3 + 0.7;
          vec3 cityGlow = vec3(1.0, 0.82, 0.45) * cityMask * flicker * 1.3;
          vec3 nightCol = surface * 0.04 + vec3(0.01, 0.02, 0.05);
          nightCol += cityGlow * nightSide;
          // Dim clouds slightly on night side
          nightCol = mix(nightCol, vec3(0.05, 0.06, 0.08), clouds * 0.5);

          // --- blend day & night across terminator ---
          // uDay biases the blend so the dive sequence always shows the lit
          // hemisphere (no dark side facing the camera on approach).
          float blend = smoothstep(-0.05, 0.15, NdotL);
          blend = mix(blend, 1.0, clamp(uDay, 0.0, 1.0));
          vec3 col = mix(nightCol, dayCol, blend);

          // --- atmospheric limb scattering (fresnel) ---
          float fres = pow(1.0 - clamp(dot(vViewN, vec3(0.0,0.0,1.0)), 0.0, 1.0), 3.5);
          col += vec3(0.35, 0.55, 0.95) * fres * 0.55;

          // Legacy uDay override still modestly brightens the whole globe
          // when the dive sequence wants a "daylight glow" pass
          col = mix(col, col * 1.25, uDay * 0.15);

          gl_FragColor = vec4(col, 1.0);
        }`
    });
    // Earth is treated like a planet in the solar system:
    //   - orbits at radius 6 (between the other planets)
    //   - same camera-facing orbit plane so it stays in view
    //   - tilted spin axis (23.5°) parented through earthAxis group so the
    //     tilt stays rigid while the sphere spins on its own Y.
    // earthPivot handles orbital position (translated inside tick loop),
    // earthAxis handles axial tilt, earth spins inside earthAxis.
    const earthPivot = new THREE.Group();
    earthGroup.add(earthPivot);
    const earthAxis = new THREE.Group();
    earthAxis.rotation.z = 0.41; // 23.5° axial tilt
    earthPivot.add(earthAxis);
    const earth = new THREE.Mesh(earthGeo, earthMat);
    // Planet-size by default (comparable to other planets: 0.18–0.53)
    earth.scale.setScalar(0.55);
    earthAxis.add(earth);

    // Earth's orbit ring (same ellipse as other planets)
    const earthOrbitR = 6;
    const eOrbitSegs = 128;
    const eOrbitPts = new Float32Array((eOrbitSegs + 1) * 3);
    for (let s = 0; s <= eOrbitSegs; s++) {
      const a = (s / eOrbitSegs) * Math.PI * 2;
      eOrbitPts[s*3]   = Math.cos(a) * earthOrbitR;
      eOrbitPts[s*3+1] = Math.sin(a) * earthOrbitR * 0.45;
      eOrbitPts[s*3+2] = Math.sin(a) * earthOrbitR * 0.15;
    }
    const eRingGeo = new THREE.BufferGeometry();
    eRingGeo.setAttribute('position', new THREE.BufferAttribute(eOrbitPts, 3));
    const eRingMat = new THREE.LineBasicMaterial({ color: 0x6fb0ff, transparent: true, opacity: 0.28 });
    const earthOrbitLine = new THREE.LineLoop(eRingGeo, eRingMat);
    earthOrbitLine.position.copy(sun.position); // sun at (0,1.5,-4)
    earthGroup.add(earthOrbitLine);
    disposables.push({ geo: eRingGeo, mat: eRingMat });
    // Atmosphere — sun-aware rim glow (Rayleigh-style scattering approximation).
    // Back-side sphere slightly larger than the planet. Rim concentrates
    // brightness on the sunlit limb and fades across the terminator.
    const atmoGeo = new THREE.SphereGeometry(1.08, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uIntensity: { value: 0.4 },
        uSunPos:    { value: new THREE.Vector3(0, 1.5, -4) },
      },
      vertexShader: `
        varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vViewN;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          vViewN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vViewN;
        uniform float uIntensity; uniform vec3 uSunPos;
        void main(){
          float rim = pow(1.0 - clamp(dot(vViewN, vec3(0.0,0.0,1.0)), 0.0, 1.0), 2.5);
          vec3 L = normalize(uSunPos - vPosW);
          float sunFace = clamp(dot(normalize(vNormalW), L), 0.0, 1.0);
          // blue scatter on lit side, warm horizon glow right at terminator
          vec3 cool = vec3(0.30, 0.55, 1.0);
          vec3 warm = vec3(1.0, 0.55, 0.30);
          float dawn = smoothstep(0.0, 0.4, sunFace) * smoothstep(0.7, 0.1, sunFace);
          vec3 col = mix(cool, warm, dawn * 0.7);
          float a = rim * (0.35 + sunFace * 0.9) * uIntensity * 1.6;
          gl_FragColor = vec4(col, a);
        }`
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    atmo.scale.setScalar(1.18); // relative to earth parent
    earth.add(atmo);
    disposables.push({geo: earthGeo, mat: earthMat}, {geo: atmoGeo, mat: atmoMat});

    /* ---------- CLOUD STREAKS ----------
       Wispy billboard planes that only appear in the last third of
       scroll, streaking past the camera to sell the "entering Earth's
       atmosphere" moment. */
    const cloudCount = isMobile ? 6 : 14;
    const cloudGeo = new THREE.PlaneGeometry(6, 2.5);
    const cloudMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: { uFade: { value: 0 }, uTint: { value: new THREE.Color(1,1,1) }, uThick: { value: 0.5 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uFade; uniform vec3 uTint; uniform float uThick;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p);
          float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
          vec2 u=f*f*(3.0-2.0*f);
          return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }
        float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.0; a*=0.5;} return v; }
        void main(){
          vec2 p = vUv*vec2(2.0,1.0);
          float n = fbm(p*3.0);
          // soft ellipse mask
          vec2 d = vUv - 0.5;
          float m = smoothstep(0.5, 0.1, length(d*vec2(1.0,2.0)));
          // uThick controls how dense the cloud reads: low = wispy cirrus, high = chunky cumulus
          float thr = mix(0.45, 0.25, uThick);
          float a = smoothstep(thr, thr + 0.45, n) * m * uFade;
          vec3 col = mix(vec3(1.0), uTint, n);
          gl_FragColor = vec4(col, a * mix(0.6, 0.95, uThick));
        }`
    });
    const clouds = [];
    for (let i = 0; i < cloudCount; i++) {
      // Stratify: first ~40% are high-altitude cirrus (thin, fast, blue-white,
      // appear earlier as we enter mesosphere); rest are low cumulus (thick,
      // slower, warmer-tinted, appear deeper in the descent).
      const isCirrus = i < Math.floor(cloudCount * 0.4);
      const c = new THREE.Mesh(cloudGeo, cloudMat.clone());
      const tint = isCirrus
        ? new THREE.Color(0.88, 0.92, 1.0)
        : new THREE.Color(1.0, 0.94, 0.88);
      c.material.uniforms = {
        uFade: { value: 0 },
        uTint: { value: tint },
        uThick: { value: isCirrus ? 0.15 : 0.85 }
      };
      c.userData = {
        stratum: isCirrus ? 'cirrus' : 'cumulus',
        base: new THREE.Vector3(
          (Math.random() - 0.5) * (isCirrus ? 30 : 22),
          isCirrus ? 3 + Math.random() * 5 : -2 + Math.random() * 4,
          -Math.random() * 30 - 2
        ),
        speed: isCirrus ? 10 + Math.random() * 8 : 4 + Math.random() * 6,
        offset: Math.random() * 30,
        scale: isCirrus ? 1.8 + Math.random() * 1.5 : 1.2 + Math.random() * 1.8,
        fadeIn: isCirrus ? 0.50 : 0.66,
        fadeInSpan: isCirrus ? 0.18 : 0.14,
        fadeOut: isCirrus ? 0.88 : 0.92,
        fadeOutSpan: 0.04
      };
      c.position.copy(c.userData.base);
      c.scale.setScalar(c.userData.scale);
      scene.add(c);
      clouds.push(c);
      disposables.push({geo: null, mat: c.material});
    }
    disposables.push({geo: cloudGeo, mat: cloudMat});

    /* ---------- RE-ENTRY PLASMA / HEAT GLOW ----------
       Camera-attached fullscreen additive plane. Shader draws animated
       orange-hot turbulent streaks that rush past during atmospheric
       entry (p 0.78-0.90). Sells the heat-shield re-entry feel. */
    const plasmaGeo = new THREE.PlaneGeometry(2, 2);
    const plasmaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform float uFade;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
          return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
        float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.07; a*=0.5;} return v; }
        void main(){
          vec2 uv = vUv * 2.0 - 1.0;          // -1..1
          float d = length(uv);                // distance from center
          // Radial streak pattern: FBM in polar coords, motion along radius
          float ang = atan(uv.y, uv.x);
          vec2 polar = vec2(ang * 1.2, d * 3.5 - uTime * 2.2);
          float streaks = fbm(polar * 2.0);
          streaks += fbm(polar * 5.0 + uTime * 0.8) * 0.5;
          // Heat only at the EDGES of the frame (like looking through a
          // canopy during re-entry) — center stays clear so Earth is visible.
          float edge = smoothstep(0.55, 1.1, d);
          // Warm peripheral glow: amber at mid-edge, fading to deep red at corners
          vec3 col = mix(vec3(1.0, 0.55, 0.18), vec3(0.7, 0.18, 0.05), smoothstep(0.7, 1.1, d));
          col = mix(col, vec3(1.0, 0.85, 0.55), streaks * 0.4);
          float a = edge * (0.35 + streaks * 0.25) * uFade;
          gl_FragColor = vec4(col, a * 0.55);
        }`
    });
    const plasma = new THREE.Mesh(plasmaGeo, plasmaMat);
    plasma.frustumCulled = false;
    plasma.renderOrder = 999;
    plasma.visible = false;
    camera.add(plasma);
    scene.add(camera); // camera must be in scene for its children to render
    plasma.position.set(0, 0, -1);
    disposables.push({ geo: plasmaGeo, mat: plasmaMat });

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
      const COUNT = type === 'spiral' ? 3500
                  : type === 'elliptical' ? 2200
                  : 2600;
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
      disposables.push({ geo: null, mat: bhMat });
    }
    disposables.push({ geo: null, mat: null, tex: bhTex });


    // Real solar-system planets (Earth handled separately at radius 6).
    // Sizes are scaled for visibility, not to astronomical accuracy.
    //   Mercury (r=2.2) → Venus (4) → [Earth=6] → Mars (8.5)
    //   → Jupiter (12) → Saturn (15) → Uranus (17.5) → Neptune (20)
    const SOLAR_PLANETS = [
      { name: 'mercury', radius: 2.2,  size: 0.14, color: 0x9a8f7d, emissive: 0x2a2218, speed: 0.40, style: 'rocky' },
      { name: 'venus',   radius: 4.0,  size: 0.22, color: 0xe8c28a, emissive: 0x3a2a12, speed: 0.30, style: 'cloudy' },
      { name: 'mars',    radius: 8.5,  size: 0.18, color: 0xc86b3c, emissive: 0x3a1a0a, speed: 0.20, style: 'mars' },
      { name: 'jupiter', radius: 12.0, size: 0.55, color: 0xd9b58f, emissive: 0x332418, speed: 0.14, style: 'bands', hasMoon: true },
      { name: 'saturn',  radius: 15.0, size: 0.45, color: 0xe6c888, emissive: 0x332a18, speed: 0.10, style: 'bands', hasRing: true },
      { name: 'uranus',  radius: 17.5, size: 0.30, color: 0x9adbe6, emissive: 0x1a3038, speed: 0.08, style: 'ice' },
      { name: 'neptune', radius: 20.0, size: 0.30, color: 0x4a7fd9, emissive: 0x101f3a, speed: 0.06, style: 'ice' },
    ];

    // Procedural planet material factory — one shader, different parameters.
    // Lit by the sun (world-space position) with proper day/night terminator,
    // fresnel rim glow (stronger for gas giants), procedural surface detail.
    const makePlanetMaterial = (cfg) => {
      const color = new THREE.Color(cfg.color);
      const accent = new THREE.Color(cfg.color).multiplyScalar(0.55);
      const highlight = new THREE.Color(cfg.color).lerp(new THREE.Color(0xffffff), 0.45);
      const styleIdx = { rocky: 0, cloudy: 1, mars: 2, bands: 3, ice: 4 }[cfg.style] ?? 0;
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime:     { value: 0 },
          uSunPos:   { value: new THREE.Vector3(0, 1.5, -4) },
          uColor:    { value: color },
          uAccent:   { value: accent },
          uHighlight:{ value: highlight },
          uRimStrength: { value: cfg.style === 'bands' || cfg.style === 'ice' ? 1.1 : 0.45 },
          uStyle:    { value: styleIdx }
        },
        vertexShader: `
          varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vPosL; varying vec3 vViewN;
          void main(){
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vPosW = wp.xyz;
            vPosL = position;
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }`,
        fragmentShader: `
          varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vPosL; varying vec3 vViewN;
          uniform float uTime; uniform vec3 uSunPos; uniform vec3 uColor; uniform vec3 uAccent; uniform vec3 uHighlight;
          uniform float uRimStrength; uniform int uStyle;
          float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
          float vnoise(vec3 p){
            vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
            float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
            float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
            return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
          }
          float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
          void main(){
            vec3 n = normalize(vNormalW);
            vec3 L = normalize(uSunPos - vPosW);
            float NdotL = clamp(dot(n, L), 0.0, 1.0);
            // Procedural surface per style
            vec3 base = uColor;
            if (uStyle == 0) {
              // rocky — cratered, dusty (Mercury)
              float n1 = fbm(vPosL * 6.0);
              float n2 = fbm(vPosL * 18.0);
              float craters = smoothstep(0.45, 0.55, n2) * smoothstep(0.65, 0.45, n1);
              base = mix(uAccent, uColor, n1);
              base = mix(base, uAccent*0.7, craters);
            } else if (uStyle == 1) {
              // cloudy — smooth turbulent swirls (Venus)
              float swirl = fbm(vPosL * 2.5 + vec3(uTime*0.05, 0.0, 0.0));
              swirl += 0.5 * fbm(vPosL * 7.0 - vec3(uTime*0.08, 0.0, 0.0));
              base = mix(uAccent, uHighlight, smoothstep(0.35, 0.75, swirl));
            } else if (uStyle == 2) {
              // mars — rusty with polar ice caps + canyons
              float surface = fbm(vPosL * 3.5);
              float detail  = fbm(vPosL * 9.0);
              base = mix(uAccent, uColor, surface);
              base = mix(base, uColor*1.3, smoothstep(0.55, 0.75, detail));
              float polar = smoothstep(0.80, 0.95, abs(normalize(vPosL).y));
              base = mix(base, vec3(0.92, 0.92, 0.95), polar * 0.85);
            } else if (uStyle == 3) {
              // bands — horizontal striping (Jupiter / Saturn) with turbulence
              vec3 sp = normalize(vPosL);
              float lat = sp.y; // -1..1
              float bands = sin(lat * 18.0 + fbm(vPosL*4.0)*2.0);
              float turb = fbm(vPosL*6.0 + vec3(uTime*0.04, 0.0, 0.0));
              base = mix(uAccent, uColor, 0.5 + 0.5*bands);
              base = mix(base, uHighlight, smoothstep(0.55, 0.9, turb) * 0.35);
              // Great Red Spot-like feature on Jupiter
              float spot = smoothstep(0.15, 0.02, distance(sp, normalize(vec3(0.85, -0.15, 0.4))));
              base = mix(base, vec3(0.75, 0.25, 0.12), spot * 0.85);
            } else {
              // ice giant — smooth tinted with subtle flow (Uranus / Neptune)
              float flow = fbm(vPosL * 2.2 + vec3(uTime*0.03, 0.0, 0.0));
              base = mix(uAccent, uColor, smoothstep(0.3, 0.8, flow));
              base = mix(base, uHighlight, smoothstep(0.65, 0.9, flow) * 0.4);
            }
            // Lighting: lambert + tiny ambient + dark night side
            vec3 lit = base * (0.08 + NdotL * 1.1);
            // Fresnel rim glow (stronger on atmospheric bodies)
            float fres = pow(1.0 - clamp(dot(vViewN, vec3(0.0,0.0,1.0)), 0.0, 1.0), 3.0);
            lit += fres * uHighlight * uRimStrength;
            gl_FragColor = vec4(lit, 1.0);
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
      const geo = new THREE.SphereGeometry(size, 48, 48);
      const mat = makePlanetMaterial(P);
      const planet = new THREE.Mesh(geo, mat);
      const radius = P.radius;
      planet.userData = {
        name: P.name,
        radius,
        speed: P.speed,
        phase: (i / planetCount) * Math.PI * 2, // spread them out at start
        yBase: 1.5,
        yAmp: 0.15,
        tilt: (Math.random() - 0.5) * 0.2,
        spin: 0.01 + Math.random() * 0.02
      };
      floatGroup.add(planet);
      orbs.push(planet);
      disposables.push({geo, mat});

      // orbit ring (thin line)
      const segs = 128;
      const orbitPts = new Float32Array((segs + 1) * 3);
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        // Camera-facing ellipse (matches planet motion plane): mostly X/Y with tiny Z sway
        orbitPts[s*3]   = Math.cos(a) * radius;
        orbitPts[s*3+1] = Math.sin(a) * radius * 0.45;
        orbitPts[s*3+2] = Math.sin(a) * radius * 0.15;
      }
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute('position', new THREE.BufferAttribute(orbitPts, 3));
      const ringMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 });
      const orbitLine = new THREE.LineLoop(ringGeo, ringMat);
      orbitLine.position.copy(sun.position);
      // orbit plane already built camera-facing; small random roll for variety
      orbitLine.rotation.z = planet.userData.tilt * 0.5;
      floatGroup.add(orbitLine);
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
      // Moon on Jupiter (placeholder for galilean moons)
      if (P.hasMoon) {
        const mGeo = new THREE.SphereGeometry(size * 0.28, 12, 12);
        const mMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.1, roughness: 0.9, emissive: 0x222233, emissiveIntensity: 0.3 });
        const moon = new THREE.Mesh(mGeo, mMat);
        moon.position.set(size * 1.8, 0, 0);
        planet.add(moon);
        planet.userData.moon = moon;
        disposables.push({geo: mGeo, mat: mMat});
      }
    }

    /* ---------- 5. ASTEROID BELT (hyper-real: C/S/M types, irregular shapes) ----------
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
      swarmMeshes.push({ mesh, count, startIdx: cubeData.length });
      disposables.push({ geo, mat: t.mat });

      // Per-instance orbit + tumble parameters
      for (let i = 0; i < count; i++) {
        const ringR = 10.2 + (Math.random() - 0.5) * 1.4;
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

    /* ---------- 6. COMET LIGHT-TRAILS (bright coma + ion tail, faded along length) ---------- */
    const ribbons = [];
    const ribbonCount = isMobile ? 1 : 2;
    const cometShader = {
      uniforms: { uTime: { value: 0 }, uColorHead: { value: new THREE.Color(0xffffff) }, uColorTail: { value: new THREE.Color(0x6fc4ff) } },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uColorHead;
        uniform vec3 uColorTail;
        void main(){
          // vUv.x runs 0 (head) -> 1 (tail end). Bright white coma at head,
          // fading through cyan ion tail to transparent.
          float head = smoothstep(0.0, 0.08, vUv.x);
          float tail = 1.0 - smoothstep(0.1, 1.0, vUv.x);
          vec3 col = mix(uColorHead, uColorTail, smoothstep(0.02, 0.45, vUv.x));
          // tube radial falloff along v
          float radial = 1.0 - abs(vUv.y - 0.5) * 2.0;
          float alpha = tail * (0.25 + 0.75 * head) * smoothstep(0.0, 1.0, radial);
          // gentle flicker on the head
          alpha *= 0.85 + 0.15 * sin(uTime * 4.0);
          gl_FragColor = vec4(col, alpha);
        }`
    };
    for (let r = 0; r < ribbonCount; r++) {
      const pts = [];
      const n = 18;
      for (let i = 0; i < n; i++) {
        pts.push(new THREE.Vector3(
          (i / (n - 1) - 0.5) * 22,
          Math.sin(i * 0.6 + r) * 2 + 3,
          -5 - r * 3 + Math.cos(i * 0.4) * 3
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
      const geo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorHead: { value: new THREE.Color(0xffffff) },
          uColorTail: { value: r === 0 ? new THREE.Color(0x6fc4ff) : new THREE.Color(0xff9fd8) }
        },
        vertexShader: cometShader.vertexShader,
        fragmentShader: cometShader.fragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const tube = new THREE.Mesh(geo, mat);
      tube.userData = { basePts: pts.map(p => p.clone()), curve, speed: 0.25 + r * 0.15, phase: r * 1.3, mat };
      floatGroup.add(tube);
      ribbons.push(tube);
      disposables.push({geo, mat});
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
    const dustPos = new Float32Array(dustCount * 3);
    const dustBase = new Float32Array(dustCount * 3);
    const dustColor = new Float32Array(dustCount * 3);
    const tmpCol = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 12 + 2;
      const z = (Math.random() - 0.5) * 20 - 4;
      dustPos[i*3] = x; dustPos[i*3+1] = y; dustPos[i*3+2] = z;
      dustBase[i*3] = x; dustBase[i*3+1] = y; dustBase[i*3+2] = z;
      const roll = Math.random();
      if (roll < 0.6) tmpCol.setHex(0xbfd6ff);
      else if (roll < 0.85) tmpCol.setHex(0xffd59a);
      else tmpCol.setHex(0xff9fd8);
      dustColor[i*3] = tmpCol.r; dustColor[i*3+1] = tmpCol.g; dustColor[i*3+2] = tmpCol.b;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColor, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.035, vertexColors: true, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    disposables.push({geo: dustGeo, mat: dustMat});

    // legacy placeholders so older cleanup code stays valid
    const floaters = [];
    const knots = [];
    const floorGeo = new THREE.BufferGeometry(); // sentinel, disposed harmlessly
    const floorMat = { dispose(){}, uniforms: { uTime: { value: 0 } } }; // shim
    const walls = [];
    const wallMat = { dispose(){} };

    /* Tube cursor trail */
    const tubes = [];
    const mousePath = [];
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const tubeColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xffcc00];

    const screenToWorld = (clientX, clientY) => {
      ndc.x = (clientX / window.innerWidth) * 2 - 1;
      ndc.y = -(clientY / window.innerHeight) * 2 + 1;
      const vec = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      return camera.position.clone().add(dir.multiplyScalar(Math.min(dist, 10)));
    };

    const spawnTube = (x, y) => {
      if (isMobile && !('ontouchstart' in window)) return;
      const p = screenToWorld(x, y);
      mousePath.push(p);
      if (mousePath.length > 20) mousePath.shift();
      if (mousePath.length < 4) return;
      const curve = new THREE.CatmullRomCurve3(mousePath.slice(-8));
      const geo = new THREE.TubeGeometry(curve, 24, 0.015, 8, false);
      const color = tubeColors[Math.floor(Math.random() * tubeColors.length)];
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
      const tube = new THREE.Mesh(geo, mat);
      scene.add(tube);
      tubes.push({ mesh: tube, born: performance.now() });
      setCursorColor('#' + color.toString(16).padStart(6, '0'));
      gsap.to(mat, { opacity: 0, duration: 1.5, ease: 'power2.out', onComplete: () => {
        scene.remove(tube); geo.dispose(); mat.dispose();
      }});
      if (tubes.length > 120) { // safety cap
        const old = tubes.shift(); scene.remove(old.mesh); old.mesh.geometry.dispose(); old.mesh.material.dispose();
      }
    };

    const onMouseMove = (e) => spawnTube(e.clientX, e.clientY);
    const onTouchMove = (e) => { if (e.touches[0]) spawnTube(e.touches[0].clientX, e.touches[0].clientY); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    /* Camera scroll chapters — one progress value drives a smooth lerp
       along waypoints inside the RAF loop. This avoids 7 competing
       ScrollTrigger tweens writing to camera.position every frame,
       which caused visible jank on the floaters during scroll. */
    // Camera chapters: zoom OUT through scroll. Start close to the solar
    // system (hero) and gradually pull back to reveal galaxies — spirals,
    // ellipticals, irregulars — each with a bright SMBH-like core.
    const chapters = [
      { pos: new THREE.Vector3(3, 2.6, 16),   look: new THREE.Vector3(-2, 1.0, -4) },  // hero: solar system framed, room to breathe
      { pos: new THREE.Vector3(3.5, 2.8, 28), look: new THREE.Vector3(-2, 1.0, -4) },  // about: first pull-back
      { pos: new THREE.Vector3(2.5, 2.6, 100),look: new THREE.Vector3(0, 0.5, -8) },   // projects: first galaxies drift in
      { pos: new THREE.Vector3(0, 2.0, 220),  look: new THREE.Vector3(0, 0, -20) },    // skills: solar system is tiny, near galaxies visible
      { pos: new THREE.Vector3(0, 0, 520),    look: new THREE.Vector3(0, 0, -60) },    // experience: galactic neighborhood
      { pos: new THREE.Vector3(0, 0, 1200),   look: new THREE.Vector3(0, 0, -200) },   // terminal: deep field, many galaxies
      { pos: new THREE.Vector3(0, 0, 2400),   look: new THREE.Vector3(0, 0, -500) }    // contact: cosmic web
    ];
    const desiredPos = new THREE.Vector3().copy(chapters[0].pos);
    const desiredLook = new THREE.Vector3().copy(chapters[0].look);
    const currentLook = new THREE.Vector3().copy(chapters[0].look);
    const scrollProg = { value: 0 }; // 0 = deep space (top), 1 = daylight at Earth (bottom)
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const smooth = (x) => x * x * (3 - 2 * x); // smoothstep

    const updateDesiredFromScroll = () => {
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

    /* Animate */
    const clock = new THREE.Clock();
    let raf;
    let frameCount = 0;
    let lastDiveState = '0';
    const parallax = { x: 0, y: 0 };
    let nextShootingStarAt = performance.now() + 1500;
    const tick = () => {
      const t = clock.getElapsedTime();
      const now = performance.now();

      // ---------- SKY ----------
      // Deep space throughout. Stars and nebula are the cosmic backdrop.
      const p = scrollProg.value;
      scene.background.copy(skyDeep);
      starMat.uniforms.uFade.value = 1;
      nebulaMat.uniforms.uFade.value = 1;
      dustMat.opacity = 0.6;
      ambient.intensity = 0.5;
      ambient.color.setRGB(0.10, 0.10, 0.22);
      sunLight.color.setRGB(1.0, 0.80, 0.40);

      // Hide section content only during the brief "inside atmosphere" window.
      // Keep experience/terminal visible longer on either side of the dive
      // so users can actually read them before and after the plunge.
      // Content always visible — no atmospheric dive to hide it.
      const contentFade = 1;
      document.documentElement.style.setProperty('--content-fade', contentFade.toFixed(3));
      const diveState = contentFade < 0.05 ? '1' : '0';
      if (diveState !== lastDiveState) {
        lastDiveState = diveState;
        document.querySelectorAll('.fade-during-dive').forEach((el) => {
          el.setAttribute('data-dive', diveState);
        });
      }

      // Earth — a planet in the system. During the first 55% of scroll it
      // orbits the sun like other planets (same camera-facing plane so it
      // stays in view). After that, earthPivot lerps from its current orbital
      // offset to a "dive" position in front of the camera while earth scales
      // up to fill the view.
      const sunPos = sun.position;
      const orbitR = earthOrbitR;       // 6 — matches the visible orbit line
      const orbitSpeed = 0.25;
      const earthSpinAmt = t * 0.5;     // own-axis rotation (visible spin)
      const angle = t * orbitSpeed;
      // Orbital offset from the sun (relative to earthPivot's parent earthGroup)
      const orbX = sunPos.x + Math.cos(angle) * orbitR;
      const orbY = sunPos.y + Math.sin(angle) * orbitR * 0.45;
      const orbZ = sunPos.z + Math.sin(angle) * orbitR * 0.15;

      // Earth stays in pure orbit throughout — no dive sequence.
      let pivX = orbX, pivY = orbY, pivZ = orbZ, earthScale = 0.55;
      earthPivot.position.set(pivX, pivY, pivZ);
      earth.scale.setScalar(earthScale);
      // Fade Earth out at the very end so the beach reveal isn't blocked
      const earthVisFade = 1 - smooth(Math.max(0, (p - 0.80) / 0.08));
      // Feed sun world-pos into Earth shader (natural lighting, no virtual-sun override).
      {
        const _sw = new THREE.Vector3();
        sun.getWorldPosition(_sw);
        earthMat.uniforms.uSunPos.value.copy(_sw);
        atmoMat.uniforms.uSunPos.value.copy(_sw);
      }
      earthMat.uniforms.uDay.value = 0.6;
      atmoMat.uniforms.uIntensity.value = (0.25 + p * 1.1) * earthVisFade;
      earth.visible = earthVisFade > 0.02;
      // Hide orbit line during the dive (it'd look weird huge)
      earthOrbitLine.visible = p < 0.6;
      earthOrbitLine.material.opacity = 0.28 * Math.max(0, 1 - p / 0.6);
      // Own-axis spin (tilt handled by parent earthAxis group)
      earth.rotation.y = earthSpinAmt;

      // Sun stays visible — it's our star among many galaxies.
      const sunFade = 1;
      sunMat.uniforms.uDay = sunMat.uniforms.uDay || { value: 0 };
      sun.visible = sunFade > 0.02;
      corona.visible = sunFade > 0.02;
      sun.scale.setScalar((1 + Math.sin(t * 0.7) * 0.04) * sunFade);
      corona.material.uniforms.uFade = corona.material.uniforms.uFade || { value: 1 };

      // Planets + asteroids hide with the sun — no stray bright specks
      // visible against Earth once we're on approach.
      floatGroup.visible = sunFade > 0.02;
      floatGroup.traverse?.((o) => {
        if (o.material && o.material.opacity !== undefined && o.material !== sunMat && o.material !== coronaMat) {
          if (!o.userData.baseOpacity) o.userData.baseOpacity = o.material.opacity || 1;
          o.material.opacity = o.userData.baseOpacity * sunFade;
          o.material.transparent = true;
        }
      });

      // Galaxies — staggered reveal keyed to scroll progress. Near galaxies
      // appear first, far deep-field ones only once we've zoomed well out.
      // Global uFade eases the point-cloud alpha once any galaxy is active.
      const galaxyGlobalFade = Math.min(1, Math.max(0, (p - 0.04) / 0.14));
      galaxyMat.uniforms.uFade.value = galaxyGlobalFade;
      galaxyGroup.children.forEach((gx) => {
        const u = gx.userData;
        if (!u) return;
        if (u.spin) gx.rotation.y += u.spin * 0.01;
        // Per-galaxy fade with smooth ramp between appearAt and fullAt.
        const gf = Math.min(1, Math.max(0, (p - u.appearAt) / Math.max(0.01, u.fullAt - u.appearAt)));
        gx.visible = gf > 0.01;
        // SMBH sprite is the first child of each galaxy — fade it in lockstep.
        gx.children.forEach((ch) => {
          if (ch.isSprite && ch.material) ch.material.opacity = gf;
        });
      });

      // Space scene always visible (no more beach handoff).
      floatGroup.visible = sunFade > 0.02;
      earthGroup.visible = true;
      starField.visible = true;
      nebula.visible = true;
      if (typeof dust !== 'undefined' && dust) dust.visible = true;

      // Clouds — disabled (no atmospheric entry sequence)
      clouds.forEach((c) => { c.visible = false; });

      // Re-entry plasma disabled (no atmospheric entry sequence)
      plasma.visible = false;
      plasmaMat.uniforms.uFade.value = 0;

      // Descent camera shake — disabled
      const shakeX = 0;
      const shakeY = 0;

      // Shader uniforms
      sunMat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      nebulaMat.uniforms.uTime.value = t;
      starMat.uniforms.uTime.value = t;
      earthMat.uniforms.uTime.value = t;

      // Sun — slow spin + breathing scale
      sun.rotation.y = t * 0.12;
      const sunPulse = 1 + Math.sin(t * 0.7) * 0.04;
      sun.scale.setScalar(sunPulse);
      // Corona billboard — always face camera, slow scale breathing + fades out on daylight side
      corona.lookAt(camera.position);
      const coronaPulse = 1 + Math.sin(t * 0.9) * 0.08;
      corona.scale.setScalar(coronaPulse);
      coronaMat.uniforms.uTime.value = t;

      // Nebula — gently track behind the camera so it stays as backdrop
      nebula.lookAt(camera.position);

      // Starfield — very slow rotation for parallax of the universe
      starField.rotation.y = t * 0.005;
      starField.rotation.x = Math.sin(t * 0.01) * 0.05;

      // Planets — orbit the sun in a camera-facing plane
      // (mostly X/Y sweep with tiny Z depth sway) so they never disappear
      // behind the sun or leave the view frustum.
      const sunWorld = new THREE.Vector3();
      sun.getWorldPosition(sunWorld);
      orbs.forEach((p) => {
        const u = p.userData;
        const a = t * u.speed + u.phase;
        const cx = sun.position.x, cy = sun.position.y, cz = sun.position.z;
        p.position.x = cx + Math.cos(a) * u.radius;
        p.position.y = cy + Math.sin(a) * u.radius * (0.45 + Math.abs(Math.sin(u.tilt)) * 0.25);
        p.position.z = cz + Math.sin(a) * u.radius * 0.15; // subtle depth
        p.rotation.y += u.spin;
        // Feed sun world-pos + time into per-planet shader
        if (p.material && p.material.uniforms) {
          if (p.material.uniforms.uSunPos) p.material.uniforms.uSunPos.value.copy(sunWorld);
          if (p.material.uniforms.uTime) p.material.uniforms.uTime.value = t;
        }
        if (u.moon) {
          u.moon.position.x = Math.cos(t * 2.0) * 0.6;
          u.moon.position.y = Math.sin(t * 2.0) * 0.6;
        }
      });

      // Asteroid belt — multi-type instanced swarms, same orbital plane.
      for (let s = 0; s < swarmMeshes.length; s++) {
        const sw = swarmMeshes[s];
        for (let j = 0; j < sw.count; j++) {
          const d = cubeData[sw.startIdx + j];
          d.orbitA += d.orbitSpeed * 0.01;
          const x = sun.position.x + Math.cos(d.orbitA) * d.orbitR;
          const y = sun.position.y + Math.sin(d.orbitA) * d.orbitR * 0.45 + d.yBase + Math.sin(t * 0.6 + d.phase) * d.amp;
          const z = sun.position.z + Math.sin(d.orbitA) * d.orbitR * 0.15;
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
      }

      // Comet light-trails — regenerate curve every 3rd frame (perf).
      // uTime drives the head flicker on the shader.
      frameCount++;
      ribbons.forEach((rb) => { if (rb.userData.mat) rb.userData.mat.uniforms.uTime.value = t; });
      if (frameCount % 3 === 0) {
        ribbons.forEach((rb) => {
          const u = rb.userData;
          const pts = u.basePts;
          const shifted = pts.map((p, i) => new THREE.Vector3(
            p.x + Math.cos(t * u.speed * 0.6 + i * 0.3 + u.phase) * 0.3,
            p.y + Math.sin(t * u.speed + i * 0.6 + u.phase) * 0.8,
            p.z + Math.cos(t * u.speed * 0.8 + i * 0.4 + u.phase) * 0.8
          ));
          const curve = new THREE.CatmullRomCurve3(shifted, false, 'catmullrom', 0.5);
          const newGeo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
          rb.geometry.dispose();
          rb.geometry = newGeo;
        });
      }

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

      // Cosmic dust — slow drift, update every 2nd frame
      if (frameCount % 2 === 0) {
        const dposAttr = dustGeo.attributes.position;
        for (let i = 0; i < dustCount; i++) {
          const bx = dustBase[i*3], by = dustBase[i*3+1], bz = dustBase[i*3+2];
          dposAttr.array[i*3]   = bx + Math.sin(t * 0.15 + i * 0.3) * 0.3;
          dposAttr.array[i*3+1] = by + Math.cos(t * 0.2 + i * 0.4) * 0.3;
          dposAttr.array[i*3+2] = bz + Math.sin(t * 0.12 + i * 0.5) * 0.3;
        }
        dposAttr.needsUpdate = true;
      }

      // Mouse parallax on the solar system group — gentle lean
      parallax.x += (mouseNDC.x * 0.25 - parallax.x) * 0.04;
      parallax.y += (mouseNDC.y * 0.15 - parallax.y) * 0.04;
      floatGroup.rotation.y = parallax.x;
      floatGroup.rotation.x = -parallax.y;

      // Lights — steady with tiny pulse so brightness stays consistent
      pLight.intensity = 3.3 + Math.sin(t * 1.2) * 0.25;
      sLight.intensity = 1.6 + Math.sin(t * 0.8 + 1) * 0.15;

      // Smooth camera follow
      camera.position.lerp(desiredPos, 0.08);
      currentLook.lerp(desiredLook, 0.08);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const heroWeight = Math.max(0, 1 - (window.scrollY / max) * 6);
      camera.position.y += Math.sin(t * 0.8) * 0.08 * heroWeight;
      // Re-entry turbulence shake
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.lookAt(currentLook.x, currentLook.y, currentLook.z);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('resize', updateDesiredFromScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousemove', onMouseNDC);
      window.removeEventListener('touchmove', onTouchMove);
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
      tubes.forEach(({mesh}) => { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); });
      shootingStars.forEach(s => { scene.remove(s.line); s.geo.dispose(); s.mat.dispose(); });
      disposables.forEach(({geo, mat}) => { geo && geo.dispose && geo.dispose(); mat && mat.dispose && mat.dispose(); });
      ribbons.forEach(rb => rb.geometry && rb.geometry.dispose());
      floorGeo.dispose(); floorMat.dispose();
      walls.forEach(w => { w.geometry.dispose(); });
      wallMat.dispose();
      renderer.dispose();
    };
  }, [ready]);

  /* ---- Smooth scroll-to helper (used by AI chat) ---- */
  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (threeRef.current.lenis) threeRef.current.lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---- Cursor mode helpers ---- */
  const hoverBtn = () => setCursorMode('button');
  const hoverCard = () => setCursorMode('card');
  const unhover = () => { setCursorMode('default'); setCursorColor(null); };

  return (
    <>
      <GlobalStyle />
      <LoadingScreen progress={progress} done={ready} />
      <CustomCursor mode={cursorMode} color={cursorColor} />

      {/* Fixed Three canvas */}
      <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none'}} />

      {/* Content layer — sits above the canvas and the page-level scrim */}
      <main style={{position:'relative',zIndex:2}}>
        <NavPill onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} />
        <Hero onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} reducedMotion={reducedMotion}/>
        <About />
        <Projects onHoverCard={hoverCard} onUnhover={unhover} onHoverBtn={hoverBtn}/>
        <Skills />
        <Experience />
        <Terminal />
        <Contact onHoverBtn={hoverBtn} onUnhover={unhover} />
        <Footer />
      </main>

      <ChatWidget onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} />
    </>
  );
}
