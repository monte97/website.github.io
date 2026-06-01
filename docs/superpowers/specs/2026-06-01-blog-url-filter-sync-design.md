# Design: URL sync per i filtri del blog

**Data**: 2026-06-01
**Stato**: approvato

## Obiettivo

Rendere condivisibile l'URL di `/blog` (e `/en/blog`) con i filtri attivi pre-popolati. Un link come `/blog?q=kubernetes&pillar=verificare` apre la pagina già filtrata.

## Scope

Un solo file modificato: `src/components/blog/BlogFilterable.vue`.

Nessuna modifica a `BlogListPage.astro`, `index.astro`, né al build.

## Schema URL

| Param   | Tipo          | Esempio                        |
|---------|---------------|--------------------------------|
| `q`     | string        | `?q=kubernetes`                |
| `pillar`| enum          | `?pillar=verificare`           |
| `category` | string     | `?category=kafka`              |
| `tag`   | string (ripetuto) | `?tag=tracing&tag=otel`    |

Tutti opzionali. Valori non riconosciuti ignorati silenziosamente.

## Comportamento

### Lettura (URL → state) — `onMounted`

Dopo l'hydration Vue, prima della prima interazione utente:

1. Leggi `window.location.search` con `URLSearchParams`
2. Inizializza i ref:
   - `searchQuery` ← `params.get('q') ?? ''`
   - `activePillar` ← `params.get('pillar')` se è uno dei tre pillar validi, altrimenti `null`
   - `activeCategory` ← `params.get('category') ?? null`
   - `activeTags` ← `new Set(params.getAll('tag'))`

### Scrittura (state → URL) — `watch`

Un singolo `watch` su tutti e quattro i ref (`{ deep: true }`):

- Costruisce un `URLSearchParams` vuoto
- Aggiunge solo i param con valore non-default (es. `q` non viene aggiunto se stringa vuota)
- Chiama `history.replaceState(null, '', '?' + params.toString())` — se i params sono tutti vuoti, usa `window.location.pathname` senza `?`
- `searchQuery` ha un debounce di 200ms per non aggiornare l'URL a ogni carattere; gli altri tre aggiornano immediatamente

### Perché `replaceState` e non `pushState`

`pushState` aggiungerebbe una voce alla history per ogni filtro cambiato, rendendo il tasto "indietro" del browser inutilizzabile. `replaceState` sostituisce l'entry corrente: la history rimane pulita.

## Compatibilità

- Funziona identicamente su `/en/blog` — `window.location` usa sempre l'URL corrente
- Nessun impatto su SEO (i filtri sono client-side, i crawler vedono la pagina non filtrata)
- Nessuna nuova dipendenza

## Implementazione

Modifiche a `BlogFilterable.vue`:

1. **Import**: aggiungere `watch` agli import Vue esistenti (già presenti: `computed`, `ref`, `onMounted`, `onUnmounted`)
2. **`onMounted`**: aggiungere la lettura dei params dopo `document.addEventListener`
3. **`watch` URL sync**: aggiungere dopo i filter actions, prima dei computed
4. **Debounce**: implementare con `setTimeout`/`clearTimeout` inline (no librerie)
