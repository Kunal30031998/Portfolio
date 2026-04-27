import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const projectsDir = path.join(publicDir, 'projects');
const experienceDir = path.join(publicDir, 'experience');

const configPath = path.join(root, 'src', 'config.json');
const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);

const owner = config.owner || {};
const projects = config.projects || [];
const experiences = config.experience || [];
const siteUrl = (process.env.SITE_URL || 'https://portfolio.kunal-gautam-570.workers.dev').replace(/\/$/, '');
const lastmod = new Date().toISOString().slice(0, 10);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderBasePage({ title, description, canonicalPath, heading, subheading, chips, paragraphs, listTitle, listItems, ctaHref }) {
  const canonical = `${siteUrl}${canonicalPath}`;
  const chipsHtml = (chips || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('');
  const paragraphsHtml = (paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('\n');
  const listHtml = (listItems || []).map((i) => `<li>${esc(i)}</li>`).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${esc(siteUrl)}/og-image.svg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(siteUrl)}/og-image.svg" />
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: title,
      description,
      url: canonical,
      author: {
        '@type': 'Person',
        name: owner.fullName,
        url: siteUrl,
        sameAs: [owner.githubUrl, owner.linkedinUrl].filter(Boolean)
      }
    })}</script>
    <style>
      :root { color-scheme: dark; }
      html, body {
        margin: 0;
        padding: 0;
        background: radial-gradient(circle at 20% 20%, #0e1630 0%, #040814 45%, #020408 100%);
        color: #e8edf5;
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      .wrap { max-width: 900px; margin: 0 auto; padding: 56px 20px 72px; }
      h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0 0 8px; }
      .sub { color: #9db2cf; margin: 0 0 24px; font-size: 1.05rem; }
      .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; }
      .chip {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        border: 1px solid rgba(100, 255, 218, 0.35);
        color: #8be7d8;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
      }
      p { color: #d7e0ef; line-height: 1.7; font-size: 1.02rem; }
      h2 { margin-top: 30px; font-size: 1.2rem; color: #d8e9ff; letter-spacing: 0.02em; }
      ul { margin-top: 8px; color: #c8d7ea; line-height: 1.7; }
      a { color: #7cd3ff; }
      .cta {
        margin-top: 34px;
        display: inline-flex;
        gap: 10px;
        align-items: center;
        border: 1px solid rgba(124, 211, 255, 0.4);
        border-radius: 999px;
        padding: 10px 16px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>${esc(heading)}</h1>
      <p class="sub">${esc(subheading)}</p>
      <div class="chips">${chipsHtml}</div>
      ${paragraphsHtml}
      <h2>${esc(listTitle)}</h2>
      <ul>${listHtml}</ul>
      <a class="cta" href="${esc(ctaHref)}">Open Interactive Portfolio View</a>
      <p style="margin-top:26px; color:#90a2bd;">See full portfolio: <a href="${esc(siteUrl)}/">${esc(siteUrl)}</a></p>
    </main>
  </body>
</html>`;
}

function writeProjectPages() {
  for (const p of projects) {
    const pageDir = path.join(projectsDir, p.id);
    ensureDir(pageDir);
    const relPath = `/projects/${p.id}/`;
    const html = renderBasePage({
      title: `${p.title} | Project Case Study | ${owner.fullName}`,
      description: p.detail?.headline || p.body || `${p.title} project by ${owner.fullName}`,
      canonicalPath: relPath,
      heading: p.title,
      subheading: p.detail?.headline || p.body || 'Project overview',
      chips: p.tags || [],
      paragraphs: [
        p.body,
        (p.problem || '').replace(/^\/\/\s*problem:\s*/i, '')
      ].filter(Boolean),
      listTitle: 'Highlights',
      listItems: p.detail?.highlights || [],
      ctaHref: `/?project=${p.id}`
    });
    fs.writeFileSync(path.join(pageDir, 'index.html'), html);
  }
}

function writeExperiencePages() {
  for (const e of experiences) {
    const pageDir = path.join(experienceDir, e.id);
    ensureDir(pageDir);
    const relPath = `/experience/${e.id}/`;
    const html = renderBasePage({
      title: `${e.title} | Experience | ${owner.fullName}`,
      description: e.detail?.headline || e.body || `${e.title} experience by ${owner.fullName}`,
      canonicalPath: relPath,
      heading: e.title,
      subheading: e.when || 'Career experience',
      chips: e.detail?.stack || [],
      paragraphs: [e.body, e.detail?.headline].filter(Boolean),
      listTitle: 'Key Wins',
      listItems: e.detail?.wins || [],
      ctaHref: `/?experience=${e.id}`
    });
    fs.writeFileSync(path.join(pageDir, 'index.html'), html);
  }
}

function writeSitemap() {
  const urls = [
    '/',
    ...projects.map((p) => `/projects/${p.id}/`),
    ...experiences.map((e) => `/experience/${e.id}/`)
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${siteUrl}${u}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${u === '/' ? '1.0' : '0.8'}</priority>\n  </url>`).join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
}

resetDir(projectsDir);
resetDir(experienceDir);
writeProjectPages();
writeExperiencePages();
writeSitemap();
console.log(`Generated ${projects.length} project pages, ${experiences.length} experience pages, and sitemap.`);
