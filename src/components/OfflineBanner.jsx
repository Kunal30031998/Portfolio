import React from 'react';

/* Offline indicator — shown when navigator goes offline.
   Relies on the window 'online' / 'offline' events wired in Portfolio. */
export function OfflineBanner() {
  return (
    <div style={{
      position: 'fixed', bottom: 16, left: 16, zIndex: 999,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,200,0,0.4)', borderRadius: 6,
      padding: '6px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11, color: '#ffcc00',
    }}>
      ◌ viewing offline · cached version
    </div>
  );
}
