# OG image — Competenze

**File output**: `public/og/competenze.png`
**Pagine che la useranno**: `/about/competenze/`, `/en/about/competenze/`

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
- Mono accents (numbers, area separators): JetBrains Mono

PAGE: Competenze (skills)
HEADLINE (large, bold, two lines):
"Organizzate per metodo,
non come parata di loghi."

VISUAL CONCEPT
Editorial table-of-contents layout. Three labeled rows stacked
vertically in the center of the canvas, each representing one
pillar of the method.

Each row is composed of three typographic levels, left to right:

  [number]  [PILLAR NAME]
            [area · area · area]

The number ("01" / "02" / "03") is in JetBrains Mono, warm orange,
small. The pillar name is in Inter Bold, near-black, medium-large.
The areas list is in regular weight, secondary gray, smaller, with
middle-dot separators (·) in warm orange.

Exact text content:

  01  PROGETTARE
      Decidere · Bilanciare · Disegnare

  02  VERIFICARE
      Misurare · Testare · Proteggere

  03  AUTOMATIZZARE
      Replicare · Distribuire · Mantenere

The headline sits in the upper-left of the canvas, in large bold
weight. The three rows are vertically centered below the headline,
with consistent spacing between rows. Generous whitespace around
everything.

A thin orange vertical line runs along the left side of the three
rows, suggesting they belong together as a structured list.

The composition reads instantly as "this is what I do, organized
in three groups". No decoding required, no visual jokes.

TEXT RENDERING RULES (critical)
- Render every text string EXACTLY as shown. Do not paraphrase,
  abbreviate, or "auto-correct" any character.
- The middle dot separator is U+00B7 ( · ), NOT a regular dot (.)
  and NOT a hyphen (-). It must be visually centered between words.
- Pillar names are UPPERCASE: PROGETTARE, VERIFICARE, AUTOMATIZZARE.
- The numbers "01", "02", "03" are TWO digits each (with leading zero).

DO NOT INCLUDE
- Logos of any tech company (Kafka, Kubernetes, Grafana, etc.)
- Recognizable tool icons
- Code snippets, terminal windows, IDE screenshots
- Empty pill-tags or abstract rectangular shapes (we want plain
  typography, not pseudo-tags)
- Card-like boxes around each row (the rows are typographic, not card UI)
- Decorative ornaments, stars, sparkles
- Robots, lightbulbs, neural networks, gear icons
```

---

## Variante EN

Sostituisci tutto il blocco con i contenuti tradotti:

```
HEADLINE:
"Organized by method,
not by logo wall."

Exact text content for the three rows:

  01  DESIGN
      Decide · Balance · Map

  02  VERIFY
      Measure · Test · Protect

  03  AUTOMATE
      Replicate · Deploy · Maintain
```

---

## Note di accettazione

L'immagine è OK quando:
- ✓ I 3 pilastri (PROGETTARE / VERIFICARE / AUTOMATIZZARE) sono visibilmente impilati come "indice"
- ✓ Sotto ogni pilastro le 3 aree sono leggibili e separate da middle dot in arancio
- ✓ I numeri 01/02/03 sono in monospace, in arancio, dimensione minore del pillar name
- ✓ La gerarchia tipografica è chiara: numero → pillar → aree (tre livelli)
- ✓ La linea verticale arancio sulla sinistra unisce visivamente i 3 livelli
- ✓ C'è aria attorno (whitespace generoso), niente è schiacciato

L'immagine è da rifare se:
- ✗ Compaiono pill-tags vuote, rettangoli astratti o forme che imitano badge UI
- ✗ Compaiono loghi reali di tech (anche di sfondo)
- ✗ Le righe sono inscatolate in card con border (vogliamo solo tipografia)
- ✗ I separatori `·` sono renderizzati come `.` o `-`
- ✗ Le aree sotto un pilastro sono più grandi/visibili del nome del pilastro stesso
- ✗ I pillar names appaiono in minuscolo invece che maiuscolo
- ✗ La composizione è una griglia 4×4 generica
- ✗ L'arancio domina (deve restare accent: numeri + linea verticale + middle dots)

---

## Generatori consigliati

| Generatore | Forte | Debole |
|---|---|---|
| **Ideogram 2.0** | Typography pulita, testo italiano leggibile | Stile a volte troppo "design poster" |
| **DALL-E 3 / ChatGPT Image** | Bilanciato, segue bene istruzioni di palette | Testo lungo a volte sbagliato |
| **Flux Pro 1.1** | Stile editoriale eccellente | Testo italiano imperfetto |
| **Midjourney v6+** | Estetica fotografica | Testo ancora imperfetto |

> **Suggerimento per questo prompt specifico**: il concept è interamente
> typography + struttura editoriale. **Ideogram 2.0** è probabilmente la
> scelta migliore (gestisce testo lungo meglio di MJ/Flux). In alternativa,
> **costruirla in Figma in 15 minuti** elimina ogni rischio di errore di
> rendering: il layout è semplice (3 righe ripetute con stessa struttura)
> e il risultato sarà più pulito di qualsiasi generazione AI.

## Workflow

1. Genera 4 varianti per il prompt (oppure costruisci direttamente in Figma)
2. Verifica che i 3 pilastri siano leggibili e che le 3 aree sotto ognuno appaiano
3. Verifica che i middle dots `·` siano renderizzati correttamente (NON `.` o `-`)
4. Apri in Figma se serve ritoccare typo o allineamento baseline
5. Esporta come **PNG** (meglio di JPG per testo) — eventualmente WebP per dimensione
6. Test su [opengraph.xyz](https://www.opengraph.xyz/) o Facebook Debugger
7. Salva in `public/og/competenze.png`

## Wiring nel codice

In `src/components/pages/CompetenzePage.astro`, modifica il PageLayout:

```astro
<PageLayout
  title={t.pageTitle}
  description={t.pageDesc}
  ogImage="/og/competenze.png"
  lang={lang}
>
```
