import React, { useRef } from 'react';

/* Wraps children in a div that follows the cursor within the button
   rectangle — classic Active-Theory magnetic CTA feel. */
export function Magnetic({ children, className = '', onHover, onLeave, ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    ref.current.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = 'translate(0,0)'; onLeave && onLeave(); };
  return (
    <div ref={ref} className={`magnetic ${className}`} onMouseMove={onMove} onMouseLeave={leave} onMouseEnter={onHover} {...rest}>
      {children}
    </div>
  );
}
