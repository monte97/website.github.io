# Page Hero Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the bare h1+p header pattern on all internal pages (Services, About, Blog) with a cohesive mini-hero section matching the home page's visual identity. Move health check card below services. Add accent ring to profile photo in both home and about.

**Architecture:** A single reusable `PageHero.astro` component with optional props for image, CTA, and secondary CTA. Each page passes its own content. The component replicates the home hero's dot pattern background and accent gradient blob but at a more compact size.

**Tech Stack:** Astro components, Tailwind CSS

---

### Task 1: Create the `PageHero.astro` component

**Files:**
- Create: `src/components/ui/PageHero.astro`

**Step 1: Create the component file**

```astro
---
import Button from '@/components/ui/Button.astro';

interface Props {
  title: string;
  subtitle?: string;
  image?: { src: string; alt: string };
  cta?: { href: string; label: string };
  ctaSecondary?: { href: string; label: string };
}

const { title, subtitle, image, cta, ctaSecondary } = Astro.props;
---

<section class="relative overflow-hidden border-b border-border/30 dark:border-border-dark/30">
  <!-- Dot pattern background -->
  <div class="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]" aria-hidden="true">
    <svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="page-hero-dots" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="1" fill="currentColor" class="text-text-dark dark:text-text-light" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#page-hero-dots)" />
    </svg>
  </div>

  <!-- Accent gradient blob -->
  <div class="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" aria-hidden="true"></div>

  <!-- Content -->
  <div class="relative z-10 max-w-5xl mx-auto px-5 pt-16 pb-12 md:pt-20 md:pb-16">
    <div class:list={[
      'flex flex-col',
      image ? 'md:flex-row md:items-center md:gap-12' : '',
    ]}>
      {image && (
        <div class="shrink-0 mb-6 md:mb-0">
          <img
            src={image.src}
            alt={image.alt}
            width="128"
            height="128"
            class="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-cover shadow-lg ring-4 ring-accent"
          />
        </div>
      )}

      <div class="flex-1">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-text-dark dark:text-text-light">
          {title}
        </h1>
        {subtitle && (
          <p class="mt-3 text-base md:text-lg text-text-muted max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
        {(cta || ctaSecondary) && (
          <div class="mt-6 flex flex-wrap gap-3">
            {cta && (
              <Button href={cta.href} size="md">
                {cta.label}
              </Button>
            )}
            {ctaSecondary && (
              <Button href={ctaSecondary.href} variant="secondary" size="md">
                {ctaSecondary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
</section>
```

**Step 2: Verify the build compiles**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro check 2>&1 | tail -5`
Expected: No errors related to PageHero

**Step 3: Commit**

```bash
git add src/components/ui/PageHero.astro
git commit -m "feat: add PageHero reusable component for internal pages"
```

---

### Task 2: Update Home Hero photo styling

**Files:**
- Modify: `src/components/home/Hero.astro:53-65` (photo column)

**Step 1: Replace the photo column**

In `src/components/home/Hero.astro`, replace the photo column (the `<!-- Photo column -->` div, lines 53-65):

Old:
```astro
      <!-- Photo column -->
      <div class="shrink-0 mb-8 md:mb-0">
        <div class="relative w-28 h-28 md:w-36 md:h-36">
          <img
            src="/images/author/monte.png"
            alt="Francesco Montelli"
            width="144"
            height="144"
            class="w-full h-full rounded-2xl object-cover shadow-lg ring-1 ring-border/50 dark:ring-border-dark/50"
          />
          <!-- Amber corner accent -->
          <div class="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-accent rounded-md" aria-hidden="true"></div>
        </div>
      </div>
```

New:
```astro
      <!-- Photo column -->
      <div class="shrink-0 mb-8 md:mb-0">
        <img
          src="/images/author/monte.png"
          alt="Francesco Montelli"
          width="144"
          height="144"
          class="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover shadow-lg ring-4 ring-accent"
        />
      </div>
```

Changes: removed the wrapper `<div class="relative">`, removed the amber corner accent div, changed `ring-1 ring-border/50 dark:ring-border-dark/50` to `ring-4 ring-accent`.

**Step 2: Visual check with dev server**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -3`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/home/Hero.astro
git commit -m "feat: use accent ring on home hero profile photo"
```

---

### Task 3: Wire PageHero into Services page (IT)

**Files:**
- Modify: `src/pages/servizi/index.astro`

**Step 1: Add PageHero import and replace the h1+p header**

Add import at top of frontmatter (after other imports):
```typescript
import PageHero from '@/components/ui/PageHero.astro';
```

**Step 2: Replace the opening of the template**

Old (lines 58-63):
```astro
<PageLayout title="Servizi">
  <h1 class="text-4xl font-bold mb-4">Come posso aiutarti</h1>
  <p class="text-text-muted text-lg mb-16 max-w-2xl">
    Aiuto team tecnici a costruire, monitorare e automatizzare sistemi software con metodo.
  </p>
```

New:
```astro
<PageLayout title="Servizi">
  <PageHero
    title="Come posso aiutarti"
    subtitle="Aiuto team tecnici a costruire, monitorare e automatizzare sistemi software con metodo."
    cta={{ href: '#health-check', label: 'Inizia dal Health Check' }}
  />
```

Note: PageHero renders outside the `max-w-5xl` constraint of PageLayout's `<main>`. This is intentional — the hero should span the full width like the home hero. To achieve this, the PageHero must break out of the parent container. Add a negative margin wrapper:

Actually, looking at PageLayout (line 18): `<main class="max-w-5xl mx-auto px-5 py-12">` — the hero will be constrained. We need to handle this. Two options:
- Option A: wrap PageHero in a div that breaks out of the container with negative margins
- Option B: don't use PageLayout for pages with PageHero, use BaseLayout directly

**Better approach — Option B**: For pages that use PageHero, switch to BaseLayout + Header/Footer directly (like the home page does). The hero goes before `<main>`, and the rest of the content goes inside `<main class="max-w-5xl mx-auto px-5 py-12">`.

Replace the entire template structure in `src/pages/servizi/index.astro`:

Old (line 58):
```astro
<PageLayout title="Servizi">
  <h1 class="text-4xl font-bold mb-4">Come posso aiutarti</h1>
  <p class="text-text-muted text-lg mb-16 max-w-2xl">
    ...
  </p>

  {/* Health Check hero card */}
  {healthCheck && (
    <section id={healthCheck.service.id} ...>
      ...
    </section>
  )}

  {/* Other services as cards */}
  <div class="space-y-8">
    ...
  </div>
</PageLayout>
```

New:
```astro
<BaseLayout title="Servizi">
  <Header lang="it" />
  <PageHero
    title="Come posso aiutarti"
    subtitle="Aiuto team tecnici a costruire, monitorare e automatizzare sistemi software con metodo."
    cta={{ href: '#health-check', label: 'Inizia dal Health Check' }}
  />
  <main class="max-w-5xl mx-auto px-5 py-12">
    {/* Services cards */}
    <div class="space-y-8">
      {otherServices.map(({ service, Content }) => {
        /* ... existing service card code unchanged ... */
      })}
    </div>

    {/* Health Check — moved to bottom */}
    {healthCheck && (
      <section
        id={healthCheck.service.id}
        class="bg-accent-subtle rounded-xl p-8 mt-16 scroll-mt-20 fade-in-section"
      >
        <span class="text-xs text-accent font-semibold uppercase tracking-wide">
          Punto di partenza
        </span>
        <div class="flex items-center gap-3 mt-2 mb-4">
          <span class="text-accent" set:html={icons[healthCheck.service.data.icon]} />
          <h2 class="text-2xl font-bold">{healthCheck.service.data.title}</h2>
        </div>
        <div class="prose dark:prose-invert max-w-none text-text-muted mb-6">
          <healthCheck.Content />
        </div>
        <Button
          href={`mailto:francesco@montelli.dev?subject=${encodeURIComponent(healthCheck.service.data.title)}`}
          variant="primary"
          size="md"
        >
          {healthCheck.service.data.cta}
        </Button>
      </section>
    )}
  </main>
  <Footer lang="it" />
</BaseLayout>
```

Update the imports in frontmatter:
- Remove: `import PageLayout from '@/layouts/PageLayout.astro';`
- Add: `import BaseLayout from '@/layouts/BaseLayout.astro';`
- Add: `import Header from '@/components/layout/Header.astro';`
- Add: `import Footer from '@/components/layout/Footer.astro';`
- Add: `import PageHero from '@/components/ui/PageHero.astro';`

**Step 3: Build check**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/pages/servizi/index.astro
git commit -m "feat: add PageHero to services page, move health check to bottom"
```

---

### Task 4: Wire PageHero into Services page (EN)

**Files:**
- Modify: `src/pages/en/services/index.astro`

**Step 1: Apply the same structural changes as Task 3**

Same pattern: replace PageLayout with BaseLayout+Header+Footer+PageHero.

Imports to change:
- Remove: `import PageLayout from '@/layouts/PageLayout.astro';`
- Add: `import BaseLayout from '@/layouts/BaseLayout.astro';`
- Add: `import Header from '@/components/layout/Header.astro';`
- Add: `import Footer from '@/components/layout/Footer.astro';`
- Add: `import PageHero from '@/components/ui/PageHero.astro';`

Template:
```astro
<BaseLayout title="Services">
  <Header lang="en" />
  <PageHero
    title="How I can help"
    subtitle="I help engineering teams build, monitor, and automate software systems with method."
    cta={{ href: '#health-check', label: 'Start with a Health Check' }}
  />
  <main class="max-w-5xl mx-auto px-5 py-12">
    {/* Services cards — same as before */}
    <div class="space-y-8">
      {otherServices.map(({ service, Content }) => {
        /* ... existing code unchanged ... */
      })}
    </div>

    {/* Health Check — moved to bottom */}
    {healthCheck && (
      <section
        id={healthCheck.service.id}
        class="bg-accent-subtle rounded-xl p-8 mt-16 scroll-mt-20 fade-in-section"
      >
        <span class="text-xs text-accent font-semibold uppercase tracking-wide">
          Starting point
        </span>
        <div class="flex items-center gap-3 mt-2 mb-4">
          <span class="text-accent" set:html={icons[healthCheck.service.data.icon]} />
          <h2 class="text-2xl font-bold">{healthCheck.service.data.title}</h2>
        </div>
        <div class="prose dark:prose-invert max-w-none text-text-muted mb-6">
          <healthCheck.Content />
        </div>
        <Button
          href={`mailto:francesco@montelli.dev?subject=${encodeURIComponent(healthCheck.service.data.title)}`}
          variant="primary"
          size="md"
        >
          {healthCheck.service.data.cta}
        </Button>
      </section>
    )}
  </main>
  <Footer lang="en" />
</BaseLayout>
```

**Step 2: Build check**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/en/services/index.astro
git commit -m "feat: add PageHero to EN services page, move health check to bottom"
```

---

### Task 5: Wire PageHero into About page (IT)

**Files:**
- Modify: `src/pages/about/index.astro`

**Step 1: Update imports**

- Remove: `import PageLayout from '@/layouts/PageLayout.astro';`
- Add: `import BaseLayout from '@/layouts/BaseLayout.astro';`
- Add: `import Header from '@/components/layout/Header.astro';`
- Add: `import Footer from '@/components/layout/Footer.astro';`
- Add: `import PageHero from '@/components/ui/PageHero.astro';`

**Step 2: Replace the template**

The current About page has the bio (photo + name + bio text + stats) inside a `<section class="mb-20">`. We move the photo and title into PageHero, and keep the bio text + stats as the first section in main.

Old (lines 39-69):
```astro
<PageLayout title="About">
  {/* Bio */}
  <section class="mb-20 fade-in-section">
    <div class="flex flex-col md:flex-row items-center md:items-start gap-8">
      <img src={author.image} alt={author.name} ... />
      <div>
        <p class="text-sm text-accent ...">Backend Engineer & DevOps Consultant</p>
        <h1 class="text-4xl font-bold mb-4">Chi sono</h1>
        <p class="text-text-muted ...">{bio}</p>
        <div class="flex gap-8 mt-6">
          ... stats ...
        </div>
      </div>
    </div>
  </section>
  ... rest ...
</PageLayout>
```

New:
```astro
<BaseLayout title="About">
  <Header lang="it" />
  <PageHero
    title="Chi sono"
    subtitle="Backend Engineer & DevOps Consultant"
    image={{ src: author.image, alt: author.name }}
    cta={{ href: '/files/Francesco_Montelli_CV.pdf', label: 'Scarica CV' }}
  />
  <main class="max-w-5xl mx-auto px-5 py-12">
    {/* Bio */}
    <section class="mb-20 fade-in-section">
      <p class="text-text-muted text-lg leading-relaxed max-w-2xl">
        {bio}
      </p>
      <div class="flex gap-8 mt-6">
        <div>
          <span class="text-3xl font-bold text-accent">{yearsExperience}+</span>
          <p class="text-sm text-text-muted">anni di esperienza</p>
        </div>
        <div>
          <span class="text-3xl font-bold text-accent">{articleCount}</span>
          <p class="text-sm text-text-muted">articoli pubblicati</p>
        </div>
      </div>
    </section>

    {/* Stack tecnologico — unchanged */}
    ...
    {/* Esperienze — unchanged */}
    ...
    {/* Istruzione — unchanged */}
    ...
    {/* Pubblicazioni — unchanged */}
    ...
    {/* CTA — unchanged */}
    ...
  </main>
  <Footer lang="it" />
</BaseLayout>
```

**Step 3: Build check**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/pages/about/index.astro
git commit -m "feat: add PageHero with profile photo to about page"
```

---

### Task 6: Wire PageHero into About page (EN)

**Files:**
- Modify: `src/pages/en/about/index.astro`

**Step 1: Same structural changes as Task 5, with EN text**

Imports: same changes as Task 5.

Template: same structure, with EN labels:
- `title="About me"`
- `subtitle="Backend Engineer & DevOps Consultant"`
- `cta={{ href: '/files/Francesco_Montelli_CV.pdf', label: 'Download CV' }}`
- Stats labels: "years experience", "articles published"

**Step 2: Build check**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/pages/en/about/index.astro
git commit -m "feat: add PageHero with profile photo to EN about page"
```

---

### Task 7: Wire PageHero into BlogListPage

**Files:**
- Modify: `src/components/blog/BlogListPage.astro`

**Step 1: Update imports**

- Remove: `import PageLayout from '@/layouts/PageLayout.astro';`
- Add: `import BaseLayout from '@/layouts/BaseLayout.astro';`
- Add: `import Header from '@/components/layout/Header.astro';`
- Add: `import Footer from '@/components/layout/Footer.astro';`
- Add: `import PageHero from '@/components/ui/PageHero.astro';`

**Step 2: Replace template structure**

Old (lines 97-134):
```astro
<PageLayout title={title} description={description} lang={lang}>
  <div class="fade-in-section">
    <!-- Editorial header -->
    <h1 class="text-3xl font-bold tracking-tight mb-2">{title}</h1>
    <p class="text-text-muted text-base mb-8">
      {description} — <span class="font-medium ...">{totalCount}</span> {t.articles}
    </p>
    <!-- Pillar tabs + search -->
    ...
    <!-- Filterable post grid -->
    ...
  </div>
</PageLayout>
```

New:
```astro
<BaseLayout title={title} description={description} lang={lang}>
  <Header lang={lang} />
  <PageHero
    title={title}
    subtitle={`${description} — ${totalCount} ${t.articles}`}
  />
  <main class="max-w-5xl mx-auto px-5 py-12">
    <div class="fade-in-section">
      <!-- Pillar tabs + search -->
      <div class="flex flex-wrap items-center gap-2 mb-8">
        {pillars.map(p => {
          /* ... existing pillar tab code unchanged ... */
        })}
        <div class="ml-auto">
          <div id="blog-search" class="w-64"></div>
        </div>
      </div>

      <!-- Filterable post grid + sidebar (Vue island) -->
      <BlogFilterable client:load posts={serializedPosts} lang={lang} />
    </div>
  </main>
  <Footer lang={lang} />
</BaseLayout>
```

Note: BaseLayout accepts `description` and `lang` props — verify by checking `src/layouts/BaseLayout.astro`. If it doesn't have `description` or `lang`, pass them as needed or skip.

**Step 3: Build check**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/blog/BlogListPage.astro
git commit -m "feat: add PageHero to blog list page"
```

---

### Task 8: Final verification

**Step 1: Full production build**

Run: `cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npx astro build 2>&1 | tail -10`
Expected: Build succeeds with no errors

**Step 2: Visual spot-check pages**

Run dev server and verify each page:
- `/` — home hero photo has accent ring, no corner square
- `/servizi/` — PageHero at top, services cards, health check at bottom
- `/about/` — PageHero with profile photo, bio text below, rest unchanged
- `/blog/` — PageHero, then pillar tabs and post grid
- `/en/services/` — same as IT but EN text
- `/en/about/` — same as IT but EN text
- `/en/blog/` — same as IT but EN text

**Step 3: Commit if any adjustments needed**

```bash
git add -A
git commit -m "fix: adjust page hero styling after visual review"
```
