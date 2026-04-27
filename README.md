# Astral Portfolio

Cinematic WebGL portfolio inspired by activetheory.net. Single-file React artifact in `src/Portfolio.jsx` that loads Three.js, GSAP, ScrollTrigger, and Lenis from CDNs at runtime.

## Run

```bash
npm install
npm run dev
```

## Customising the template

All personal content lives in one file — **`src/config.json`**. No code changes needed.

| Section | Keys to edit |
|---------|-------------|
| Your identity | `owner.firstName`, `owner.lastName`, `owner.email`, `owner.phone`, `owner.githubUrl`, `owner.linkedinUrl` |
| Hero | `hero.eyebrow`, `hero.typewriterWords` |
| About | `about.bioLines`, `about.stats`, `about.availabilityText` |
| Contact | `contact.heading`, `contact.subheading` |
| Projects | `projects[]` — each entry has `id`, `title`, `problem`, `body`, `tags`, `detail` |
| Experience | `experience[]` — each entry has `id`, `when`, `title`, `body`, `detail` |
| Skills | `skills[]` — each entry has `title` (group name) and `items` |
| Terminal | `terminal.script[]` — `{cmd, out}` pairs for the auto-typing animation |
| Clara AI | `chat.suggestions`, `chat.systemPrompt`, `chat.localBrainResponses` |

### Minimal fork checklist
1. Edit `src/config.json` with your details.
2. Replace `/public/deepState.mp3` with your preferred ambient track (or remove the audio feature).
3. Update `owner.githubUrl` and `owner.linkedinUrl` to your actual profile URLs.
4. Update the `chat.systemPrompt` to describe you, not Kunal.

## Claude API (optional)

The chat widget calls `https://api.anthropic.com/v1/messages`. For a live demo without a backend:

```js
localStorage.setItem('ANTHROPIC_API_KEY', 'sk-ant-...');
```

Without a key, the widget falls back to `chat.localBrainResponses` in `config.json` — fully functional offline.

**Production:** proxy the call through your own server — do not ship keys to the browser.

## Secret commands (terminal section)

- `sudo hire kunal`
- `ls projects`
- `help` · `clear` · `whoami`

## License

This project is released under a **Personal Use License** — free to fork for your own portfolio, not for resale or commercial use. See [LICENSE](LICENSE) for full terms.

<!-- PORTFOLIO:START -->

## 🚀 Portfolio

Live: **[https://portfolio.kunal-gautam-570.workers.dev/](https://portfolio.kunal-gautam-570.workers.dev/)**

Interactive 3D portfolio with project case studies, experience timeline, and contact details.

<!-- PORTFOLIO:END -->
