# Hugo → Astro Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate montelli.dev from Hugo + Toha to Astro 5 with custom components, restructuring content around P/V/A pillars and implementing the new homepage/style from org.md and style.md.

**Architecture:** Astro 5 SSG with Vue 3 islands for interactivity. Tailwind CSS 4 via Vite plugin for styling with design tokens from style.md. Content Collections with Zod schemas for type-safe content. Pagefind for static search. GitHub Pages deploy.

**Tech Stack:** Astro 5, Vue 3, Tailwind CSS 4, Shiki, KaTeX, Mermaid, Pagefind, View Transitions API

**Reference docs:**
- Design: `docs/plans/2026-02-28-hugo-to-astro-migration-design.md`
- Content strategy: `org.md`
- Visual style: `style.md`
- Current Hugo config: `hugo.yaml`
- Current data: `data/it/sections/*.yaml`

---

## Phase 1: Project Scaffold & Configuration

### Task 1: Initialize Astro project

**Files:**
- Create: `package.json` (overwrite existing Hugo one)
- Create: `astro.config.mjs`
- Create: `tsconfig.json`

**Step 1: Create new Astro project in-place**

Back up the existing Hugo package.json, then init Astro:

```bash
cp package.json package.json.hugo.bak
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
```

Accept overwriting `package.json` and `tsconfig.json`. Keep all existing content files.

**Step 2: Install core dependencies**

```bash
npm install astro @astrojs/vue @astrojs/sitemap @astrojs/rss
npm install vue
npm install @tailwindcss/vite tailwindcss
npm install remark-math rehype-katex katex
npm install -D @types/node
```

**Step 3: Verify project scaffolded**

```bash
ls package.json astro.config.mjs tsconfig.json
cat package.json | grep astro
```

Expected: astro listed in dependencies.

**Step 4: Commit**

```bash
git add package.json package.json.hugo.bak tsconfig.json astro.config.mjs
git commit -m "chore: scaffold Astro 5 project (keep Hugo files for reference)"
```

---

### Task 2: Configure Astro

**Files:**
- Modify: `astro.config.mjs`

**Step 1: Write Astro config**

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://montelli.dev',
  output: 'static',

  integrations: [
    vue(),
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    locales: ['it', 'en'],
    defaultLocale: 'it',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      wrap: true,
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
```

Note: custom Shiki theme (ambra) will be added in a later task once the base is working. Start with built-in themes.

**Step 2: Update tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"],
      "@utils/*": ["src/utils/*"],
      "@data/*": ["src/data/*"],
      "@i18n/*": ["src/i18n/*"]
    }
  }
}
```

**Step 3: Verify config valid**

```bash
npx astro check 2>&1 | head -20
```

Expected: no config errors (content warnings are fine at this stage).

**Step 4: Commit**

```bash
git add astro.config.mjs tsconfig.json
git commit -m "feat: configure Astro with Vue, Tailwind, i18n, markdown plugins"
```

---

### Task 3: Set up Tailwind CSS with design tokens

**Files:**
- Create: `src/styles/global.css`

**Step 1: Create global CSS with Tailwind + design tokens from style.md**

```css
/* src/styles/global.css */
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
@import "katex/dist/katex.min.css";

/* Dark mode via class strategy */
@custom-variant dark (&:where(.dark, .dark *));

/* Design tokens from style.md */
@theme {
  /* Base colors */
  --color-base-dark: #1E1E2E;
  --color-base-light: #F5F3EF;

  /* Accent */
  --color-accent: #E8973A;
  --color-accent-hover: #D4832E;

  /* Text */
  --color-text-dark: #2D2D3A;
  --color-text-light: #E0DDD6;
  --color-text-muted: #8A8A96;

  /* Borders */
  --color-border: #D4D1CA;
  --color-border-dark: #3A3A4C;

  /* Pillar colors */
  --color-pillar-progettare: #5B7FA5;
  --color-pillar-verificare: #6B9B78;
  --color-pillar-automatizzare: #9B7FB5;

  /* Code */
  --color-code-bg: #1E1E2E;
  --color-code-inline-light: #F0EDE6;
  --color-code-inline-dark: #2A2A3C;

  /* Fonts */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

/* Base styles */
html {
  font-family: var(--font-sans);
  scroll-behavior: smooth;
}

body {
  background-color: var(--color-base-light);
  color: var(--color-text-dark);
  line-height: 1.7;
  font-size: 1.05rem;
}

.dark body {
  background-color: var(--color-base-dark);
  color: var(--color-text-light);
}

/* Prose max-width for readability (70ch) */
.prose {
  max-width: 70ch;
}

/* Inline code */
:not(pre) > code {
  background-color: var(--color-code-inline-light);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.95rem;
}

.dark :not(pre) > code {
  background-color: var(--color-code-inline-dark);
}

/* Code blocks — always dark */
pre {
  background-color: var(--color-code-bg) !important;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.95rem;
}

/* Shiki dual theme support */
html:not(.dark) .shiki,
html:not(.dark) .shiki span {
  color: var(--shiki-light) !important;
  background-color: var(--shiki-light-bg) !important;
}

html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}

/* KaTeX overrides */
.katex {
  font-size: 1.1em;
}
```

**Step 2: Verify Tailwind processes the file**

```bash
mkdir -p src/pages
cat > src/pages/index.astro << 'ASTRO'
---
import '@/styles/global.css';
---
<html lang="it">
<head><title>Test</title></head>
<body class="bg-base-light dark:bg-base-dark">
  <h1 class="text-accent font-sans text-4xl font-bold">montelli.dev</h1>
  <p class="text-text-muted">Test Tailwind tokens</p>
</body>
</html>
ASTRO
npx astro build 2>&1 | tail -5
```

Expected: build succeeds, no CSS errors.

**Step 3: Commit**

```bash
git add src/styles/global.css src/pages/index.astro
git commit -m "feat: add Tailwind CSS 4 with design tokens from style.md"
```

---

## Phase 2: Content Collections & Data Migration

### Task 4: Define content collection schemas

**Files:**
- Create: `src/content.config.ts`

**Step 1: Write collection schemas**

```typescript
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare']).nullable().default(null),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['it', 'en']).default('it'),
    draft: z.boolean().default(false),
    reviewed: z.union([z.boolean(), z.literal('machine')]).default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    heroImage: z.string().optional(),
    reproducibility: z.boolean().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare']),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    links: z.object({
      github: z.string().optional(),
      demo: z.string().optional(),
      blog: z.string().optional(),
    }).optional(),
    image: z.string().optional(),
    weight: z.number().default(10),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare', 'tutti']),
    icon: z.string(),
    cta: z.string(),
    weight: z.number().default(10),
  }),
});

export const collections = { posts, projects, services };
```

**Step 2: Create content directories**

```bash
mkdir -p src/content/posts/progettare/kubernetes
mkdir -p src/content/posts/progettare/system-design
mkdir -p src/content/posts/progettare/keycloak
mkdir -p src/content/posts/progettare/kafka
mkdir -p src/content/posts/verificare/observability
mkdir -p src/content/posts/verificare/testing
mkdir -p src/content/posts/automatizzare/devops
mkdir -p src/content/posts/automatizzare/homelab
mkdir -p src/content/posts/automatizzare/docker
mkdir -p src/content/posts/altro/web-development
mkdir -p src/content/posts/altro/devcontainer
mkdir -p src/content/projects
mkdir -p src/content/services
```

**Step 3: Create placeholder content to verify schema**

```bash
cat > src/content/posts/progettare/kubernetes/test-post/index.md << 'MD'
---
title: "Test Post"
date: 2026-01-01
description: "Schema validation test"
pillar: progettare
category: kubernetes
tags: ["Kubernetes"]
lang: it
draft: true
reviewed: false
---

Test content.
MD
```

**Step 4: Verify collections compile**

```bash
npx astro check 2>&1 | tail -10
```

Expected: no schema errors.

**Step 5: Remove test content and commit**

```bash
rm -rf src/content/posts/progettare/kubernetes/test-post
git add src/content.config.ts
git commit -m "feat: define content collection schemas for posts, projects, services"
```

---

### Task 5: Write content migration script

**Files:**
- Create: `scripts/migrate-content.ts`

This script:
1. Reads all Hugo posts from `content/posts/`
2. Maps categories to pillars
3. Converts frontmatter to the new schema
4. Copies files to the new structure under `src/content/posts/`

**Step 1: Write the migration script**

```typescript
// scripts/migrate-content.ts
import * as fs from 'fs';
import * as path from 'path';

const HUGO_POSTS = 'content/posts';
const ASTRO_POSTS = 'src/content/posts';

// Mapping from Hugo category dirs to pillar/category
const CATEGORY_MAP: Record<string, { pillar: string | null; category: string }> = {
  'kubernetes': { pillar: 'progettare', category: 'kubernetes' },
  'homelab-capi': { pillar: 'progettare', category: 'kubernetes' },
  'patterns': { pillar: 'progettare', category: 'system-design' },
  'kafka': { pillar: 'progettare', category: 'kafka' },
  'keycloak': { pillar: 'progettare', category: 'keycloak' },
  'dotnet': { pillar: 'progettare', category: 'system-design' },
  'otel-website-material': { pillar: 'verificare', category: 'observability' },
  'testing': { pillar: 'verificare', category: 'testing' },
  'devops-practices': { pillar: 'automatizzare', category: 'devops' },
  'homelab-n8n': { pillar: 'automatizzare', category: 'homelab' },
  'docker-internals': { pillar: 'automatizzare', category: 'docker' },
  'web-development': { pillar: null, category: 'web-development' },
  'devcontainer': { pillar: null, category: 'devcontainer' },
  'projects': { pillar: null, category: 'projects' },
};

function convertFrontmatter(content: string, pillar: string | null, category: string, lang: string): string {
  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return content;

  const fm = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Parse key fields from YAML (simple parsing)
  const getField = (name: string): string | undefined => {
    const match = fm.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : undefined;
  };

  const title = getField('title') || '"Untitled"';
  const date = getField('date') || '2026-01-01';
  const description = getField('description') || '""';
  const draft = getField('draft') === 'true';
  const reviewed = getField('reviewed') || 'false';

  // Parse tags array
  const tagsMatch = fm.match(/^tags:\s*\[(.*?)\]/m);
  const tags = tagsMatch ? tagsMatch[1] : '';

  // Parse series info from menu.sidebar.parent
  const parentMatch = fm.match(/parent:\s*(.+)/m);
  const series = parentMatch ? parentMatch[1].trim() : undefined;
  const weightMatch = fm.match(/weight:\s*(\d+)/m);
  const seriesOrder = weightMatch ? parseInt(weightMatch[1]) : undefined;

  // Parse hero image
  const heroMatch = fm.match(/hero:\s*(.+)/m);
  const heroImage = heroMatch ? heroMatch[1].trim() : undefined;

  // Build new frontmatter
  let newFm = `---\ntitle: ${title}\ndate: ${date}\ndescription: ${description}`;
  newFm += `\npillar: ${pillar || 'null'}`;
  newFm += `\ncategory: ${category}`;
  newFm += `\ntags: [${tags}]`;
  newFm += `\nlang: ${lang}`;
  newFm += `\ndraft: ${draft}`;
  newFm += `\nreviewed: ${reviewed}`;
  if (series) newFm += `\nseries: ${series}`;
  if (seriesOrder) newFm += `\nseriesOrder: ${seriesOrder}`;
  if (heroImage) newFm += `\nheroImage: ${heroImage}`;
  newFm += `\n---`;

  return newFm + body;
}

function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // Skip .pipeline and .reproducibility dirs
      if (entry.name.startsWith('.')) continue;
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function migratePost(hugoCategory: string, postSlug: string, postDir: string) {
  const mapping = CATEGORY_MAP[hugoCategory];
  if (!mapping) {
    console.warn(`Unknown category: ${hugoCategory}, skipping ${postSlug}`);
    return;
  }

  const pillarDir = mapping.pillar ? mapping.pillar : 'altro';
  const destDir = path.join(ASTRO_POSTS, pillarDir, mapping.category, postSlug);

  // Copy entire post directory (images, etc.)
  copyDirRecursive(postDir, destDir);

  // Convert index.md (Italian)
  const indexPath = path.join(destDir, 'index.md');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const converted = convertFrontmatter(content, mapping.pillar, mapping.category, 'it');
    fs.writeFileSync(indexPath, converted);
    console.log(`  IT: ${indexPath}`);
  }

  // Convert index.en.md (English) — rename to index-en.md for Astro
  const enPath = path.join(destDir, 'index.en.md');
  if (fs.existsSync(enPath)) {
    const content = fs.readFileSync(enPath, 'utf-8');
    const converted = convertFrontmatter(content, mapping.pillar, mapping.category, 'en');
    const newEnPath = path.join(destDir, 'index-en.md');
    fs.writeFileSync(newEnPath, converted);
    fs.unlinkSync(enPath);
    console.log(`  EN: ${newEnPath}`);
  }
}

// Main
console.log('Starting content migration...\n');

for (const category of fs.readdirSync(HUGO_POSTS, { withFileTypes: true })) {
  if (!category.isDirectory()) continue;

  const categoryDir = path.join(HUGO_POSTS, category.name);
  console.log(`Category: ${category.name}`);

  for (const post of fs.readdirSync(categoryDir, { withFileTypes: true })) {
    if (!post.isDirectory()) continue; // skip _index.md
    if (post.name.startsWith('_')) continue;

    const postDir = path.join(categoryDir, post.name);
    migratePost(category.name, post.name, postDir);
  }
}

console.log('\nMigration complete.');
```

**Step 2: Verify script syntax**

```bash
npx tsc --noEmit scripts/migrate-content.ts 2>&1 | head -10
```

Note: This may need `ts-node` or `tsx` to run. We'll use `tsx` in the next task.

**Step 3: Commit**

```bash
git add scripts/migrate-content.ts
git commit -m "feat: add content migration script (Hugo → Astro)"
```

---

### Task 6: Run content migration

**Step 1: Install tsx and run migration**

```bash
npm install -D tsx
npx tsx scripts/migrate-content.ts
```

**Step 2: Verify migrated content structure**

```bash
find src/content/posts -name 'index.md' | head -20
find src/content/posts -name 'index-en.md' | head -10
```

Expected: files organized under `progettare/`, `verificare/`, `automatizzare/`, `altro/`.

**Step 3: Spot-check a few frontmatters**

```bash
head -15 src/content/posts/progettare/kubernetes/$(ls src/content/posts/progettare/kubernetes/ | head -1)/index.md
head -15 src/content/posts/verificare/observability/$(ls src/content/posts/verificare/observability/ | head -1)/index.md
```

Expected: new frontmatter with `pillar`, `lang`, `category` fields.

**Step 4: Verify Astro can load the collections**

```bash
npx astro check 2>&1 | tail -20
```

Fix any schema validation errors (common: missing description, wrong date format).

**Step 5: Commit migrated content**

```bash
git add src/content/posts/
git commit -m "feat: migrate 52 blog posts to pillar-based structure"
```

---

### Task 7: Migrate projects and services content

**Files:**
- Create: `src/content/projects/*.md` (6 files)
- Create: `src/content/services/*.md` (4 files)

**Step 1: Create project entries**

Read current projects from `data/it/sections/projects.yaml` and create one markdown file per project. Example for Observability-as-a-Service:

```markdown
---
title: "Observability-as-a-Service"
description: "Stack LGTM completo con OpenTelemetry per monitoring, logging e tracing distribuito. Da $1.800/anno SaaS a $7/anno self-hosted."
pillar: verificare
featured: true
tags: ["OpenTelemetry", "Grafana", "Loki", "Tempo", "Mimir"]
links:
  blog: "/blog/observability"
image: "oaas.webp"
weight: 1
---

Description body here (from existing project data).
```

Create all 6 project files. Mark the 4 homepage projects with `featured: true`:
1. Observability-as-a-Service (verificare, featured)
2. Internal Developer Platform (progettare, featured)
3. Order Processing Platform (progettare, featured)
4. Workshop Keycloak (progettare, featured)
5. Real-time Analytics Pipeline (progettare, not featured)
6. E2E Testing Infrastructure (verificare, not featured)

**Step 2: Create service entries**

```markdown
<!-- src/content/services/health-check.md -->
---
title: "DevOps Health Check"
description: "Assessment completo della tua infrastruttura usando il framework Progettare/Verificare/Automatizzare. Gap analysis, maturity scale, roadmap prioritizzata."
pillar: tutti
icon: health-check
cta: "Richiedi il tuo Health Check →"
weight: 1
---
```

Create all 4 service files: `health-check.md`, `architecture.md`, `observability-security.md`, `pipeline-automation.md`.

**Step 3: Verify**

```bash
npx astro check 2>&1 | tail -10
```

**Step 4: Commit**

```bash
git add src/content/projects/ src/content/services/
git commit -m "feat: add projects and services content collections"
```

---

### Task 8: Migrate static data (skills, experiences, education)

**Files:**
- Create: `src/data/skills.ts`
- Create: `src/data/experiences.ts`
- Create: `src/data/education.ts`
- Create: `src/data/publications.ts`
- Create: `src/data/author.ts`
- Create: `src/data/site.ts`

**Step 1: Convert YAML data to TypeScript**

Read each file under `data/it/sections/` and convert to typed TS exports. Example for skills:

```typescript
// src/data/skills.ts
export interface Skill {
  name: string;
  logo: string;
  summary: string;
  categories: string[];
  url?: string;
}

export const skills: Skill[] = [
  {
    name: 'Kubernetes',
    logo: '/images/sections/skills/kubernetes.png',
    summary: 'Container orchestration, CAPI, Helm, operators',
    categories: ['Container'],
    url: 'https://kubernetes.io',
  },
  // ... all 22 skills from data/it/sections/skills.yaml
];
```

Repeat for experiences, education, publications, author, site data.

**Step 2: Copy images**

```bash
cp -r assets/images/ public/images/
cp -r static/files/ public/files/
cp -r static/images/ public/images/static/
```

**Step 3: Verify imports work**

Create a test page that imports the data:

```bash
# Quick verification — will be removed
npx astro build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/data/ public/images/ public/files/
git commit -m "feat: migrate static data (skills, experiences, education) to TypeScript"
```

---

## Phase 3: Base Layouts & UI Components

### Task 9: Create BaseLayout

**Files:**
- Create: `src/layouts/BaseLayout.astro`

**Step 1: Write BaseLayout**

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
  lang?: 'it' | 'en';
}

const { title, description = 'Progetto, verifico e automatizzo sistemi software', ogImage, lang = 'it' } = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<!doctype html>
<html lang={lang} class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content={Astro.generator} />

  <!-- SEO -->
  <title>{title} | montelli.dev</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonicalURL} />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalURL} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  {ogImage && <meta property="og:image" content={new URL(ogImage, Astro.site)} />}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />

  <!-- Theme initialization (prevent flash) -->
  <script is:inline>
    const theme = localStorage.getItem('theme') ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  </script>

  <!-- Global styles -->
  <style>
    @import '@/styles/global.css';
  </style>
</head>
<body class="bg-base-light dark:bg-base-dark text-text-dark dark:text-text-light transition-colors duration-200 min-h-screen">
  <slot />
</body>
</html>
```

**Step 2: Verify layout renders**

Update `src/pages/index.astro` to use it:

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---
<BaseLayout title="Home">
  <main class="flex items-center justify-center min-h-screen">
    <h1 class="text-4xl font-bold text-accent">montelli.dev</h1>
  </main>
</BaseLayout>
```

```bash
npx astro build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "feat: add BaseLayout with SEO, dark mode, global styles"
```

---

### Task 10: Create UI primitives

**Files:**
- Create: `src/components/ui/Button.astro`
- Create: `src/components/ui/Card.astro`
- Create: `src/components/ui/Badge.astro`
- Create: `src/components/ui/SectionHeading.astro`

**Step 1: Write Button component**

```astro
---
// src/components/ui/Button.astro
interface Props {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  [key: string]: any;
}

const { href, variant = 'primary', size = 'md', class: className = '', ...rest } = Astro.props;

const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200';

const variants = {
  primary: 'bg-accent text-base-dark hover:bg-accent-hover shadow-sm hover:shadow',
  secondary: 'border border-border dark:border-border-dark text-text-dark dark:text-text-light hover:bg-base-light/50 dark:hover:bg-base-dark/50',
  ghost: 'text-accent hover:underline',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3 text-lg',
};

const classes = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
const Tag = href ? 'a' : 'button';
---

<Tag href={href} class={classes} {...rest}>
  <slot />
</Tag>
```

**Step 2: Write Card component**

```astro
---
// src/components/ui/Card.astro
interface Props {
  pillar?: 'progettare' | 'verificare' | 'automatizzare' | null;
  class?: string;
}

const { pillar, class: className = '' } = Astro.props;

const borderColors = {
  progettare: 'border-l-pillar-progettare',
  verificare: 'border-l-pillar-verificare',
  automatizzare: 'border-l-pillar-automatizzare',
};

const borderClass = pillar ? `border-l-[3px] ${borderColors[pillar]}` : '';
---

<div class:list={[
  'bg-base-light dark:bg-base-dark/60 rounded-lg border border-border dark:border-border-dark p-6',
  'shadow-sm hover:shadow transition-shadow duration-200',
  borderClass,
  className,
]}>
  <slot />
</div>
```

**Step 3: Write Badge component**

```astro
---
// src/components/ui/Badge.astro
interface Props {
  pillar?: 'progettare' | 'verificare' | 'automatizzare';
  class?: string;
}

const { pillar, class: className = '' } = Astro.props;

const pillarStyles = {
  progettare: 'bg-pillar-progettare/15 text-pillar-progettare',
  verificare: 'bg-pillar-verificare/15 text-pillar-verificare',
  automatizzare: 'bg-pillar-automatizzare/15 text-pillar-automatizzare',
};

const style = pillar ? pillarStyles[pillar] : 'bg-text-muted/15 text-text-muted';
---

<span class:list={['inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium', style, className]}>
  <slot />
</span>
```

**Step 4: Write SectionHeading component**

```astro
---
// src/components/ui/SectionHeading.astro
interface Props {
  title: string;
  subtitle?: string;
}

const { title, subtitle } = Astro.props;
---

<div class="text-center mb-12">
  <h2 class="text-3xl font-bold mb-3">{title}</h2>
  {subtitle && <p class="text-text-muted text-lg">{subtitle}</p>}
</div>
```

**Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add UI primitives (Button, Card, Badge, SectionHeading)"
```

---

### Task 11: Create Header with ThemeToggle

**Files:**
- Create: `src/components/layout/Header.astro`
- Create: `src/components/interactive/ThemeToggle.vue`

**Step 1: Write ThemeToggle Vue component**

```vue
<!-- src/components/interactive/ThemeToggle.vue -->
<template>
  <button
    @click="toggle"
    class="p-2 rounded-lg hover:bg-border/30 dark:hover:bg-border-dark/30 transition-colors"
    :aria-label="isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'"
  >
    <!-- Sun icon (shown in dark mode) -->
    <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    <!-- Moon icon (shown in light mode) -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isDark = ref(true);

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
});

function toggle() {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
}
</script>
```

**Step 2: Write Header component**

```astro
---
// src/components/layout/Header.astro
import ThemeToggle from '@/components/interactive/ThemeToggle.vue';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

const nav = {
  it: [
    { label: 'Blog', href: '/blog/' },
    { label: 'Servizi', href: '/servizi/' },
    { label: 'About', href: '/about/' },
  ],
  en: [
    { label: 'Blog', href: '/en/blog/' },
    { label: 'Services', href: '/en/services/' },
    { label: 'About', href: '/en/about/' },
  ],
};

const currentPath = Astro.url.pathname;
const langSwitchHref = lang === 'it'
  ? `/en${currentPath}`
  : currentPath.replace(/^\/en/, '') || '/';
---

<header class="sticky top-0 z-50 bg-base-light/80 dark:bg-base-dark/80 backdrop-blur-md border-b border-border dark:border-border-dark">
  <nav class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
    <!-- Logo -->
    <a href={lang === 'it' ? '/' : '/en/'} class="text-xl font-semibold hover:text-accent transition-colors">
      montelli.dev
    </a>

    <!-- Desktop nav -->
    <div class="hidden md:flex items-center gap-6">
      {nav[lang].map(item => (
        <a
          href={item.href}
          class:list={[
            'text-sm font-medium transition-colors hover:text-accent',
            currentPath.startsWith(item.href) ? 'text-accent' : 'text-text-muted',
          ]}
        >
          {item.label}
        </a>
      ))}

      <!-- Search trigger -->
      <button
        id="search-trigger"
        class="p-2 rounded-lg hover:bg-border/30 dark:hover:bg-border-dark/30 transition-colors"
        aria-label="Cerca"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      <!-- Language switcher -->
      <a href={langSwitchHref} class="text-sm text-text-muted hover:text-accent transition-colors">
        {lang === 'it' ? 'EN' : 'IT'}
      </a>

      <!-- Theme toggle -->
      <ThemeToggle client:load />
    </div>

    <!-- Mobile hamburger -->
    <button
      id="mobile-menu-toggle"
      class="md:hidden p-2 rounded-lg hover:bg-border/30 dark:hover:bg-border-dark/30 transition-colors"
      aria-label="Menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </nav>

  <!-- Mobile nav panel (hidden by default, toggled via JS) -->
  <div id="mobile-menu" class="hidden md:hidden border-t border-border dark:border-border-dark bg-base-light dark:bg-base-dark px-4 py-4">
    <div class="flex flex-col gap-3">
      {nav[lang].map(item => (
        <a href={item.href} class="text-base font-medium text-text-muted hover:text-accent transition-colors py-1">
          {item.label}
        </a>
      ))}
      <div class="flex items-center gap-4 pt-2 border-t border-border dark:border-border-dark">
        <a href={langSwitchHref} class="text-sm text-text-muted hover:text-accent">{lang === 'it' ? 'EN' : 'IT'}</a>
        <ThemeToggle client:load />
      </div>
    </div>
  </div>
</header>

<script>
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  toggle?.addEventListener('click', () => menu?.classList.toggle('hidden'));
</script>
```

**Step 3: Verify**

```bash
npx astro build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/components/layout/Header.astro src/components/interactive/ThemeToggle.vue
git commit -m "feat: add Header with nav, language switch, ThemeToggle"
```

---

### Task 12: Create Footer

**Files:**
- Create: `src/components/layout/Footer.astro`

**Step 1: Write Footer**

```astro
---
// src/components/layout/Footer.astro
interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;
const year = new Date().getFullYear();

const labels = {
  it: { rights: 'Tutti i diritti riservati', built: 'Costruito con' },
  en: { rights: 'All rights reserved', built: 'Built with' },
};
---

<footer class="border-t border-border dark:border-border-dark mt-20">
  <div class="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <a href="mailto:francesco@montelli.dev" class="text-text-muted hover:text-accent transition-colors text-sm">
        Email
      </a>
      <a href="https://linkedin.com/in/francesco-montelli" target="_blank" rel="noopener" class="text-text-muted hover:text-accent transition-colors text-sm">
        LinkedIn
      </a>
      <a href="https://github.com/monte97" target="_blank" rel="noopener" class="text-text-muted hover:text-accent transition-colors text-sm">
        GitHub
      </a>
    </div>
    <p class="text-text-muted text-sm">
      &copy; {year} Francesco Montelli. {labels[lang].rights}.
    </p>
  </div>
</footer>
```

**Step 2: Commit**

```bash
git add src/components/layout/Footer.astro
git commit -m "feat: add Footer component"
```

---

### Task 13: Create PageLayout

**Files:**
- Create: `src/layouts/PageLayout.astro`

**Step 1: Write PageLayout (BaseLayout + Header + Footer)**

```astro
---
// src/layouts/PageLayout.astro
import BaseLayout from './BaseLayout.astro';
import Header from '@/components/layout/Header.astro';
import Footer from '@/components/layout/Footer.astro';

interface Props {
  title: string;
  description?: string;
  ogImage?: string;
  lang?: 'it' | 'en';
}

const { title, description, ogImage, lang = 'it' } = Astro.props;
---

<BaseLayout title={title} description={description} ogImage={ogImage} lang={lang}>
  <Header lang={lang} />
  <main class="max-w-6xl mx-auto px-4 py-12">
    <slot />
  </main>
  <Footer lang={lang} />
</BaseLayout>
```

**Step 2: Commit**

```bash
git add src/layouts/PageLayout.astro
git commit -m "feat: add PageLayout (BaseLayout + Header + Footer)"
```

---

## Phase 4: Homepage

### Task 14: Build Hero section

**Files:**
- Create: `src/components/home/Hero.astro`

**Step 1: Write Hero component (from org.md)**

```astro
---
// src/components/home/Hero.astro
import Button from '@/components/ui/Button.astro';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

const content = {
  it: {
    headline: 'Progetto, verifico e automatizzo sistemi software',
    subtitle: 'Per team che crescono e non vogliono scricchiolare',
    cta: 'Inizia dal Health Check',
  },
  en: {
    headline: 'I design, verify, and automate software systems',
    subtitle: 'For teams that grow without breaking apart',
    cta: 'Start with a Health Check',
  },
};

const t = content[lang];
---

<section class="relative min-h-[80vh] flex items-center justify-center bg-base-dark overflow-hidden">
  <!-- Isometric grid pattern (subtle) -->
  <div class="absolute inset-0 opacity-[0.04]" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; stroke=&quot;%23E0DDD6&quot; stroke-width=&quot;0.5&quot;%3E%3Cpath d=&quot;M0 30 L30 0 L60 30 L30 60Z&quot;/%3E%3C/g%3E%3C/svg%3E'); background-size: 60px 60px;"></div>

  <div class="relative text-center px-4 max-w-3xl">
    <h1 class="text-4xl md:text-5xl font-bold text-text-light mb-4 leading-tight">
      {t.headline}
    </h1>
    <p class="text-lg md:text-xl text-text-muted mb-8">
      {t.subtitle}
    </p>
    <Button href={lang === 'it' ? '/servizi/#health-check' : '/en/services/#health-check'} size="lg">
      {t.cta} &rarr;
    </Button>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add src/components/home/Hero.astro
git commit -m "feat: add Hero section with isometric grid pattern"
```

---

### Task 15: Build PillarCards section

**Files:**
- Create: `src/components/home/PillarCards.astro`

**Step 1: Write PillarCards component**

```astro
---
// src/components/home/PillarCards.astro
import Card from '@/components/ui/Card.astro';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

const pillars = {
  it: [
    { id: 'progettare', title: 'Progettare', tagline: 'Sistemi che reggono quando cresci.', href: '/servizi/#architecture' },
    { id: 'verificare', title: 'Verificare', tagline: 'Vedi cosa succede. Proteggi quello che conta.', href: '/servizi/#observability' },
    { id: 'automatizzare', title: 'Automatizzare', tagline: 'Togli l\'errore umano dal loop.', href: '/servizi/#automation' },
  ],
  en: [
    { id: 'progettare', title: 'Design', tagline: 'Systems that hold when you grow.', href: '/en/services/#architecture' },
    { id: 'verificare', title: 'Verify', tagline: 'See what happens. Protect what matters.', href: '/en/services/#observability' },
    { id: 'automatizzare', title: 'Automate', tagline: 'Remove the human error from the loop.', href: '/en/services/#automation' },
  ],
};

const cta = lang === 'it' ? 'Scopri di più' : 'Learn more';
---

<section class="py-20 bg-base-light dark:bg-base-dark">
  <div class="max-w-6xl mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {pillars[lang].map(p => (
        <Card pillar={p.id as any} class="flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-semibold mb-2">{p.title}</h3>
            <p class="text-text-muted">{p.tagline}</p>
          </div>
          <a href={p.href} class="text-accent hover:underline mt-4 text-sm font-medium">
            {cta} &rarr;
          </a>
        </Card>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add src/components/home/PillarCards.astro
git commit -m "feat: add PillarCards homepage section"
```

---

### Task 16: Build FeaturedProjects section

**Files:**
- Create: `src/components/home/FeaturedProjects.astro`

**Step 1: Write FeaturedProjects component**

```astro
---
// src/components/home/FeaturedProjects.astro
import { getCollection } from 'astro:content';
import Card from '@/components/ui/Card.astro';
import Badge from '@/components/ui/Badge.astro';
import SectionHeading from '@/components/ui/SectionHeading.astro';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

const projects = (await getCollection('projects'))
  .filter(p => p.data.featured)
  .sort((a, b) => a.data.weight - b.data.weight);

const heading = lang === 'it' ? { title: 'Progetti selezionati', subtitle: '' } : { title: 'Featured Projects', subtitle: '' };
const detailsLabel = lang === 'it' ? 'Dettagli' : 'Details';
---

<section class="py-20">
  <div class="max-w-6xl mx-auto px-4">
    <SectionHeading title={heading.title} />
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {projects.map(project => (
        <Card pillar={project.data.pillar} class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <h3 class="text-lg font-semibold">{project.data.title}</h3>
              <Badge pillar={project.data.pillar}>{project.data.pillar}</Badge>
            </div>
            <p class="text-text-muted text-sm">{project.data.description}</p>
          </div>
          {project.data.links?.blog && (
            <a href={project.data.links.blog} class="text-accent hover:underline mt-4 text-sm font-medium">
              {detailsLabel} &rarr;
            </a>
          )}
        </Card>
      ))}
    </div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add src/components/home/FeaturedProjects.astro
git commit -m "feat: add FeaturedProjects homepage section"
```

---

### Task 17: Build FilteredPosts section

**Files:**
- Create: `src/components/home/FilteredPosts.astro`
- Create: `src/components/blog/PostCard.astro`

**Step 1: Write PostCard component (reused on blog list page)**

```astro
---
// src/components/blog/PostCard.astro
import Card from '@/components/ui/Card.astro';
import Badge from '@/components/ui/Badge.astro';

interface Props {
  title: string;
  description: string;
  date: Date;
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null;
  href: string;
  tags?: string[];
}

const { title, description, date, pillar, href, tags = [] } = Astro.props;

const formattedDate = date.toLocaleDateString('it-IT', {
  year: 'numeric', month: 'short', day: 'numeric',
});
---

<Card pillar={pillar}>
  <a href={href} class="block group">
    <div class="flex items-center gap-2 mb-1">
      <time class="text-xs text-text-muted">{formattedDate}</time>
      {pillar && <Badge pillar={pillar}>{pillar}</Badge>}
    </div>
    <h3 class="text-lg font-semibold group-hover:text-accent transition-colors mb-1">{title}</h3>
    <p class="text-text-muted text-sm line-clamp-2">{description}</p>
    {tags.length > 0 && (
      <div class="flex flex-wrap gap-1 mt-2">
        {tags.slice(0, 3).map(tag => (
          <span class="text-xs text-text-muted bg-text-muted/10 px-1.5 py-0.5 rounded">{tag}</span>
        ))}
      </div>
    )}
  </a>
</Card>
```

**Step 2: Write FilteredPosts component**

```astro
---
// src/components/home/FilteredPosts.astro
import { getCollection } from 'astro:content';
import PostCard from '@/components/blog/PostCard.astro';
import SectionHeading from '@/components/ui/SectionHeading.astro';

interface Props {
  lang?: 'it' | 'en';
  count?: number;
}

const { lang = 'it', count = 6 } = Astro.props;

const posts = (await getCollection('posts'))
  .filter(p => p.data.lang === lang && !p.data.draft && p.data.pillar !== null)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .slice(0, count);

const heading = lang === 'it'
  ? { title: 'Ultimi articoli', link: '/blog/', linkLabel: 'Tutti gli articoli' }
  : { title: 'Latest articles', link: '/en/blog/', linkLabel: 'All articles' };
---

<section class="py-20">
  <div class="max-w-6xl mx-auto px-4">
    <SectionHeading title={heading.title} />
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map(post => (
        <PostCard
          title={post.data.title}
          description={post.data.description}
          date={post.data.date}
          pillar={post.data.pillar}
          href={`/blog/${post.id}/`}
          tags={post.data.tags}
        />
      ))}
    </div>
    <div class="text-center mt-8">
      <a href={heading.link} class="text-accent hover:underline font-medium">
        {heading.linkLabel} &rarr;
      </a>
    </div>
  </div>
</section>
```

**Step 3: Commit**

```bash
git add src/components/blog/PostCard.astro src/components/home/FilteredPosts.astro
git commit -m "feat: add PostCard and FilteredPosts homepage section"
```

---

### Task 18: Build AboutBrief and ContactSection

**Files:**
- Create: `src/components/home/AboutBrief.astro`
- Create: `src/components/home/ContactSection.astro`

**Step 1: Write AboutBrief**

```astro
---
// src/components/home/AboutBrief.astro
import Button from '@/components/ui/Button.astro';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

const content = {
  it: {
    text: 'Software Engineer con oltre 5 anni di esperienza su sistemi distribuiti. Lavoro con team che crescono e li aiuto a costruire infrastrutture che scalano senza che il team impazzisca. Iscritto all\'Ordine degli Ingegneri della Provincia di Ravenna.',
    aboutLink: 'Più su di me',
    cvLink: 'Scarica CV (PDF)',
  },
  en: {
    text: 'Software Engineer with 5+ years of experience in distributed systems. I work with growing teams and help them build infrastructure that scales without driving the team crazy. Registered at the Order of Engineers of the Province of Ravenna, Italy.',
    aboutLink: 'More about me',
    cvLink: 'Download CV (PDF)',
  },
};

const t = content[lang];
---

<section class="py-20 bg-base-dark text-text-light">
  <div class="max-w-3xl mx-auto px-4 text-center">
    <h2 class="text-3xl font-bold mb-6">{lang === 'it' ? 'Chi sono' : 'About me'}</h2>
    <p class="text-lg text-text-muted leading-relaxed mb-8">{t.text}</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Button href={lang === 'it' ? '/about/' : '/en/about/'} variant="secondary">
        {t.aboutLink} &rarr;
      </Button>
      <Button href="/files/cv-montelli.pdf" variant="ghost">
        {t.cvLink}
      </Button>
    </div>
  </div>
</section>
```

**Step 2: Write ContactSection**

```astro
---
// src/components/home/ContactSection.astro
import Button from '@/components/ui/Button.astro';

interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;
---

<section class="py-20">
  <div class="max-w-3xl mx-auto px-4 text-center">
    <h2 class="text-3xl font-bold mb-6">{lang === 'it' ? 'Contatto' : 'Contact'}</h2>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <a href="mailto:francesco@montelli.dev" class="text-text-muted hover:text-accent transition-colors">
        francesco@montelli.dev
      </a>
      <span class="text-border hidden sm:inline">|</span>
      <a href="https://linkedin.com/in/francesco-montelli" target="_blank" rel="noopener" class="text-text-muted hover:text-accent transition-colors">
        LinkedIn
      </a>
    </div>
    <div class="mt-6">
      <Button href={lang === 'it' ? '/servizi/#health-check' : '/en/services/#health-check'}>
        {lang === 'it' ? 'Inizia dal Health Check' : 'Start with a Health Check'} &rarr;
      </Button>
    </div>
  </div>
</section>
```

**Step 3: Commit**

```bash
git add src/components/home/AboutBrief.astro src/components/home/ContactSection.astro
git commit -m "feat: add AboutBrief and ContactSection homepage components"
```

---

### Task 19: Assemble homepage

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Compose the homepage from all sections**

```astro
---
// src/pages/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import Header from '@/components/layout/Header.astro';
import Footer from '@/components/layout/Footer.astro';
import Hero from '@/components/home/Hero.astro';
import PillarCards from '@/components/home/PillarCards.astro';
import FeaturedProjects from '@/components/home/FeaturedProjects.astro';
import FilteredPosts from '@/components/home/FilteredPosts.astro';
import AboutBrief from '@/components/home/AboutBrief.astro';
import ContactSection from '@/components/home/ContactSection.astro';
---

<BaseLayout title="Progetto, verifico e automatizzo sistemi software">
  <Header lang="it" />
  <Hero lang="it" />
  <PillarCards lang="it" />
  <FeaturedProjects lang="it" />
  <FilteredPosts lang="it" />
  <AboutBrief lang="it" />
  <ContactSection lang="it" />
  <Footer lang="it" />
</BaseLayout>
```

Note: homepage does NOT use PageLayout because the Hero is full-width (no max-w-6xl wrapper).

**Step 2: Build and verify**

```bash
npx astro build 2>&1 | tail -10
```

Expected: build succeeds, homepage at `dist/index.html`.

**Step 3: Visual check with dev server**

```bash
npx astro dev &
# Open http://localhost:4321 in browser
# Verify: hero, pillar cards, projects, posts, about, contact
# Kill dev server when done
```

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: assemble homepage with all 6 sections from org.md"
```

---

## Phase 5: Blog

### Task 20: Create blog list page with pagination

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[...page].astro`

**Step 1: Write blog index page (page 1)**

The index page redirects to the paginated route or serves as page 1:

```astro
---
// src/pages/blog/[...page].astro
import { getCollection } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import PageLayout from '@/layouts/PageLayout.astro';
import PostCard from '@/components/blog/PostCard.astro';
import Badge from '@/components/ui/Badge.astro';

export const getStaticPaths = (async ({ paginate }) => {
  const posts = (await getCollection('posts'))
    .filter(p => p.data.lang === 'it' && !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return paginate(posts, { pageSize: 12 });
}) satisfies GetStaticPaths;

const { page } = Astro.props;
---

<PageLayout title="Blog" lang="it">
  <h1 class="text-4xl font-bold mb-4">Blog</h1>

  <!-- Pillar filters -->
  <div class="flex flex-wrap gap-2 mb-8">
    <a href="/blog/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-base-dark">Tutti</a>
    <a href="/blog/progettare/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-pillar-progettare/15 text-pillar-progettare hover:bg-pillar-progettare/25 transition-colors">Progettare</a>
    <a href="/blog/verificare/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-pillar-verificare/15 text-pillar-verificare hover:bg-pillar-verificare/25 transition-colors">Verificare</a>
    <a href="/blog/automatizzare/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-pillar-automatizzare/15 text-pillar-automatizzare hover:bg-pillar-automatizzare/25 transition-colors">Automatizzare</a>
  </div>

  <!-- Post grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {page.data.map(post => (
      <PostCard
        title={post.data.title}
        description={post.data.description}
        date={post.data.date}
        pillar={post.data.pillar}
        href={`/blog/${post.id}/`}
        tags={post.data.tags}
      />
    ))}
  </div>

  <!-- Pagination -->
  {(page.url.prev || page.url.next) && (
    <nav class="flex justify-center items-center gap-4 mt-12">
      {page.url.prev && (
        <a href={page.url.prev} class="text-accent hover:underline">&larr; Precedente</a>
      )}
      <span class="text-text-muted text-sm">Pagina {page.currentPage} di {page.lastPage}</span>
      {page.url.next && (
        <a href={page.url.next} class="text-accent hover:underline">Successiva &rarr;</a>
      )}
    </nav>
  )}
</PageLayout>
```

**Step 2: Create pillar filter pages**

```bash
mkdir -p src/pages/blog/progettare src/pages/blog/verificare src/pages/blog/automatizzare
```

Create `src/pages/blog/progettare/[...page].astro` (and same for verificare, automatizzare):

```astro
---
// src/pages/blog/progettare/[...page].astro
import { getCollection } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import PageLayout from '@/layouts/PageLayout.astro';
import PostCard from '@/components/blog/PostCard.astro';

export const getStaticPaths = (async ({ paginate }) => {
  const posts = (await getCollection('posts'))
    .filter(p => p.data.lang === 'it' && !p.data.draft && p.data.pillar === 'progettare')
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(posts, { pageSize: 12 });
}) satisfies GetStaticPaths;

const { page } = Astro.props;
---

<PageLayout title="Blog — Progettare" lang="it">
  <h1 class="text-4xl font-bold mb-4">Progettare</h1>
  <!-- Same filter bar and grid as main blog page, with "Progettare" filter active -->
  <div class="flex flex-wrap gap-2 mb-8">
    <a href="/blog/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-text-muted/15 text-text-muted hover:bg-text-muted/25 transition-colors">Tutti</a>
    <a href="/blog/progettare/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-pillar-progettare text-white">Progettare</a>
    <a href="/blog/verificare/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-pillar-verificare/15 text-pillar-verificare hover:bg-pillar-verificare/25 transition-colors">Verificare</a>
    <a href="/blog/automatizzare/" class="px-3 py-1.5 rounded-lg text-sm font-medium bg-pillar-automatizzare/15 text-pillar-automatizzare hover:bg-pillar-automatizzare/25 transition-colors">Automatizzare</a>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {page.data.map(post => (
      <PostCard
        title={post.data.title}
        description={post.data.description}
        date={post.data.date}
        pillar={post.data.pillar}
        href={`/blog/${post.id}/`}
        tags={post.data.tags}
      />
    ))}
  </div>
  {(page.url.prev || page.url.next) && (
    <nav class="flex justify-center items-center gap-4 mt-12">
      {page.url.prev && <a href={page.url.prev} class="text-accent hover:underline">&larr; Precedente</a>}
      <span class="text-text-muted text-sm">Pagina {page.currentPage} di {page.lastPage}</span>
      {page.url.next && <a href={page.url.next} class="text-accent hover:underline">Successiva &rarr;</a>}
    </nav>
  )}
</PageLayout>
```

Repeat for `verificare` and `automatizzare` (change pillar filter in query and active button styling).

**Step 3: Commit**

```bash
git add src/pages/blog/
git commit -m "feat: add blog list pages with pillar filtering and pagination"
```

---

### Task 21: Create BlogPostLayout and post route

**Files:**
- Create: `src/layouts/BlogPostLayout.astro`
- Create: `src/components/blog/TOC.astro`
- Create: `src/components/blog/PostCTA.astro`
- Create: `src/pages/blog/[...slug].astro`

**Step 1: Write TOC component**

```astro
---
// src/components/blog/TOC.astro
interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  headings: Heading[];
}

const { headings } = Astro.props;
const filtered = headings.filter(h => h.depth >= 2 && h.depth <= 3);
---

{filtered.length > 0 && (
  <nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
    <h4 class="text-sm font-semibold mb-3 text-text-muted uppercase tracking-wide">Indice</h4>
    <ul class="space-y-1.5 text-sm">
      {filtered.map(h => (
        <li style={`padding-left: ${(h.depth - 2) * 0.75}rem`}>
          <a
            href={`#${h.slug}`}
            class="text-text-muted hover:text-accent transition-colors block py-0.5 border-l-2 border-transparent hover:border-accent pl-2"
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)}
```

**Step 2: Write PostCTA component**

```astro
---
// src/components/blog/PostCTA.astro
interface Props {
  lang?: 'it' | 'en';
}

const { lang = 'it' } = Astro.props;

const content = {
  it: { question: 'Ti è piaciuto questo articolo?', linkedin: 'Seguimi su LinkedIn', email: 'Scrivimi' },
  en: { question: 'Did you enjoy this article?', linkedin: 'Follow me on LinkedIn', email: 'Write me' },
};

const t = content[lang];
---

<div class="border-t border-border dark:border-border-dark mt-12 pt-8 text-center">
  <p class="text-lg font-medium mb-4">{t.question}</p>
  <div class="flex items-center justify-center gap-4">
    <a
      href="https://linkedin.com/in/francesco-montelli"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077b5] text-white text-sm font-medium hover:bg-[#006399] transition-colors"
    >
      {t.linkedin}
    </a>
    <a
      href="mailto:francesco@montelli.dev"
      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-text-muted/20 text-sm font-medium hover:bg-text-muted/30 transition-colors"
    >
      {t.email}
    </a>
  </div>
</div>
```

**Step 3: Write BlogPostLayout**

```astro
---
// src/layouts/BlogPostLayout.astro
import BaseLayout from './BaseLayout.astro';
import Header from '@/components/layout/Header.astro';
import Footer from '@/components/layout/Footer.astro';
import TOC from '@/components/blog/TOC.astro';
import PostCTA from '@/components/blog/PostCTA.astro';
import Badge from '@/components/ui/Badge.astro';

interface Props {
  title: string;
  description: string;
  date: Date;
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null;
  tags: string[];
  headings: { depth: number; slug: string; text: string }[];
  lang?: 'it' | 'en';
  editUrl?: string;
}

const { title, description, date, pillar, tags, headings, lang = 'it', editUrl } = Astro.props;

const formattedDate = date.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
});
---

<BaseLayout title={title} description={description} lang={lang}>
  <Header lang={lang} />

  <article class="max-w-6xl mx-auto px-4 py-12">
    <!-- Breadcrumb -->
    <nav class="text-sm text-text-muted mb-6">
      <a href={lang === 'it' ? '/' : '/en/'} class="hover:text-accent">Home</a>
      <span class="mx-1">/</span>
      <a href={lang === 'it' ? '/blog/' : '/en/blog/'} class="hover:text-accent">Blog</a>
      {pillar && (
        <>
          <span class="mx-1">/</span>
          <a href={lang === 'it' ? `/blog/${pillar}/` : `/en/blog/${pillar}/`} class="hover:text-accent capitalize">{pillar}</a>
        </>
      )}
    </nav>

    <!-- Title block -->
    <header class="mb-10">
      <h1 class="text-4xl font-bold mb-4 leading-tight">{title}</h1>
      <div class="flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <time datetime={date.toISOString()}>{formattedDate}</time>
        {pillar && <Badge pillar={pillar}>{pillar}</Badge>}
        {tags.map(tag => (
          <span class="bg-text-muted/10 px-2 py-0.5 rounded text-xs">{tag}</span>
        ))}
      </div>
    </header>

    <!-- Content + TOC -->
    <div class="flex gap-12">
      <!-- Main content -->
      <div class="prose max-w-none flex-1 min-w-0">
        <slot />
      </div>

      <!-- TOC sidebar (desktop) -->
      <aside class="hidden lg:block w-64 shrink-0">
        <TOC headings={headings} />
      </aside>
    </div>

    <!-- Post CTA -->
    <PostCTA lang={lang} />

    <!-- Edit link -->
    {editUrl && (
      <div class="mt-6 text-center">
        <a href={editUrl} target="_blank" rel="noopener" class="text-sm text-text-muted hover:text-accent">
          {lang === 'it' ? 'Migliora questa pagina su GitHub' : 'Improve this page on GitHub'} &rarr;
        </a>
      </div>
    )}
  </article>

  <Footer lang={lang} />
</BaseLayout>
```

**Step 4: Write the dynamic post route**

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, render } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import BlogPostLayout from '@/layouts/BlogPostLayout.astro';

export const getStaticPaths = (async () => {
  const posts = await getCollection('posts');
  return posts
    .filter(p => p.data.lang === 'it' && !p.data.draft)
    .map(post => ({
      params: { slug: post.id },
      props: { post },
    }));
}) satisfies GetStaticPaths;

const { post } = Astro.props;
const { Content, headings } = await render(post);

const editUrl = `https://github.com/monte97/website.github.io/edit/main/src/content/posts/${post.id}/index.md`;
---

<BlogPostLayout
  title={post.data.title}
  description={post.data.description}
  date={post.data.date}
  pillar={post.data.pillar}
  tags={post.data.tags}
  headings={headings}
  editUrl={editUrl}
>
  <Content />
</BlogPostLayout>
```

**Step 5: Build and verify**

```bash
npx astro build 2>&1 | tail -15
```

Expected: blog pages generated at `dist/blog/<slug>/index.html`.

**Step 6: Commit**

```bash
git add src/layouts/BlogPostLayout.astro src/components/blog/TOC.astro src/components/blog/PostCTA.astro src/pages/blog/
git commit -m "feat: add BlogPostLayout with TOC, CTA, and dynamic post routing"
```

---

### Task 22: Add series navigation

**Files:**
- Create: `src/components/blog/SeriesNav.astro`
- Modify: `src/layouts/BlogPostLayout.astro` (add SeriesNav)

**Step 1: Write SeriesNav component**

```astro
---
// src/components/blog/SeriesNav.astro
import { getCollection } from 'astro:content';

interface Props {
  series: string;
  currentId: string;
}

const { series, currentId } = Astro.props;

const seriesPosts = (await getCollection('posts'))
  .filter(p => p.data.series === series && p.data.lang === 'it' && !p.data.draft)
  .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));

const currentIndex = seriesPosts.findIndex(p => p.id === currentId);
const prev = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
const next = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;
---

{seriesPosts.length > 1 && (
  <div class="border border-border dark:border-border-dark rounded-lg p-4 mb-8">
    <h4 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
      Serie: {series}
    </h4>
    <ol class="space-y-1 text-sm">
      {seriesPosts.map((p, i) => (
        <li class:list={['py-1 pl-2 border-l-2', p.id === currentId ? 'border-accent text-accent font-medium' : 'border-transparent text-text-muted hover:text-accent']}>
          {p.id === currentId ? (
            <span>{i + 1}. {p.data.title}</span>
          ) : (
            <a href={`/blog/${p.id}/`}>{i + 1}. {p.data.title}</a>
          )}
        </li>
      ))}
    </ol>

    {(prev || next) && (
      <div class="flex justify-between mt-4 pt-3 border-t border-border dark:border-border-dark text-sm">
        {prev ? (
          <a href={`/blog/${prev.id}/`} class="text-accent hover:underline">&larr; {prev.data.title}</a>
        ) : <span />}
        {next ? (
          <a href={`/blog/${next.id}/`} class="text-accent hover:underline">{next.data.title} &rarr;</a>
        ) : <span />}
      </div>
    )}
  </div>
)}
```

**Step 2: Add SeriesNav to BlogPostLayout**

In `BlogPostLayout.astro`, add the `series` and `postId` props and render `<SeriesNav>` above the content when `series` is defined. Add `import SeriesNav from '@/components/blog/SeriesNav.astro';` and render it before `<slot />`.

**Step 3: Pass series info from the post route**

Update `src/pages/blog/[...slug].astro` to pass `series={post.data.series}` and `postId={post.id}` to `BlogPostLayout`.

**Step 4: Commit**

```bash
git add src/components/blog/SeriesNav.astro src/layouts/BlogPostLayout.astro src/pages/blog/
git commit -m "feat: add series navigation for multi-part blog posts"
```

---

## Phase 6: Services, About, QR, 404

### Task 23: Build services page

**Files:**
- Create: `src/pages/servizi/index.astro`

**Step 1: Write services page**

```astro
---
// src/pages/servizi/index.astro
import { getCollection, render } from 'astro:content';
import PageLayout from '@/layouts/PageLayout.astro';
import Badge from '@/components/ui/Badge.astro';
import Button from '@/components/ui/Button.astro';

const services = (await getCollection('services'))
  .sort((a, b) => a.data.weight - b.data.weight);
---

<PageLayout title="Servizi" lang="it">
  <h1 class="text-4xl font-bold mb-4">Come posso aiutarti</h1>
  <p class="text-text-muted text-lg mb-12 max-w-2xl">
    Aiuto team tecnici a costruire, monitorare e automatizzare sistemi software con metodo.
  </p>

  <div class="space-y-16">
    {await Promise.all(services.map(async (service) => {
      const { Content } = await render(service);
      const anchorId = service.id.replace('.md', '');
      return (
        <section id={anchorId} class="scroll-mt-20">
          <div class="flex items-center gap-3 mb-4">
            <h2 class="text-2xl font-semibold">{service.data.title}</h2>
            {service.data.pillar !== 'tutti' && (
              <Badge pillar={service.data.pillar as any}>{service.data.pillar}</Badge>
            )}
          </div>
          <div class="prose max-w-none mb-6">
            <Content />
          </div>
          <Button href="mailto:francesco@montelli.dev?subject=Richiesta: {service.data.title}">
            {service.data.cta}
          </Button>
        </section>
      );
    }))}
  </div>
</PageLayout>
```

**Step 2: Commit**

```bash
git add src/pages/servizi/
git commit -m "feat: add services page with 4 service sections"
```

---

### Task 24: Build about page

**Files:**
- Create: `src/pages/about/index.astro`
- Create: `src/components/about/SkillGrid.astro`
- Create: `src/components/about/Timeline.astro`

**Step 1: Write SkillGrid component**

```astro
---
// src/components/about/SkillGrid.astro
import { skills } from '@/data/skills';

const categories = [...new Set(skills.flatMap(s => s.categories))];
---

<div>
  <div class="flex flex-wrap gap-2 mb-6">
    {categories.map(cat => (
      <button class="px-3 py-1 rounded-lg text-sm bg-text-muted/10 text-text-muted hover:bg-accent/15 hover:text-accent transition-colors" data-filter={cat}>
        {cat}
      </button>
    ))}
  </div>
  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
    {skills.map(skill => (
      <div class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-text-muted/5 transition-colors" data-categories={skill.categories.join(',')}>
        <img src={skill.logo} alt={skill.name} class="w-10 h-10 object-contain" loading="lazy" />
        <span class="text-xs text-text-muted text-center">{skill.name}</span>
      </div>
    ))}
  </div>
</div>
```

**Step 2: Write Timeline component**

```astro
---
// src/components/about/Timeline.astro
interface TimelineItem {
  title: string;
  subtitle: string;
  period: string;
  description?: string;
}

interface Props {
  items: TimelineItem[];
}

const { items } = Astro.props;
---

<div class="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border dark:before:bg-border-dark">
  {items.map(item => (
    <div class="pl-8 relative">
      <div class="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-accent border-2 border-base-light dark:border-base-dark"></div>
      <h3 class="text-lg font-semibold">{item.title}</h3>
      <p class="text-sm text-accent">{item.subtitle}</p>
      <time class="text-xs text-text-muted">{item.period}</time>
      {item.description && <p class="text-sm text-text-muted mt-1">{item.description}</p>}
    </div>
  ))}
</div>
```

**Step 3: Write about page**

```astro
---
// src/pages/about/index.astro
import PageLayout from '@/layouts/PageLayout.astro';
import SkillGrid from '@/components/about/SkillGrid.astro';
import Timeline from '@/components/about/Timeline.astro';
import SectionHeading from '@/components/ui/SectionHeading.astro';
import { experiences } from '@/data/experiences';
import { education } from '@/data/education';
import { publications } from '@/data/publications';
import { author } from '@/data/author';
---

<PageLayout title="About" lang="it">
  <!-- Bio -->
  <section class="mb-16">
    <h1 class="text-4xl font-bold mb-6">Chi sono</h1>
    <div class="prose max-w-none">
      <p>{author.bio}</p>
    </div>
  </section>

  <!-- Skills -->
  <section class="mb-16">
    <SectionHeading title="Stack tecnologico" />
    <SkillGrid />
  </section>

  <!-- Experiences -->
  <section class="mb-16">
    <SectionHeading title="Esperienze" />
    <Timeline items={experiences} />
  </section>

  <!-- Education -->
  <section class="mb-16">
    <SectionHeading title="Istruzione" />
    <Timeline items={education} />
  </section>

  <!-- Publications -->
  <section class="mb-16">
    <SectionHeading title="Pubblicazioni" />
    <ul class="space-y-3">
      {publications.map(pub => (
        <li>
          <a href={pub.url} target="_blank" rel="noopener" class="text-accent hover:underline font-medium">
            {pub.title}
          </a>
          <p class="text-sm text-text-muted">{pub.venue} — {pub.year}</p>
        </li>
      ))}
    </ul>
  </section>

  <!-- CV download -->
  <div class="text-center">
    <a href="/files/cv-montelli.pdf" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-base-dark font-medium hover:bg-accent-hover transition-colors">
      Scarica CV (PDF)
    </a>
  </div>
</PageLayout>
```

**Step 4: Commit**

```bash
git add src/pages/about/ src/components/about/
git commit -m "feat: add about page with skills, timeline, publications"
```

---

### Task 25: Build QR contact and 404 pages

**Files:**
- Create: `src/pages/qr/index.astro`
- Create: `src/pages/404.astro`

**Step 1: Write QR page (migrated from Hugo layout)**

```astro
---
// src/pages/qr/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
---

<BaseLayout title="Contatto" lang="it">
  <div class="min-h-screen flex items-center justify-center bg-base-light dark:bg-base-dark p-4">
    <div class="bg-white dark:bg-base-dark/80 rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border border-border dark:border-border-dark">
      <!-- Photo ring -->
      <div class="w-28 h-28 rounded-full mx-auto mb-4 p-1 bg-gradient-to-br from-accent to-[#D4832E]">
        <img src="/images/author/avatar.webp" alt="Francesco Montelli" class="w-full h-full rounded-full object-cover border-3 border-white dark:border-base-dark" />
      </div>
      <h1 class="text-xl font-bold">Francesco Montelli</h1>
      <p class="text-text-muted text-sm mb-6">Software Engineer &amp; DevOps Consultant</p>
      <div class="flex flex-col gap-3">
        <a href="mailto:francesco@montelli.dev" class="block px-4 py-2.5 rounded-lg bg-accent text-base-dark font-medium hover:bg-accent-hover transition-colors">
          Email
        </a>
        <a href="https://linkedin.com/in/francesco-montelli" target="_blank" class="block px-4 py-2.5 rounded-lg bg-[#0077b5] text-white font-medium hover:bg-[#006399] transition-colors">
          LinkedIn
        </a>
        <a href="https://github.com/monte97" target="_blank" class="block px-4 py-2.5 rounded-lg bg-text-muted/20 font-medium hover:bg-text-muted/30 transition-colors">
          GitHub
        </a>
        <a href="/" class="block px-4 py-2.5 rounded-lg bg-text-muted/20 font-medium hover:bg-text-muted/30 transition-colors">
          montelli.dev
        </a>
      </div>
    </div>
  </div>
</BaseLayout>
```

**Step 2: Write 404 page**

```astro
---
// src/pages/404.astro
import PageLayout from '@/layouts/PageLayout.astro';
import Button from '@/components/ui/Button.astro';
---

<PageLayout title="Pagina non trovata" lang="it">
  <div class="text-center py-20">
    <h1 class="text-6xl font-bold text-accent mb-4">404</h1>
    <p class="text-xl text-text-muted mb-8">Questa pagina non esiste.</p>
    <div class="flex items-center justify-center gap-4">
      <Button href="/">Homepage</Button>
      <Button href="/blog/" variant="secondary">Blog</Button>
    </div>
  </div>
</PageLayout>
```

**Step 3: Commit**

```bash
git add src/pages/qr/ src/pages/404.astro
git commit -m "feat: add QR contact page and 404 page"
```

---

## Phase 7: i18n

### Task 26: Set up i18n utilities and English pages

**Files:**
- Create: `src/i18n/it.ts`
- Create: `src/i18n/en.ts`
- Create: `src/i18n/index.ts`
- Create: `src/pages/en/index.astro`
- Create: `src/pages/en/blog/[...page].astro`
- Create: `src/pages/en/blog/[...slug].astro`
- Create: `src/pages/en/services/index.astro`
- Create: `src/pages/en/about/index.astro`

**Step 1: Write i18n string files**

```typescript
// src/i18n/it.ts
export default {
  nav: { blog: 'Blog', services: 'Servizi', about: 'About' },
  blog: { all: 'Tutti', prev: 'Precedente', next: 'Successiva', page: 'Pagina', of: 'di', allArticles: 'Tutti gli articoli' },
  post: { toc: 'Indice', enjoyed: 'Ti è piaciuto questo articolo?', followLinkedIn: 'Seguimi su LinkedIn', writeMe: 'Scrivimi', improve: 'Migliora questa pagina su GitHub' },
  home: { headline: 'Progetto, verifico e automatizzo sistemi software', subtitle: 'Per team che crescono e non vogliono scricchiolare', cta: 'Inizia dal Health Check' },
  footer: { rights: 'Tutti i diritti riservati' },
} as const;
```

```typescript
// src/i18n/en.ts
export default {
  nav: { blog: 'Blog', services: 'Services', about: 'About' },
  blog: { all: 'All', prev: 'Previous', next: 'Next', page: 'Page', of: 'of', allArticles: 'All articles' },
  post: { toc: 'Contents', enjoyed: 'Did you enjoy this article?', followLinkedIn: 'Follow me on LinkedIn', writeMe: 'Write me', improve: 'Improve this page on GitHub' },
  home: { headline: 'I design, verify, and automate software systems', subtitle: 'For teams that grow without breaking apart', cta: 'Start with a Health Check' },
  footer: { rights: 'All rights reserved' },
} as const;
```

```typescript
// src/i18n/index.ts
import it from './it';
import en from './en';

const translations = { it, en } as const;

export type Lang = keyof typeof translations;

export function t(lang: Lang) {
  return translations[lang];
}
```

**Step 2: Create English mirror pages**

Each EN page mirrors its IT counterpart, passing `lang="en"` to all components. Example for homepage:

```astro
---
// src/pages/en/index.astro
import BaseLayout from '@/layouts/BaseLayout.astro';
import Header from '@/components/layout/Header.astro';
import Footer from '@/components/layout/Footer.astro';
import Hero from '@/components/home/Hero.astro';
import PillarCards from '@/components/home/PillarCards.astro';
import FeaturedProjects from '@/components/home/FeaturedProjects.astro';
import FilteredPosts from '@/components/home/FilteredPosts.astro';
import AboutBrief from '@/components/home/AboutBrief.astro';
import ContactSection from '@/components/home/ContactSection.astro';
---

<BaseLayout title="I design, verify, and automate software systems" lang="en">
  <Header lang="en" />
  <Hero lang="en" />
  <PillarCards lang="en" />
  <FeaturedProjects lang="en" />
  <FilteredPosts lang="en" />
  <AboutBrief lang="en" />
  <ContactSection lang="en" />
  <Footer lang="en" />
</BaseLayout>
```

Create EN versions for blog list, blog post, services, and about pages — same structure as IT but with `lang="en"`, filtering on `p.data.lang === 'en'`, and English routes.

**Step 3: Commit**

```bash
git add src/i18n/ src/pages/en/
git commit -m "feat: add i18n utilities and English mirror pages"
```

---

## Phase 8: Search & Animations

### Task 27: Integrate Pagefind search

**Files:**
- Create: `src/components/interactive/SearchModal.vue`
- Modify: `src/components/layout/Header.astro` (wire search trigger)
- Modify: `package.json` (add pagefind postbuild script)

**Step 1: Install Pagefind**

```bash
npm install -D pagefind
```

**Step 2: Add postbuild script to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "build": "astro build",
    "postbuild": "pagefind --site dist --glob '**/*.html'",
    "dev": "astro dev",
    "preview": "astro preview"
  }
}
```

**Step 3: Write SearchModal Vue component**

```vue
<!-- src/components/interactive/SearchModal.vue -->
<template>
  <div>
    <!-- Trigger button (rendered in Header slot) -->
    <button @click="open = true" class="p-2 rounded-lg hover:bg-border/30 dark:hover:bg-border-dark/30 transition-colors" aria-label="Cerca">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" @click.self="open = false" @keydown.escape="open = false">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <!-- Modal content -->
        <div class="relative w-full max-w-xl mx-4 bg-base-light dark:bg-base-dark rounded-xl border border-border dark:border-border-dark shadow-2xl overflow-hidden">
          <div id="pagefind-container" class="p-4"></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';

const open = ref(false);

// Init Pagefind UI when modal opens
watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  const container = document.getElementById('pagefind-container');
  if (container && !container.hasChildNodes()) {
    // @ts-ignore — Pagefind loaded at runtime
    const { PagefindUI } = await import('/pagefind/pagefind-ui.js');
    new PagefindUI({
      element: '#pagefind-container',
      showSubResults: false,
      showImages: false,
      autofocus: true,
      translations: {
        placeholder: 'Cerca nel blog...',
        zero_results: 'Nessun risultato per [SEARCH_TERM]',
      },
    });
  }
});

// Keyboard shortcut: Cmd/Ctrl+K
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open.value = !open.value;
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>
```

**Step 4: Add Pagefind CSS to BaseLayout**

In `BaseLayout.astro`, add inside `<head>`:
```html
<link href="/pagefind/pagefind-ui.css" rel="stylesheet" />
```

And add CSS variables for Pagefind theming in `global.css`:
```css
:root {
  --pagefind-ui-scale: 0.9;
  --pagefind-ui-primary: #E8973A;
  --pagefind-ui-text: #2D2D3A;
  --pagefind-ui-background: #F5F3EF;
  --pagefind-ui-border: #D4D1CA;
  --pagefind-ui-border-radius: 8px;
  --pagefind-ui-font: "Inter", system-ui, sans-serif;
}

.dark {
  --pagefind-ui-primary: #E8973A;
  --pagefind-ui-text: #E0DDD6;
  --pagefind-ui-background: #1E1E2E;
  --pagefind-ui-border: #3A3A4C;
}
```

**Step 5: Replace search button in Header with SearchModal**

Replace the static search button in `Header.astro` with:
```astro
import SearchModal from '@/components/interactive/SearchModal.vue';
<!-- Replace the search trigger button with: -->
<SearchModal client:load />
```

**Step 6: Build and verify Pagefind index**

```bash
npm run build
ls dist/pagefind/
```

Expected: `pagefind.js`, `pagefind-ui.js`, `pagefind-ui.css`, index files.

**Step 7: Commit**

```bash
git add src/components/interactive/SearchModal.vue src/components/layout/Header.astro src/styles/global.css src/layouts/BaseLayout.astro package.json
git commit -m "feat: add Pagefind search with SearchModal and Cmd+K shortcut"
```

---

### Task 28: Add View Transitions and scroll animations

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/home/Hero.astro` (add animation class)

**Step 1: Enable View Transitions**

In `BaseLayout.astro`, add in the `<head>`:

```astro
---
import { ViewTransitions } from 'astro:transitions';
---
<!-- Inside <head> -->
<ViewTransitions />
```

**Step 2: Add fade-in on scroll for homepage sections**

Add to `global.css`:

```css
/* Fade-in on scroll */
.fade-in-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.fade-in-section.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

Add a small inline script to `BaseLayout.astro` (before `</body>`):

```html
<script is:inline>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));
</script>
```

**Step 3: Add `fade-in-section` class to homepage sections**

In `PillarCards.astro`, `FeaturedProjects.astro`, `FilteredPosts.astro`, `AboutBrief.astro`, `ContactSection.astro`: add `class="fade-in-section"` to the outer `<section>` tag.

**Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/styles/global.css src/components/home/
git commit -m "feat: add View Transitions and fade-in scroll animations"
```

---

## Phase 9: CI/CD, SEO, RSS

### Task 29: Set up GitHub Actions deploy

**Files:**
- Modify: `.github/workflows/hugo.yaml` → rename/replace with Astro workflow

**Step 1: Write Astro deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Step 2: Write PR validation workflow**

```yaml
# .github/workflows/pr.yml
name: PR Validation

on:
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
```

**Step 3: Remove/archive old Hugo workflows**

```bash
mv .github/workflows/hugo.yaml .github/workflows/hugo.yaml.bak
mv .github/workflows/merge-to-main.yml .github/workflows/merge-to-main.yml.bak
mv .github/workflows/theme-update.yml .github/workflows/theme-update.yml.bak
```

**Step 4: Commit**

```bash
git add .github/workflows/
git commit -m "feat: replace Hugo CI/CD with Astro deploy workflows"
```

---

### Task 30: Add RSS feed and sitemap

**Files:**
- Create: `src/pages/rss.xml.ts`
- Verify: sitemap integration (already added in Task 2)

**Step 1: Write RSS feed endpoint**

```typescript
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts'))
    .filter(p => p.data.lang === 'it' && !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'montelli.dev',
    description: 'Progetto, verifico e automatizzo sistemi software',
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
```

**Step 2: Build and verify**

```bash
npm run build
cat dist/rss.xml | head -20
ls dist/sitemap-index.xml
```

**Step 3: Commit**

```bash
git add src/pages/rss.xml.ts
git commit -m "feat: add RSS feed and verify sitemap"
```

---

### Task 31: Update Netlify config

**Files:**
- Modify: `netlify.toml`

**Step 1: Update for Astro**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

[context.deploy-preview]
  command = "npm run build"

[context.branch-deploy]
  command = "npm run build"
```

**Step 2: Commit**

```bash
git add netlify.toml
git commit -m "chore: update netlify.toml for Astro build"
```

---

### Task 32: Add Makefile for common operations

**Files:**
- Modify: `Makefile`

**Step 1: Replace Hugo Makefile with Astro targets**

```makefile
.PHONY: help dev build preview clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Dev server with hot reload
	npx astro dev

build: ## Build for production
	npm run build

preview: ## Preview production build locally
	npx astro preview

clean: ## Remove build output
	rm -rf dist .astro
```

**Step 2: Commit**

```bash
git add Makefile
git commit -m "chore: update Makefile for Astro commands"
```

---

### Task 33: Final build verification and cleanup

**Step 1: Full production build**

```bash
npm run build 2>&1
```

Expected: clean build, no errors. All pages generated.

**Step 2: Check page count**

```bash
find dist -name 'index.html' | wc -l
```

Expected: roughly 60+ pages (52 IT posts + EN posts + homepage + blog list + services + about + QR + 404 + pillar pages).

**Step 3: Preview locally**

```bash
npx astro preview &
# Open http://localhost:4321
# Verify: homepage, blog list, blog post, services, about, QR, 404, dark mode, search
```

**Step 4: Remove Hugo backup files and old config**

```bash
rm package.json.hugo.bak
rm -f hugo.yaml  # or keep for reference
rm -rf archetypes/
# Keep content/ (old Hugo content) until migration is verified
# Keep go.mod, go.sum (can remove after migration is confirmed)
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: clean up Hugo artifacts after Astro migration"
```

---

## Post-Migration Checklist

After all tasks are complete, verify:

- [ ] Homepage renders all 6 sections per org.md
- [ ] Dark mode default, toggle works, persists across pages
- [ ] All 52 published posts accessible at `/blog/<slug>/`
- [ ] Blog list pagination works (12/page)
- [ ] Pillar filtering on blog list works
- [ ] Series navigation works for multi-part articles
- [ ] TOC sidebar renders on blog posts
- [ ] Syntax highlighting with Shiki dual themes
- [ ] KaTeX formulas render
- [ ] Mermaid diagrams render
- [ ] Search (Pagefind) returns results
- [ ] Cmd/Ctrl+K opens search modal
- [ ] View Transitions between pages
- [ ] Fade-in animations on homepage scroll
- [ ] Services page with 4 sections + CTA
- [ ] About page with skills, timeline, publications
- [ ] QR contact page
- [ ] 404 page
- [ ] Language switcher IT/EN
- [ ] English pages render with EN content
- [ ] RSS feed at /rss.xml
- [ ] Sitemap at /sitemap-index.xml
- [ ] Lighthouse score 95+
- [ ] GitHub Actions deploy works
- [ ] Netlify preview builds work
- [ ] All images load (WebP, lazy loaded)
- [ ] Mobile responsive on all pages
- [ ] No console errors
