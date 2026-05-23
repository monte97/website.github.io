# QR Event Pages — Design Spec

## Obiettivo

Aggiungere sottopagine `/qr/<slug>` personalizzate per eventi. Ogni pagina mostra la stessa card di contatto di `/qr` più un titolo evento e una lista variabile di link specifici (slides, repo, articoli, ecc.).

## Struttura dati

Nuovo file `src/data/qr-events.ts`:

```typescript
export type QrEventLink = {
  label: string;
  href: string;
};

export type QrEvent = {
  slug: string;    // path: /qr/<slug>
  title: string;   // titolo mostrato nella card, es. "DevRomagna 2025"
  links: QrEventLink[];
};

export const qrEvents: QrEvent[] = [
  // aggiungere un entry per ogni evento
];
```

## Route dinamica

Nuovo file `src/pages/qr/[event].astro`:

- `getStaticPaths()` legge `qrEvents` e restituisce un path per slug con l'oggetto `QrEvent` come props.
- Renderizza la stessa card di `index.astro` (foto, nome, ruolo, bottoni contatto).
- Dopo i bottoni contatto: separatore `border-t border-border` con il `title` dell'evento centrato sopra.
- Sotto il separatore: lista di bottoni link evento, stile secondario (bordo, sfondo trasparente), uno per riga come gli altri bottoni.

## Layout card evento

```
[ Foto ]
Francesco Montelli
Software Engineer & DevOps Consultant

[ Email ]
[ LinkedIn ]
[ GitHub ]
[ montelli.dev ]

──── DevRomagna 2025 ────

[ Link 1 ]
[ Link 2 ]
[ Link 3 ]
```

## Gestione slug non validi

GitHub Pages non può fare redirect server-side. La `404.astro` esistente viene modificata con uno script inline minimo:

```js
if (window.location.pathname.startsWith('/qr/')) {
  window.location.replace('/qr/');
}
```

Il redirect avviene prima che la pagina 404 sia visibile. Solo i path `/qr/*` sono interessati.

## File coinvolti

| File | Azione |
|------|--------|
| `src/data/qr-events.ts` | nuovo |
| `src/pages/qr/[event].astro` | nuovo |
| `src/pages/qr/index.astro` | invariato |
| `src/pages/404.astro` | modifica minima (script redirect) |

## Vincoli

- Nessun deploy automatico: aggiungere un evento richiede una entry in `qr-events.ts` + deploy manuale.
- Nessuna icona per i link evento — label testuale sufficiente.
- La pagina base `/qr` resta invariata per l'uso generico (biglietto da visita digitale).
