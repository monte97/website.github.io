# Blog Unified Filter Bar — Design

## Problem

The current blog filtering has three overlapping levels:
1. **Pillar tabs** — server-side routes (`/blog/progettare/`, etc.) that trigger full page loads
2. **Sidebar** — client-side category/series lists, desktop-only, hidden on mobile
3. **Tag clicks** — client-side tag filtering on post cards

Users find it confusing: too many controls, inconsistent behavior (some reload, some don't), sidebar invisible on mobile.

## Solution

Replace all three with a **single unified filter bar** — one horizontal row above the post grid, fully client-side.

```
[ Tutti | Progettare | Verificare | Automatizzare ]   [ Argomento ▾ ]

[ Verificare ✕ ] [ Observability ✕ ]  — Rimuovi tutti
```

### Filter Controls

| Control | Type | Behavior |
|---------|------|----------|
| Pillar pills | Single-select toggle | Click active pill → back to "Tutti" |
| "Argomento" dropdown | Single-select | Lists categories (filtered by active pillar). Cumulative with pillar (AND logic) |
| Tag badges on cards | Multi-select | Click tag → adds OR filter. Lightweight tertiary filter |
| Active chips | Dismissible | Each filter shows as a chip with ✕. "Rimuovi tutti" clears everything |

### Filter Logic

- Pillar + Category = AND (post must match both)
- Multiple tags = OR (post must have at least one selected tag)
- Pillar + Category + Tags = AND(pillar, category) AND OR(tags)

### Dropdown Behavior

- When "Tutti" is active: shows all categories with counts
- When a pillar is selected: shows only categories that have posts in that pillar, with filtered counts
- On mobile: native `<select>` or bottom-sheet

### What Changes

| Current | New |
|---------|-----|
| Pillar tabs = server-side links (`/blog/progettare/`) | Pillar pills = client-side toggle in Vue component |
| Desktop-only sidebar with categories + series | Dropdown "Argomento" visible on all viewports |
| 6 server-side pillar routes (IT + EN) | Removed — single route `/blog/` per language |
| `BlogListPage.astro` filters posts by pillar before passing to Vue | Passes ALL posts, Vue handles all filtering |
| Pagefind search inline in filter bar | Removed from bar — SearchModal (`Cmd+K`) in header is sufficient |
| Series as separate filter group | Removed as filter level. Series posts reachable via category or tags |

### Components

- **`BlogFilterable.vue`** — Rewrite. Absorbs pillar pills, category dropdown, active chips, post grid. Single Vue island.
- **`BlogListPage.astro`** — Simplified. Passes all posts to Vue without pillar pre-filtering. Removes server-side pillar tabs.
- **6 pillar route files** — Deleted (`src/pages/blog/{progettare,verificare,automatizzare}/[...page].astro` × 2 languages).

### Mobile

- Pillar pills scroll horizontally if needed
- Dropdown uses native `<select>` or simple popover
- Active chips wrap naturally

### User Decisions

- Primary axis: Pillar
- All client-side (no page reload)
- Category via dropdown (not inline pills)
- Tags on cards remain clickable as lightweight filter
- Series removed as filter dimension
