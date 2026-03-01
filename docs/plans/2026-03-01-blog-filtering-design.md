# Blog Listing — Client-Side Filtering

**Date:** 2026-03-01
**Status:** Approved

## Problem

The blog listing page sidebar (Categories, Series) is purely informational — no element is interactive. Tags on PostCards are decorative. The only filtering available is pillar tabs (page navigation). Users want to filter posts by category, series, or tag without leaving the page.

## Requirements

- Sidebar items (Categories, Series) become clickable filters
- Tags on PostCards become clickable (same filtering effect)
- Filter is client-side, instant, no page reload
- One filter active at a time (click another = replace, click same = toggle off)
- Sidebar stays hidden on mobile (tags on cards serve as filter entry point)
- Pillar tabs and Pagefind search are unchanged

## Approach — Vue Island

A single Vue component `BlogFilterable.vue` replaces the post grid + sidebar section of `BlogListPage.astro`. Vue is already in the project (SearchModal.vue), so no new dependencies.

## Architecture

```
BlogListPage.astro
├── Header (title, description, count)
├── Pillar tabs + Pagefind search        ← stays Astro
├── BlogFilterable.vue (client:load)     ← NEW
│   ├── Post Grid
│   │   └── Card per filtered post
│   │       └── Clickable tags (emit filter)
│   └── Sidebar (lg: only)
│       ├── Active filter chip with reset (x)
│       ├── Categories (clickable, highlight active)
│       └── Series (clickable, highlight active)
└── (pagination removed — all posts loaded client-side)
```

## State

```
Props (from Astro):
  posts: PostData[]                    — all posts for current language
  lang: 'it' | 'en'
  heroImages: Record<string, string>   — postId → hero URL

State:
  activeFilter: { type: 'category' | 'series' | 'tag', value: string } | null

Computed:
  filteredPosts    — filtered by activeFilter (or all if null)
  categories       — list with counts (computed on ALL posts, not filtered)
  series           — list with counts (computed on ALL posts, not filtered)
  featuredPost     — first post only when no filter active
  gridPosts        — filteredPosts minus featured
```

## Interaction Flow

1. Click "Kafka" in sidebar → `activeFilter = { type: 'category', value: 'kafka' }`
2. Grid updates instantly, "Kafka" highlighted in sidebar
3. Click "Kafka" tag on a PostCard → same effect
4. Click active filter again → toggle off (`activeFilter = null`)
5. Click different filter → replaces active filter
6. Sidebar counts remain static (total posts per category, not filtered)

## UI Details

**Sidebar items:**
- `<button>` elements with hover (`bg-text-muted/10`)
- Active: `bg-accent/10 text-accent font-medium`
- Active filter chip at top: "Kafka x" — click x to reset

**Tags on cards:**
- `<button>` with hover and cursor-pointer
- Active tag highlighted with accent style
- `stopPropagation` to prevent card navigation

**Featured post:** hidden when filter is active (grid becomes uniform)

**Empty state:** message + reset button if filter yields no results

**Transitions:** CSS `transition-opacity` for grid changes, no heavy animations

## Files

**Create:**
- `src/components/blog/BlogFilterable.vue` — main component (grid + sidebar + filter logic)

**Modify:**
- `src/components/blog/BlogListPage.astro` — replace grid+sidebar+pagination with `<BlogFilterable>`, pass all posts as JSON props

**Not touched:**
- Blog page routes (`blog/[...page].astro`, pillar pages)
- Global styles, layouts, header/footer
- Pagefind search, pillar tabs

**Deprecated (kept but unused):**
- `src/components/blog/PostCard.astro` — card re-implemented as Vue template inside BlogFilterable
- `src/components/blog/BlogSidebar.astro` — sidebar now part of Vue component

## Scope Exclusions

- No changes to pillar tabs system
- No URL/query param sync (filter is ephemeral, not shareable)
- No SSR — component is `client:load`
- No mobile sidebar (tags on cards are the mobile entry point)
