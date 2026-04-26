import React from 'react';

/* Sound on/off toggle button — fixed top-right corner.
   Renders a speaker SVG icon with waves when on, muted X when off. */
export function SoundToggle({ soundOn, onToggle, onHoverBtn, onUnhover, detailOpen }) {
  return (
    <button
      type="button"
      onMouseEnter={onHoverBtn}
      onMouseLeave={onUnhover}
      onClick={onToggle}
      title={soundOn ? 'Mute ambient sound' : 'Enable ambient sound'}
      aria-pressed={soundOn}
      style={{
        position: 'fixed',
        top: detailOpen ? 78 : 20,
        right: 22,
        zIndex: 9999,
        width: 42, height: 42,
        borderRadius: '50%',
        background: soundOn
          ? 'radial-gradient(circle at 50% 40%, rgba(167,231,243,0.18), rgba(2,4,10,0.88) 70%)'
          : 'rgba(2,4,10,0.72)',
        border: `1px solid ${soundOn ? 'rgba(167,231,243,0.5)' : 'rgba(167,231,243,0.18)'}`,
        boxShadow: soundOn ? '0 0 18px rgba(167,231,243,0.2)' : 'none',
        backdropFilter: 'blur(10px)',
        cursor: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.3s, box-shadow 0.3s, top 300ms ease',
      }}
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
  );
}
