import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Rocket } from 'lucide-react';

/* -----------------------------------------------------------------------
   DetailPage — full-view "warp jump" destination for a project or
   experience. Not a modal. Three.js scene is already transitioning to a
   black-hole environment via envMode; this component paints the readable
   content and kicks off a CSS warp-streak overlay on entry.
   Layout:
     - Sticky dock (return + mission label + orbital)
     - Hero panel (eyebrow + title + headline + tags)
     - Pillar grid:
         Projects     → Problem, Solution, Impact (+ Role / Ownership)
         Experience   → Scope, Wins, Stack (+ Role context)
   ----------------------------------------------------------------------- */
export function DetailPage({ open, kind, item, planet, onBack, onDismiss, onHoverBtn, onUnhover }) {
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef(null);

  const handleBack = useCallback(() => {
    // Fire 3D release immediately so planet starts returning while overlay fades
    onBack?.();
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      onDismiss?.();
    }, 480);
  }, [onBack, onDismiss]);

  // Clean up timer if unmounted mid-animation
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Reset closing state whenever a new detail opens
  useEffect(() => { if (open) setClosing(false); }, [open]);
  const safe = useMemo(() => {
    if (!item) return null;
    const title = item.title ?? '';
    const subtitle = kind === 'project' ? 'PROJECT · WARP LOG' : 'EXPERIENCE · WARP LOG';
    const headline = item.detail?.headline;
    const tags = kind === 'project' ? item.tags : item.detail?.stack;
    const when = item.when;
    const problemText = kind === 'project'
      ? (item.problem || '').replace(/^\/\/\s*problem:\s*/i, '')
      : null;
    const pillars =
      kind === 'project'
        ? [
            {
              label: 'Problem',
              kind: 'problem',
              className: 'pillar-problem',
              items: problemText ? [problemText] : [],
              body: item.body,
            },
            {
              label: 'Solution',
              kind: 'solution',
              items: item.detail?.highlights || [],
            },
            {
              label: 'Ownership',
              kind: 'impact',
              className: 'pillar-impact',
              items: item.detail?.whatIPersonalOwned || [],
            },
          ]
        : [
            {
              label: 'Scope',
              kind: 'solution',
              items: item.detail?.scope || [],
              body: item.body,
            },
            {
              label: 'Wins',
              kind: 'impact',
              className: 'pillar-impact',
              items: item.detail?.wins || [],
            },
            {
              label: 'Stack',
              kind: 'stack',
              items: item.detail?.stack || [],
              asChips: true,
            },
          ];
    const roles = kind === 'project' ? item.detail?.role || [] : [];
    return { title, subtitle, headline, tags, when, pillars, roles, problemText };
  }, [kind, item]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('detail-open');
    const onKey = (e) => { if (e.key === 'Escape') handleBack(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('detail-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open, handleBack]);

  if (!open || !safe) return null;

  const pr = planet?.rgb?.[0] ?? 150;
  const pg = planet?.rgb?.[1] ?? 120;
  const pb = planet?.rgb?.[2] ?? 220;

  return (
    <>
      <div
        className={`detail-wrap${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={safe.title}
        data-lenis-prevent
        style={{ '--pr': String(pr), '--pg': String(pg), '--pb': String(pb) }}
      >
        {/* Sticky command dock — constrained to the right panel */}
        <div className="detail-dock">
          <button
            onMouseEnter={onHoverBtn}
            onMouseLeave={onUnhover}
            onClick={handleBack}
            className="skeuo-btn font-mono"
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              cursor: 'none',
              color: 'var(--accent)',
              borderColor: 'rgba(167,231,243,0.28)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: '0.18em',
              fontSize: 11,
              textTransform: 'uppercase',
            }}
          >
            <ArrowLeft size={15} strokeWidth={1.7} />
            Return to journey
          </button>

          <div
            className="font-mono"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--text-faint)',
              fontSize: 10.5,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              paddingRight: 12,
            }}
          >
            <span className="skeuo-led warp pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%' }} />
            {safe.subtitle}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="detail-side">

        {/* Hero */}
        <div className="detail-grid" style={{ marginBottom: 18 }}>
          <div className="glass-card railed detail-hero span-3">
            <div className="detail-eyebrow">
              <Rocket size={13} strokeWidth={1.6} />
              {kind === 'project' ? 'Hyperspace · Case File' : 'Hyperspace · Timeline Log'}
            </div>
            <h1 className="detail-title grad-text-warp">{safe.title}</h1>

            {safe.when && (
              <div
                className="font-mono"
                style={{
                  color: 'var(--accent)',
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  marginTop: 14,
                }}
              >
                {safe.when}
              </div>
            )}

            {safe.headline && <div className="detail-headline">{safe.headline}</div>}

            {Array.isArray(safe.tags) && safe.tags.length ? (
              <div className="detail-meta-row">
                {safe.tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono skeuo-chip"
                    style={{
                      padding: '6px 12px',
                      color: 'var(--accent)',
                      fontSize: 11,
                      borderRadius: 999,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            {safe.roles.length ? (
              <div
                className="font-mono"
                style={{
                  marginTop: 18,
                  color: 'var(--text-dim)',
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  lineHeight: 1.6,
                }}
              >
                <span style={{ color: 'var(--text-faint)', letterSpacing: '0.3em', marginRight: 10 }}>ROLE</span>
                {safe.roles.join('  ·  ')}
              </div>
            ) : null}
          </div>
        </div>

        {/* Planet context — shows which body in the solar system this entry maps to */}
        {planet && (
          <div className="detail-grid" style={{ marginBottom: 14 }}>
            <div
              className="glass-card span-3"
              style={{
                padding: '14px 22px',
                display: 'flex', alignItems: 'center', gap: 18,
                borderLeft: `2px solid rgba(${pr},${pg},${pb},0.55)`,
                background: `rgba(${pr},${pg},${pb},0.05)`,
              }}
            >
              <div style={{
                fontSize: 40, lineHeight: 1, minWidth: 44, textAlign: 'center',
                filter: `drop-shadow(0 0 10px rgba(${pr},${pg},${pb},0.7))`,
              }}>{planet.symbol}</div>
              <div style={{ flex: 1 }}>
                <div
                  className="font-mono"
                  style={{ color: `rgb(${pr},${pg},${pb})`, fontSize: 10,
                    letterSpacing: '0.38em', textTransform: 'uppercase', marginBottom: 7 }}
                >
                  Currently orbiting · {planet.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
                  {planet.facts.map((f, i) => (
                    <span key={i} className="font-mono" style={{ color: 'var(--text-dim)', fontSize: 11.5, letterSpacing: '0.02em' }}>
                      <span style={{ color: `rgb(${pr},${pg},${pb})`, marginRight: 5, opacity: 0.8 }}>·</span>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pillars */}
        <div className="detail-grid pillars">
          {safe.pillars.map((p) => (
            <div key={p.label} className={`glass-card pillar ${p.className || ''}`}>
              <div className="pillar-label">
                <span className="dot" />
                {p.label}
              </div>

              {p.body && (
                <div
                  className="font-display"
                  style={{
                    marginTop: 14,
                    color: 'var(--text)',
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  {p.body}
                </div>
              )}

              {p.asChips ? (
                <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(p.items || []).map((it) => (
                    <span
                      key={it}
                      className="font-mono skeuo-chip"
                      style={{
                        padding: '6px 12px',
                        color: 'var(--accent)',
                        fontSize: 11,
                        borderRadius: 999,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              ) : (p.items || []).length ? (
                <ul className="pillar-list">
                  {p.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        {/* Footer return */}
        <div style={{ margin: '28px 0 0', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onMouseEnter={onHoverBtn}
            onMouseLeave={onUnhover}
            onClick={handleBack}
            className="skeuo-btn warp font-mono"
            style={{
              padding: '14px 22px',
              borderRadius: 999,
              cursor: 'none',
              color: 'var(--warp)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              letterSpacing: '0.22em',
              fontSize: 11,
              textTransform: 'uppercase',
            }}
          >
            <ArrowLeft size={15} strokeWidth={1.7} />
            Warp back to main journey
          </button>
        </div>

        </div> {/* end detail-side */}
      </div>
    </>
  );
}
