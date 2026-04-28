# OG image — About

**File output**: `public/og/about.png`
**Pagine che la useranno**: `/about/`, `/en/about/`

---

## Prompt completo (copia/incolla)

```
Create an Open Graph image for a personal technical website.

FORMAT
1200 × 630 pixels, landscape orientation, exactly. The composition
must work when cropped to a 1.91:1 ratio without losing key elements.

VISUAL STYLE
Editorial, warm and professional. Not corporate-glossy, not Y2K-glitchy,
not crypto-bro futuristic. Think: a thoughtful tech blog made by an
engineer who reads books. Subtle texture, generous whitespace,
high contrast typography.

PALETTE (strict)
- Background: warm off-white #FAF7F2
- Accent: warm orange #E8973A — highlights, underlines, geometric
  elements. NOT for fills covering more than ~15% of the canvas
- Primary text: near-black #1A1A1A
- Secondary text: warm gray

TYPOGRAPHY
- Headline: Inter Bold, large, tight tracking
- Mono accents: JetBrains Mono

PAGE: About
HEADLINE (large, bold):
"Quando firmo, sono io che ne rispondo."

SUBTEXT (medium, below):
Francesco Montelli — Iscritto all’Ordine degli Ingegneri di Ravenna

TEXT RENDERING RULES (critical)
- The apostrophe in "all’Ordine" is a TYPOGRAPHIC RIGHT SINGLE
  QUOTATION MARK (Unicode U+2019, the curly apostrophe ’).
  DO NOT render it as a straight apostrophe (' U+0027).
  DO NOT render it with a backslash escape (\'  or \’).
  DO NOT render it as a backtick or any other character.
- The opening and closing quotation marks around the headline
  ("«" U+00AB and "»" U+00BB) are GUILLEMETS, not straight quotes.
  Do NOT replace with straight double quotes (").
- Render every text string EXACTLY as shown above. Do not paraphrase,
  abbreviate, translate, or "auto-correct" any character.
- The em-dash (—) in the subtext must remain an em-dash, not a hyphen.

VISUAL CONCEPT
Pure typography composition. No illustrative elements at all.

The headline is rendered as a large editorial quote, with elegant
opening and closing quotation marks ("«" and "»") in warm orange,
sized roughly 2× the headline text. The headline is centered or
left-aligned, occupying the upper-center of the canvas.

Below the quote, a thin orange horizontal divider (about 1/3 the
canvas width). Below the divider, the subtext.

The background carries only a subtle dot grid texture (low opacity
~5%) — nothing else. No symbols, no shapes, no illustrations.

The message is conveyed entirely by the words and the gravitas of
the typographic composition.

DO NOT INCLUDE
- Any illustration, icon, symbol, or geometric ornament beyond
  the quotation marks and the thin divider
- Faces of people
- Logos
- Any imagery suggesting profession, signature, or seal
- Robots, lightbulbs, neural networks, gear icons
```

---

## Variante EN

Sostituisci la sezione HEADLINE + SUBTEXT con:

```
HEADLINE:
"When I sign, I'm the one accountable."

SUBTEXT:
Francesco Montelli — Italian Order of Engineers (Ravenna)
```

---

## Note di accettazione

L'immagine è OK quando:
- ✓ Le virgolette caporali in arancio sono visibili e ben proporzionate (~2× il testo)
- ✓ Il testo della headline è al centro della scena, ha aria attorno
- ✓ Il divider sottile sotto la quote è arancio e occupa ~1/3 della larghezza
- ✓ Il fondo è davvero spoglio: solo il dot grid texture, nient'altro
- ✓ Il subtext è leggibile sotto il divider

L'immagine è da rifare se:
- ✗ Compaiono icone, sigilli, firme, ornamenti decorativi
- ✗ Compaiono volti, persone, soggetti illustrativi
- ✗ Le virgolette sono dritte (`"`) invece che caporali (`«»`)
- ✗ L'arancio domina (deve restare accent: virgolette + divider)
- ✗ Il fondo ha gradient, sfumature complesse, texture non-dot
- ✗ La typography è serif "decorativa" (vogliamo Inter, geometrica)
- ✗ L'apostrofo in "all’Ordine" è renderizzato come `\'`, `'` dritto, backtick o qualsiasi altro carattere diverso da `’` (U+2019)
- ✗ L'em-dash nel subtext è renderizzato come `-` (hyphen) invece che `—`

---

## Generatori consigliati

| Generatore | Forte | Debole |
|---|---|---|
| **Ideogram 2.0** | Typography pulita, testo italiano leggibile | Stile a volte troppo "design poster" |
| **DALL-E 3 / ChatGPT Image** | Bilanciato, segue bene istruzioni di palette | Testo lungo a volte sbagliato |
| **Flux Pro 1.1** | Stile editoriale eccellente | Testo italiano imperfetto |
| **Midjourney v6+** | Estetica fotografica | Testo ancora imperfetto |

> **Suggerimento per questo prompt specifico**: visto che è 100% typography
> senza concept visuale, **Ideogram 2.0** è probabilmente il generatore
> migliore — è quello che gestisce il testo in modo più pulito. In alternativa,
> visto che il concept è semplice, **lo si può fare direttamente in Figma in 10
> minuti** senza passare da generatore AI: Inter Bold per headline, virgolette
> caporali in arancio, divider sottile, JetBrains Mono per subtext.

## Workflow

1. Genera 4 varianti per il prompt (oppure costruisci direttamente in Figma)
2. Scegli quella con testo leggibile e composizione bilanciata
3. Apri in Figma se il testo va ritoccato (correggi typo, allinea baseline)
4. Esporta come **PNG** (meglio di JPG per testo) — eventualmente WebP per dimensione
5. Test su [opengraph.xyz](https://www.opengraph.xyz/) o Facebook Debugger
6. Salva in `public/og/about.png`

## Wiring nel codice

In `src/components/pages/AboutPage.astro`, modifica il PageLayout:

```astro
<PageLayout
  title={t.pageTitle}
  description={t.pageDesc}
  ogImage="/og/about.png"
  lang={lang}
>
```
