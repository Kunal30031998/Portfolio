import React from 'react';

/* Keyboard shortcuts cheat-sheet overlay — toggle with '?' key.
   Closed by pressing Escape or clicking the backdrop. */
export function KeyboardHelp({ onClose }) {
  const SHORTCUTS = [
    ['Space', 'Pause / resume animation'],
    ['?',     'Toggle this help panel'],
    ['H',     'Jump to Hero'],
    ['A',     'Jump to About'],
    ['P',     'Jump to Projects'],
    ['S',     'Jump to Skills'],
    ['E',     'Jump to Experience'],
    ['T',     'Jump to Terminal'],
    ['K',     'Jump to Contact'],
    ['C',     'Toggle Constellation mode'],
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        fontFamily: 'var(--font-mono)',
        color: 'rgba(0,255,200,0.9)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          border: '1px solid rgba(0,255,200,0.25)', borderRadius: 12,
          padding: '32px 48px', minWidth: 360,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, marginBottom: 20, opacity: 0.5, letterSpacing: '0.1em' }}>
          KEYBOARD SHORTCUTS
        </div>

        {SHORTCUTS.map(([key, desc]) => (
          <div key={key} style={{ display: 'flex', gap: 24, marginBottom: 10, fontSize: 12 }}>
            <span style={{
              background: 'rgba(0,255,200,0.12)',
              border: '1px solid rgba(0,255,200,0.3)',
              borderRadius: 4, padding: '2px 8px',
              minWidth: 40, textAlign: 'center',
            }}>
              {key}
            </span>
            <span style={{ opacity: 0.7 }}>{desc}</span>
          </div>
        ))}

        <div style={{ marginTop: 20, opacity: 0.35, fontSize: 11 }}>
          Click anywhere to close
        </div>
      </div>
    </div>
  );
}
