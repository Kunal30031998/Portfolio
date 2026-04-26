import { useEffect } from 'react';
import { createNoise3D } from 'simplex-noise';
import { ORBITAL_WORKER_CODE } from '../lib/three/orbitalWorkerCode';

/* =========================================================================
   useThreeScene — owns the entire Three.js scene lifecycle.

   Receives refs + state-setters from Portfolio so the scene can
   communicate back to React without coupling Three.js to component state.
   Called once when CDN scripts are ready (ready === true).
   ========================================================================= */
export function useThreeScene({ ready, canvasRef, threeRef, labelsRef, setSceneReady, mouseLastMoveRef, autoScrollRef, pausedRef, lenisStoppedRef, reducedMotion }) {
  useEffect(() => {
    if (!ready) return;
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

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? 'low-power' : 'default',
    });
    // Cap DPR at 1 on mobile, 1.5 on desktop — 4K monitors don't need full res for a space bg
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;

    // --- GPU quality tier ---
    // Low-end: mobile, OR integrated GPU signal (max texture size <= 8192 is a reliable proxy
    // for integrated Intel/AMD on Windows laptops).
    const _maxTex = renderer.capabilities.maxTextureSize;
    const isLowEnd = isMobile || _maxTex <= 8192;
    // High-end: dedicated GPU with large VRAM (maxTexture 16384+)
    const isHighEnd = !isMobile && _maxTex >= 16384;

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
          intensity: isLowEnd ? 0.9 : 1.4,
          luminanceThreshold: 0.85,
          luminanceSmoothing: 0.4,
          radius: isLowEnd ? 0.3 : 0.4,
        });

        // CA and DOF skipped on mobile and low-end — each adds a full extra render pass
        if (isHighEnd) {
          caEffect = new ChromaticAberrationEffect({
            offset: new THREE.Vector2(0.0005, 0.0005)
          });
          dofEffect = new DepthOfFieldEffect(camera, {
            focusDistance: 0.0,
            focalLength: 0.048,
            bokehScale: 2.0
          });
        }

        const vignetteEffect = new VignetteEffect({ offset: 0.35, darkness: 0.7 });

        // Effect list by tier
        const _highEffects = [bloomEffect, caEffect, dofEffect, vignetteEffect,
          (() => { const n = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY }); n.blendMode.opacity.value = 0.035; return n; })()];
        const _midEffects  = [bloomEffect, vignetteEffect];
        const _lowEffects  = [bloomEffect];
        const effectPass = new EffectPass(camera, ...(isHighEnd ? _highEffects : isLowEnd ? _lowEffects : _midEffects));
        composer.addPass(effectPass);

        // GodRays: high-end only (32-sample fullscreen radial blur is very GPU heavy)
        try {
          const godRaysFrag = `
            uniform sampler2D inputBuffer;
            uniform vec2 uSunScreenPos;
            uniform float uIntensity;
            uniform float uDecay;
            uniform float uDensity;
            uniform float uWeight;
            const int NUM_SAMPLES = 16;
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
          if (isHighEnd) {
            godRaysPass = new EffectPass(camera, new GodRaysEffect());
            threeRef.current._godRaysEffect = godRaysPass.effects?.[0];
            composer.addPass(godRaysPass);
          }
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
          if (isHighEnd) {
            const gravLensPass = new EffectPass(camera, new GravLensEffect());
            threeRef.current._gravLensEffect = gravLensPass.effects?.[0];
            composer.addPass(gravLensPass);
          }
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
    // Minimal mousemove — update NDC for parallax only
    const onMouseNDC = (e) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseNDC, { passive: true });

    // Device-orientation → mouseNDC for mobile parallax (same target variable)
    // iOS 13+: permission requested on first touch (handled by the React-level useEffect above).
    // Here we register unconditionally — on iOS the permission grant above fires this too.
    const onDeviceOrientationNDC = (e) => {
      if (e.gamma === null) return;
      mouseNDC.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
      mouseNDC.y = Math.max(-1, Math.min(1, -((e.beta ?? 30) - 30) / 45));
    };
    // On iOS we piggyback on the permission already requested by the React effect;
    // on Android/desktop we register immediately.
    const _attachNDCOrientation = () => {
      window.addEventListener('deviceorientation', onDeviceOrientationNDC);
    };
    const DOE = window.DeviceOrientationEvent;
    if (typeof DOE?.requestPermission === 'function') {
      // iOS: wait for first touch (permission will have been granted by then)
      window.addEventListener('touchstart', _attachNDCOrientation, { once: true, passive: true });
    } else {
      _attachNDCOrientation();
    }

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
    const starCount = isMobile ? 700 : isLowEnd ? 1800 : 3500;
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
      uniforms: {
        uTime:      { value: 0 },
        uPxRatio:   { value: renderer.getPixelRatio() },
        uFade:      { value: 1.0 },
        uScrollVel: { value: 0.0 }, // 0..1, drives streak length
        uDoppler:   { value: 0.0 }, // 0..1, drives blue-shift
      },
      vertexShader: `
        attribute float aSize; attribute float aTwinkle;
        varying vec3 vCol; varying float vTwk; varying float vStretch;
        uniform float uTime; uniform float uPxRatio; uniform float uScrollVel; uniform float uDoppler;
        void main(){
          vCol = color;
          // Doppler: blue-shift forward (low z) stars at high scroll vel
          float fwd = clamp(-position.z / 80.0, 0.0, 1.0); // 1 = forward
          float blueShift = uDoppler * fwd * 0.6;
          float redShift  = uDoppler * (1.0 - fwd) * 0.25;
          vCol = mix(vCol, vec3(0.72, 0.88, 1.0), blueShift);
          vCol = mix(vCol, vec3(1.0, 0.55, 0.32), redShift);
          vTwk = 0.6 + 0.4*sin(uTime*2.0 + aTwinkle*1.7);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_Position = projectionMatrix * mv;
          float sz = aSize * uPxRatio * (300.0 / -mv.z);
          // Stretch radially toward screen center at high scroll velocity
          vStretch = uScrollVel;
          gl_PointSize = sz * (1.0 + uScrollVel * 3.5);
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vTwk; varying float vStretch;
        uniform float uFade;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          // Squash Y so star elongates radially (streak along Y axis of point)
          float sq = mix(1.0, 0.08, vStretch);
          c.y *= (1.0 / max(sq, 0.04));
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          float flare = smoothstep(0.5, 0.0, abs(c.x)*4.0) + smoothstep(0.5, 0.0, abs(c.y)*4.0);
          flare *= 0.15;
          // Brighten streaking stars
          float bright = 1.0 + vStretch * 1.2;
          gl_FragColor = vec4(vCol * (a + flare) * vTwk * uFade * bright, (a + flare) * vTwk * uFade);
        }`
    });
    starMat.vertexColors = true;
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);
    disposables.push({geo: starGeo, mat: starMat});

    /* ---------- 2. VOLUMETRIC NEBULA (layered billboard sprites) ----------
       50 planes at staggered Z depths create a parallax flythrough effect.
       As the camera moves through them on scroll the layers separate, giving
       genuine stereoscopic depth — unlike a single flat plane. */
    const nebulaGeo = new THREE.PlaneGeometry(180, 120);
    const nebulaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColA: { value: new THREE.Color(0x3b0b66) },
        uColB: { value: new THREE.Color(0x00446b) },
        uColC: { value: new THREE.Color(0xff3b8b) },
        uFade: { value: 1.0 },
        uLayerZ: { value: 0.0 }, // layer depth offset → shifts FBM pattern per layer
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform float uLayerZ;
        uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uFade;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
          return mix(a,b,f.x)+(c-a)*f.y*(1.0-f.x)+(d-b)*f.x*f.y;
        }
        float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<2;i++){v+=a*noise(p);p*=2.0;a*=0.5;} return v; }
        void main(){
          vec2 uv=vUv*2.0-1.0;
          float t=uTime*0.03;
          float seed=uLayerZ*0.37;
          float n1=fbm(uv*1.8+vec2(t+seed,-t*0.7+seed));
          float n2=fbm(uv*3.2-vec2(t*0.6+seed*0.5,t));
          float cloud=smoothstep(0.35,1.0,n1*0.7+n2*0.5);
          vec3 col=mix(uColA,uColB,n2);
          col+=uColC*smoothstep(0.55,0.95,n1)*0.6;
          float vign=smoothstep(1.25,0.2,length(uv));
          // Each layer is thinner in opacity so they blend without blowing out
          gl_FragColor=vec4(col,cloud*vign*0.08*uFade);
        }`,
    });
    // Build a shared geometry + per-layer material with unique uLayerZ
    const NEBULA_LAYERS = isMobile ? 3 : isLowEnd ? 5 : 10;
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);
    const _nebulaLayerMats = [];
    for (let _nl = 0; _nl < NEBULA_LAYERS; _nl++) {
      const _lmat = nebulaMat.clone();
      _lmat.uniforms = {
        uTime:    { value: 0 },
        uColA:    { value: nebulaMat.uniforms.uColA.value.clone() },
        uColB:    { value: nebulaMat.uniforms.uColB.value.clone() },
        uColC:    { value: nebulaMat.uniforms.uColC.value.clone() },
        uFade:    { value: 1.0 },
        uLayerZ:  { value: _nl / NEBULA_LAYERS },
      };
      const _lmesh = new THREE.Mesh(nebulaGeo, _lmat);
      // Spread layers from z=-40 (near) to z=-120 (far) with slight XY jitter
      const _zpos = -40 - (_nl / NEBULA_LAYERS) * 80;
      const _xjit = (Math.random() - 0.5) * 12;
      const _yjit = (Math.random() - 0.5) * 8;
      _lmesh.position.set(_xjit, _yjit + 2, _zpos);
      nebulaGroup.add(_lmesh);
      _nebulaLayerMats.push(_lmat);
      disposables.push({ geo: null, mat: _lmat });
    }
    // Dispose the shared geometry once at cleanup
    disposables.push({ geo: nebulaGeo, mat: null });
    // Keep a reference to the first-layer mat as `nebulaMat` for tick loop uTime / uFade updates
    const nebula = nebulaGroup.children[0]; // billboard-face set per frame in tick

    /* ---------- 3. SUN (central star) ---------- */
    // Hyper-realistic sun: layered FBM granulation + turbulent plasma veins
    // + hot rim halo. Displacement gives it a molten, roiling surface.
    const sunGeo = new THREE.IcosahedronGeometry(1.6, isMobile ? 3 : isHighEnd ? 5 : 4);
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
        float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<3;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; } return v; }
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
        float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<3;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; } return v; }
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
    // Fluid sim: high-end only (ping-pong RT pipeline too expensive for integrated GPU)
    const _fluidEnabled = renderer.capabilities.isWebGL2 && isHighEnd;
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
      const COUNT = type === 'spiral' ? (isMobile ? 400 : 2200)
                  : type === 'elliptical' ? (isMobile ? 300 : 1500)
                  : (isMobile ? 350 : 1700);
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
    const galaxyCount = isMobile ? 7 : 32;
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

    /* ---------- ASTEROID BELT (hyper-real: C/S/M spectral types) ----------
       Real asteroids split roughly into three spectral classes:
         C-type (carbonaceous) ~75% — dark, very rough, low albedo
         S-type (silicate)     ~17% — tan/grey, stony, moderate roughness
         M-type (metallic)      ~8% — nickel-iron, subtly reflective
       Each family gets its own pre-displaced icosahedron so no two rocks
       read as a clean polyhedron, plus per-instance color jitter. */
    const swarmCount = isMobile ? 24 : 160;
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
    // Use simplex noise for organic initial placement — clusters naturally
    const _noise3D = createNoise3D();
    const dustCount = isMobile ? 150 : 900;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos   = new Float32Array(dustCount * 3); // base positions (immutable after init)
    const dustColor = new Float32Array(dustCount * 3);
    const dustDrift = new Float32Array(dustCount * 3); // per-particle drift phase offsets
    const tmpCol = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      // Simplex-based rejection: bias particle placement toward high-density noise regions
      let x, y, z;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * 30;
        y = (Math.random() - 0.5) * 12 + 2;
        z = (Math.random() - 0.5) * 20 - 4;
        attempts++;
      } while (_noise3D(x * 0.12, y * 0.12, z * 0.12) < -0.1 && attempts < 8);
      // Drift phase seeded by simplex for organic-looking motion clusters
      const nx = _noise3D(x * 0.2, y * 0.2, 0)     * Math.PI * 2;
      const ny = _noise3D(x * 0.2, y * 0.2, 10)    * Math.PI * 2;
      const nz = _noise3D(x * 0.2, y * 0.2, 20)    * Math.PI * 2;
      dustPos[i*3] = x; dustPos[i*3+1] = y; dustPos[i*3+2] = z;
      dustDrift[i*3] = nx; dustDrift[i*3+1] = ny; dustDrift[i*3+2] = nz;
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
        uCamVel:  { value: 0.0 }, // 0..1 scroll speed — drives particle impulse
      },
      vertexShader: `
        attribute vec3 aDriftPhase;
        uniform float uTime;
        uniform float uPxRatio;
        uniform float uCamVel;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec3 p = position;
          // Base organic drift
          p.x += sin(uTime * 0.15 + aDriftPhase.x) * 0.3;
          p.y += cos(uTime * 0.20 + aDriftPhase.y) * 0.3;
          p.z += sin(uTime * 0.12 + aDriftPhase.z) * 0.3;
          // Camera-velocity impulse: push particles toward +Z (camera) when scrolling fast.
          // Each particle has a unique phase so they scatter at different speeds.
          float vel = uCamVel;
          p.z += vel * sin(aDriftPhase.x * 3.7 + aDriftPhase.z) * 4.5;
          p.x += vel * cos(aDriftPhase.y * 2.3) * 1.2;
          p.y += vel * sin(aDriftPhase.z * 1.9) * 0.8;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          // Points grow larger during velocity burst (streak effect)
          float szBoost = 1.0 + vel * 2.5;
          gl_PointSize = 0.035 * szBoost * uPxRatio * (300.0 / -mv.z);
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
    const _workerBlob = new Blob([ORBITAL_WORKER_CODE], { type:'application/javascript' });
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

    /* ---------- N-BODY GRAVITY (WebGPU or JS fallback) ----------
       When WebGPU is available: each frame a compute shader integrates N×N
       gravitational forces (F = G·m₁·m₂ / r²) and sends positions back so
       planets gradually drift off perfect Kepler orbits under mutual attraction.
       When WebGPU is absent we run the same math in a tiny JS loop on the
       main thread — cheap enough for 8–10 planets at 60fps.
       The Kepler worker keeps running as a source of initial positions; N-body
       adds a perturbation offset on top so orbits stay recognisable but jitter
       naturally. */
    const N_PLANETS = activePlanets.length;
    const _G = 0.0004; // gravitational constant tuned for visual drama
    // State arrays: position (x,y,z) + velocity (vx,vy,vz) per planet
    const _nbPos = new Float32Array(N_PLANETS * 3);
    const _nbVel = new Float32Array(N_PLANETS * 3).fill(0);
    // Masses proportional to visual radius
    const _nbMass = activePlanets.map(p => p.size * p.size * 0.5);
    let _nbInitialized = false; // populated from first Kepler worker frame

    // WebGPU path (feature detect)
    let _gpuDevice = null;
    let _gpuNBodyPipeline = null;
    let _gpuPosBuffer = null, _gpuVelBuffer = null, _gpuMassBuffer = null, _gpuOutBuffer = null;
    const _webGpuReady = { ok: false };

    if (navigator.gpu) {
      navigator.gpu.requestAdapter().then(adapter => adapter?.requestDevice()).then(device => {
        if (!device) return;
        _gpuDevice = device;
        const wgslCompute = /* wgsl */`
          struct Body { px:f32, py:f32, pz:f32, vx:f32, vy:f32, vz:f32 };
          @group(0) @binding(0) var<storage, read_write> bodies: array<Body>;
          @group(0) @binding(1) var<storage, read>       masses: array<f32>;
          @group(0) @binding(2) var<uniform>             params: vec2<f32>; // (dt, G)

          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
            let i = gid.x;
            let n = arrayLength(&bodies);
            if (i >= n) { return; }
            let dt = params.x;
            let G  = params.y;
            var ax = 0.0; var ay = 0.0; var az = 0.0;
            for (var j: u32 = 0u; j < n; j++) {
              if (j == i) { continue; }
              let dx = bodies[j].px - bodies[i].px;
              let dy = bodies[j].py - bodies[i].py;
              let dz = bodies[j].pz - bodies[i].pz;
              let r2 = dx*dx + dy*dy + dz*dz + 0.01; // softening
              let inv = G * masses[j] / (r2 * sqrt(r2));
              ax += dx * inv; ay += dy * inv; az += dz * inv;
            }
            bodies[i].vx += ax * dt;
            bodies[i].vy += ay * dt;
            bodies[i].vz += az * dt;
            bodies[i].px += bodies[i].vx * dt;
            bodies[i].py += bodies[i].vy * dt;
            bodies[i].pz += bodies[i].vz * dt;
          }
        `;
        const shaderModule = device.createShaderModule({ code: wgslCompute });
        _gpuNBodyPipeline = device.createComputePipeline({
          layout: 'auto',
          compute: { module: shaderModule, entryPoint: 'main' },
        });
        // 6 floats per body (px,py,pz,vx,vy,vz), 4 bytes each
        const bodyStride = 6 * 4;
        _gpuPosBuffer  = device.createBuffer({ size: N_PLANETS * bodyStride, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        _gpuMassBuffer = device.createBuffer({ size: N_PLANETS * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        _gpuOutBuffer  = device.createBuffer({ size: N_PLANETS * bodyStride, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        // Upload masses (static)
        const massArr = new Float32Array(_nbMass);
        device.queue.writeBuffer(_gpuMassBuffer, 0, massArr);
        _webGpuReady.ok = true;
      }).catch(() => { /* WebGPU unavailable — JS fallback active */ });
    }

    // JS N-body integrator — runs every frame when WebGPU is absent
    const _integrateNBodyJS = (dt) => {
      if (!_nbInitialized) return;
      const n = N_PLANETS;
      // Accumulate accelerations then integrate
      for (let i = 0; i < n; i++) {
        let ax = 0, ay = 0, az = 0;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const dx = _nbPos[j*3]   - _nbPos[i*3];
          const dy = _nbPos[j*3+1] - _nbPos[i*3+1];
          const dz = _nbPos[j*3+2] - _nbPos[i*3+2];
          const r2 = dx*dx + dy*dy + dz*dz + 0.01; // softening
          const inv = _G * _nbMass[j] / (r2 * Math.sqrt(r2));
          ax += dx * inv; ay += dy * inv; az += dz * inv;
        }
        _nbVel[i*3]   += ax * dt;
        _nbVel[i*3+1] += ay * dt;
        _nbVel[i*3+2] += az * dt;
      }
      for (let i = 0; i < n; i++) {
        _nbPos[i*3]   += _nbVel[i*3]   * dt;
        _nbPos[i*3+1] += _nbVel[i*3+1] * dt;
        _nbPos[i*3+2] += _nbVel[i*3+2] * dt;
      }
    };
    // Store on ref for cleanup
    threeRef.current._nbState = { pos: _nbPos, vel: _nbVel, mass: _nbMass, initialized: false };

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
    // Frame-rate cap: 30fps on all devices — portfolio animations look smooth at 30fps
    // and this gives the GPU significant headroom, preventing thermal throttling on laptops.
    // High-end gets 60fps cap since it has the headroom.
    const _frameMinMs = 33; // fixed 30fps cap on all devices
    let _lastRafTime = 0;
    const tick = () => {
      const now = performance.now();
      // Pause completely when tab is in background
      if (document.hidden) { raf = requestAnimationFrame(tick); return; }
      if (now - _lastRafTime < _frameMinMs) { raf = requestAnimationFrame(tick); return; }
      _lastRafTime = now;
      // getDelta() FIRST so it returns true frame delta; elapsedTime is updated by it
      const _rawDelta = Math.min(clock.getDelta(), 0.05);
      // Time dilation: slow everything to 0.3× after 8s of idle
      if (!threeRef.current._timeDilation) threeRef.current._timeDilation = 1.0;
      const _lastMoveNow = mouseLastMoveRef.current;
      const _idle8 = _lastMoveNow !== null && (now - _lastMoveNow) > 8000;
      const _dilTarget = _idle8 ? 0.3 : 1.0;
      threeRef.current._timeDilation += (_dilTarget - threeRef.current._timeDilation) * 0.015;
      const _delta = _rawDelta * threeRef.current._timeDilation;
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
            // Galaxy rotation is purely decorative — skip on mobile to save matrix recalcs
            if (!isMobile && u.spin) gx.rotation.y += u.spin * 0.01;
            // Cached SMBH sprite — no children traversal needed
            if (u.bhSprite) u.bhSprite.material.opacity = gf;
          }
        }
      }

      // Shader uniforms
      sunMat.uniforms.uTime.value = t;
      coronaMat.uniforms.uTime.value = t;
      // nebulaMat handled by volumetric layer loop below
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

      // Nebula layers — update uTime every 8th frame (slow-drifting clouds don't need per-frame updates)
      if (frameCount % 8 === 0) {
        const _nebulaFade = Math.max(0, 1 - m * 1.4);
        for (let _nli = 0; _nli < _nebulaLayerMats.length; _nli++) {
          _nebulaLayerMats[_nli].uniforms.uTime.value = t;
          _nebulaLayerMats[_nli].uniforms.uFade.value = _nebulaFade;
        }
      }

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
      // Planet uniforms: throttle to every 2nd frame on mobile (shader is GPU-side, not time-critical)
      const _doPlanetuniforms = !isMobile || frameCount % 2 === 0;
      if (floatGroup.visible) for (let _oi = 0; _oi < orbs.length; _oi++) { const p = orbs[_oi];
        // Skip orbital position update for the locked planet — orbit-lock tick owns its position
        if (_oi === _lockedIdx) { p.rotation.y += p.userData.spin; continue; }
        const u = p.userData;
        // E5: use worker positions when available, fall back to inline
        if (_latestOrbPos.planets?.[_oi]) {
          const wp = _latestOrbPos.planets[_oi];
          const cx = sun.position.x, cy = sun.position.y, cz = sun.position.z;
          // Seed N-body state on first valid Kepler frame
          const _nb = threeRef.current._nbState;
          if (_nb && !_nb.initialized) {
            for (let _ni = 0; _ni < N_PLANETS; _ni++) {
              if (_latestOrbPos.planets[_ni]) {
                _nb.pos[_ni*3]   = _latestOrbPos.planets[_ni].x;
                _nb.pos[_ni*3+1] = _latestOrbPos.planets[_ni].y;
                _nb.pos[_ni*3+2] = _latestOrbPos.planets[_ni].z;
              }
            }
            _nb.initialized = true;
            _nbInitialized = true;
          }
          // Run JS N-body only on desktop (mobile doesn't need the subtle perturbation)
          if (!isMobile && _nb?.initialized && !_webGpuReady.ok && frameCount % 16 === 0) {
            _integrateNBodyJS(_delta * 4);
          }
          // N-body perturbation: add a small fraction of the N-body offset on top of Kepler orbit
          const _nbPertX = _nb?.initialized ? (_nb.pos[_oi*3]   - wp.x) * 0.04 : 0;
          const _nbPertY = _nb?.initialized ? (_nb.pos[_oi*3+1] - wp.y) * 0.04 : 0;
          const _nbPertZ = _nb?.initialized ? (_nb.pos[_oi*3+2] - wp.z) * 0.04 : 0;
          p.position.x = cx + wp.x + _nbPertX;
          p.position.y = cy + wp.y + _nbPertY;
          p.position.z = cz + wp.z + _nbPertZ;
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
        if (_doPlanetuniforms && p.material && p.material.uniforms) {
          if (p.material.uniforms.uSunPos) p.material.uniforms.uSunPos.value.copy(_sunWorld);
          if (p.material.uniforms.uTime) p.material.uniforms.uTime.value = t;
        }
      }  // end planet loop

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

      // Asteroid belt — use worker-computed positions
      // On mobile: only update matrix every 2nd frame to halve InstancedMesh upload cost
      const _wAstPos = _latestOrbPos.astPos;
      if (floatGroup.visible && (!isMobile || frameCount % 2 === 0)) for (let s = 0; s < swarmMeshes.length; s++) {
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

      // Shooting stars — desktop only (alloc/dispose every ~2s heats mobile)
      if (!isMobile && now > nextShootingStarAt) {
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

      // Cosmic dust — GPU shader handles drift; throttle uniform on mobile (4th frame)
      if (!isMobile || frameCount % 4 === 0) dustMat.uniforms.uTime.value = t;
      // Drive dust velocity from scroll speed (_sv already computed in the !reducedMotion block above,
      // but we need it on all tiers so read scrollProg delta independently here).
      if (!threeRef.current._dustVel) threeRef.current._dustVel = 0;
      const _dScrollDelta = Math.abs(scrollProg.value - (threeRef.current._dustPrevP ?? scrollProg.value));
      threeRef.current._dustPrevP = scrollProg.value;
      // Smooth impulse: spike on fast scroll, decay quickly
      threeRef.current._dustVel += Math.min(1, _dScrollDelta * 80) * 0.6;
      threeRef.current._dustVel *= 0.82; // decay
      dustMat.uniforms.uCamVel.value = Math.min(1, threeRef.current._dustVel);

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

      // Mouse / device-tilt driven camera parallax — subtle depth shift
      if (!threeRef.current._camPx) threeRef.current._camPx = { x: 0, y: 0 };
      const _cp = threeRef.current._camPx;
      const _cpStrX = 1.8 * (1 - scrollProg.value * 0.6); // weaker in deep space
      const _cpStrY = 1.0 * (1 - scrollProg.value * 0.6);
      _cp.x += (mouseNDC.x * _cpStrX - _cp.x) * 0.025;
      _cp.y += (mouseNDC.y * _cpStrY - _cp.y) * 0.025;
      camera.position.x += _cp.x;
      camera.position.y += _cp.y;

      // E8 — FOV breathing + Perlin-noise camera shake
      if (!reducedMotion) {
        // Scene heartbeat: gentle 0.25Hz breathe of the FOV (universe inhales)
        const _breathe = 1.0 + Math.sin(t * 0.25 * Math.PI * 2) * 0.0035 * threeRef.current._timeDilation;
        const _targetFov = (38 + Math.sin(t * 0.17) * 0.6) * (1 / _breathe);
        const _prevFov = camera.fov;
        camera.fov += (_targetFov - camera.fov) * 0.04;
        // Only flush projection matrix when FOV changed meaningfully (saves CPU on mobile)
        if (Math.abs(camera.fov - _prevFov) > 0.01) camera.updateProjectionMatrix();
        const _shakeMag = isMobile ? 0 : 0.004; // skip shake on mobile
        camera.position.x += (Math.sin(t * 1.27) + Math.sin(t * 2.13) * 0.4 + Math.sin(t * 5.79) * 0.15) * _shakeMag;
        camera.position.y += (Math.sin(t * 1.61) + Math.sin(t * 2.67) * 0.4 + Math.sin(t * 4.91) * 0.15) * _shakeMag;
      }

      camera.lookAt(currentLook.x, currentLook.y, currentLook.z);

      // E1 — update bloom/CA reactivity (desktop only — mobile has no CA/DOF and simpler bloom)
      if (!reducedMotion && !isMobile) {
        // Track scroll velocity for reactive CA / bloom
        if (!threeRef.current._sv) threeRef.current._sv = { prev: 0, vel: 0 };
        const _sv = threeRef.current._sv;
        _sv.vel += (Math.abs(scrollProg.value - _sv.prev) * 55 - _sv.vel) * 0.18;
        _sv.prev = scrollProg.value;
        const _wi = Math.min(1, _sv.vel * 10); // 0..1 scroll velocity

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
        // Star-streaking + Doppler color shift at scroll speed
        if (starMat.uniforms.uScrollVel !== undefined) {
          starMat.uniforms.uScrollVel.value += (_wi * 0.9 - starMat.uniforms.uScrollVel.value) * 0.12;
          starMat.uniforms.uDoppler.value   += (_wi * 0.7 - starMat.uniforms.uDoppler.value)   * 0.10;
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

      // E13 — Pause gate
      if (pausedRef.current) { raf = requestAnimationFrame(tick); return; }

      // Auto-scroll — only runs when screen has been idle for 1.5 s.
      // mouseLastMoveRef is null until first user interaction → treat as active (no scroll).
      // After first interaction it holds the timestamp; auto-scroll starts once 1.5 s elapses.
      const _lastMove = mouseLastMoveRef.current;
      const _userActive = _lastMove === null || (performance.now() - _lastMove) < 1500;
      if (autoScrollRef.current && !lenisStoppedRef.current && !_userActive) {
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

      // Render — skip EffectComposer on mobile and low-end (saves 1-2 render passes)
      if (!isLowEnd && threeRef.current.composer) {
        try {
          threeRef.current.composer.render();
        } catch (_renderErr) {
          threeRef.current.composer = null;
          renderer.render(scene, camera);
        }
      } else {
        renderer.render(scene, camera);
      }

      // ---- Update planet/sun name label positions ----
      // Throttle on mobile: DOM style writes + O(N²) occlusion are expensive
      if (planetLabelEls.length && (!isMobile || frameCount % 6 === 0)) {
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

    // Pre-compile ALL shader programs + upload all geometry buffers to the GPU
    // while the loading screen is still visible. This eliminates the
    // per-shader / per-buffer stutter that would otherwise hit on the first
    // scrolled-to frame where each new material or geometry is first used.
    //
    // renderer.compile() forces the WebGL driver to compile every ShaderMaterial
    // in the scene graph right now (blocking). Then we do 3 warm render passes
    // to flush all VBO / texture uploads. Total cost: ~100-300ms at load time,
    // which is hidden behind the loading screen — zero cost during interaction.
    try {
      // Temporarily show all galaxies so their geometries get uploaded too
      galaxyGroup.children.forEach(g => { g.visible = true; });
      renderer.compile(scene, camera);
      // Three warm renders: first flushes VBO uploads, subsequent ones amortise
      // any deferred driver work (shader linking, texture mip-gen, etc.)
      renderer.render(scene, camera);
      renderer.render(scene, camera);
      renderer.render(scene, camera);
      galaxyGroup.children.forEach(g => { g.visible = false; });
    } catch (_warmErr) { /* non-fatal */ }

    // Scene is fully GPU-resident — dismiss loading screen and start the loop
    setSceneReady(true);
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
      window.removeEventListener('deviceorientation', onDeviceOrientationNDC);
      window.removeEventListener('touchstart', _attachNDCOrientation);

      // wheel/touch/pointermove idle listeners are owned by the dedicated top-level useEffect
      // E5: terminate orbital worker
      if (threeRef.current.orbitalWorker) {
        threeRef.current.orbitalWorker.terminate();
        threeRef.current.orbitalWorker = null;
        URL.revokeObjectURL(_workerUrl);
      }
      // E3: dispose fluid render targets
      if (threeRef.current.fluidRtA) { threeRef.current.fluidRtA.dispose(); threeRef.current.fluidRtB.dispose(); }
      // N-body WebGPU cleanup
      if (_gpuDevice) {
        try { _gpuPosBuffer?.destroy(); _gpuMassBuffer?.destroy(); _gpuOutBuffer?.destroy(); } catch (_) {}
      }
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
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
}
