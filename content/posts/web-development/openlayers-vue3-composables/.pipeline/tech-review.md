# Tech Review — OpenLayers e Vue 3: integrazione con composables e TypeScript

**Reviewer**: claude-opus-4-6 (tech-review)
**Date**: 2026-02-20
**Score**: 8/10

---

## Summary

Articolo solido che presenta quattro pattern reali per integrare OpenLayers con Vue 3 Composition API. L'architettura proposta (shallowRef, composables come bridge, cleanup automatico) e' corretta e rappresenta best practice riconosciute. I code snippet sono ben strutturati e funzionanti. Ci sono alcuni problemi di robustezza e diverse sviste tipografiche.

---

## Issues

### P1 — `setTarget(undefined)` vs `setTarget(null)` (correttezza)

**Riga 109-112**

```typescript
map.value?.setTarget(undefined)
map.value?.dispose()
```

La documentazione ufficiale OpenLayers usa `setTarget(null)` come valore canonico per rimuovere la mappa dal DOM. `undefined` funziona nella pratica ma non e' allineato alla documentazione. Inoltre `dispose()` gestisce internamente il cleanup: chiamare `setTarget()` prima e' ridondante. Suggerimento: usare `setTarget(null)` oppure affidarsi solo a `dispose()`.

### P1 — `watch({ once: true })` richiede Vue 3.4+ (compatibilita')

**Riga 278**

L'opzione `once` per `watch()` e' stata introdotta in Vue 3.4. L'articolo non menziona questa dipendenza di versione. Un lettore con Vue 3.3 o precedente otterrebbe un comportamento inatteso (il watcher non si fermerebbe dopo la prima esecuzione, registrando handler multipli ad ogni ri-assegnazione). Aggiungere una nota sulla versione minima richiesta o nel testo o nel frontmatter.

### P1 — Mancata rimozione event listener sulla mappa (memory leak potenziale)

**Riga 258-278, Pattern 3**

```typescript
m.on('click', (event) => { ... })
m.on('pointermove', (event) => { ... })
```

Gli event listener registrati con `m.on(...)` non vengono mai rimossi esplicitamente. Il `dispose()` in `useOlMap` dovrebbe pulirli, ma se il componente che registra i listener viene smontato prima della mappa (es. componente figlio in un layout condiviso), questi listener restano attivi. Sarebbe piu' robusto salvare le key restituite da `m.on()` e chiamare `m.un()` in un `onUnmounted`.

### P1 — `usePolling` non gestisce chiamate concorrenti (robustezza)

**Riga 303-335, Pattern 4**

Se `fn` e' asincrona e impiega piu' di `intervalMs` per completarsi, `setInterval` lancia `fn` nuovamente prima che la precedente finisca. Questo causa race condition: risposte API che arrivano fuori ordine sovrascrivono lo stato in modo imprevedibile. Un pattern piu' sicuro usa `setTimeout` ricorsivo:

```typescript
async function tick() {
  await fn()
  intervalId = setTimeout(tick, intervalMs)
}
```

L'articolo descrive questo come composable di produzione, quindi vale la pena menzionare questa limitazione o adottare il pattern ricorsivo.

### P2 — Typo: spazi mancanti in parole composte

Diverse occorrenze di parole attaccate per spazi mancanti:

- Riga 21: `unrallentamento` -> `un rallentamento`
- Riga 25: `unpattern` -> `un pattern`
- Riga 203: `ilbridge` -> `il bridge`, `Èuna` -> `E' una`
- Riga 432: `ilpattern` -> `il pattern`
- Riga 436: `Èlostesso` -> `E' lo stesso`

### P2 — Import mancanti negli snippet di utilizzo

Pattern 2 usage (riga 213-248): usa `Style`, `Icon`, `Point`, `fromLonLat`, `CircleStyle`, `Fill`, `Stroke`, `Feature` senza mostrarli negli import. Il componente template (riga 133-136) usa `ref` senza importarlo da Vue. Per un articolo didattico, almeno un commento `// import omessi per brevita'` aiuterebbe il lettore.

### P2 — `StyleLike` import path

**Riga 154**

```typescript
import type { StyleLike } from 'ol/style/Style'
```

In alcune versioni di OpenLayers il path corretto e' `ol/style/Style.js`. Verificare la compatibilita' con la versione OL usata nel progetto demo.

### P2 — Repository demo potenzialmente non verificabile

L'articolo linka a `https://github.com/monte97/olm-vue-demo`. Verificare che il repository sia pubblico e contenga il codice descritto prima della pubblicazione.

### P2 — Inconsistenza `items` getter vs computed

Nell'uso di `useVectorLayer` (riga 416-417), il primo layer usa `() => props.shops` (getter function) mentre il secondo usa `computed(...)`. Entrambi sono validi come `WatchSource`, ma una nota sulla scelta sarebbe utile per coerenza didattica.

---

## Factual Correctness

| Claim | Verdict |
|-------|---------|
| `shallowRef` previene deep proxy wrapping su oggetti OL | Corretto |
| OpenLayers richiede DOM reale, quindi `onMounted` | Corretto |
| `feature.set(key, value, true)` sopprime eventi interni | Corretto (parametro `opt_silent` esiste, ma non documentato chiaramente in API reference corrente) |
| Tree-shaking funziona con import diretti vs plugin globale | Corretto |
| `fromLonLat` converte EPSG:4326 -> EPSG:3857 | Corretto |
| `clear()` + `addFeatures()` e' pattern efficiente per batch update | Corretto |
| `WatchSource<T[]>` come tipo per items nel composable | Corretto |

---

## Security

Nessun problema di sicurezza identificato. L'articolo non gestisce input utente non fidato, non espone credenziali, e non usa pattern XSS-prone.

---

## Verdict

Articolo tecnicamente valido con architettura ben ragionata. I P1 riguardano dettagli di robustezza (cleanup listener, race condition polling, versione Vue, `setTarget(null)`) che meritano attenzione prima della pubblicazione. I P2 sono principalmente cosmetici. Il contenuto e' utile e rappresenta pattern reali applicabili in produzione.

**Approvato per pubblicazione** con correzioni P1.
