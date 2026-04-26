/* =========================================================================
   Static content: all personal/project data is loaded from config.json.
   Edit src/config.json to customise the portfolio — no code changes needed.
   ========================================================================= */

import config from '../config.json';

export const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
  'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js'
];

export const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });

// Re-export config for sections that need owner/hero/about/contact data
export { config };

export const PROJECTS         = config.projects;
export const EXPERIENCE       = config.experience;
export const SKILL_GROUPS     = config.skills;
export const TERMINAL_SCRIPT  = config.terminal.script;
export const CHAT_SUGGESTIONS = config.chat.suggestions;
export const SYSTEM_PROMPT    = config.chat.systemPrompt;

/* Local fallback "brain" — responses driven by config.chat.localBrainResponses */
export function localBrain(q) {
  const s = q.toLowerCase();
  for (const r of config.chat.localBrainResponses) {
    if (r.fallback) continue;
    if (r.keywords.some(k => s.includes(k))) return { message: r.message, scrollTo: r.scrollTo };
  }
  const fallback = config.chat.localBrainResponses.find(r => r.fallback);
  return fallback
    ? { message: fallback.message, scrollTo: fallback.scrollTo }
    : { message: 'Ask me anything.', scrollTo: null };
}
