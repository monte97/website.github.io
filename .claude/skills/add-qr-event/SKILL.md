---
name: add-qr-event
description: Use when the user asks to add, create, or register a new QR event page on montelli.dev — for conferences, meetups, talks, or any event requiring a personalized /qr/<slug> page with custom links.
---

# Add QR Event Page

## Overview

QR event pages live at `/qr/<slug>` on montelli.dev. Each page shows the standard contact card plus an event-specific section with a labeled divider and a list of links. All data lives in one file.

## The One File to Edit

**`src/data/qr-events.ts`** — add one entry to `qrEvents`.

```typescript
export const qrEvents: QrEvent[] = [
  {
    slug: 'devromagna-2026',        // → /qr/devromagna-2026/
    title: 'DevRomagna 2026',       // shown as divider label in the card
    links: [
      { label: 'Repo del talk',     href: 'https://github.com/monte97/...' },
      { label: 'Slide',             href: 'https://...' },
      { label: 'Articolo',          href: 'https://montelli.dev/blog/...' },
    ],
  },
];
```

**Slug conventions:** lowercase, hyphens only, no accents (e.g., `voxxed-days-2026`, `javaday-roma-2026`).

## Steps

1. Edit `src/data/qr-events.ts` — add entry to `qrEvents[]`
2. Verify build: `make build`
3. Confirm page generated: `ls dist/qr/<slug>/`
4. Commit: `git add src/data/qr-events.ts && git commit -m "feat(qr): aggiungi pagina QR per <EventName>"`

## Types (reference)

```typescript
type QrEventLink = { label: string; href: string };
type QrEvent    = { slug: string; title: string; links: QrEventLink[] };
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Slug con spazi o maiuscole | Usa lowercase + hyphens: `devromagna-2026` |
| Commit `feat:` invece di `feat(qr):` | Scope `qr` obbligatorio per questa feature |
| Nessuna verifica build | Sempre `make build` + `ls dist/qr/<slug>/` |
| `links: []` vuoto | Aggiungere almeno un link altrimenti il separatore resta orfano |
