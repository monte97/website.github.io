# Coerenza comunicazione tra le pagine — trovamenti (audit 2026-07-02)

> **Stato:** P0 risolto (via A, minima disruption) · **P1 APPLICATO** (commit 08e3bd1) · **P2 APPLICATO** (commit 4b131a0) · P3 non applicato (vedi sotto).
>
> **Aggiornamento esecuzione 2026-07-02:**
> - P1 fatto: home Hero riscritto, `pageDesc` servizi, `author.ts`, meta home IT+EN, About whoBody (con greenfield + "unnecessary"), PostCTA generic — tutti sulla storia *progetta/sviluppa/automatizza, da zero o su sistema irrigidito*.
> - P2 fatto: etichetta CTA unica "Prenota una discovery call"/"Book a discovery call" (10 occorrenze, 9 file); credenziale Ordine uniforme (AboutPage orderTitle + ServicesPage credential).
> - P3 NON fatto (nessun impatto live): pagine scratch `servizi-2/3/4`,`home-2/3` sono **untracked** → non deployate. File `src/i18n/it.ts`+`en.ts` con `home.headline`/`subtitle` vecchi sono **codice morto** (nessun import) → mai renderizzati. `methodVariant` full/link/none rami morti. Tutti cancellabili in un cleanup separato, a scelta.
> - Rimasto DERIVATO ma non toccato (trade-off): ForWho 3° segnale (redundancy vs coerenza — richiede estrazione a sorgente unico) e About philosophyQuote (metafora AI orfana ma accettabile).


> Fonte: giro di 3 auditor avversariali (coerenza messaggio, percorso visitatore, voce/terminologia) sul branch `feat/servizi-riposizionamento` dopo il redesign di `/servizi`.

## Quadro
Reggono bene in tutto il sito: il **metodo** (progetta/verifica/automatizza) e il **differenziatore** ("rendermi inutile" + accountability da ingegnere iscritto all'Ordine).
È andato alla deriva il **posizionamento**: `/servizi` si è evoluto su *"progetto / sviluppo / automatizzo, da zero o su un sistema irrigidito"*, mentre il resto del sito è rimasto sul vecchio *"modernizzo sistemi irrigiditi"* (solo brownfield). Break peggiore per un visitatore: **home → servizi**, sembrano due offerte diverse.

## Frase canonica proposta (verso cui far convergere tutto)
> *"Progetto, sviluppo e automatizzo il software di prodotto per aziende che partono da zero o devono sbloccare un sistema irrigidito nel tempo — e lascio il team capace di andare avanti da solo."*
> EN: *"I design, build and automate product software for companies starting from scratch or unlocking a system that's grown rigid over time — and I leave the team able to carry on without me."*
> (Nel corpo, niente trattino lungo: sostituirlo con due punti/punto.)

## P0 — Nodo strutturale da decidere (blocca la copy definitiva)
I 3 **verbi** dell'hero (progetto / **sviluppo** / automatizzo) non coincidono coi 3 **pilastri** del metodo (progettare / **verificare** / automatizzare). "Sviluppo" non ha casa nei pilastri; "verificare" è sparito dall'hero. Opzioni:
- **(A, consigliata, minima disruption)** i 3 pilastri restano il METODO/IA del sito; l'hero dice che *costruisco/sviluppo il software col metodo che lo tiene solido* → "verificare" rientra. L'IA (colori pilastri, filtri blog, competenze, content collection) non cambia.
- (B) adottare il nuovo arco ovunque (progetta → sviluppa → automatizza-la-qualità, "verificare" assorbita nell'automazione qualità): cambia il sistema a 3 pilastri in tutta l'IA. Più lavoro.
- (C) tenere l'hero attuale e dare casa a "sviluppo" dentro il pilastro "progettare" (dal diagramma al codice): compromesso, verbi leggermente fuori sync coi pilastri.
> Orientamento utente: no stravolgimenti → tendere ad A, da valutare con calma.

## P1 — Deriva di posizionamento (superfici da riallineare alla frase canonica)
| Superficie | File | Cosa dice ora | Verdetto |
|---|---|---|---|
| **`/servizi` pageDesc** (meta/OG) | `src/components/pages/ServicesPage.astro` (`t.pageDesc` IT+EN) | "Modernizzo sistemi di prodotto irrigiditi nel tempo…" | **CONTRADICE il proprio hero** (bug: finalizzazione ha aggiornato l'hero non la meta) |
| **Home Hero** | `src/components/home/Hero.astro` | headline "arrivo prima che diventi un'emergenza" + sub "modernizzare sistemi irrigiditi" | **CONTRADICE** — niente design/build/greenfield |
| **`author.ts` bio** | `src/data/author.ts` | verbatim la *vecchia* pageDesc di servizi ("modernizzare sistemi irrigiditi…") | **CONTRADICE** — cascata in footer/box autore ovunque |
| **meta home** | `src/pages/index.astro`, `src/pages/en/index.astro` | "modernizzare sistemi irrigiditi: architettura, observability, automazione" | **CONTRADICE** |
| **About whoBody** | `src/components/pages/AboutPage.astro` | "sistemi irrigiditi nel tempo…" | **CONTRADICE** — niente greenfield |
| **About philosophyQuote** (metafora AI/robot) | `src/components/pages/AboutPage.astro` | metafora AI, tolta da servizi | **ORFANA** — arriva senza setup, primo blocco di About |
| **Home ForWho — 3° segnale** | `src/components/home/ForWho.astro` | "nessuno sa di chi è quel pezzo" (brownfield) | **DERIVATO** — manca il segnale greenfield che ora c'è su servizi ("stai per costruire qualcosa di nuovo") |
| **PostCTA generic** | `src/components/blog/PostCTA.astro` | "architettura, observability e automazione" | **DERIVATO** — droppa "sviluppo" e riduce "verifica" a observability |

Coerenti e da NON toccare: `PillarCards.astro`, `CompetenzePage.astro`, `ContactSection.astro`, la riga "rendermi inutile", il PostCTA variante *architecture*.

## P2 — Coerenza voce / terminologia / fatti (in gran parte meccanica)
1. **Etichetta CTA doppia** per la stessa azione: "Prenota una discovery call" (Home, ContactSection, ServicesPage) vs "Prenota una call" (About, Competenze, PostCTA ×3, ProjectsListPage, WorkshopPage, dettaglio workshop/progetti IT+EN, servizi-2/3/4). Contraddizioni interne dove `ctaDesc` dice "discovery call" ma il bottone dice "Prenota una call" (`CompetenzePage`, `progetti/[...slug]`). → **standardizzare su "Prenota una discovery call" / "Book a discovery call"**.
2. **Credenziale Ordine in 4 formulazioni**: Hero/Footer "Iscritto all'Ordine degli Ingegneri di Ravenna" · ServicesPage "ingegnere iscritto all'Ordine di Ravenna: di quello che consegno rispondo io" · author.ts "…della Provincia di Ravenna" · AboutPage "Iscritto all'Ordine degli Ingegneri" (droppa Ravenna). → canonica: **versione Hero/Footer**; usare la formula "rispondo io" solo nei callout accountability.
3. **EN "make myself useless" vs "unnecessary"** (About vs Servizi; IT è sempre "rendermi inutile") → standardizzare su **"unnecessary"**.
4. **ForWho EN**: title "Product companies" vs intro "Products" a una riga di distanza (idem IT: "Aziende di prodotto" vs "Prodotti") → uniformare su "Product companies / Aziende di prodotto".
5. **Segnali "Per chi è" diversi** tra Home (ForWho) e Servizi, pur con eyebrow e frase di chiusura *identiche* ("se due di queste…") → riconciliare in un'unica lista condivisa (oggi duplicata a mano in 2 file, già divergente).
6. **Accountability**: "di quello che consegno rispondo io" (Servizi) vs "Quando firmo, sono io che ne rispondo" (About) → allineare il verbo.

## P3 — Pulizia
- **Pagine scratch `servizi-2/3/4` e `home-2/3`**: URL vivi e buildabili, con copy/prezzi VECCHI e contraddittori ("i €1.200 si scalano dalla prima fattura" vs canonico "rimborsato senza domande"). → **eliminare o noindex**.
- Prop `methodVariant` in `ServicesPage.astro`: rami `full`/`link`/`none` non più usati (live solo `slim`) → sfoltibile.
- Trattini lunghi residui solo dentro commenti JSX (invisibili) → cosmetico.

## Note
- Regole di stile di scrittura: **pulite** — nessun trattino lungo in copy visibile, nessun pattern "Non è X, è Y", nessuna parola vietata.
- Sequenza consigliata quando si esegue: sciogliere P0 → fissare la frase canonica → applicare P1 (author.ts per primo: cascata) → P2 → P3.
