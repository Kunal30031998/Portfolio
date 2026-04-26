import React, { useEffect, useState, useRef } from 'react';

/* -------------------------------------------------------------------------
   AstronautHUD
   On section entry, a brief AR-style visor readout flashes in the bottom-left
   corner showing mission coordinates, O₂, and section name. Dismisses after 2.6s.
   ------------------------------------------------------------------------- */

const SECTION_DATA = {
  hero:       { label: 'LAUNCH PAD',   coords: 'SOL  0.0 AU',  mission: 'INIT',     o2: 98 },
  about:      { label: 'INNER SYSTEM', coords: 'SOL  0.4 AU',  mission: 'SURVEY',   o2: 97 },
  projects:   { label: 'ASTEROID BELT',coords: 'SOL  2.7 AU',  mission: 'SALVAGE',  o2: 94 },
  skills:     { label: 'GAS GIANTS',   coords: 'SOL  5.2 AU',  mission: 'ANALYSIS', o2: 91 },
  experience: { label: 'OUTER SYSTEM', coords: 'SOL 19.8 AU',  mission: 'ARCHIVE',  o2: 88 },
  terminal:   { label: 'DEEP FIELD',   coords: 'SOL 30.1 AU',  mission: 'DECRYPT',  o2: 85 },
  contact:    { label: 'COSMIC WEB',   coords: 'SOL ∞  AU',   mission: 'SIGNAL',   o2: 82 },
};

export function AstronautHUD({ activeId }) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState(SECTION_DATA.hero);
  const prevIdRef = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (prevIdRef.current === activeId) return;
    prevIdRef.current = activeId;
    const d = SECTION_DATA[activeId];
    if (!d) return;
    clearTimeout(timerRef.current);
    setData(d);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(timerRef.current);
  }, [activeId]);

  if (!data) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 80,
        left: 28,
        zIndex: 9100,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Corner bracket */}
      <div style={{
        position: 'absolute', top: -6, left: -6,
        width: 14, height: 14,
        borderTop: '1.5px solid rgba(167,231,243,0.7)',
        borderLeft: '1.5px solid rgba(167,231,243,0.7)',
      }} />
      <div style={{
        position: 'absolute', bottom: -6, right: -6,
        width: 14, height: 14,
        borderBottom: '1.5px solid rgba(167,231,243,0.7)',
        borderRight: '1.5px solid rgba(167,231,243,0.7)',
      }} />

      <div style={{
        background: 'rgba(2,4,12,0.62)',
        border: '1px solid rgba(167,231,243,0.22)',
        backdropFilter: 'blur(12px)',
        borderRadius: 6,
        padding: '10px 14px',
        minWidth: 200,
      }}>
        {/* Section label */}
        <div style={{
          fontSize: 8, letterSpacing: '0.42em', color: 'rgba(167,231,243,0.55)',
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          ◈ {data.mission} · SECTOR
        </div>
        <div style={{
          fontSize: 11, letterSpacing: '0.18em', color: 'var(--accent)',
          textTransform: 'uppercase', marginBottom: 8, fontWeight: 600,
        }}>
          {data.label}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 7.5, letterSpacing: '0.3em', color: 'rgba(167,231,243,0.4)', marginBottom: 2 }}>COORDS</div>
            <div style={{ fontSize: 9.5, color: 'rgba(167,231,243,0.85)', letterSpacing: '0.12em' }}>{data.coords}</div>
          </div>
          <div>
            <div style={{ fontSize: 7.5, letterSpacing: '0.3em', color: 'rgba(130,227,176,0.4)', marginBottom: 2 }}>O₂</div>
            <div style={{ fontSize: 9.5, color: 'var(--green)', letterSpacing: '0.12em' }}>{data.o2}%</div>
          </div>
          <div>
            <div style={{ fontSize: 7.5, letterSpacing: '0.3em', color: 'rgba(234,191,138,0.4)', marginBottom: 2 }}>TIME</div>
            <div style={{ fontSize: 9.5, color: 'var(--warm)', letterSpacing: '0.12em' }}>{new Date().toUTCString().slice(17, 22)} UTC</div>
          </div>
        </div>

        {/* Fake signal bar */}
        <div style={{ display: 'flex', gap: 2, marginTop: 8, alignItems: 'flex-end', height: 10 }}>
          {[3,5,7,9,7,4,6,8,5,3].map((h, i) => (
            <div key={i} style={{
              width: 3, height: h,
              background: i < 7 ? 'rgba(167,231,243,0.6)' : 'rgba(167,231,243,0.18)',
              borderRadius: 1,
              animation: `hudBar${i % 3} 0.8s ease-in-out ${i * 0.07}s infinite alternate`,
            }} />
          ))}
          <span style={{ fontSize: 7, letterSpacing: '0.25em', color: 'rgba(167,231,243,0.35)', marginLeft: 4 }}>SIGNAL</span>
        </div>
      </div>
    </div>
  );
}
