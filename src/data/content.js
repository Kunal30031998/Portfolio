/* =========================================================================
   Static content: all personal/project data is loaded from config.json.
   Edit src/config.json to customise the portfolio — no code changes needed.
   ========================================================================= */

import config from '../config.json';

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
