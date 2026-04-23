import { useEffect, useState } from 'react';

/* Cycles a list of words with a typewriter effect: type -> hold -> delete. */
export function useTypewriter(words, typeSpeed = 90, deleteSpeed = 50, pause = 1400) {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[i % words.length];
    let t;
    if (!del && text === w) t = setTimeout(() => setDel(true), pause);
    else if (del && text === '') { setDel(false); setI(n => n + 1); }
    else t = setTimeout(() => {
      setText(del ? w.slice(0, text.length - 1) : w.slice(0, text.length + 1));
    }, del ? deleteSpeed : typeSpeed);
    return () => clearTimeout(t);
  }, [text, del, i, words, typeSpeed, deleteSpeed, pause]);
  return text;
}
