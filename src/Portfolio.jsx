import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CDN, loadScript, PROJECTS, EXPERIENCE } from './data/content';
import { PLANET_LORE } from './data/planetLore';

// Scene
import { useThreeScene }   from './scene/useThreeScene.jsx';

// Hooks
import { useSoundManager } from './hooks/useSoundManager';

// Layout components
import { GlobalStyle }     from './components/GlobalStyle';
import { CustomCursor }    from './components/CustomCursor';
import { LoadingScreen }   from './components/LoadingScreen';
import { NavPill }         from './components/NavPill';
import { ChatWidget }      from './components/ChatWidget';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AstronautHUD }    from './components/AstronautHUD';
import { DetailPage }      from './components/DetailPage';
import { SourceViewer }    from './components/SourceViewer';
import { KeyboardHelp }    from './components/KeyboardHelp';
import { SoundToggle }     from './components/SoundToggle';
import { AtmosphericHaze } from './components/AtmosphericHaze';
import { OfflineBanner }   from './components/OfflineBanner';

// Sections
import { Hero }       from './sections/Hero';
import { About }      from './sections/About';
import { Projects }   from './sections/Projects';
import { Skills }     from './sections/Skills';
import { Experience } from './sections/Experience';
import { Terminal }   from './sections/Terminal';
import { Contact }    from './sections/Contact';
import { Footer }     from './sections/Footer';

/* =========================================================================
   Portfolio — top-level orchestrator.

   Responsibilities:
   1. Load CDN scripts progressively (Three.js, GSAP, Lenis).
   2. Delegate Three.js scene lifecycle to useThreeScene().
   3. Delegate all audio to useSoundManager().
   4. Own cross-cutting React state: cursor, active section, detail overlay.
   5. Compose section components inside the scroll container.

   To customise content: edit src/config.json — no code changes needed.
   ========================================================================= */
export default function Portfolio() {
  /* ── Canvas / scene refs ──────────────────────────────────────────────── */
  const canvasRef  = useRef(null); // WebGL canvas
  const threeRef   = useRef({});   // mutable bag: scene, camera, renderer, orbs, etc.
  const labelsRef  = useRef(null); // fixed DOM container for planet name labels

  /* ── UI / layout refs ────────────────────────────────────────────────── */
  const sectionsWrapRef  = useRef(null);  // CSS 3D perspective wrapper
  const mouseLastMoveRef = useRef(null);  // timestamp of last pointer activity
  const pausedRef        = useRef(false); // mirrors `paused` for RAF loop (no re-render cost)
  const autoScrollRef    = useRef(true);  // RAF loop auto-scroll flag
  const lenisStoppedRef  = useRef(false); // true while detail overlay is open
  const _dismissRafRef   = useRef(null);  // detail-dismiss poll RAF id
  const _dismissTmoRef   = useRef(null);  // detail-dismiss settle timeout id
  const audioRef         = useRef(null);  // HTMLAudioElement (ambient track)

  /* ── Loading state ───────────────────────────────────────────────────── */
  const [progress,   setProgress]   = useState(0);
  const [ready,      setReady]      = useState(false);   // CDN scripts loaded
  const [sceneReady, setSceneReady] = useState(false);   // GPU shaders compiled

  /* ── UI state ────────────────────────────────────────────────────────── */
  const [cursorMode,  setCursorMode]  = useState('default');
  const [cursorColor, setCursorColor] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeId,    setActiveId]    = useState('hero');
  const [detail,      setDetail]      = useState(null);  // { kind, item, planetIdx }
  const [sectionsRevealing, setSectionsRevealing] = useState(false);
  const [showKeyboardHelp,  setShowKeyboardHelp]  = useState(false);
  const [showSourceViewer,  setShowSourceViewer]  = useState(false);
  const [paused,      setPaused]      = useState(false);
  const [soundOn,     setSoundOn]     = useState(true);
  const [isOffline,   setIsOffline]   = useState(false);
  const [lockedPlanetIdx, setLockedPlanetIdx] = useState(-1); // atmospheric haze

  /* ── Dirty-lens overlay (generated once, stays stable) ──────────────── */
  const lensTexture = React.useMemo(() => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 512;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 512);
      for (let i = 0; i < 14; i++) {
        const x = Math.random() * 512, y = Math.random() * 512,
              r = 20 + Math.random() * 80, a = 0.015 + Math.random() * 0.04;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(0.4, `rgba(255,255,255,${a * 0.5})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        const x1 = Math.random() * 512, y1 = Math.random() * 512,
              x2 = x1 + (Math.random() - 0.5) * 200, y2 = y1 + (Math.random() - 0.5) * 200;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.03})`;
        ctx.lineWidth = 0.5 + Math.random(); ctx.stroke();
      }
      return c.toDataURL();
    } catch (_e) { return null; }
  }, []);

  /* ── Idle pointer tracking (stamp on any pointer / wheel / touch) ────── */
  useEffect(() => {
    const stamp = () => { mouseLastMoveRef.current = performance.now(); };
    const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'touchmove'];
    events.forEach(e => window.addEventListener(e, stamp, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, stamp));
  }, []);

  /* ── CDN script loading + scroll restore + reduced-motion detection ──── */
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
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
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Three.js scene (lives in src/scene/useThreeScene.js) ───────────── */
  useThreeScene({ ready, canvasRef, threeRef, labelsRef, setSceneReady,
                  mouseLastMoveRef, autoScrollRef, pausedRef, lenisStoppedRef, reducedMotion });

  /* ── Audio (ambient music, SFX, planet tones, spatial pan) ─────────── */
  useSoundManager({ ready, soundOn, threeRef, audioRef });

  /* ── Online / offline detection ─────────────────────────────────────── */
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

  /* ── GitHub activity → asteroid density (cosmetic, silently degrades) ──
     PERF: Skip on save-data / slow connections; defer until idle so it never
     competes with first paint. */
  useEffect(() => {
    if (!ready) return;
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(2g|slow-2g)/.test(conn.effectiveType || ''))) return;

    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('https://github-contributions-api.jogruber.de/v4/kugautam?y=last');
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const weekTotal = (json.contributions ?? []).slice(-4).reduce((sum, d) => sum + (d.count ?? 0), 0);
        const density = Math.min(2.0, Math.max(0.5, weekTotal / 20));
        threeRef.current.swarmMeshes?.forEach((sw) => {
          sw.mesh.count = Math.min(Math.round(sw.baseCount * density), sw.count);
          sw.mesh.instanceMatrix.needsUpdate = true;
        });
      } catch (_) {}
    };

    // Run after paint, in idle time
    const idle =
      window.requestIdleCallback ||
      ((cb) => window.setTimeout(cb, 1500));
    const idleId = idle(run, { timeout: 4000 });

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idleId);
    };
  }, [ready]);

  /* ── Active-section IntersectionObserver (drives NavPill highlight) ──── */
  useEffect(() => {
    const ids = ['hero', 'about', 'projects', 'skills', 'experience', 'terminal', 'contact'];
    const els = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;

    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
      if (visible?.target?.id) {
        setActiveId(visible.target.id);
        threeRef.current.activeId = visible.target.id;
      }
    }, { threshold: [0.2, 0.35, 0.5, 0.65] });

    els.forEach(el => obs.observe(el));

    // Wormhole ring fires once per eyebrow on scroll-in
    const eyebrowObs = new IntersectionObserver((entries) =>
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('wh-active'); eyebrowObs.unobserve(e.target); }
      }), { threshold: 0.6 });
    document.querySelectorAll('.section-eyebrow').forEach(el => eyebrowObs.observe(el));

    return () => { obs.disconnect(); eyebrowObs.disconnect(); };
  }, []);

  /* ── Auto-scroll flag ────────────────────────────────────────────────── */
  useEffect(() => {
    if (activeId === 'hero' || activeId === 'about') autoScrollRef.current = true;
    else if (activeId === 'contact') autoScrollRef.current = false;
  }, [activeId]);

  /* ── CSS 3D perspective tilt on sections ─────────────────────────────── */
  useEffect(() => {
    if (reducedMotion || !ready) return;
    const lenis = threeRef.current.lenis;
    if (!lenis || !sectionsWrapRef.current) return;

    const sections = sectionsWrapRef.current.querySelectorAll('section');
    sections.forEach((sec, i) => {
      sec.style.willChange = 'transform';
      sec.style.backfaceVisibility = 'hidden';
      sec.style.zIndex = String(i + 1);
    });

    const applyDepth = () => {
      sections.forEach((sec) => {
        const fromCenter = sec.getBoundingClientRect().top / window.innerHeight;
        const rotateX = Math.max(-8, Math.min(8, fromCenter * 8));
        sec.style.transform = `perspective(1200px) rotateX(${rotateX}deg)`;
      });
    };

    lenis.on('scroll', applyDepth);
    applyDepth();
    return () => {
      lenis.off('scroll', applyDepth);
      sections.forEach(sec => { sec.style.transform = ''; sec.style.willChange = ''; });
    };
  }, [ready, reducedMotion]);

  /* ── Keyboard navigation ─────────────────────────────────────────────── */
  useEffect(() => {
    const SECTION_KEYS = {
      h: 'hero', a: 'about', p: 'projects',
      s: 'skills', e: 'experience', t: 'terminal', k: 'contact',
    };

    const onKeyDown = (ev) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const key = ev.key?.toLowerCase();
      if (key === ' ') {
        ev.preventDefault();
        setPaused(prev => { const next = !prev; pausedRef.current = next; return next; });
      } else if (ev.key === '?') {
        setShowKeyboardHelp(prev => !prev);
      } else if (key === 'escape') {
        setShowKeyboardHelp(false);
      } else if (key === 'c') {
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

  /* ── Cleanup dismiss refs on unmount ─────────────────────────────────── */
  useEffect(() => () => {
    if (_dismissRafRef.current) cancelAnimationFrame(_dismissRafRef.current);
    if (_dismissTmoRef.current) clearTimeout(_dismissTmoRef.current);
  }, []);

  /* ── Cursor helpers ──────────────────────────────────────────────────── */
  const hoverBtn  = () => setCursorMode('button');
  const hoverCard = () => setCursorMode('card');
  const unhover   = () => { setCursorMode('default'); setCursorColor(null); };

  /* ── Smooth scroll (also used by ChatWidget) ─────────────────────────── */
  const scrollToSection = useCallback((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (threeRef.current.lenis) threeRef.current.lenis.scrollTo(el, { duration: 1.6, offset: -80 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ── Orbit lock helper (shared by openProject + openExperience) ──────── */
  function _activateOrbitLock(orbIdx, zoomMult) {
    const ol = threeRef.current.orbitLock;
    if (!ol) return;
    // Snap previously detached planet back to orbit before switching
    if (ol.detached && ol.planetIdx >= 0) {
      const prevOrb = threeRef.current.orbs?.[ol.planetIdx];
      if (prevOrb) {
        try {
          const { scene: sc, floatGroup: fg } = threeRef.current;
          if (sc && fg) {
            sc.remove(prevOrb);
            fg.updateMatrixWorld(true);
            prevOrb.position.copy(fg.worldToLocal(prevOrb.position.clone()));
            fg.add(prevOrb);
          }
          prevOrb.scale.setScalar(1);
        } catch (_) {}
      }
    }
    ol.active = true; ol.planetIdx = orbIdx; ol.prog = 0; ol.detached = false; ol.zoomMult = zoomMult;
  }

  /* ── Detail overlay — open ───────────────────────────────────────────── */
  const openProject = useCallback((p) => {
    const idx     = PROJECTS.findIndex(proj => proj.id === p.id);
    const orbIdx  = Math.min(Math.max(0, idx < 0 ? 0 : idx), (threeRef.current.orbs?.length ?? 1) - 1);
    const loreIdx = Math.min(Math.max(0, idx < 0 ? 0 : idx), PLANET_LORE.length - 1);
    _activateOrbitLock(orbIdx, 1.0);
    setLockedPlanetIdx(orbIdx);
    try { threeRef.current.lenis?.stop?.(); lenisStoppedRef.current = true; } catch (_) {}
    setDetail({ kind: 'project', item: p, planetIdx: loreIdx });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openExperience = useCallback((e) => {
    const idx       = EXPERIENCE.findIndex(exp => exp.id === e.id);
    const orbOffset = 4 + (idx < 0 ? 0 : idx);
    const orbIdx    = Math.min(orbOffset, (threeRef.current.orbs?.length ?? 1) - 1);
    const loreIdx   = Math.min(orbOffset, PLANET_LORE.length - 1);
    _activateOrbitLock(orbIdx, 4.0);
    setLockedPlanetIdx(orbIdx);
    try { threeRef.current.lenis?.stop?.(); lenisStoppedRef.current = true; } catch (_) {}
    setDetail({ kind: 'experience', item: e, planetIdx: loreIdx });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Detail overlay — close (two-phase: release lock → unmount) ──────── */
  const releaseOrbitLock = useCallback(() => {
    const ol = threeRef.current.orbitLock;
    if (ol) ol.active = false;
    setLockedPlanetIdx(-1);
  }, []);

  const dismissDetail = useCallback(() => {
    try { threeRef.current.lenis?.start?.(); lenisStoppedRef.current = false; } catch (_) {}
    const poll = () => {
      if ((threeRef.current.orbitLock?.prog ?? 0) <= 0) {
        setSectionsRevealing(true);
        setDetail(null);
        _dismissTmoRef.current = setTimeout(() => setSectionsRevealing(false), 480);
      } else {
        _dismissRafRef.current = requestAnimationFrame(poll);
      }
    };
    _dismissRafRef.current = requestAnimationFrame(poll);
  }, []);

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <GlobalStyle />
      <LoadingScreen progress={progress} done={sceneReady} />
      <CustomCursor mode={cursorMode} color={cursorColor} />

      {/* Fixed WebGL canvas — behind everything */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* DOM container for imperative planet / sun name labels */}
      <div ref={labelsRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }} />

      {/* Per-planet atmospheric haze tint */}
      <AtmosphericHaze lockedPlanetIdx={lockedPlanetIdx} detailOpen={Boolean(detail)} />

      {/* Top-edge scrim — prevents content bleeding behind the fixed nav */}
      <div className="nav-top-scrim" aria-hidden="true" />

      <main style={{ position: 'relative', zIndex: 2 }}>
        <NavPill
          onHoverBtn={hoverBtn} onUnhover={unhover}
          scrollTo={scrollToSection}
          activeId={activeId}
          hide={Boolean(detail)}
          detailOpen={Boolean(detail)}
        />

        {/* Sections — always mounted to avoid mount/unmount burst on warp-out */}
        <div
          ref={sectionsWrapRef}
          className={sectionsRevealing ? 'sections-revealing' : ''}
          style={{
            opacity: detail ? 0 : (sectionsRevealing ? undefined : 1),
            pointerEvents: detail ? 'none' : 'auto',
          }}
        >
          <Hero       onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} reducedMotion={reducedMotion} />
          <About />
          <Projects   onHoverCard={hoverCard} onUnhover={unhover} onHoverBtn={hoverBtn} onOpenProject={openProject} />
          <Skills />
          <Experience onOpenExperience={openExperience} onHoverBtn={hoverBtn} onUnhover={unhover} />
          <Terminal   onViewSource={() => setShowSourceViewer(true)} />
          <Contact    onHoverBtn={hoverBtn} onUnhover={unhover} />
          <Footer />
        </div>
      </main>

      {/* Detail / warp overlay */}
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

      {/* Persistent widgets (hidden while detail is open) */}
      {!detail && <ChatWidget onHoverBtn={hoverBtn} onUnhover={unhover} scrollTo={scrollToSection} />}
      {!detail && <AstronautHUD activeId={activeId} />}
      <AudioVisualizer soundOn={soundOn} />

      {/* Dirty-lens smudge overlay */}
      {lensTexture && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 4, pointerEvents: 'none',
          backgroundImage: `url(${lensTexture})`, backgroundSize: 'cover',
          mixBlendMode: 'screen', opacity: 0.6,
        }} />
      )}

      {/* Sound toggle */}
      <SoundToggle
        soundOn={soundOn}
        onToggle={() => setSoundOn(s => !s)}
        onHoverBtn={hoverBtn}
        onUnhover={unhover}
        detailOpen={Boolean(detail)}
      />

      {/* Modals / overlays */}
      {showKeyboardHelp && <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />}
      {showSourceViewer && <SourceViewer onClose={() => setShowSourceViewer(false)} onHoverBtn={hoverBtn} onUnhover={unhover} />}
      {isOffline && <OfflineBanner />}
    </>
  );
}
