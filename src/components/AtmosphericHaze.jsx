import React from 'react';

/* Per-planet atmospheric haze — a radial colour tint over the entire
   viewport when an orbit-locked planet is in focus.
   Invisible when lockedPlanetIdx is -1 or detailOpen is false. */

const ATMO_COLORS = [
  null,                        // Mercury — no atmosphere
  'rgba(232,180,80,0.07)',     // Venus   — sulfuric yellow
  'rgba(80,140,220,0.07)',     // Earth   — ocean blue
  'rgba(200,90,40,0.07)',      // Mars    — rust orange
  'rgba(200,160,100,0.06)',    // Jupiter — amber bands
  'rgba(210,190,120,0.06)',    // Saturn  — golden
  'rgba(130,210,230,0.07)',    // Uranus  — methane teal
  'rgba(70,110,220,0.07)',     // Neptune — deep blue
];

export function AtmosphericHaze({ lockedPlanetIdx, detailOpen }) {
  const hazeColor = lockedPlanetIdx >= 0 ? (ATMO_COLORS[lockedPlanetIdx] ?? null) : null;
  if (!hazeColor) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 30% 50%, ${hazeColor} 0%, transparent 70%)`,
        transition: 'opacity 1.2s ease',
        opacity: detailOpen ? 1 : 0,
      }}
    />
  );
}
