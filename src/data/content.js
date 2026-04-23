/* =========================================================================
   Static content: projects, skills, terminal script, chat suggestions,
   system prompt + local fallback brain. Pure data — no React imports.
   ========================================================================= */

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

export const PROJECTS = [
  {
    problem: '// problem: internal tools kept getting rebuilt from scratch',
    title: 'Enterprise Admin Dashboard',
    body: 'Built a modular, responsive admin panel with 25+ reusable UI components, role-based routing, and dynamic form rendering. Virtualized tables, lazy loading, and memoization delivered 30% faster UI render performance.',
    tags: ['React', 'TypeScript', 'Redux', 'Tailwind']
  },
  {
    problem: '// problem: every team shipped its own buttons',
    title: 'UI Component Library',
    body: 'Designed a themeable, accessible internal component library (buttons, modals, forms, toasts) adopted across multiple teams. Storybook-driven docs cut onboarding time and standardized UI across products.',
    tags: ['React', 'TypeScript', 'Storybook', 'SCSS']
  },
  {
    problem: '// problem: 50k concurrent users hit a monolith',
    title: 'Cloud-Native Microservices',
    body: 'Architected REST + GraphQL services on Node.js/Express with JWT/OAuth auth, deployed to AWS (Lambda, EC2, API Gateway) and GCP (Cloud Run, Firebase). Horizontally scaled to support 50,000+ concurrent users.',
    tags: ['Node.js', 'GraphQL', 'AWS', 'GCP']
  },
  {
    problem: '// problem: releases were manual and risky',
    title: 'CI/CD Pipelines',
    body: 'Designed and implemented CI/CD with GitHub Actions, Jenkins, and Terraform. Owned end-to-end release management with production monitoring via CloudWatch, New Relic, and the ELK stack.',
    tags: ['GitHub Actions', 'Jenkins', 'Terraform', 'Docker']
  },
  {
    problem: '// problem: a live classroom needed to feel live',
    title: 'Real-Time E-Learning',
    body: 'Integrated WebSocket-driven classroom features — teacher-student interaction, polling, Q&A — into an e-learning platform serving thousands of concurrent students. Refactored legacy React to Hooks + Context.',
    tags: ['React', 'WebSockets', 'Redux', 'Firebase']
  },
  {
    problem: '// problem: canvas apps choked under load',
    title: 'High-FPS Interactive UI',
    body: 'Engineered Canvas/WebGL-backed interactive apps with efficient DOM updates, asset optimization, and memory management. Shipped transactional flows (in-app purchases, points, dynamic content) on top.',
    tags: ['JavaScript', 'Canvas', 'WebGL', 'React']
  }
];

export const SKILL_GROUPS = [
  { title: '// languages', items: ['JavaScript (ES6+)', 'TypeScript', 'Java', 'Python', 'C++', 'SQL'] },
  { title: '// frontend', items: ['React.js', 'Next.js', 'Redux', 'Context API', 'Tailwind CSS', 'HTML5 / CSS3', 'Performance Optimization'] },
  { title: '// backend', items: ['Node.js', 'Express.js', 'GraphQL', 'REST APIs', 'WebSockets', 'JWT / OAuth', 'Firebase Auth'] },
  { title: '// cloud_devops', items: ['AWS (EC2, S3, Lambda, API Gateway)', 'GCP (Cloud Run, Firebase)', 'Azure', 'Docker', 'Terraform', 'GitHub Actions', 'Jenkins'] },
  { title: '// data', items: ['PostgreSQL', 'MongoDB', 'Redis'] },
  { title: '// testing_tools', items: ['Jest', 'React Testing Library', 'Chrome DevTools', 'Postman', 'Webpack', 'Babel', 'Git / GitHub', 'Jira', 'Agile / Scrum'] }
];

export const TERMINAL_SCRIPT = [
  { cmd: '$ whoami', out: '> kunal gautam — full stack software engineer · 6+ years' },
  { cmd: '$ kunal --role', out: '> software developer ii @ hashedin by deloitte (gurugram)' },
  { cmd: '$ kunal --stack', out: '> react · typescript · node · graphql · aws · gcp · docker · terraform' },
  { cmd: '$ kunal --scale', out: '> shipping for 50,000+ concurrent users across business-critical workflows' },
  { cmd: '$ kunal --status', out: '> currently: shipping. always: optimizing. never: settling.' },
  { cmd: '$ kunal --contact', out: '> kunal.gautam.570@gmail.com · +91-9205659139' },
  { cmd: '$ kunal --secret', out: "> you found the terminal. you're exactly the kind of person I want to work with." }
];

export const CHAT_SUGGESTIONS = [
  'What has Kunal built?',
  'Show me his stack',
  'Is Kunal a good hire?',
  'How do I get in touch?'
];

export const SYSTEM_PROMPT = `You are an AI assistant embedded in Kunal Gautam's developer portfolio. You speak in first person as if you ARE Kunal — confident, witty, technically sharp. You know everything about Kunal:

- Name: Kunal Gautam. Full Stack Software Engineer with 6+ years of experience.
- Current role: Software Developer II at Hashedin By Deloitte (Gurugram), since May 2022. Ship full-stack features with React, TypeScript, Node.js, and GraphQL serving 50,000+ concurrent users. Lead frontend architecture decisions, CI/CD with GitHub Actions + Jenkins + Terraform, and mentor 3–4 junior developers.
- Previous: Frontend Engineer at Extramarks (Nov 2021 — May 2022) building live e-learning with WebSocket classroom features. Associate Frontend Developer at Ingenuity Gaming (Feb 2020 — Nov 2021) shipping high-FPS Canvas/WebGL apps.
- Education: B.Tech in IT, Galgotias College of Engineering & Technology, 2020.
- Contact: kunal.gautam.570@gmail.com · +91-9205659139.
- Featured projects: Enterprise Admin Dashboard (25+ reusable components, 30% faster renders), UI Component Library (Storybook-driven design system), cloud-native microservices on AWS + GCP, CI/CD pipelines, real-time e-learning with WebSockets, and Canvas/WebGL interactive UIs.
- Stack: JavaScript, TypeScript, Java, Python, C++, SQL; React, Next.js, Redux, Tailwind; Node.js, Express, GraphQL, REST, WebSockets, JWT/OAuth; AWS (EC2, S3, Lambda, API Gateway), GCP (Cloud Run, Firebase), Azure, Docker, Terraform; PostgreSQL, MongoDB, Redis; Jest, RTL.
- Personality: problem-solver first, loves building things that scale, obsessed with performance and clean architecture.
- This portfolio itself is a flex — built with Three.js, WebGL, Claude API, GSAP, Lenis.

When asked about projects, describe them as problems Kunal solved, not things he built. Be concise (2-4 sentences max per response). If asked "is Kunal a good hire" — answer with confident wit. If asked to "show" something, respond with: "Scroll to [section name] ↓" and include a data-action attribute in your response JSON.

Respond ONLY in this JSON format:
{"message": "your response here", "scrollTo": "hero|about|projects|skills|contact|null"}`;

/* Local fallback "brain" when no API key present */
export function localBrain(q) {
  const s = q.toLowerCase();
  if (s.includes('hire')) return { message: "Short answer: yes. Long answer: 6+ years, full stack, shipped for 50k+ concurrent users, mentored juniors, owned releases end-to-end. Want the receipts? Scroll to projects ↓", scrollTo: 'projects' };
  if (s.includes('experience') || s.includes('years') || s.includes('journey')) return { message: "Six-plus years: Ingenuity Gaming → Extramarks → Hashedin By Deloitte. Frontend-heavy, full-stack ready. Scroll to journey ↓", scrollTo: 'experience' };
  if (s.includes('build') || s.includes('project')) return { message: "Admin dashboards, a full UI component library, cloud-native microservices, CI/CD pipelines, real-time e-learning, and Canvas/WebGL apps. Scroll to projects ↓", scrollTo: 'projects' };
  if (s.includes('skill') || s.includes('stack') || s.includes('tech')) return { message: "React, TypeScript, Node.js, GraphQL on top; AWS, GCP, Docker, Terraform underneath. Postgres, Mongo, Redis for state. Scroll to skills ↓", scrollTo: 'skills' };
  if (s.includes('cloud') || s.includes('aws') || s.includes('gcp') || s.includes('devops')) return { message: "AWS (Lambda, EC2, S3, API Gateway) and GCP (Cloud Run, Firebase), wrapped in Docker + Terraform, delivered through GitHub Actions and Jenkins.", scrollTo: 'skills' };
  if (s.includes('contact') || s.includes('email') || s.includes('reach')) return { message: "kunal.gautam.570@gmail.com · +91-9205659139. Scroll to contact ↓", scrollTo: 'contact' };
  if (s.includes('about') || s.includes('who')) return { message: "Full stack engineer at Hashedin By Deloitte, shipping for 50k+ concurrent users. Scroll to about ↓", scrollTo: 'about' };
  if (s.includes('different') || s.includes('special')) return { message: "I optimize for outcomes, not line counts. End-to-end ownership from architecture through production monitoring. This site itself is the flex.", scrollTo: null };
  return { message: "Ask me about my stack, experience, projects, or how to get in touch.", scrollTo: null };
}
