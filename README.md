# activeTheoryPortfolio

Cinematic WebGL portfolio inspired by activetheory.net. Single-file React artifact in `src/Portfolio.jsx` that loads Three.js, GSAP, ScrollTrigger, and Lenis from CDNs at runtime.

## Run

```bash
npm install
npm run dev
```

## Claude API (optional)

The chat widget calls `https://api.anthropic.com/v1/messages` exactly as specified, but browsers require an API key + the dangerous-direct-browser-access header. For a live demo without a backend, drop a key at runtime:

```js
localStorage.setItem('ANTHROPIC_API_KEY', 'sk-ant-...');
```

Without a key, the widget falls back to a local "Kunal brain" that returns the same JSON shape (`{message, scrollTo}`) so every feature (including smooth scroll to sections) still works.

**Production:** proxy the call through your own server — do not ship keys to the browser.

## Secret commands (terminal section)

- `sudo hire kunal`
- `ls projects`
- `help` · `clear` · `whoami`
# Portfolio
