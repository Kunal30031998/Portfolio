import { useEffect, useRef } from 'react';

/* =========================================================================
   useSoundManager — all audio in one place.

   Manages:
   - Ambient background music with gesture-gated autoplay
   - Mute/unmute in sync with the soundOn React state
   - Doppler pitch shift on scroll speed
   - Per-planet resonance tones that fade in/out on orbit-lock
   - Spatial stereo panning following mouse/device tilt
   - SFX engine (window._sfx) for click + key sounds
   - Global button click sound wired via event delegation

   Returns { audioRef } so the parent can pass it to <AudioVisualizer />.
   ========================================================================= */
export function useSoundManager({ ready, soundOn, threeRef }) {
  const audioRef  = useRef(null);
  const soundRef2 = useRef(soundOn); // sync mirror — avoids stale closure in gesture handler

  /* ---- Ambient sound: HTML audio element ---- */
  useEffect(() => {
    const audio = new Audio('/deepState.mp3');
    audio.loop = true;
    audio.volume = 0.7;
    audio.crossOrigin = 'anonymous'; // required for Web Audio API AnalyserNode
    audioRef.current = audio;
    window._portfolioAudio = audio;

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

  // Doppler pitch shift on scroll velocity — ambient track pitch rises during fast scroll
  useEffect(() => {
    if (!ready) return;
    let _prevScroll = window.scrollY;
    let _pitchTarget = 1.0;
    let _rafId;
    const tick = () => {
      const audio = window._portfolioAudio;
      if (audio) {
        const vel = Math.abs(window.scrollY - _prevScroll);
        _prevScroll = window.scrollY;
        _pitchTarget = 1.0 + Math.min(vel / 120, 0.18); // max +18% pitch
        // Smooth converge
        const cur = audio.playbackRate ?? 1;
        audio.playbackRate = cur + (_pitchTarget - cur) * 0.08;
        // Decay back to 1.0 when still
        _pitchTarget = 1.0 + (_pitchTarget - 1.0) * 0.88;
      }
      _rafId = requestAnimationFrame(tick);
    };
    _rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(_rafId);
  }, [ready]);

  // Per-planet ambient tones — Web Audio oscillators, fade in/out with orbit-lock
  useEffect(() => {
    if (!ready) return;
    // Planet tone frequencies (Hz) — each planet gets a characteristic resonance
    const PLANET_TONES = [
      { freq: 196,  type: 'sine',     gain: 0.04, detune: 0    }, // Mercury — thin sine
      { freq: 110,  type: 'sine',     gain: 0.05, detune: 12   }, // Venus   — warm low
      { freq: 164,  type: 'sine',     gain: 0.06, detune: 0    }, // Earth   — ocean hum
      { freq: 82,   type: 'sawtooth', gain: 0.025,detune: 0    }, // Mars    — rumble
      { freq: 55,   type: 'sine',     gain: 0.05, detune: -7   }, // Jupiter — bass
      { freq: 73.4, type: 'triangle', gain: 0.045,detune: 0    }, // Saturn  — ring harmonic
      { freq: 138,  type: 'sine',     gain: 0.04, detune: 5    }, // Uranus  — icy tone
      { freq: 98,   type: 'sine',     gain: 0.04, detune: -5   }, // Neptune — deep
    ];
    let _toneCtx = null, _oscNodes = [];
    let _currentPlanetIdx = -1;

    const buildTones = () => {
      const ctx = window._portfolioAudioCtx;
      if (!ctx) return false;
      _toneCtx = ctx;
      _oscNodes = PLANET_TONES.map((cfg) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = cfg.type;
        osc.frequency.value = cfg.freq;
        osc.detune.value = cfg.detune;
        gain.gain.value = 0; // start silent
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        return { osc, gain, maxGain: cfg.gain };
      });
      return true;
    };

    const _pollId = setInterval(() => {
      if (buildTones()) clearInterval(_pollId);
    }, 600);

    // Check orbitLock each animation frame and fade tones accordingly
    let _rafId2;
    const _toneTick = () => {
      const _ol = threeRef.current.orbitLock;
      const lockedIdx = (_ol?.active && _ol?.planetIdx >= 0) ? _ol.planetIdx : -1;
      if (lockedIdx !== _currentPlanetIdx) _currentPlanetIdx = lockedIdx;
      _oscNodes.forEach((n, i) => {
        if (!n) return;
        const target = (i === lockedIdx) ? n.maxGain : 0;
        const cur = n.gain.gain.value;
        n.gain.gain.value = cur + (target - cur) * 0.04; // smooth fade
      });
      _rafId2 = requestAnimationFrame(_toneTick);
    };
    _rafId2 = requestAnimationFrame(_toneTick);

    return () => {
      clearInterval(_pollId);
      cancelAnimationFrame(_rafId2);
      _oscNodes.forEach(n => { try { n?.osc.stop(); n?.osc.disconnect(); n?.gain.disconnect(); } catch(_) {} });
    };
  }, [ready]);

  // Spatial audio panning — follows mouse X (desktop) or device tilt (mobile)
  useEffect(() => {
    const onMousePan = (e) => {
      const p = window._portfolioPanner;
      if (!p) return;
      const norm = (e.clientX / window.innerWidth) * 2 - 1; // -1..+1
      p.pan.value += (norm * 0.28 - p.pan.value) * 0.08;    // smooth lerp
    };
    const onDeviceOrientation = (e) => {
      const p = window._portfolioPanner;
      if (e.gamma === null) return;
      const tiltX = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
      if (p) p.pan.value += (tiltX * 0.28 - p.pan.value) * 0.08;
    };
    window.addEventListener('mousemove', onMousePan, { passive: true });

    // iOS 13+ requires explicit permission for DeviceOrientationEvent.
    // Request it on first touchstart (a valid user gesture).
    let orientationAttached = false;
    const attachOrientation = () => {
      if (orientationAttached) return;
      orientationAttached = true;
      const DOE = window.DeviceOrientationEvent;
      if (typeof DOE?.requestPermission === 'function') {
        DOE.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', onDeviceOrientation);
            }
          })
          .catch(() => {});
      } else {
        // Android / desktop — no permission needed
        window.addEventListener('deviceorientation', onDeviceOrientation);
      }
    };
    window.addEventListener('touchstart', attachOrientation, { once: true, passive: true });

    return () => {
      window.removeEventListener('mousemove', onMousePan);
      window.removeEventListener('deviceorientation', onDeviceOrientation);
      window.removeEventListener('touchstart', attachOrientation);
    };
  }, []);

  // Global button click sound — catches all skeuo-btn and nav clicks
  useEffect(() => {
    const onGlobalClick = (e) => {
      const el = e.target?.closest('button, [role="button"]');
      if (el) window._sfx?.click();
    };
    window.addEventListener('click', onGlobalClick);
    return () => window.removeEventListener('click', onGlobalClick);
  }, []);

  // SFX engine
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

  return { audioRef };
}
