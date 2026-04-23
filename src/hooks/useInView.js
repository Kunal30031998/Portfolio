import { useEffect, useState } from 'react';

/* Sticky intersection-observer hook: flips to true the first time the
   referenced node crosses the threshold and stays true. */
export function useInView(ref, opts = { threshold: 0.2 }) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, opts);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, opts]);
  return inView;
}
