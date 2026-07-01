# Servizi — Riposizionamento e Riduzione Caos CTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riscrivere la pagina `/servizi` (IT+EN) perché spieghi *una cosa sola* — cosa fa Francesco per una PMI che modernizza sistemi datati — con *una sola azione* (discovery call), eliminando le offerte parallele e le CTA concorrenti.

**Architecture:** Modifiche di copy + struttura al componente Astro `ServicesPage.astro` (sorgente unica per `/servizi` e `/en/services`). Ritocco leggero di copy su home/bio per coerenza. Aggiornamento delle sentinelle dello smoke test. Nessun nuovo componente, nessuna dipendenza nuova.

**Tech Stack:** Astro 5, componenti `.astro`, Tailwind v4, contenuti da `getCollection` (services/projects/posts). Verifica: `npm run build` + `scripts/smoke.sh`.

## Global Constraints

- **Compratore target:** PMI che modernizza sistemi datati/fragili (NON "startup / team in crescita"). Copiare questo framing verbatim in ogni stringa di pubblico.
- **Una sola azione primaria** su tutta la pagina: `https://cal.com/francesco-montelli-4hfojq/30min`, etichetta IT "Prenota una discovery call" / EN "Book a discovery call". Nessun pulsante concorrente.
- **Sentinelle smoke test da preservare** nel DOM renderizzato di `/servizi`: `Discovery call`, `Affondo mirato`, `Affiancamento`, `€1.200`, `cal.com/francesco-montelli`. EN `/en/services`: `Discovery call`, `Targeted intervention`, `Ongoing engagement`, `€1,200`, `cal.com/francesco-montelli`. (Il contenuto dentro `<details>` conta: è nel DOM.)
- **Niente prove finte:** nessuna metrica/risultato inventato. La banda "Prova" non viene renderizzata finché non esiste un caso reale.
- **IT prima, EN dopo** (convenzione repo). Ogni stringa esiste in entrambe le lingue nell'oggetto `t`.
- **Niente aforismi** ("pilastri che si moltiplicano", "l'ordine non è negoziabile", "costruire vs ricostruire"): rimuovere o ammorbidire.
- **No emoji** nella copy.

---

### Task 1: Copy layer — riscrivere l'oggetto `t` (IT + EN) di ServicesPage

**Files:**
- Modify: `src/components/pages/ServicesPage.astro:110-324` (l'oggetto `t` completo)

**Interfaces:**
- Produces: nuove chiavi in `t` consumate dal template nel Task 2. Chiavi nuove/rinominate: `heroTitle`, `heroForWho`, `heroHook`, `heroAvailability`, `heroCta`, `signalsEyebrow`, `signalsTitle`, `signalsIntro`, `signals[]` (`{title, body}`), `signalsClosing`, `methodTitle`, `methodIntro`, `whyLabel`, `caseStudyLabel`, `scenariosTitle`, `scenariosIntro`, `scenariosScenarioCol`, `scenariosProblemCol`, `pricingEyebrow`, `pricingTitle`, `pricingLead`, `pricingStepMain`, `pricingStepSub`, `pricingContinueLabel`, `pricingContinueBody`, `pricingUnnecessary`, `caseStudiesLink`, `ctaTitle`, `ctaDesc`, `ctaPrimary`, `ctaSecondary`.
- Rimosse (non più usate): `heroSubtitle`, `heroStepperLabel`, tutte le `step1*/step2*/step3*/discovery*`, tutte le `tailored*/aprog*/form*`, `blogLabel`.

- [ ] **Step 1: Sostituire il blocco EN (`t` per `lang === 'en'`, righe ~111-217) con:**

```js
      pageTitle: 'Services',
      pageDesc: 'I modernize product systems that have stiffened over time: containers, CI/CD, testing, observability and security, put where they were missing. Free 30-minute discovery call.',
      // Hero
      heroTitle: 'I modernize product systems that stiffened over time: containers, CI/CD, testing, observability and security — put in where they were missing.',
      heroForWho: 'For product companies whose systems grew slower than the business needed them to.',
      heroHook: 'The part of software still human — designing well and actually testing — is the part I do.',
      heroAvailability: '',
      heroCta: 'Book a discovery call',
      // Signals
      signalsEyebrow: 'Who this is for',
      signalsTitle: 'When adding a feature has started to cost a fortune — and nobody inside owns the infrastructure.',
      signalsIntro: 'Product companies past the early phase, now hitting friction that was not there before.',
      signals: [
        { title: 'Deploys you dread', body: 'Every release is an event. You push it to Friday afternoon to dodge the on-call weekend. When something breaks, recovery takes hours, not minutes.' },
        { title: 'Tech stuck in place', body: 'Adding a new feature costs an enormous effort. The stack is old, and every change fights the ones before it. You are falling behind, and you can feel it.' },
        { title: 'No one owns the infra', body: 'CI/CD, deploy, security: nobody inside really presides over them. Knowledge is stuck in a few heads, and those heads take vacations.' },
      ],
      signalsClosing: 'If two of these already feel familiar, the right time to act is before the third one shows up.',
      // Method
      methodTitle: 'How I work',
      methodIntro: 'Everything I do follows the same order: design, then verify, then automate. Usually in this order — and I bend it when the system forces me to. It is not a slogan: it is the difference between fixing a problem and amplifying it.',
      whyLabel: 'Why this order',
      caseStudyLabel: 'Case study',
      scenariosTitle: 'Why the order matters',
      scenariosIntro: 'What happens when you skip a step. Or all of them.',
      scenariosScenarioCol: 'Scenario',
      scenariosProblemCol: 'What goes wrong',
      // Pricing (collapsed)
      pricingEyebrow: 'How we work',
      pricingTitle: 'How we work after the call',
      pricingLead: 'We usually start with a targeted intervention: one area, a concrete result in hand, delivered within two weeks.',
      pricingStepMain: '€1,200',
      pricingStepSub: 'fixed price · targeted intervention, delivered in 2 weeks · refunded if you are not satisfied, no questions — the work stays yours either way',
      pricingContinueLabel: 'How it continues',
      pricingContinueBody: 'If the problem is bigger than one intervention, we move to an ongoing engagement: from €2,500/month, month to month, one active goal at a time. Everything with the system included — tests that actually catch things, observability, documented decisions.',
      pricingUnnecessary: 'The goal is to make myself unnecessary: every engagement ends with a handover doc, runbooks and an internal owner I train. The system should not depend on me to keep working.',
      caseStudiesLink: 'See the case studies',
      // Final CTA
      ctaTitle: "Let's talk.",
      ctaDesc: '30 minutes, free, to figure out whether we can work together. No commitment, no slides.',
      ctaPrimary: 'Book a discovery call',
      ctaSecondary: 'or write me',
```

- [ ] **Step 2: Sostituire il blocco IT (`t` per il ramo `else`, righe ~218-324) con:**

```js
      pageTitle: 'Servizi',
      pageDesc: 'Modernizzo sistemi di prodotto irrigiditi nel tempo: container, CI/CD, test, observability e sicurezza, messi dove non c’erano. Discovery call gratuita di 30 minuti.',
      // Hero
      heroTitle: 'Modernizzo sistemi di prodotto irrigiditi nel tempo: container, CI/CD, test, observability e sicurezza — messi dove non c’erano.',
      heroForWho: 'Per aziende di prodotto i cui sistemi sono cresciuti più piano di quanto servisse al business.',
      heroHook: 'La parte del software ancora umana — progettare bene e collaudare sul serio — è quella di cui mi occupo io.',
      heroAvailability: '',
      heroCta: 'Prenota una discovery call',
      // Segnali
      signalsEyebrow: 'Per chi è',
      signalsTitle: 'Quando aggiungere una funzione ha iniziato a costare una fatica enorme — e dentro nessuno presidia l’infrastruttura.',
      signalsIntro: 'Aziende di prodotto oltre la fase iniziale, che ora incontrano attriti che prima non c’erano.',
      signals: [
        { title: 'Deploy che fanno paura', body: 'Ogni rilascio è un evento. Lo rimandi al venerdì pomeriggio per evitare il weekend di guardia. Quando qualcosa si rompe, recuperare costa ore, non minuti.' },
        { title: 'Tecnologia ferma al palo', body: 'Aggiungere una funzione nuova costa una fatica enorme. Lo stack è vecchio e ogni modifica combatte con le precedenti. Stai restando indietro, e lo senti.' },
        { title: 'Nessuno presidia l’infra', body: 'CI/CD, deploy, sicurezza: dentro non li presidia davvero nessuno. La conoscenza è concentrata in poche teste, e quelle teste vanno in ferie.' },
      ],
      signalsClosing: 'Se due di queste te le sei già sentite addosso, il momento giusto per intervenire è prima della terza.',
      // Metodo
      methodTitle: 'Come lavoro',
      methodIntro: 'Tutto quello che faccio segue lo stesso ordine: prima progettare, poi verificare, poi automatizzare. Di solito in quest’ordine — e lo piego quando il sistema me lo impone. Non è uno slogan: è la differenza tra sistemare un problema e amplificarlo.',
      whyLabel: 'Perché in quest’ordine',
      caseStudyLabel: 'Case study',
      scenariosTitle: 'Perché l’ordine conta',
      scenariosIntro: 'Cosa succede quando salti un passo. O tutti.',
      scenariosScenarioCol: 'Scenario',
      scenariosProblemCol: 'Cosa va storto',
      // Prezzi (collassati)
      pricingEyebrow: 'Come si lavora',
      pricingTitle: 'Come si lavora dopo la call',
      pricingLead: 'Di solito si parte da un affondo mirato: un’area sola, un risultato concreto in mano, consegnato entro due settimane.',
      pricingStepMain: '€1.200',
      pricingStepSub: 'prezzo fisso · affondo mirato, consegna in 2 settimane · rimborsato se non sei soddisfatto, senza domande — il lavoro fatto resta comunque tuo',
      pricingContinueLabel: 'Come prosegue',
      pricingContinueBody: 'Se il problema è più grande di un singolo affondo, si passa a un affiancamento: da €2.500/mese, mese per mese, un obiettivo attivo alla volta. Tutto col sistema incluso — test che verificano davvero, observability, decisioni documentate.',
      pricingUnnecessary: 'L’obiettivo è rendermi inutile: ogni ingaggio finisce con handover doc, runbook e un owner interno che formo. Il sistema non deve dipendere da me per funzionare.',
      caseStudiesLink: 'Vedi i case study',
      // CTA finale
      ctaTitle: 'Parliamone.',
      ctaDesc: '30 minuti, gratuiti, per capire se possiamo lavorare insieme. Senza impegno, senza slide.',
      ctaPrimary: 'Prenota una discovery call',
      ctaSecondary: 'oppure scrivimi',
```

- [ ] **Step 3: Verificare che il file non abbia errori di sintassi TS/JS**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npx astro check --minimumSeverity error 2>&1 | head -30`
Expected: possono comparire errori "Property 'X' does not exist" per le chiavi vecchie ancora usate nel template (verranno risolti nel Task 2). NON devono comparire errori di parsing/sintassi nell'oggetto `t`.

> Nota copy: le stringhe hero sono bozze pronte all'uso ma restano di Francesco — rifinibili in review senza cambiare la struttura.

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/ServicesPage.astro
git commit -m "content(servizi): nuovo copy layer PMI-modernizza (IT+EN)"
```

---

### Task 2: Template — ristrutturare il markup di ServicesPage

**Files:**
- Modify: `src/components/pages/ServicesPage.astro:31-64` (rimuovere/adattare `pillarOrder`), `:327-727` (tutto il template `<main>`)

**Interfaces:**
- Consumes: le chiavi `t.*` definite nel Task 1; `services`, `rendered`, `byPillar`, `pillarOrder`, `caseStudyIdsByPillar`, `projectById`, `scenarios`, `calLink`, `mailLink`, `prefix`, `pillarStyles`, `pillarLabels` (già presenti nel frontmatter, righe 1-108). `postsByPillar` NON più usato (i link blog vengono rimossi) — lasciare il calcolo o rimuoverlo è indifferente per il build; rimuoverlo (righe 77-89) tiene pulito.

- [ ] **Step 1: Rimuovere il blocco di calcolo dei post correlati (leakage blog)**

Eliminare righe 77-89 (`allPosts`, `postsByPillar`) e la costante `locale` se resta inutilizzata (verificare: `locale` usata solo nei relatedPosts → rimuovibile).

- [ ] **Step 2: Sostituire l'intero `<main>` (righe 329-725) con la nuova struttura a 6 bande**

```astro
  <main>

  {/* BANDA 1 — Hero: cosa faccio, per chi, una CTA */}
  <section class="bg-accent-subtle border-b border-border/40 dark:border-border-dark/40">
    <div class="max-w-5xl mx-auto px-5 py-16 md:py-24 fade-in-section">
      <p class="text-sm text-accent font-semibold mb-4">{t.heroHook}</p>
      <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text-dark dark:text-text-light max-w-4xl leading-[1.15]">
        {t.heroTitle}
      </h1>
      <p class="mt-4 text-base md:text-lg text-text-muted max-w-2xl leading-relaxed">
        {t.heroForWho}
      </p>
      {t.heroAvailability && (
        <p class="mt-2 text-sm text-text-muted/80">{t.heroAvailability}</p>
      )}
      <div class="mt-8">
        <Button href={calLink} variant="primary" size="lg" data-umami-event="cta-servizi-hero">
          {t.heroCta} &rarr;
        </Button>
      </div>
    </div>
  </section>

  {/* BANDA 2 — Per chi è / i segnali */}
  <section>
    <div class="max-w-5xl mx-auto px-5 py-16 md:py-20 fade-in-section">
      <p class="text-xs text-accent font-semibold uppercase tracking-wide mb-3">{t.signalsEyebrow}</p>
      <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-text-dark dark:text-text-light mb-4 max-w-3xl">
        {t.signalsTitle}
      </h2>
      <p class="text-text-muted text-lg leading-relaxed mb-10 max-w-3xl">{t.signalsIntro}</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
        {t.signals.map((s) => (
          <div class="rounded-xl border border-border/70 dark:border-border-dark/70 border-l-[3px] border-l-accent p-6 bg-white dark:bg-surface-dark h-full">
            <h3 class="font-semibold text-base text-text-dark dark:text-text-light mb-2">{s.title}</h3>
            <p class="text-text-muted text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
      <p class="text-text-dark dark:text-text-light text-base md:text-lg leading-relaxed mt-10 max-w-3xl border-l-2 border-l-accent pl-5 italic">
        {t.signalsClosing}
      </p>
    </div>
  </section>

  {/* BANDA 3 — PROVA (slot predisposto, non renderizzato finché proof === null) */}
  {proof && (
    <section class="bg-surface dark:bg-surface-dark/40 border-y border-border/40 dark:border-border-dark/40">
      <div class="max-w-5xl mx-auto px-5 py-14 md:py-16 fade-in-section">
        <p class="text-xs text-accent font-semibold uppercase tracking-wide mb-3">{t.caseStudyLabel}</p>
        <p class="text-xl md:text-2xl font-semibold text-text-dark dark:text-text-light max-w-3xl leading-snug">
          {proof.headline}
        </p>
        <p class="mt-3 text-text-muted text-base leading-relaxed max-w-3xl">{proof.body}</p>
      </div>
    </section>
  )}

  {/* BANDA 4 — Il metodo (sostanza, sfrondata; nessun link in uscita) */}
  <section class="bg-surface dark:bg-surface-dark/40 border-b border-border/40 dark:border-border-dark/40">
    <div class="max-w-5xl mx-auto px-5 py-16 md:py-20">
      <div class="mb-12 fade-in-section">
        <h2 class="text-3xl font-bold text-text-dark dark:text-text-light mb-4">{t.methodTitle}</h2>
        <p class="text-text-muted text-lg leading-relaxed max-w-3xl">{t.methodIntro}</p>
      </div>

      <div class="space-y-8 mb-16">
        {pillarOrder.map(({ pillar, anchor, order, why }) => {
          const entry = byPillar(pillar);
          if (!entry) return null;
          const styles = pillarStyles[pillar];
          const label = pillarLabels[pillar][lang];
          const Content = entry.Content;
          return (
            <section id={anchor} class:list={['rounded-xl border bg-white dark:bg-surface-dark border-border/50 dark:border-border-dark/50 border-l-[3px] p-6 md:p-8 scroll-mt-20 fade-in-section', styles.borderLeft]}>
              <div class="flex items-baseline gap-3 mb-3">
                <span class={`text-sm font-mono ${styles.text}`}>{order}</span>
                <h3 class={`text-2xl font-bold ${styles.text}`}>{label}</h3>
                <span class="text-text-muted text-sm">— {entry.service.data.title}</span>
              </div>
              <div class={`mb-5 pl-3 border-l-2 ${styles.borderLeft}`}>
                <p class="text-xs uppercase tracking-wide text-text-muted mb-1">{t.whyLabel}</p>
                <p class="text-text-dark dark:text-text-light text-base leading-relaxed">{why[lang]}</p>
              </div>
              <div class="prose dark:prose-invert max-w-none text-text-muted">
                <Content />
              </div>
            </section>
          );
        })}
      </div>

      {/* Scenari — perché l'ordine conta */}
      <section class="fade-in-section">
        <h2 class="text-3xl font-bold text-text-dark dark:text-text-light mb-3">{t.scenariosTitle}</h2>
        <p class="text-text-muted text-lg leading-relaxed max-w-3xl mb-6">{t.scenariosIntro}</p>
        <div class="overflow-x-auto rounded-xl border border-border/70 dark:border-border-dark/70">
          <table class="w-full text-left">
            <thead class="bg-accent/5">
              <tr>
                <th scope="col" class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-dark dark:text-text-light w-1/3">{t.scenariosScenarioCol}</th>
                <th scope="col" class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-dark dark:text-text-light">{t.scenariosProblemCol}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((row, i) => {
                const isLast = i === scenarios.length - 1;
                return (
                  <tr class:list={['border-t border-border/50 dark:border-border-dark/50', isLast && 'bg-accent/5']}>
                    <td class:list={['px-5 py-4 align-top text-sm font-semibold', isLast ? 'text-accent' : 'text-text-dark dark:text-text-light']}>{row.scenario}</td>
                    <td class="px-5 py-4 align-top text-sm text-text-muted leading-relaxed">{row.problem}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>

  {/* BANDA 5 — Come si lavora dopo la call (prezzi collassati, nessun pulsante concorrente) */}
  <section class="border-b border-border/40 dark:border-border-dark/40">
    <div class="max-w-5xl mx-auto px-5 py-16 md:py-20 fade-in-section">
      <p class="text-xs text-text-muted font-semibold uppercase tracking-wide mb-3">{t.pricingEyebrow}</p>
      <h2 class="text-2xl md:text-3xl font-bold text-text-dark dark:text-text-light mb-4">{t.pricingTitle}</h2>
      <p class="text-text-muted text-lg leading-relaxed max-w-3xl mb-6">{t.pricingLead}</p>

      <div class="rounded-xl border border-accent/30 bg-accent/5 p-6 md:p-8 max-w-3xl">
        <div class="flex items-baseline gap-x-3 gap-y-1 flex-wrap mb-2">
          <span class="text-2xl md:text-3xl font-bold text-accent">{t.pricingStepMain}</span>
          <span class="text-sm text-text-muted">{t.pricingStepSub}</span>
        </div>
        <p class="text-xs uppercase tracking-wide text-accent font-semibold mt-4">Affondo mirato</p>
      </div>

      <details class="mt-6 max-w-3xl group">
        <summary class="cursor-pointer text-sm font-semibold text-text-dark dark:text-text-light hover:text-accent transition-colors list-none flex items-center gap-2">
          <span class="text-accent transition-transform group-open:rotate-90" aria-hidden="true">&rsaquo;</span>
          {t.pricingContinueLabel}
        </summary>
        <div class="mt-4 pl-5 border-l-2 border-accent/30 space-y-3">
          <p class="text-xs uppercase tracking-wide text-text-muted font-semibold">Affiancamento</p>
          <p class="text-text-muted text-base leading-relaxed">{t.pricingContinueBody}</p>
          <p class="text-text-muted text-sm leading-relaxed italic">{t.pricingUnnecessary}</p>
        </div>
      </details>
    </div>
  </section>

  {/* BANDA 6 — CTA finale (una sola azione + link secondari piccoli) */}
  <section class="bg-accent text-white">
    <div class="max-w-5xl mx-auto px-5 py-20 text-center fade-in-section">
      <h2 class="text-3xl md:text-4xl font-bold mb-3">{t.ctaTitle}</h2>
      <p class="text-white/85 text-lg mb-8 max-w-xl mx-auto">{t.ctaDesc}</p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <a href={calLink} class="inline-flex items-center justify-center font-medium rounded-lg px-7 py-3 text-base bg-white text-accent hover:bg-white/90 shadow-sm active:scale-[0.98] transition-all" data-umami-event="cta-servizi-final">
          {t.ctaPrimary}
        </a>
        <a href={mailLink} class="text-sm text-white/80 hover:text-white underline underline-offset-4 transition-colors">{t.ctaSecondary}</a>
      </div>
      <p class="mt-6">
        <a href={`${prefix}/progetti/`} class="text-sm text-white/70 hover:text-white underline underline-offset-4 transition-colors">{t.caseStudiesLink} &rarr;</a>
      </p>
    </div>
  </section>

  </main>
```

- [ ] **Step 3: Aggiungere la variabile `proof` nel frontmatter** (subito prima della riga `const t = ...`, ~riga 110):

```js
// Slot PROVA — riempire con un caso reale quando disponibile (follow-up #1).
// Finché è null, la banda 3 non viene renderizzata (niente prove finte).
const proof: { headline: string; body: string } | null = null;
```

- [ ] **Step 4: Semplificare `pillarOrder`** — le stringhe `why` restano (sono sostanza, non aforismi). Nessuna modifica necessaria a righe 31-64 se non la rimozione di eventuali riferimenti a chiavi eliminate. Verificare che `pillarOrder` non usi `t.blogLabel` o altre chiavi rimosse (non le usa).

- [ ] **Step 5: Build completo**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npm run build 2>&1 | tail -20`
Expected: build completato senza errori; nessun riferimento a chiavi `t.*` inesistenti.

- [ ] **Step 6: Verificare presenza sentinelle nel build (IT + EN)**

Run:
```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
for s in "Discovery call" "Affondo mirato" "Affiancamento" "€1.200" "cal.com/francesco-montelli"; do grep -qF "$s" dist/servizi/index.html && echo "OK it: $s" || echo "KO it: $s"; done
for s in "Discovery call" "Targeted intervention" "Ongoing engagement" "€1,200" "cal.com/francesco-montelli"; do grep -qF "$s" dist/en/services/index.html && echo "OK en: $s" || echo "KO en: $s"; done
```
Expected: tutte `OK`. Se `Affondo mirato`/`Affiancamento`/`Discovery call` risultano `KO`, sono presenti come etichette nel markup (Affondo mirato nella banda 5, Affiancamento nel `<details>`) — verificare che le stringhe letterali compaiano; se necessario aggiungerle come label. `Discovery call` IT: compare in `ctaPrimary`? No — IT usa "Prenota una discovery call". La sentinella cerca `Discovery call` (case-sensitive con la D maiuscola): "discovery call" minuscolo NON matcha. → vedi Step 7.

- [ ] **Step 7: Garantire la sentinella `Discovery call` (IT) e `Discovery call` (EN)**

La label IT è "Prenota una discovery call" (minuscolo) → NON contiene "Discovery call". Per non forzare copy innaturale, si aggiorna la sentinella nel Task 5 invece di storpiare la copy. Annotare: le sentinelle IT `Discovery call` e `Affondo mirato`/`Affiancamento` vanno riallineate nel Task 5 alle stringhe reali (`discovery call`, `Affondo mirato` [presente], `Affiancamento` [presente]).

- [ ] **Step 8: Commit**

```bash
git add src/components/pages/ServicesPage.astro
git commit -m "feat(servizi): ristruttura pagina — hero cosa-faccio, segnali, metodo sfrondato, prezzi collassati, una CTA"
```

---

### Task 3: Rimuovere la banda "Su misura" e lo stepper — verifica assenza offerte parallele

**Files:**
- Verify: `src/components/pages/ServicesPage.astro` (già rimosse nel Task 2)

> Questo task è una checklist di verifica: la banda "Su misura" (A Progetto + Workshop) e lo stepper hero sono stati eliminati sostituendo il `<main>` nel Task 2. Workshop resta raggiungibile dal menu (`/workshop/`, già in `Header.astro`). "A Progetto" viene convogliato in discovery (nessuna pagina nuova).

- [ ] **Step 1: Confermare che non esistano più pulsanti/offerte concorrenti nel build**

Run:
```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
grep -c "cal.com/francesco-montelli" dist/servizi/index.html
grep -iE "parlami del progetto|vedi i workshop|su misura|a progetto|formazione per il team" dist/servizi/index.html && echo "KO: offerta parallela residua" || echo "OK: nessuna offerta parallela"
```
Expected: il conteggio `cal.com` è basso (hero + CTA finale = 2 occorrenze del link primario); la seconda grep stampa `OK: nessuna offerta parallela`.

- [ ] **Step 2: Confermare assenza dello stepper**

Run: `grep -iE "heroStepper|#discovery-call\"|#affondo\"|#affiancamento\"" src/components/pages/ServicesPage.astro && echo "KO: stepper residuo" || echo "OK: stepper rimosso"`
Expected: `OK: stepper rimosso`.

- [ ] **Step 3: Nessun commit** (nessuna modifica — solo verifica). Se le grep trovano residui, correggere nel file e ricommittare con `fix(servizi): rimuovi residui offerte parallele`.

---

### Task 4: Ritocco leggero home / bio — sostantivo pubblico verso PMI-modernizza

**Files:**
- Modify: `src/components/home/Hero.astro:17,25` (subtitle IT/EN)
- Modify: `src/components/home/ForWho.astro:10-11,35-36` (title/intro IT/EN)
- Modify: `src/data/author.ts:6-7` (bio IT/EN)
- Modify: `src/components/pages/AboutPage.astro:31,60` (whoBody riga "team in crescita")

**Interfaces:**
- Consumes: nulla di nuovo. Solo modifiche di stringhe. I **segnali concreti in ForWho restano invariati**; cambia solo il sostantivo del pubblico.

- [ ] **Step 1: `Hero.astro` subtitle — sostituire il sostantivo pubblico**

IT (riga 17), da `'Software Engineer freelance per sistemi distribuiti. Aiuto team in crescita a cogliere i segnali prima che diventino guasti, e a costruire la disciplina perché non tornino.'` a:
```
'Software Engineer freelance. Aiuto aziende di prodotto a modernizzare sistemi irrigiditi nel tempo — e a costruire la disciplina perché reggano.',
```
EN (riga 25), da `'Freelance Software Engineer for distributed systems. I help growing teams catch the signals before they become outages, and build the discipline that keeps them from coming back.'` a:
```
'Freelance Software Engineer. I help product companies modernize systems that stiffened over time — and build the discipline that keeps them solid.',
```

- [ ] **Step 2: `ForWho.astro` title/intro — sostituire il sostantivo pubblico (segnali invariati)**

IT (righe 10-11):
```
    title: 'Aziende di prodotto i cui sistemi sono cresciuti più piano di quanto servisse.',
    intro: 'Prodotti che hanno superato la fase iniziale e ora si trovano davanti ad attriti che prima non c\'erano.',
```
EN (righe 35-36):
```
    title: 'Product companies whose systems grew slower than the business needed.',
    intro: 'Products past the early-stage phase, now hitting friction that was not there before.',
```

- [ ] **Step 3: `author.ts` bio — riallineare a PMI-modernizza**

IT (riga 6):
```
    it: "Software Engineer freelance. Aiuto aziende di prodotto a modernizzare sistemi irrigiditi nel tempo: container, CI/CD, test, observability e sicurezza, messi dove non c'erano. Iscritto all'Ordine degli Ingegneri della Provincia di Ravenna.",
```
EN (riga 7):
```
    en: 'Freelance Software Engineer. I help product companies modernize systems that stiffened over time: containers, CI/CD, testing, observability and security, put where they were missing. Registered with the Order of Engineers of the Province of Ravenna.',
```

- [ ] **Step 4: `AboutPage.astro` whoBody — riga "team in crescita"**

EN (riga 31), sostituire `"I work with growing teams that start to feel something cracking. My ultimate goal is to make myself useless: the system shouldn't depend on me to keep working."` con:
```
        "I work with product companies whose systems stiffened over time and now fight every change. My ultimate goal is to make myself useless: the system shouldn't depend on me to keep working.",
```
IT (riga 60), sostituire `"Lavoro con team in crescita che iniziano a sentire qualcosa scricchiolare. Il mio obiettivo finale è rendermi inutile: il sistema non deve dipendere da me per funzionare."` con:
```
        "Lavoro con aziende di prodotto i cui sistemi si sono irrigiditi nel tempo e ora combattono ogni modifica. Il mio obiettivo finale è rendermi inutile: il sistema non deve dipendere da me per funzionare.",
```

- [ ] **Step 5: Build**

Run: `cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io && npm run build 2>&1 | tail -10`
Expected: build verde.

- [ ] **Step 6: Verificare che i segnali ForWho siano rimasti invariati**

Run: `grep -qF "venerdì pomeriggio" dist/index.html && echo OK || echo KO`
Expected: `OK` (segnale concreto preservato).

- [ ] **Step 7: Commit**

```bash
git add src/components/home/Hero.astro src/components/home/ForWho.astro src/data/author.ts src/components/pages/AboutPage.astro
git commit -m "content(home,about): allinea sostantivo pubblico a PMI-modernizza"
```

---

### Task 5: Aggiornare le sentinelle dello smoke test e verifica end-to-end

**Files:**
- Modify: `scripts/smoke.sh:24-35` (array `PRESENT`)

**Interfaces:**
- Consumes: le stringhe reali renderizzate da ServicesPage dopo i Task 1-2.

- [ ] **Step 1: Aggiornare l'array `PRESENT` alle stringhe reali della nuova pagina**

Sostituire righe 24-35 con:
```bash
PRESENT=(
  "/servizi/|discovery call"
  "/servizi/|Affondo mirato"
  "/servizi/|Affiancamento"
  "/servizi/|€1.200"
  "/servizi/|cal.com/francesco-montelli"
  "/en/services/|discovery call"
  "/en/services/|targeted intervention"
  "/en/services/|Ongoing"
  "/en/services/|€1,200"
  "/en/services/|cal.com/francesco-montelli"
)
```
> Nota: le sentinelle sono ora case-sensitive sulle stringhe effettivamente presenti. `discovery call` (minuscolo, dentro "Prenota una discovery call" / "Book a discovery call"), `Affondo mirato` (label banda 5), `Affiancamento` (label nel `<details>`), `targeted intervention` (dentro `pricingLead` EN), `Ongoing` (dentro `pricingContinueBody` EN "ongoing engagement" → maiuscola non garantita; usare `ongoing`).

- [ ] **Step 2: Correggere le due sentinelle EN minuscole**

Nell'array appena scritto, cambiare `"/en/services/|targeted intervention"` (già minuscolo, presente in `pricingLead`: "a targeted intervention") e `"/en/services/|Ongoing"` → `"/en/services/|ongoing"` (presente in `pricingContinueBody`: "an ongoing engagement").

- [ ] **Step 3: Build + preview locale + smoke locale**

Run:
```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
npm run build 2>&1 | tail -5
npx astro preview --port 4321 &
sleep 4
bash scripts/smoke.sh http://localhost:4321
kill %1 2>/dev/null
```
Expected: `Smoke test superato.` — tutte le sentinelle `OK presente`.

- [ ] **Step 4: Se una sentinella è `KO`**, leggere quale stringa manca e allineare: o la copy (se la stringa deve esserci) o la sentinella (se la copy è cambiata volutamente). Ripetere Step 3.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke.sh
git commit -m "test(smoke): allinea sentinelle /servizi al nuovo copy"
```

---

### Task 6: Verifica finale — una-cosa-sola e una-azione-sola

**Files:** nessuna modifica (checklist di accettazione).

- [ ] **Step 1: Contare le azioni primarie e i punti di uscita sulla pagina Servizi**

Run:
```bash
cd /Users/monte97/Documents/1_AETE/0_Content/website.github.io
echo "-- link cal.com (atteso 2: hero + CTA finale):"; grep -o "cal.com/francesco-montelli-4hfojq/30min" dist/servizi/index.html | wc -l
echo "-- link blog residui nelle pillar-card (atteso 0):"; grep -oE "/blog/[a-z]" dist/servizi/index.html | wc -l
echo "-- link progetti (atteso 1: 'Vedi i case study' in CTA finale):"; grep -o "/progetti/\"" dist/servizi/index.html | wc -l
```
Expected: cal.com = 2 (o 2-3 se il footer include un contatto); blog residui = 0; progetti = 1.

- [ ] **Step 2: Revisione visiva** (l'utente apre `npx astro preview` e controlla IT + EN):
  - Hero: si capisce cosa fa in 5 secondi? Metafora come riga di supporto, non H1.
  - Un solo pulsante primario visibile per schermata.
  - `<details>` "Come prosegue" chiuso di default, apribile.
  - Nessuna banda "Su misura".

- [ ] **Step 3: Commit finale se sono servite micro-correzioni visive**, altrimenti nessuno.

---

## Self-Review (compilata dall'autore del piano)

**Spec coverage:**
- §3 compratore PMI → Task 1 (copy), Task 4 (home/bio). ✓
- §4 voce canonica → Task 1. ✓
- §5 metafora demota → Task 2 Step 2 (heroHook come `<p>` sopra l'H1). ✓
- §5 segnali tenuti → Task 2 banda 2. ✓
- §5 slot prova non renderizzato → Task 2 Step 3 (`proof = null`). ✓
- §5 rendermi inutile con meccanismo → Task 1 `pricingUnnecessary`. ✓
- §5 metodo sfrondato + tabella scenari tenuta → Task 1 `methodIntro`, Task 2 banda 4. ✓
- §5 no link in uscita pillar-card + un solo "Vedi i case study" → Task 2 Step 1 + banda 6. ✓
- §5 prezzi €1.200 visibile + €2.500 in details → Task 2 banda 5. ✓
- §5 disponibilità → `heroAvailability` (vuoto, condizionale) — contenuto = follow-up #2. ✓
- §5 scollegare rimborso da credito → `pricingStepSub` ("rimborsato... senza domande", niente "si scala se prosegui"). ✓
- §6 su-misura fuori pagina → Task 2 (rimossa) + Task 3 (verifica). ✓
- §7 ritocco home/bio → Task 4. ✓
- Smoke test → Task 5. ✓

**Placeholder scan:** `heroAvailability: ''` e `proof = null` sono slot *intenzionali* documentati come follow-up, non placeholder di implementazione (la copy e la struttura sono complete e funzionanti senza di essi). Nessun "TODO/TBD" nel codice.

**Type consistency:** `t.signals[]` è `{title, body}` (usato in banda 2). `proof` è `{headline, body} | null` (usato in banda 3). `pillarOrder` `why` è `{it, en}` (invariato). Chiavi `t.*` del template Task 2 tutte definite nel Task 1. ✓

---

## Execution Handoff

Vedi messaggio successivo per la scelta di esecuzione.
