# OG image — Workshop

**File output**: `public/og/workshop.png`
**Pagine che la useranno**: `/workshop/`, `/en/workshop/`

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

PAGE: Workshop
HEADLINE (large, bold, two lines):
"Imparare facendo,
non guardando slide."

SUBTEXT (medium, in monospace):
Workshop hands-on per team di sviluppo

VISUAL CONCEPT
A clear visual contrast between two halves of the canvas:
- LEFT: a small abstract representation of a slide deck — a thin
  rectangle with horizontal lines, faded out, in light gray. Slightly
  smaller, slightly off-axis, deliberately unappealing.
- RIGHT: larger and in full warm-orange contrast, something that
  suggests hands-on building. Could be a stylized terminal cursor
  (a blinking block), a wrench-like geometric shape, or a small
  bracket/parenthesis mark. Minimal, suggestive, not literal.

The left element should feel "passive", the right should feel
"active". The visual gap (negative space) between the two elements
is part of the message — it's the gap between watching and doing.

DO NOT INCLUDE
- Faces of people (no instructor pictures)
- Real laptops, real screens, real keyboards (avoid stock photo cliché)
- Logos of any tech company or product (keep the image
  topic-agnostic so it works for any workshop)
- Classroom imagery (whiteboards, desks, chairs)
- More than the two text strings listed
- Multiple "active" symbols on the right (one is enough)
```

---

## Variante EN

Sostituisci la sezione HEADLINE + SUBTEXT con:

```
HEADLINE:
"Learn by doing,
not by watching slides."

SUBTEXT:
Hands-on workshops for engineering teams
```

---

## Note di accettazione

L'immagine è OK quando:
- ✓ Si percepisce immediatamente il contrasto "passivo vs attivo"
- ✓ Lo "slide deck" è chiaramente messo in cattiva luce (faded, smaller)
- ✓ L'elemento "hands-on" è arancio, leggibile, semplice
- ✓ Il negative space tra i due elementi è visibile e intenzionale

L'immagine è da rifare se:
- ✗ Il contrasto non è chiaro (entrambi gli elementi sono troppo simili)
- ✗ Compare un'aula, una lavagna, un docente
- ✗ Compaiono loghi di prodotti o aziende tech
- ✗ L'elemento "hands-on" è troppo letterale (mani vere, ferri da lavoro reali)

---

## Generatori consigliati

| Generatore | Forte | Debole |
|---|---|---|
| **Ideogram 2.0** | Typography pulita, testo italiano leggibile | Stile a volte troppo "design poster" |
| **DALL-E 3 / ChatGPT Image** | Bilanciato, segue bene istruzioni di palette | Testo lungo a volte sbagliato |
| **Flux Pro 1.1** | Stile editoriale eccellente | Testo italiano imperfetto |
| **Midjourney v6+** | Estetica fotografica | Testo ancora imperfetto |

## Workflow

1. Genera 4 varianti per il prompt
2. Scegli quella con testo leggibile e composizione bilanciata
3. Apri in Figma se il testo va ritoccato (correggi typo, allinea baseline)
4. Esporta come **PNG** (meglio di JPG per testo) — eventualmente WebP per dimensione
5. Test su [opengraph.xyz](https://www.opengraph.xyz/) o Facebook Debugger
6. Salva in `public/og/workshop.png`

## Wiring nel codice

In `src/components/pages/WorkshopPage.astro`, modifica il PageLayout:

```astro
<PageLayout
  title={t.pageTitle}
  description={t.pageDesc}
  ogImage="/og/workshop.png"
  lang={lang}
>
```
