# OG image — Servizi

**File output**: `public/og/servizi.png`
**Pagine che la useranno**: `/servizi/`, `/en/services/`

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
- Mono accents (numbers): JetBrains Mono

PAGE: Servizi (services)
HEADLINE (large, bold):
"Il metodo, applicato."

SUBTEXT (medium, three pillars listed vertically with monospace numbers):
01  Progettare
02  Verificare
03  Automatizzare

CTA TAG (small, bottom-right, in monospace, with orange underline):
30 minuti, gratuiti — cal.eu/monte97

VISUAL CONCEPT
Three vertically stacked elements that visually multiply, not add up.
Suggested: three thin horizontal bars of increasing length, with a
small vertical connecting line between them — emphasizing sequence,
not list. The "01" "02" "03" labels are in monospace, in the warm
orange. Each label is followed by its pillar name in regular text.

The horizontal bars suggest progression: each builds on the previous.

DO NOT INCLUDE
- Logos of any tech company
- Faces of people
- More than the listed text strings
- Robots, lightbulbs, neural networks, gear icons, infinite loops
- Triangle/pyramid layouts (we want sequence, not hierarchy)
```

---

## Variante EN

Sostituisci la sezione HEADLINE + SUBTEXT con:

```
HEADLINE:
"The method, applied."

SUBTEXT:
01  Design
02  Verify
03  Automate

CTA TAG:
30 minutes, free — cal.eu/monte97
```

---

## Note di accettazione

L'immagine è OK quando:
- ✓ I 3 pilastri sono ordinati verticalmente, non in colonne
- ✓ Si percepisce sequenza/build-up, non lista bullet
- ✓ I numeri 01/02/03 sono in monospace e arancio
- ✓ Il CTA "30 minuti" è leggibile ma non urla

L'immagine è da rifare se:
- ✗ I 3 pilastri appaiono come 3 prodotti separati
- ✗ La disposizione è circolare/triangolare invece che sequenziale
- ✗ Il testo del CTA copre o disturba i 3 pilastri
- ✗ L'arancio è usato per riempire il fondo dei pillar

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
6. Salva in `public/og/servizi.png`

## Wiring nel codice

In `src/components/pages/ServicesPage.astro`, modifica il PageLayout:

```astro
<PageLayout
  title={t.pageTitle}
  description={t.pageDesc}
  ogImage="/og/servizi.png"
  lang={lang}
>
```
