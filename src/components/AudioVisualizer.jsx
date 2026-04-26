import React, { useEffect, useRef, useState, useCallback } from 'react';

/* -------------------------------------------------------------------------
   AudioVisualizer — attaches a Web Audio AnalyserNode to the ambient audio
   element and renders a real-time frequency spectrum bar.
   - Only activates when music is playing + unmuted
   - Collapsed by default; small floating toggle in bottom-left corner
   - Minimalist bar style matching the space/astral theme
   ------------------------------------------------------------------------- */
const BAR_COUNT  = 48;
const BAR_GAP    = 2;
const BAR_WIDTH  = 3;
const VIZ_HEIGHT = 48;
const VIZ_WIDTH  = BAR_COUNT * (BAR_WIDTH + BAR_GAP);

export function AudioVisualizer({ soundOn }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const analyserRef = useRef(null);
  const dataRef   = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive]   = useState(false);
  const audioReadyRef = useRef(false); // true once _portfolioAudio is available

  // Build analyser ONLY during a user gesture (button click) so AudioContext is never suspended
  const buildAnalyser = useCallback(() => {
    const audio = window._portfolioAudio;
    if (!audio || analyserRef.current) return;
    try {
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      // ctx.resume() in case browser still suspends — safe to call; resolves immediately on gesture
      ctx.resume();
      const source   = ctx.createMediaElementSource(audio);

      // StereoPannerNode: HRTF-quality left/right panning driven by mouse/device tilt
      const stereoPanner = ctx.createStereoPanner();
      stereoPanner.pan.value = 0; // start centered
      window._portfolioPanner = stereoPanner;
      window._portfolioAudioCtx = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      // Chain: source → panner → analyser → destination
      source.connect(stereoPanner);
      stereoPanner.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      setActive(true);
    } catch (_) {
      // MediaElementSource can only be created once per element; silently skip if already used
    }
  }, []);

  // Poll until audio element is available — only set a ready flag, do NOT build AudioContext here
  useEffect(() => {
    if (window._portfolioAudio) { audioReadyRef.current = true; return; }
    const id = setInterval(() => {
      if (window._portfolioAudio) { audioReadyRef.current = true; clearInterval(id); }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Canvas draw loop
  useEffect(() => {
    if (!active || !expanded || !soundOn) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d  = canvas.getContext('2d');

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = analyserRef.current;
      const data     = dataRef.current;
      if (!analyser) return;

      analyser.getByteFrequencyData(data);

      ctx2d.clearRect(0, 0, VIZ_WIDTH, VIZ_HEIGHT);

      const bins = Math.min(BAR_COUNT, data.length);
      for (let i = 0; i < bins; i++) {
        const norm    = data[i] / 255;
        const barH    = Math.max(2, norm * VIZ_HEIGHT);
        const x       = i * (BAR_WIDTH + BAR_GAP);
        const y       = VIZ_HEIGHT - barH;

        // Color: low freq = warp purple, high freq = accent cyan
        const hue     = 185 + (1 - norm) * 100; // 185 cyan → 285 warp
        const alpha   = 0.4 + norm * 0.6;
        ctx2d.fillStyle = `hsla(${hue}, 90%, ${55 + norm * 20}%, ${alpha})`;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, BAR_WIDTH, barH, [1]);
        ctx2d.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, expanded, soundOn]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
        pointerEvents: 'auto',
      }}
    >
      {/* Spectrum canvas */}
      {expanded && soundOn && (
        <div style={{
          background: 'rgba(2,3,9,0.72)',
          border: '1px solid rgba(167,231,243,0.18)',
          borderRadius: 10,
          backdropFilter: 'blur(12px)',
          padding: '8px 10px 6px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div className="font-mono" style={{
            fontSize: 8,
            letterSpacing: '0.34em',
            color: 'var(--text-faint)',
            textTransform: 'uppercase',
            marginBottom: 5,
          }}>
            ◈ deepstate · live spectrum
          </div>
          <canvas
            ref={canvasRef}
            width={VIZ_WIDTH}
            height={VIZ_HEIGHT}
            style={{ display: 'block' }}
          />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => {
          if (audioReadyRef.current && !analyserRef.current) buildAnalyser();
          setExpanded(e => !e);
        }}
        title={expanded ? 'Hide spectrum' : 'Show audio spectrum'}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: expanded
            ? 'radial-gradient(circle at 50% 40%, rgba(167,231,243,0.18), rgba(2,4,10,0.88) 70%)'
            : 'rgba(2,4,10,0.72)',
          border: `1px solid ${expanded ? 'rgba(167,231,243,0.45)' : 'rgba(167,231,243,0.15)'}`,
          boxShadow: expanded ? '0 0 14px rgba(167,231,243,0.2)' : 'none',
          backdropFilter: 'blur(10px)',
          cursor: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Waveform icon */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect x="0"  y="4" width="2" height="4" rx="1" fill={`rgba(167,231,243,${expanded ? 0.9 : 0.4})`}/>
          <rect x="3"  y="1" width="2" height="10" rx="1" fill={`rgba(167,231,243,${expanded ? 0.9 : 0.4})`}/>
          <rect x="6"  y="3" width="2" height="6"  rx="1" fill={`rgba(167,231,243,${expanded ? 0.9 : 0.4})`}/>
          <rect x="9"  y="0" width="2" height="12" rx="1" fill={`rgba(167,231,243,${expanded ? 0.9 : 0.4})`}/>
          <rect x="12" y="4" width="2" height="4"  rx="1" fill={`rgba(167,231,243,${expanded ? 0.9 : 0.4})`}/>
        </svg>
      </button>
    </div>
  );
}
