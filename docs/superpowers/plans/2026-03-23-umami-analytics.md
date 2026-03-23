# Umami Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Umami Cloud analytics to montelli.dev with pageview tracking and custom events for CTA/social/blog/search/project interactions.

**Architecture:** Single `<script>` tag in BaseLayout.astro, conditional on env var. Custom events via `data-umami-event` HTML attributes on Astro components and `umami.track()` calls in Vue islands. No npm dependencies.

**Tech Stack:** Umami Cloud (free tier), Astro 5, Vue 3, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-03-23-umami-analytics-design.md`

---

### Task 1: Umami script tag in BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro:18-48` (inside `<head>`)

- [ ] **Step 1: Add dns-prefetch and conditional Umami script**

In `src/layouts/BaseLayout.astro`, add the following after the Google Fonts block (after line 45, before the `<!-- View Transitions -->` comment):

```astro
  <!-- Analytics — Umami Cloud (cookie-free, GDPR compliant) -->
  {import.meta.env.PUBLIC_UMAMI_WEBSITE_ID && (
    <>
      <link rel="dns-prefetch" href="https://cloud.umami.is" />
      <script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id={import.meta.env.PUBLIC_UMAMI_WEBSITE_ID}
        data-domains="montelli.dev"
        is:inline
      />
    </>
  )}
```

Note: `is:inline` is required because Astro would otherwise try to bundle the external script. The `data-domains` attribute restricts tracking to production only.

- [ ] **Step 2: Verify build succeeds without env var**

Run: `npm run build`
Expected: Build succeeds. The script tag is not present in the output HTML (since `PUBLIC_UMAMI_WEBSITE_ID` is undefined).

- [ ] **Step 3: Verify build succeeds with env var**

Run: `PUBLIC_UMAMI_WEBSITE_ID=test-id npm run build`
Expected: Build succeeds. Check `dist/index.html` contains `data-website-id="test-id"` and `data-domains="montelli.dev"`.

Run: `grep -l 'data-website-id="test-id"' dist/index.html`
Expected: match found.

- [ ] **Step 4: Clean up test build and commit**

Run: `npm run build` (clean build without env var)

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(analytics): add conditional Umami script tag in BaseLayout"
```

---

### Task 2: Custom events on Footer

**Files:**
- Modify: `src/components/layout/Footer.astro:17-19`

- [ ] **Step 1: Add data-umami-event attributes to footer links**

In `src/components/layout/Footer.astro`, replace lines 17-19:

```astro
      <a href="mailto:francesco@montelli.dev" class="text-text-muted hover:text-accent transition-colors text-xs">Email</a>
      <a href="https://linkedin.com/in/francesco-montelli" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-accent transition-colors text-xs">LinkedIn</a>
      <a href="https://github.com/monte97" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-accent transition-colors text-xs">GitHub</a>
```

with:

```astro
      <a href="mailto:francesco@montelli.dev" class="text-text-muted hover:text-accent transition-colors text-xs" data-umami-event="click-email">Email</a>
      <a href="https://linkedin.com/in/francesco-montelli" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-accent transition-colors text-xs" data-umami-event="click-social" data-umami-event-platform="linkedin">LinkedIn</a>
      <a href="https://github.com/monte97" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-accent transition-colors text-xs" data-umami-event="click-social" data-umami-event-platform="github">GitHub</a>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Check `dist/index.html` contains `data-umami-event="click-email"`.

Run: `grep 'data-umami-event="click-email"' dist/index.html`
Expected: match found.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.astro
git commit -m "feat(analytics): add Umami events to footer social/email links"
```

---

### Task 3: Custom events on ContactSection

**Files:**
- Modify: `src/components/home/ContactSection.astro:63-68` (CTA buttons) and `92-97` (social links)

- [ ] **Step 1: Add data-umami-event to CTA buttons**

In `src/components/home/ContactSection.astro`, replace lines 63-68:

```astro
      <Button href="mailto:francesco@montelli.dev" size="lg">
        {t.ctaPrimary} &rarr;
      </Button>
      <Button href="/servizi/#health-check" variant="secondary" size="lg">
        {t.ctaSecondary}
      </Button>
```

with:

```astro
      <Button href="mailto:francesco@montelli.dev" size="lg" data-umami-event="cta-contact-email">
        {t.ctaPrimary} &rarr;
      </Button>
      <Button href="/servizi/#health-check" variant="secondary" size="lg" data-umami-event="cta-contact-healthcheck">
        {t.ctaSecondary}
      </Button>
```

Note: `Button.astro` already spreads `...rest` props onto the rendered element (line 30), so `data-umami-event` passes through automatically.

- [ ] **Step 2: Add data-umami-event to social links in ContactSection**

Replace lines 92-97:

```astro
      <a href="mailto:francesco@montelli.dev" class="hover:text-accent transition-colors">
        Email
      </a>
      <a href="https://linkedin.com/in/francesco-montelli" target="_blank" rel="noopener noreferrer" class="hover:text-accent transition-colors">
        LinkedIn
      </a>
```

with:

```astro
      <a href="mailto:francesco@montelli.dev" class="hover:text-accent transition-colors" data-umami-event="click-email">
        Email
      </a>
      <a href="https://linkedin.com/in/francesco-montelli" target="_blank" rel="noopener noreferrer" class="hover:text-accent transition-colors" data-umami-event="click-social" data-umami-event-platform="linkedin">
        LinkedIn
      </a>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. Check `dist/index.html` contains `data-umami-event="cta-contact-email"`.

Run: `grep 'data-umami-event="cta-contact-email"' dist/index.html`
Expected: match found.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/ContactSection.astro
git commit -m "feat(analytics): add Umami events to ContactSection CTAs and social links"
```

---

### Task 4: Custom events on blog post cards (Astro — homepage)

**Files:**
- Modify: `src/components/blog/PostCard.astro:1-18` (props) and `29` (outer `<a>` tag)
- Modify: `src/components/home/FilteredPosts.astro:50,74-82` (featured post + PostCard callers)

- [ ] **Step 1: Add category prop to PostCard and data-umami-event on outer link**

In `src/components/blog/PostCard.astro`, replace the Props interface and destructuring (lines 3-18):

```astro
interface Props {
  title: string;
  description: string;
  date: Date;
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null;
  category?: string;
  tags: string[];
  href: string;
  lang?: 'it' | 'en';
  heroImage?: string;
  readingTime?: number;
}

const { title, description, date, pillar, category, tags, href, lang = 'it', heroImage, readingTime } = Astro.props;
```

Then replace line 29 (the outer `<a>` tag):

```astro
<a href={href} class="group block h-full">
```

with:

```astro
<a href={href} class="group block h-full" data-umami-event="blog-read" data-umami-event-pillar={pillar ?? ''} data-umami-event-category={category ?? ''}>
```

- [ ] **Step 2: Pass category to PostCard from FilteredPosts**

In `src/components/home/FilteredPosts.astro`, add the featured post tracking attribute on line 50. Replace:

```astro
      <a href={postHref(featured.id, lang)} class="group block mb-6">
```

with:

```astro
      <a href={postHref(featured.id, lang)} class="group block mb-6" data-umami-event="blog-read" data-umami-event-pillar={featured.data.pillar ?? ''} data-umami-event-category={featured.data.category ?? ''}>
```

Then in the PostCard usage (lines 75-83), add the category prop:

```astro
        <PostCard
          title={post.data.title}
          description={post.data.description}
          date={post.data.date}
          pillar={post.data.pillar}
          category={post.data.category}
          tags={post.data.tags}
          href={postHref(post.id, lang)}
          lang={lang}
        />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. Check homepage HTML contains `data-umami-event="blog-read"`.

Run: `grep 'data-umami-event="blog-read"' dist/index.html`
Expected: match found.

- [ ] **Step 4: Commit**

```bash
git add src/components/blog/PostCard.astro src/components/home/FilteredPosts.astro
git commit -m "feat(analytics): add blog-read event to PostCard and FilteredPosts"
```

---

### Task 5: Custom events on blog post cards (Vue — /blog/ page)

**Files:**
- Modify: `src/components/blog/BlogFilterable.vue:200-204` (featured post `<a>`) and `262-267` (grid post `<a>`)

- [ ] **Step 1: Add data-umami-event to featured post link**

In `src/components/blog/BlogFilterable.vue`, replace lines 200-204 (including the closing `>`):

```vue
        <a
          v-if="featuredPost"
          :href="featuredPost.href"
          class="group block mb-6"
        >
```

with:

```vue
        <a
          v-if="featuredPost"
          :href="featuredPost.href"
          class="group block mb-6"
          data-umami-event="blog-read"
          :data-umami-event-pillar="featuredPost.pillar ?? ''"
          :data-umami-event-category="featuredPost.category ?? ''"
        >
```

- [ ] **Step 2: Add data-umami-event to grid post links**

Replace lines 262-267 (including the closing `>`):

```vue
          <a
            v-for="post in gridPosts"
            :key="post.id"
            :href="post.href"
            class="group block h-full"
          >
```

with:

```vue
          <a
            v-for="post in gridPosts"
            :key="post.id"
            :href="post.href"
            class="group block h-full"
            data-umami-event="blog-read"
            :data-umami-event-pillar="post.pillar ?? ''"
            :data-umami-event-category="post.category ?? ''"
          >
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/blog/BlogFilterable.vue
git commit -m "feat(analytics): add blog-read event to BlogFilterable Vue component"
```

---

### Task 6: Custom events on project cards

**Files:**
- Modify: `src/components/home/FeaturedProjects.astro:36` (project `<a>` tag)
- Modify: `src/components/pages/ProjectsPage.astro:69-71` (project `<a>` tag) and `104-106` (workshop `<a>` tag)

- [ ] **Step 1: Add data-umami-event to FeaturedProjects**

In `src/components/home/FeaturedProjects.astro`, replace line 36:

```astro
          <a href={href} class="group block h-full">
```

with:

```astro
          <a href={href} class="group block h-full" data-umami-event="click-project" data-umami-event-project={project.data.title}>
```

- [ ] **Step 2: Add data-umami-event to ProjectsPage project links**

In `src/components/pages/ProjectsPage.astro`, replace lines 69-71:

```astro
          <a
            href={`${prefix}/progetti/${project.id}/`}
            class="group block rounded-xl border border-border/70 dark:border-border-dark/70 border-l-[3px] p-6 bg-white dark:bg-surface-dark hover:shadow-md hover:border-border dark:hover:border-border-dark transition-all duration-300"
```

with:

```astro
          <a
            href={`${prefix}/progetti/${project.id}/`}
            class="group block rounded-xl border border-border/70 dark:border-border-dark/70 border-l-[3px] p-6 bg-white dark:bg-surface-dark hover:shadow-md hover:border-border dark:hover:border-border-dark transition-all duration-300"
            data-umami-event="click-project"
            data-umami-event-project={project.data.title}
```

- [ ] **Step 3: Add data-umami-event to ProjectsPage workshop links**

Replace lines 104-106:

```astro
          <a
            href={`${prefix}/progetti/${ws.id}/`}
            class="group block rounded-xl border border-border/70 dark:border-border-dark/70 border-l-[3px] p-6 bg-white dark:bg-surface-dark hover:shadow-md hover:border-border dark:hover:border-border-dark transition-all duration-300"
```

with:

```astro
          <a
            href={`${prefix}/progetti/${ws.id}/`}
            class="group block rounded-xl border border-border/70 dark:border-border-dark/70 border-l-[3px] p-6 bg-white dark:bg-surface-dark hover:shadow-md hover:border-border dark:hover:border-border-dark transition-all duration-300"
            data-umami-event="click-project"
            data-umami-event-project={ws.data.title}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/FeaturedProjects.astro src/components/pages/ProjectsPage.astro
git commit -m "feat(analytics): add click-project event to project and workshop cards"
```

---

### Task 7: Search modal tracking

**Files:**
- Modify: `src/components/interactive/SearchModal.vue:70-71` (inside `watch(open, ...)`)

- [ ] **Step 1: Add umami.track call when search modal opens**

In `src/components/interactive/SearchModal.vue`, replace lines 70-71:

```ts
watch(open, async (isOpen) => {
  if (!isOpen || initialized) return;
```

with:

```ts
watch(open, async (isOpen) => {
  if (!isOpen) return;
  if ((window as any).umami) {
    (window as any).umami.track('search-open');
  }
  if (initialized) return;
```

This tracks every open (not just the first), while Pagefind initialization still only happens once.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/interactive/SearchModal.vue
git commit -m "feat(analytics): track search modal open event"
```

---

### Task 8: Privacy policy update

**Files:**
- Modify: `src/pages/privacy.astro:60-61` (after the "Cookie Analitici" paragraph)

- [ ] **Step 1: Add Umami-specific paragraph to privacy policy**

In `src/pages/privacy.astro`, after line 61 (end of the "Cookie Analitici" `<p>` tag), add:

```html
    <p>Questo sito utilizza <strong>Umami</strong> (<a href="https://umami.is" target="_blank" rel="noopener noreferrer">umami.is</a>) come strumento di analisi del traffico. Umami non utilizza cookie, non raccoglie dati personali identificabili e non effettua tracciamento cross-site. I dati raccolti (pagine visitate, referrer, tipo di dispositivo, browser, paese di provenienza) sono aggregati e anonimizzati: non consentono in alcun modo di identificare i singoli visitatori.</p>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Check privacy page contains "Umami".

Run: `grep 'Umami' dist/privacy/index.html`
Expected: match found.

- [ ] **Step 3: Commit**

```bash
git add src/pages/privacy.astro
git commit -m "docs(privacy): add Umami analytics disclosure to privacy policy"
```

---

### Task 9: GitHub Actions and env configuration

**Files:**
- Modify: `.github/workflows/deploy.yml:27` (build step)
- Create: `.env.example`

- [ ] **Step 1: Add env var to deploy workflow build step**

In `.github/workflows/deploy.yml`, replace line 27:

```yaml
      - run: npm run build
```

with:

```yaml
      - run: npm run build
        env:
          PUBLIC_UMAMI_WEBSITE_ID: ${{ vars.PUBLIC_UMAMI_WEBSITE_ID }}
```

- [ ] **Step 2: Create .env.example**

Create `.env.example` with:

```
# Umami Analytics — get your website ID from https://cloud.umami.is
# Set as GitHub repository Variable (Settings > Secrets and variables > Actions > Variables)
# Not needed for local dev (analytics script is omitted when undefined)
PUBLIC_UMAMI_WEBSITE_ID=
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: Build succeeds (env var is not set, script tag omitted).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml .env.example
git commit -m "feat(analytics): configure Umami env var in deploy workflow"
```

---

### Task 10: Final verification

- [ ] **Step 1: Full production build with env var**

Run: `PUBLIC_UMAMI_WEBSITE_ID=test-verify npm run build`

Verify all events are present in the build output:

```bash
grep -r 'data-umami-event' dist/ | head -20
grep 'data-website-id="test-verify"' dist/index.html
grep 'data-domains="montelli.dev"' dist/index.html
grep 'Umami' dist/privacy/index.html
```

Expected: All greps return matches.

- [ ] **Step 2: Verify no events leak PII**

```bash
grep -r 'data-umami-event' dist/ | grep -v -E '(click-email|click-social|cta-contact-email|cta-contact-healthcheck|blog-read|search-open|click-project)' || echo "OK: only expected events found"
```

Expected: "OK: only expected events found"

- [ ] **Step 3: Clean build and commit any remaining changes**

Run: `npm run build` (clean build without env var)

If no remaining changes, this task is done.

---

### Post-Implementation: Umami Account Setup

This is a manual step for the site owner (not automatable):

1. Create account at https://cloud.umami.is
2. Add website: `montelli.dev`
3. Copy the `data-website-id` value
4. Go to GitHub repo > Settings > Secrets and variables > Actions > Variables tab
5. Create variable `PUBLIC_UMAMI_WEBSITE_ID` with the copied value
6. Trigger a deploy (push to main or manual workflow_dispatch)
7. Visit montelli.dev and verify tracking appears in Umami dashboard
