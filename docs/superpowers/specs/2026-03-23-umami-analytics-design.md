# Umami Analytics Integration — Design Spec

**Date**: 2026-03-23
**Status**: Draft
**Scope**: Add privacy-first web analytics to montelli.dev using Umami Cloud

---

## Context

montelli.dev is a static Astro site deployed to GitHub Pages. Currently has zero analytics — no tracking scripts, no cookies, no telemetry. The goal is to understand who visits the site and how they interact with it, without compromising privacy or requiring a cookie banner.

## Requirements

| # | Requirement | Priority |
|---|------------|----------|
| R1 | Pageview tracking (pages, referrer, device, browser, country) | Must |
| R2 | Behavioral tracking (scroll, navigation paths, time on page) | Should |
| R3 | Funnel/conversion tracking (CTA clicks, social links, email, search, project clicks) | Must |
| R4 | GDPR compliant without cookie banner | Must |
| R5 | No cookies, no PII collection | Must |
| R6 | Free tier sufficient for a personal blog | Must |
| R7 | SaaS managed, no self-hosting | Must |
| R8 | Web dashboard for data consultation | Must |
| R9 | Minimal impact on site performance | Should |
| R10 | Works with Astro View Transitions (SPA-like navigation) | Must |

## Decision: Umami Cloud (Free Tier)

**Why Umami over alternatives:**

- **vs Plausible**: no free SaaS tier (6EUR/mo or self-host)
- **vs GA4**: uses cookies, requires consent banner, complex UX, shares data with Google
- **Umami Cloud free tier**: 100K events/month — more than sufficient for a personal blog

**Privacy model**: Umami uses no cookies, no localStorage, no client-side persistence. Visitor identification is server-side via ephemeral UUIDs derived from anonymized request data (hashed IP + user-agent). UUIDs are not persistent across sessions.

**Critical constraint**: we will NOT use `umami.identify()` or pass PII in custom events. Only technical properties (pillar, category, event name). This keeps us in GDPR-compliant territory.

**Implementation rule**: event property values must come from a fixed taxonomy (pillar names, category names, platform names). Never use user-supplied input (search queries, form fields) as an event property value.

## Architecture

### Script Injection

A single `<script>` tag in `BaseLayout.astro` `<head>`:

```html
<script defer src="https://cloud.umami.is/script.js"
        data-website-id={import.meta.env.PUBLIC_UMAMI_WEBSITE_ID}
        data-domains="montelli.dev"></script>
```

The `data-domains` attribute ensures tracking only fires on the production domain — prevents data pollution from localhost, Netlify previews, or forks even if the env var is accidentally set.

A `<link rel="dns-prefetch" href="https://cloud.umami.is" />` hint is added before the script to parallelize DNS resolution at near-zero cost.

**Conditional rendering**: the script tag is only included when `PUBLIC_UMAMI_WEBSITE_ID` is defined. This means:

- **Production** (GitHub Pages): tracking active (env var set in workflow)
- **Netlify previews**: tracking active if env var configured, otherwise off
- **Local dev**: no tracking by default (no `.env` needed)

### View Transitions Compatibility

Umami's tracking script detects SPA navigation via the History API (`pushState`/`replaceState`). Astro's View Transitions use this same mechanism. Pageviews are tracked automatically on each navigation — no custom event listener needed.

### Custom Events

Two mechanisms, chosen based on context:

**1. HTML data attributes** (for static Astro components — zero JS):

```html
<a href="mailto:..." data-umami-event="click-email">Email</a>
```

Umami auto-captures click events on elements with `data-umami-event`.

**2. JavaScript API** (for Vue islands):

```js
if (window.umami) {
  umami.track('search-open')
}
```

The `if (window.umami)` guard prevents errors when the script isn't loaded (dev, ad-blockers).

### Event Catalog

| Event Name | Trigger | Properties | Mechanism |
|-----------|---------|------------|-----------|
| `cta-contact-email` | Click on "Scrivimi" CTA (homepage) | — | `data-umami-event` |
| `cta-contact-healthcheck` | Click on "Health Check" CTA (homepage) | — | `data-umami-event` |
| `click-social` | Click on GitHub/LinkedIn in footer | `{ platform: "github"\|"linkedin" }` | `data-umami-event` + `data-umami-event-platform` |
| `click-email` | Click on mailto link | — | `data-umami-event` |
| `blog-read` | Click on blog post card (homepage + blog page) | `{ pillar, category }` | `data-umami-event` + data attributes (Astro); `umami.track()` (Vue) |
| `search-open` | Open search modal | — | `umami.track()` in Vue |
| `click-project` | Click on portfolio project | `{ project }` | `data-umami-event` + `data-umami-event-project` |

**No PII in any event.** Properties are technical taxonomy only.

## Files Changed

| File | Change |
|------|--------|
| `src/layouts/BaseLayout.astro` | Add conditional Umami script tag in `<head>` |
| `src/pages/privacy.astro` | Add mention of Umami, no-cookie policy, no-PII commitment |
| `src/components/home/ContactSection.astro` | `data-umami-event` on both CTA buttons (email + health check) |
| `src/components/layout/Footer.astro` | `data-umami-event="click-social"` + platform prop on social links, `data-umami-event="click-email"` on email |
| `src/components/interactive/SearchModal.vue` | `umami.track('search-open')` on modal open |
| `src/components/blog/PostCard.astro` | `data-umami-event="blog-read"` + pillar/category data attributes on outer `<a>` tag |
| `src/components/blog/BlogFilterable.vue` | `umami.track('blog-read', { pillar, category })` on post card click (covers the main `/blog/` listing page) |
| `.github/workflows/deploy.yml` | Add `PUBLIC_UMAMI_WEBSITE_ID` env var via `vars.PUBLIC_UMAMI_WEBSITE_ID` (repository variable, not secret — the value is public in HTML output) |
| `.env.example` | Document `PUBLIC_UMAMI_WEBSITE_ID` placeholder |

**No new files** (except `.env.example`). **No new npm dependencies.** **No changes to `astro.config.mjs`.**

**Note on PR builds**: `.github/workflows/pr.yml` does not need the env var. Without it, the script tag is simply omitted and the build succeeds normally.

## What We Are NOT Doing

- No `umami.identify()` — would break GDPR compliance
- No cookie banner — not needed without cookies/PII
- No npm package for Umami — the script tag is sufficient
- No analytics wrapper/utility component — too few call sites to justify abstraction
- No scroll depth or time-on-page tracking — Umami doesn't support these natively; R2 is covered by pageview sequences and navigation patterns
- No server-side analytics — static site, client-side only
- No theme toggle or language switch tracking — low-value signals for now
- No English privacy page in this iteration — can be added as a follow-up

**Ad-blocker note**: Umami is on many ad-blocker lists (uBlock Origin, etc.). For a tech audience, expect 40-60% of visitors to block the script. Analytics numbers will be significantly undercounted. This is inherent to any client-side, non-self-hosted analytics solution and is accepted as a trade-off for R7 (SaaS managed).

## Setup Prerequisites

Before the code changes have any effect, the user must:

1. Create an account at https://cloud.umami.is
2. Add the website (montelli.dev) in the Umami dashboard
3. Copy the `data-website-id` value
4. Set it as `PUBLIC_UMAMI_WEBSITE_ID` in GitHub repository **Variables** (Settings > Secrets and variables > Actions > Variables tab) — not as a Secret, since the value is embedded in public HTML
5. (Optional) Set it in Netlify env vars for preview deploys

## Privacy Policy Update

Add a paragraph to `src/pages/privacy.astro` specifying:

- Analytics tool: Umami (https://umami.is)
- No cookies used
- No personally identifiable information collected
- Data collected: page views, referrer, device type, browser, country (anonymized)
- Data is aggregated, visitors cannot be individually identified
