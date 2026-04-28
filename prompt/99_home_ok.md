# OG image — Home

**File output**: `public/og/home.png`
**Pagine che la useranno**: `/`, `/en/` (e fallback per qualsiasi pagina senza OG specifico, se vuoi farla diventare default)

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

PAGE: Homepage
HEADLINE (large, bold, italic accent on second line):
"Quando il sistema inizia a scricchiolare,
arrivo prima che diventi un’emergenza."

SUBTEXT (small, monospace, bottom-left):
montelli.dev — Software Engineer freelance

TEXT RENDERING RULES (critical)
- The apostrophe in "un’emergenza" is a TYPOGRAPHIC RIGHT SINGLE
  QUOTATION MARK (Unicode U+2019, the curly apostrophe ’).
  DO NOT render it as a straight apostrophe (' U+0027).
  DO NOT render it with a backslash escape (\'  or \’).
  DO NOT render it as a backtick or any other character.
- Render every text string EXACTLY as shown above. Do not paraphrase,
  abbreviate, translate, or "auto-correct" any character.
- The em-dash (—) in the subtext must remain an em-dash, not a hyphen.

VISUAL CONCEPT
A single, subtle architectural metaphor: a thin orange crack-line
running diagonally across a pale wall texture, like a hairline fracture
caught early. The headline sits to the right of the crack, the crack
itself does not touch the text.

The crack is the visual eco of the word "scricchiolare". Do not draw
broken glass, broken mirrors, or anything dramatic — it must feel
preventive, not catastrophic.

DO NOT INCLUDE
- Logos of any tech company
- Faces of people
- More than two short text strings
- Decorative elements that compete with the headline
- Robots, lightbulbs, neural networks, abstract data blobs
```

---

## Variante EN (se vuoi un OG dedicato per `/en/`)

Sostituisci la sezione HEADLINE con:

```
HEADLINE:
"When the system starts to creak,
I step in before it turns into an emergency."

SUBTEXT (bottom-left, monospace):
montelli.dev — Freelance Software Engineer
```

---

## Note di accettazione

L'immagine è OK quando:
- ✓ Il testo è leggibile a 600px di larghezza (preview LinkedIn mobile)
- ✓ La crepa è sottile, preventiva, non drammatica
- ✓ L'orange compare ma non domina
- ✓ Niente face, niente loghi, niente icone clichè

L'immagine è da rifare se:
- ✗ La crepa sembra "rotto" invece che "scricchiolante"
- ✗ Il testo finisce sopra la crepa o è meno leggibile
- ✗ L'arancio diventa il colore dominante (deve restare accent)
- ✗ L'apostrofo in "un’emergenza" è renderizzato come `\'`, `'` dritto, backtick o qualsiasi altro carattere diverso da `’` (U+2019)
- ✗ L'em-dash nel subtext è renderizzato come `-` (hyphen) invece che `—`

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
6. Salva in `public/og/home.png`

## Wiring nel codice

In `src/pages/index.astro` e `src/pages/en/index.astro`:

```astro
<BaseLayout
  title="..."
  description="..."
  ogImage="/og/home.png"
>
```
