# Services Funnel Ristrutturazione Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare `/servizi/` da pagina-brochure a funnel in tre gradini (Discovery call → Health Check → Affiancamento), allineando la CTA homepage, su branch dedicato.

**Architecture:** Tutto il rendering vive in un solo componente (`ServicesPage.astro`) che riceve `lang` prop e gestisce le traduzioni IT/EN tramite un oggetto `t`. Nessun nuovo file: si espande il `t` object con le stringhe dei tre step e si aggiunge HTML inline. L'Hero della homepage ha le stringhe CTA inline — cambia solo il label.

**Tech Stack:** Astro 5, Tailwind CSS v4, componenti UI esistenti (`Button`, `PageHero`), zero nuove dipendenze.

---

## File da modificare

| File | Tipo | Cosa cambia |
|------|------|-------------|
| `src/components/pages/ServicesPage.astro` | Modify | +strings nel `t` object, +sezione funnel HTML, aggiornamento `methodIntro`, aggiornamento `pageDesc` |
| `src/components/home/Hero.astro` | Modify | Solo le stringhe `cta` (IT + EN) — l'href Cal.com rimane invariato |

**Nessun nuovo file**, nessuna nuova dipendenza.

---

## Nota sulle scelte aperte

**Punto C — CTA homepage:** Si sceglie **Opzione B** (mantieni href Cal.com, cambia label in `Prenota una discovery call` / `Book a discovery call`). Motivazione: il click porta direttamente a Cal.com dove si prenota — coerenza assoluta tra promessa e destinazione. Modifica minimale: solo 2 stringhe in `Hero.astro`, nessuna modifica di href.

**TODO per Francesco (non risolvibili senza input):**
- `<!-- TODO: aggiungere sezione prova sociale (testimonianze) quando le citazioni autorizzate sono disponibili — layout non predisposto (fuori scope fase 1) -->`

---

## Task 1: Branch dedicato

**Files:**
- nessuno

- [ ] **Step 1: Crea e checkout il branch**

```bash
git checkout -b feat/services-funnel
```

- [ ] **Step 2: Verifica di essere sul branch corretto**

```bash
git branch --show-current
```

Expected output: `feat/services-funnel`

---

## Task 2: Stringhe IT — funnel + discovery aggiornata + meta description

**Files:**
- Modify: `src/components/pages/ServicesPage.astro` — sezione `t` IT (righe ~148–187)

Aggiunge tutte le nuove chiavi all'oggetto IT dentro `t`. I valori sono verbatim dal brief, salvo micro-adattamenti tipografici (apostrofi tipografici, em-dash).

- [ ] **Step 1: Verifica stato attuale `t` IT**

```bash
grep -n "pageDesc\|discoveryEyebrow\|methodIntro" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/pages/ServicesPage.astro
```

Expected: righe ~149, ~155, ~176

- [ ] **Step 2: Sostituisci il blocco IT nell'oggetto `t`**

Individua il blocco che inizia con `pageTitle: 'Servizi'` e termina con la `}` prima del `}` chiusura del ternario. Sostituisci l'intero blocco IT con:

```ts
{
      pageTitle: 'Servizi',
      pageDesc: 'Discovery call gratuita, Health Check in 1–2 settimane con report e roadmap, affiancamento con obiettivi formalizzati. Tre pilastri, un ordine preciso.',
      heroTitle: 'Il metodo, applicato.',
      heroSubtitle: "Tre pilastri che si moltiplicano, non tre servizi che si sommano. L'ordine non è negoziabile.",
      heroCta: 'Prenota una discovery call',
      caseStudyLabel: 'Case study',
      // ── Funnel section ──
      funnelTitle: 'Come si lavora insieme',
      // Step 1 — Discovery call
      step1Eyebrow: 'Passo 1 · Gratuito',
      discoveryTitle: 'Discovery call',
      discoveryLead: 'Una chiamata di 30 minuti. Gratuita, senza impegno. Il modo più rapido per capire se possiamo lavorare insieme — e se serve davvero qualcuno come me.',
      discoveryWhatTitle: 'Di cosa parliamo',
      discoveryWhat: [
        'Dove sei ora: architettura, processi, le cose che ti fanno paura in produzione',
        'Dove vuoi andare: obiettivo, vincolo, scadenza',
        'I sintomi: cosa fa male oggi e con che frequenza',
        'Oppure: cosa stai per costruire — se il sistema ancora non esiste, è il momento migliore per partire bene',
      ],
      discoveryDeliverableTitle: 'Cosa ti porti a casa',
      discoveryDeliverable: [
        'Una lettura tecnica del problema, non consigli generici',
        'Un prossimo passo concreto — che coinvolga me o meno',
        'Una risposta onesta: posso aiutarti o no.',
      ],
      discoveryDurationLabel: 'Durata',
      discoveryDuration: '30 minuti',
      discoveryCostLabel: 'Costo',
      discoveryCostFree: 'Gratuita',
      discoveryCta: 'Prenota su Cal.com',
      step1Closing: "Se dalla call emerge qualcosa su cui vale la pena indagare, il passo successivo è l'Health Check. Se non emerge niente, te lo dico — ed è comunque una buona notizia.",
      // Step 2 — Health Check
      step2Eyebrow: 'Passo 2 · Il punto di ingresso',
      step2Title: 'Health Check',
      step2Subtitle: 'Una fotografia onesta di dove sei, prima di decidere dove intervenire.',
      step2Body1: "Nell'arco di una o due settimane analizzo il tuo sistema lungo i tre pilastri: come è progettato, come viene verificato, cosa è automatizzato e cosa no. Parlo con chi ci lavora ogni giorno — sviluppatori inclusi, non solo i responsabili — e guardo pipeline, test, monitoring e gestione degli accessi.",
      step2DeliverableTitle: 'Cosa ti porti a casa:',
      step2Deliverables: [
        'Un report con la valutazione di maturità su ciascun pilastro — cosa regge, cosa scricchiola, cosa manca',
        'Una roadmap prioritizzata: interventi rapidi (settimane) e strutturali (mesi), in ordine di rapporto costo/rischio',
        'Una sessione di restituzione con il team, per discutere il quadro senza filtri',
      ],
      step2Body2: 'Il report è tuo: puoi usarlo con me, con il tuo team, o con chiunque altro. Nessun lock-in.',
      step2Body3: "Se il team ha prodotto molto con strumenti AI negli ultimi anni, l'analisi include anche la qualità reale delle verifiche: misuro quanto i test si accorgono davvero dei bug, oltre la coverage.",
      step2DurationLabel: 'Durata',
      step2Duration: '1–2 settimane',
      step2CostLabel: 'Costo',
      step2Cost: 'prezzo fisso: €1.800',
      step2Cta: 'Parti dalla discovery call',
      // Step 3 — Affiancamento
      step3Eyebrow: 'Passo 3 · Continuativo',
      step3Title: 'Affiancamento',
      step3Subtitle: "Il percorso per chiudere quello che l'Health Check ha aperto.",
      step3Body1: "Un impegno mensile definito — giornate concordate, non \"richieste illimitate\" — con obiettivi formalizzati per iscritto e rivisti ogni trimestre. Non vendo soddisfazione a sensazione: vendo risultati misurabili, decisi insieme prima di iniziare.",
      step3Body2: "L'affiancamento include le mani, non solo i consigli: nuove funzionalità, integrazioni, pezzi di piattaforma. La differenza è che tutto quello che costruisco arriva con il sistema incluso — test che verificano davvero, osservabilità su ciò che viene toccato, decisioni documentate che il team sa rileggere.",
      step3Body3: "Il perimetro tipico copre i tre pilastri: decisioni architetturali accompagnate, sistemi di verifica che il team sa mantenere, automazione che riduce il lavoro manuale invece di nasconderlo. Per chi non ha una guida tecnica interna, l'affiancamento può assumere la forma di una direzione tecnica esterna: roadmap, scelte di fornitori e strumenti, supporto alle assunzioni tecniche.",
      step3Body4: "L'obiettivo finale di ogni affiancamento è rendermi inutile: il sistema e il team non devono dipendere da me per vivere. Per costruzione, questo percorso tende a ridursi nel tempo — ed è un successo, non un problema.",
      step3DurationLabel: 'Impegno',
      step3Duration: 'giornate e obiettivi definiti per iscritto, rivisti ogni trimestre',
      step3CostLabel: 'Costo',
      step3Cost: "in base al perimetro, definito dopo l'Health Check",
      step3Closing: "Si arriva qui passando dall'Health Check.",
      // ── Metodo ──
      methodTitle: 'Il metodo',
      methodIntro: "Tutto quello che faccio — dentro un Health Check o un affiancamento — segue lo stesso metodo. Tre pilastri in un ordine preciso. Ognuno si appoggia al precedente. L'ordine non è un dettaglio — è la differenza tra costruire e ricostruire.",
      whyLabel: "Perché in quest'ordine",
      blogLabel: 'Dal blog',
      scenariosTitle: "Perché l'ordine conta",
      scenariosIntro: 'Cosa succede quando salti un pilastro — o tutti e tre.',
      scenariosScenarioCol: 'Scenario',
      scenariosProblemCol: 'Cosa va storto',
      ctaTitle: 'Vogliamo parlarne?',
      ctaDesc: '30 minuti per capire se possiamo lavorare insieme. Senza impegno, senza slide.',
      ctaPrimary: 'Prenota una call',
      ctaSecondary: 'oppure scrivimi',
    }
```

- [ ] **Step 3: Verifica che le nuove chiavi siano presenti**

```bash
grep -c "step2Title\|step3Title\|funnelTitle\|step1Eyebrow" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/pages/ServicesPage.astro
```

Expected: `4`

---

## Task 3: Stringhe EN — funnel + discovery aggiornata + meta description

**Files:**
- Modify: `src/components/pages/ServicesPage.astro` — sezione `t` EN (righe ~107–147)

Stessa struttura dell'IT, tradotta in inglese mantenendo registro e significato (non traduzione letterale).

- [ ] **Step 1: Sostituisci il blocco EN nell'oggetto `t`**

Individua il blocco che inizia con `pageTitle: 'Services'`. Sostituisci l'intero blocco EN con:

```ts
{
      pageTitle: 'Services',
      pageDesc: 'Free discovery call, Health Check in 1–2 weeks with a report and roadmap, ongoing engagement with defined objectives. Three pillars, one deliberate order.',
      heroTitle: 'The method, applied.',
      heroSubtitle: 'Three pillars that multiply — not three services that add up. The order is not negotiable.',
      heroCta: 'Book a discovery call',
      caseStudyLabel: 'Case study',
      // ── Funnel section ──
      funnelTitle: 'How we work together',
      // Step 1 — Discovery call
      step1Eyebrow: 'Step 1 · Free',
      discoveryTitle: 'Discovery call',
      discoveryLead: "A 30-minute call. Free, no strings attached. The fastest way to find out whether we can work together — and whether you actually need someone like me.",
      discoveryWhatTitle: 'What we cover',
      discoveryWhat: [
        'Where you are now: architecture, processes, the things that scare you in production',
        'Where you want to get to: the goal, the constraints, the deadline',
        "The symptoms: what's hurting today, and how often",
        "Or: what you're about to build — if the system doesn't exist yet, this is the best time to start right",
      ],
      discoveryDeliverableTitle: 'What you walk away with',
      discoveryDeliverable: [
        'A technical read on the problem, not generic advice',
        'A concrete next step — whether it involves me or not',
        "An honest answer: yes I can help, or no I can't.",
      ],
      discoveryDurationLabel: 'Duration',
      discoveryDuration: '30 minutes',
      discoveryCostLabel: 'Cost',
      discoveryCostFree: 'Free',
      discoveryCta: 'Book on Cal.com',
      step1Closing: "If the call surfaces something worth digging into, the next step is the Health Check. If it doesn't, I'll tell you — and that's a good outcome too.",
      // Step 2 — Health Check
      step2Eyebrow: 'Step 2 · The entry point',
      step2Title: 'Health Check',
      step2Subtitle: 'An honest picture of where you are, before deciding where to act.',
      step2Body1: "Over one or two weeks, I analyse your system across the three pillars: how it's designed, how it's verified, what's automated and what isn't. I talk to the people who work on it every day — developers included, not just the managers — and I look at pipelines, tests, monitoring, and access management.",
      step2DeliverableTitle: 'What you walk away with:',
      step2Deliverables: [
        'A report with a maturity assessment across each pillar — what holds, what creaks, what's missing',
        'A prioritised roadmap: fast wins (weeks) and structural improvements (months), ordered by cost-to-risk ratio',
        'A readout session with your team, to go through the picture without filters',
      ],
      step2Body2: "The report is yours: use it with me, with your team, or with anyone else. No lock-in.",
      step2Body3: "If your team has been producing a lot with AI tools lately, the analysis includes the real quality of your verification layer: I measure how well your tests actually catch bugs, beyond coverage numbers.",
      step2DurationLabel: 'Duration',
      step2Duration: '1–2 weeks',
      step2CostLabel: 'Cost',
      step2Cost: 'fixed price: €1,800',
      step2Cta: 'Start with the discovery call',
      // Step 3 — Ongoing engagement
      step3Eyebrow: 'Step 3 · Ongoing',
      step3Title: 'Ongoing engagement',
      step3Subtitle: 'The path to close what the Health Check opened.',
      step3Body1: 'A defined monthly commitment — agreed days, not "unlimited requests" — with objectives written down and reviewed every quarter. I don\'t sell satisfaction by feel: I sell measurable results, agreed before we start.',
      step3Body2: 'The engagement includes hands-on work, not just advice: new features, integrations, pieces of platform. The difference is that everything I build comes with the system included — tests that actually catch things, observability on what gets touched, documented decisions the team can read back.',
      step3Body3: 'The typical scope covers the three pillars: architectural decisions guided, verification systems the team can maintain, automation that reduces manual work instead of hiding it. For teams without internal technical leadership, the engagement can take the form of external technical direction: roadmap, vendor and tooling decisions, support for technical hiring.',
      step3Body4: "The end goal of every engagement is to make myself unnecessary: the system and the team shouldn't depend on me to function. By design, this tends to shrink over time — and that's a success, not a problem.",
      step3DurationLabel: 'Commitment',
      step3Duration: 'days and objectives defined in writing, reviewed each quarter',
      step3CostLabel: 'Cost',
      step3Cost: 'based on scope, defined after the Health Check',
      step3Closing: 'You get here by going through the Health Check.',
      // ── Method ──
      methodTitle: 'The method',
      methodIntro: "Everything I do — inside a Health Check or an ongoing engagement — follows the same method. Three pillars in a deliberate order. Each builds on the previous. The order is not a detail — it's the difference between building and rebuilding.",
      whyLabel: 'Why this order',
      blogLabel: 'From the blog',
      scenariosTitle: 'Why the order matters',
      scenariosIntro: 'What happens when you skip a pillar — or all of them.',
      scenariosScenarioCol: 'Scenario',
      scenariosProblemCol: 'What goes wrong',
      ctaTitle: 'Want to talk?',
      ctaDesc: "30 minutes to figure out whether we can work together. No commitment, no slides.",
      ctaPrimary: 'Book a call',
      ctaSecondary: 'or write me',
    }
```

- [ ] **Step 2: Verifica che entrambe le versioni abbiano `step2Title`**

```bash
grep -n "step2Title" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/pages/ServicesPage.astro
```

Expected: 2 righe (una per EN, una per IT)

---

## Task 4: HTML — sezione funnel (tre gradini)

**Files:**
- Modify: `src/components/pages/ServicesPage.astro` — sezione HTML dopo `<PageHero>`

Sostituisce la sezione discovery call esistente (`<section id="health-check" ...>`) con la nuova sezione funnel che contiene i tre gradini. L'`id="health-check"` si sposta sul blocco Step 2 (Health Check), coerentemente con il nome.

- [ ] **Step 1: Verifica che la sezione discovery esista ancora con il vecchio id**

```bash
grep -n 'id="health-check"' /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/pages/ServicesPage.astro
```

Expected: 1 risultato alla riga ~198

- [ ] **Step 2: Sostituisci l'intera sezione discovery call (da `{/* Discovery call */}` a `</section>`) con la nuova sezione funnel**

Individua il commento `{/* Discovery call — punto di apertura */}` e la sezione `<section id="health-check"...>` fino al suo `</section>` chiusura. Sostituisci con:

```astro
  {/* Come si lavora insieme — tre gradini del funnel */}
  <section class="mb-20 fade-in-section">
    <h2 class="text-3xl font-bold text-text-dark dark:text-text-light mb-10">
      {t.funnelTitle}
    </h2>

    <div class="space-y-6">

      {/* Gradino 1 — Discovery call */}
      <div id="discovery-call" class="rounded-xl border border-accent/30 bg-accent/5 p-8 md:p-10 scroll-mt-20">
        <span class="text-xs text-accent font-semibold uppercase tracking-wide">
          {t.step1Eyebrow}
        </span>
        <h3 class="text-3xl md:text-4xl font-bold text-text-dark dark:text-text-light mt-2 mb-4">
          {t.discoveryTitle}
        </h3>
        <p class="text-text-muted text-lg leading-relaxed mb-8 max-w-3xl">
          {t.discoveryLead}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h4 class="text-sm font-semibold uppercase tracking-wide text-text-dark dark:text-text-light mb-3">
              {t.discoveryWhatTitle}
            </h4>
            <ul class="space-y-2">
              {t.discoveryWhat.map((item) => (
                <li class="text-text-muted text-sm leading-relaxed flex gap-2">
                  <span class="text-accent mt-2 shrink-0 w-1 h-1 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-semibold uppercase tracking-wide text-text-dark dark:text-text-light mb-3">
              {t.discoveryDeliverableTitle}
            </h4>
            <ul class="space-y-2">
              {t.discoveryDeliverable.map((item) => (
                <li class="text-text-muted text-sm leading-relaxed flex gap-2">
                  <span class="text-accent mt-2 shrink-0 w-1 h-1 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm">
          <div>
            <span class="text-text-muted">{t.discoveryDurationLabel}:</span>
            <span class="text-text-dark dark:text-text-light font-semibold ml-2">{t.discoveryDuration}</span>
          </div>
          <div>
            <span class="text-text-muted">{t.discoveryCostLabel}:</span>
            <span class="text-accent font-semibold ml-2">{t.discoveryCostFree}</span>
          </div>
        </div>

        <Button href={calLink} variant="primary" size="lg">
          {t.discoveryCta} →
        </Button>

        <p class="mt-6 text-text-muted text-sm leading-relaxed max-w-2xl italic">
          {t.step1Closing}
        </p>
      </div>

      {/* Gradino 2 — Health Check */}
      <div id="health-check" class="rounded-xl border border-border/50 dark:border-border-dark/50 bg-white dark:bg-surface-dark p-8 md:p-10 scroll-mt-20">
        <span class="text-xs text-text-muted font-semibold uppercase tracking-wide">
          {t.step2Eyebrow}
        </span>
        <h3 class="text-3xl md:text-4xl font-bold text-text-dark dark:text-text-light mt-2 mb-2">
          {t.step2Title}
        </h3>
        <p class="text-text-muted text-lg leading-relaxed mb-6 max-w-3xl font-medium">
          {t.step2Subtitle}
        </p>

        <p class="text-text-muted text-base leading-relaxed mb-6 max-w-3xl">
          {t.step2Body1}
        </p>

        <div class="mb-6">
          <p class="text-sm font-semibold text-text-dark dark:text-text-light mb-3">
            {t.step2DeliverableTitle}
          </p>
          <ul class="space-y-2">
            {t.step2Deliverables.map((item) => (
              <li class="text-text-muted text-sm leading-relaxed flex gap-2">
                <span class="text-text-muted mt-2 shrink-0 w-1 h-1 rounded-full bg-text-muted" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p class="text-text-muted text-base leading-relaxed mb-4 max-w-3xl">
          {t.step2Body2}
        </p>
        <p class="text-text-muted text-base leading-relaxed mb-8 max-w-3xl">
          {t.step2Body3}
        </p>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm">
          <div>
            <span class="text-text-muted">{t.step2DurationLabel}:</span>
            <span class="text-text-dark dark:text-text-light font-semibold ml-2">{t.step2Duration}</span>
          </div>
          <div>
            <span class="text-text-muted">{t.step2CostLabel}:</span>
            <span class="text-text-dark dark:text-text-light font-semibold ml-2">{t.step2Cost}</span>
          </div>
        </div>

        <Button href={calLink} variant="secondary" size="lg">
          {t.step2Cta} →
        </Button>
      </div>

      {/* Gradino 3 — Affiancamento */}
      <div id="affiancamento" class="rounded-xl border border-border/50 dark:border-border-dark/50 bg-white dark:bg-surface-dark p-8 md:p-10 scroll-mt-20">
        <span class="text-xs text-text-muted font-semibold uppercase tracking-wide">
          {t.step3Eyebrow}
        </span>
        <h3 class="text-3xl md:text-4xl font-bold text-text-dark dark:text-text-light mt-2 mb-2">
          {t.step3Title}
        </h3>
        <p class="text-text-muted text-lg leading-relaxed mb-6 max-w-3xl font-medium">
          {t.step3Subtitle}
        </p>

        <div class="space-y-4 mb-8 max-w-3xl">
          <p class="text-text-muted text-base leading-relaxed">{t.step3Body1}</p>
          <p class="text-text-muted text-base leading-relaxed">{t.step3Body2}</p>
          <p class="text-text-muted text-base leading-relaxed">{t.step3Body3}</p>
          <p class="text-text-muted text-base leading-relaxed">{t.step3Body4}</p>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-sm">
          <div>
            <span class="text-text-muted">{t.step3DurationLabel}:</span>
            <span class="text-text-dark dark:text-text-light font-semibold ml-2">{t.step3Duration}</span>
          </div>
          <div>
            <span class="text-text-muted">{t.step3CostLabel}:</span>
            <span class="text-text-dark dark:text-text-light font-semibold ml-2">{t.step3Cost}</span>
          </div>
        </div>

        <p class="text-text-muted text-sm leading-relaxed italic">
          {t.step3Closing}
        </p>
      </div>

    </div>
  </section>
```

- [ ] **Step 3: Verifica che i tre id siano presenti**

```bash
grep -n 'id="discovery-call"\|id="health-check"\|id="affiancamento"' /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/pages/ServicesPage.astro
```

Expected: 3 risultati

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/ServicesPage.astro
git commit -m "feat(servizi): aggiungi sezione funnel tre gradini (Discovery call → Health Check → Affiancamento)"
```

---

## Task 5: Aggiorna metodologia intro + verifica h2/h3

**Files:**
- Modify: `src/components/pages/ServicesPage.astro` — sezione HTML metodo

Dopo il Task 2/3, `t.methodIntro` è già aggiornato con la frase "Tutto quello che faccio...". Verificare che nel template HTML il `<h2>` del metodo sia presente e non degradato a `<h3>`.

- [ ] **Step 1: Verifica la sezione metodo nell'HTML**

```bash
grep -n "methodTitle\|methodIntro\|Il metodo" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/pages/ServicesPage.astro | tail -10
```

- [ ] **Step 2: Verificare che i titoli dei gradini usino `<h3>` e la sezione metodo usi `<h2>`**

I blocchi del funnel usano `<h3>`, la sezione "Il metodo" e "Perché l'ordine conta" usano `<h2>` — l'gerarchia è corretta per default dal template originale. Se così non è, aggiustare manualmente.

---

## Task 6: Hero.astro — allinea CTA label

**Files:**
- Modify: `src/components/home/Hero.astro` — stringhe `cta` (righe ~19 e ~28)

Cambia solo il label. L'href rimane `calLink` (Cal.com).

- [ ] **Step 1: Verifica il testo attuale**

```bash
grep -n "cta:" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/home/Hero.astro
```

Expected: riga ~19 `cta: 'Richiedi un Health Check'`, riga ~28 `cta: 'Request a Health Check'`

- [ ] **Step 2: Aggiorna label IT**

Nel file `src/components/home/Hero.astro`, sostituisci:
```
    cta: 'Richiedi un Health Check',
```
con:
```
    cta: 'Prenota una discovery call',
```

- [ ] **Step 3: Aggiorna label EN**

Sostituisci:
```
    cta: 'Request a Health Check',
```
con:
```
    cta: 'Book a discovery call',
```

- [ ] **Step 4: Verifica**

```bash
grep -n "cta:" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/src/components/home/Hero.astro
```

Expected: `cta: 'Prenota una discovery call'` e `cta: 'Book a discovery call'`

- [ ] **Step 5: Commit**

```bash
git add src/components/home/Hero.astro
git commit -m "fix(homepage): allinea CTA hero a discovery call (era Health Check, che ora è su /servizi/)"
```

---

## Task 7: Build e verifica output

**Files:**
- nessuno (solo verifica)

- [ ] **Step 1: Esegui la build**

```bash
cd /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io && npm run build 2>&1 | tail -30
```

Expected: build completata senza errori, nessuna riga `error` o `Error`.

- [ ] **Step 2: Verifica che la pagina IT contenga i tre gradini**

```bash
grep -c "Health Check\|Affiancamento\|Come si lavora" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/dist/servizi/index.html
```

Expected: ≥ 3

- [ ] **Step 3: Verifica che la pagina EN contenga i tre gradini**

```bash
grep -c "Health Check\|Ongoing engagement\|How we work together" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/dist/en/services/index.html
```

Expected: ≥ 3

- [ ] **Step 4: Verifica meta description IT aggiornata**

```bash
grep "meta.*description" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/dist/servizi/index.html | head -3
```

Expected: contiene "Discovery call gratuita"

- [ ] **Step 5: Verifica meta description EN aggiornata**

```bash
grep "meta.*description" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/dist/en/services/index.html | head -3
```

Expected: contiene "Free discovery call"

- [ ] **Step 6: Verifica homepage CTA aggiornata**

```bash
grep "Prenota una discovery\|Book a discovery" /home/monte97/Documents/1_WORK/1_AETE_RIORGANIZZATA/0_Content/website.github.io/dist/index.html
```

Expected: 1 risultato

- [ ] **Step 7: Commit finale**

```bash
git add -A
git commit -m "chore: build verificata — funnel servizi completo"
```

---

## Riepilogo scelte e TODO

### Scelta C (CTA homepage)
**Opzione scelta: B** — label cambiata in `Prenota una discovery call`, href rimane Cal.com. Motivazione: click → Cal.com = coerente con "prenota". Nessun cambio di href, minima modifica strutturale.

### TODO per Francesco
Nessun contenuto inventato. I seguenti punti richiedono input prima di poter procedere:

```
<!-- TODO: sezione prova sociale (testimonianze) — fuori scope fase 1. 
     Inserire quando Francesco ha 2-3 citazioni autorizzate da clienti. 
     Layout non predisposto in questa iterazione. -->
```

Il costo dell'Affiancamento è volutamente non pubblicato ("in base al perimetro") — coerente con la strategia descritta nel brief. Nessun placeholder da riempire.
