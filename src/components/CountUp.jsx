import React, { useEffect, useState } from 'react';

/* Animates 0 → `to` once `trigger` becomes truthy. `to` can also be a
   non-numeric value, in which case it is rendered as-is. */
export function CountUp({ to, suffix = '', duration = 1600, trigger }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    if (typeof to !== 'number') { setVal(to); return; }
    let start;
    let raf;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      setVal(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [trigger, to, duration]);
  return <span style={{ fontVariantNumeric: 'tabular-nums', display: 'inline-block', minWidth: '1ch' }}>{typeof to === 'number' ? val : to}{suffix}</span>;
}
