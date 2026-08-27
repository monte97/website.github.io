---
title: "I test E2E non sono fragili. Il protocollo lo era."
seoTitle: "Playwright e la fine dei test flaky"
date: 2025-11-17T09:00:00.000Z
description: "La flakiness dei test E2E non è mancanza di disciplina: è il protocollo con cui il test parla al browser. Auto-waiting, WebSocket, parallelizzazione."
pillar: verificare
category: testing
mode: explanation
tags:
  - Playwright
  - Testing
  - E2E
  - Automazione
  - CI/CD
lang: it
reviewed: false
series: playwright
seriesOrder: 10
reproducibility: true
summary:
  - label: "Problema"
    value: "I test E2E tradizionali sono fragili, lenti e costosi"
    note: "Falsi positivi, falsi negativi e ore perse su fallimenti non riproducibili"
  - label: "Scoperta"
    value: "La fragilità non è disciplina mancante: è il protocollo fra test e browser"
    note: "WebDriver parla HTTP a comandi separati, Playwright tiene una connessione WebSocket aperta"
  - label: "Strumento"
    value: "Playwright, con auto-waiting e assertion che riprovano fino al timeout"
    note: "Cinque controlli prima di ogni azione, senza un solo sleep esplicito"
  - label: "Risultato"
    value: "100 test passano da 10 a 2.5 minuti con 4 worker"
    note: "Nessuna modifica ai test: ogni worker ha un contesto browser isolato"
openItems:
  - "Il mobile è coperto per emulazione: viewport, user agent ed eventi touch. Le app native e i browser mobili reali restano fuori"
  - "Il vantaggio di protocollo si è ridotto: Selenium 4 ha introdotto WebDriver BiDi, che è anch'esso basato su WebSocket"
  - "L'auto-waiting elimina i timing bug, non quelli di stato condiviso fra test: quelli restano un problema di progettazione della suite"
  - "Su una suite Selenium esistente il costo della migrazione è reale e va messo a bilancio contro la flakiness che si sta pagando oggi"
openNote: "Dove questa scelta smette di essere ovvia."
figures:
  - kind: flow
    at: il-protocollo-è-la-differenza
    label: "Il canale fra test e browser"
    caption: "WebDriver chiede un comando alla volta e resta cieco fra l'uno e l'altro; Playwright tiene la connessione aperta e riceve gli eventi del DOM mentre accadono"
    nodes:
      - kind: "WebDriver"
        name: "Un comando, una richiesta HTTP"
        desc: "Trova l'elemento, poi cliccalo, poi leggi il testo: ogni comando è un round trip completo. Fra l'uno e l'altro il test non sa cosa sta facendo la pagina."
        edge: "la finestra cieca dove vivono le race condition"
      - kind: "Il sintomo"
        name: "sleep(5000)"
        desc: "L'attesa a caso è l'unico rimedio disponibile: troppo corta e il test fallisce, troppo lunga e la suite si trascina."
        edge: "cosa cambia se il canale cambia"
      - kind: "Playwright"
        name: "WebSocket aperto e bidirezionale"
        desc: "Il test non interroga il browser a intervalli: riceve gli eventi del ciclo di vita della pagina mentre accadono."
        key: true
        edge: "conseguenza, non feature"
      - kind: "Il risultato"
        name: "Auto-waiting"
        desc: "I cinque controlli prima di ogni azione non sono un polling appiccicato sopra un'API lenta: sono la conseguenza di sapere in tempo reale cosa succede nel DOM."
---

Test che passano al terzo tentativo. `sleep(5000)` disseminati nel codice. Suite che girano venti minuti e falliscono in modo non deterministico, sempre su un test diverso.

Chi ha mantenuto una suite end-to-end conosce la sequenza, e conosce anche la spiegazione che le si dà di solito: i test E2E sono fragili per natura, tocca conviverci, aggiungi un retry e vai avanti.

Non è vero. La fragilità di quei test non è una proprietà del testing end-to-end: è una conseguenza di **come il test parla al browser**. Cambiando quel canale, gran parte dei sintomi sparisce senza toccare una riga di logica di test.

> Questo articolo approfondisce l'overview pubblicata su TheRedCode, [Testing E2E: perché iniziare con Playwright](https://theredcode.it/testing/testing-e2e-perche-iniziare-con-playwright/). Il codice degli esempi è su [monte97/workshop-playwright](https://github.com/monte97/workshop-playwright).

## Perché i test E2E stanno in cima alla piramide

Nella [Test Automation Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) i test end-to-end stanno in alto, e ci stanno per un motivo preciso: sono i più costosi da scrivere, i più lenti da eseguire e i più fragili da mantenere.

![La Test Automation Pyramid: i test end-to-end occupano il vertice, i più costosi e i meno numerosi, sopra i test di integrazione e la base dei test unitari](imgs/test-pyramid.png)

Si tengono comunque, perché sono gli unici che verificano il percorso intero — dall'interfaccia al database, attraverso ogni servizio che sta in mezzo. Un test unitario non vi dirà mai che il checkout è rotto perché il frontend manda un campo che il backend ha rinominato.

Il problema è che dei tre costi — scrittura, esecuzione, manutenzione — **il terzo è quello che uccide le suite.** Nessuno abbandona i test E2E perché sono lenti. Li abbandona quando smette di credere ai loro fallimenti.

## I cinque controlli prima di ogni click

La fragilità arriva quasi sempre dallo stesso posto: una race condition fra il test che agisce e il browser che non ha ancora finito. Il rimedio tradizionale è aspettare a caso — `sleep(5000)` — che è la definizione di un test non deterministico: troppo corto e fallisce, troppo lungo e la suite si allunga.

Playwright toglie il problema alla radice. Prima di eseguire un'azione verifica cinque condizioni:

1. il selettore identifica **un solo** elemento
2. l'elemento è **visibile** — non `display: none`, non `visibility: hidden`
3. l'elemento è **stabile**, cioè non in movimento o in animazione
4. l'elemento **non è coperto** da altri elementi
5. l'elemento **non è disabilitato**

```javascript
import { test, expect } from '@playwright/test';

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  // nessun wait esplicito: i cinque controlli girano prima del click
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
```

I controlli si ripetono con retry fino al timeout dell'azione, che di default eredita il timeout globale del test — 30 secondi. Lo stesso vale per le assertion: `toBeVisible()` non fotografa lo stato in un istante, lo verifica ripetutamente finché non è vero o finché il tempo non scade.

La differenza pratica: un `sleep(5000)` aspetta cinque secondi sempre, anche quando l'elemento era pronto dopo cinquanta millisecondi. L'auto-waiting aspetta esattamente quanto serve, e fallisce solo quando c'è davvero qualcosa che non va.

## Il protocollo è la differenza

Qui sta la parte che spiega perché non è un dettaglio di libreria.

Il modello classico di WebDriver è a comandi separati: il test manda una richiesta HTTP per ogni operazione — trova l'elemento, poi cliccalo, poi leggi il testo — e ogni richiesta è un giro completo di rete. Fra un comando e l'altro il test non sa cosa stia facendo la pagina. È in quella finestra che vivono le race condition.

Playwright usa protocolli specifici per ciascun motore — Chromium, Firefox, WebKit — tutti su **WebSocket**, con una connessione aperta e bidirezionale. Anche su Chromium non usa direttamente il Chrome DevTools Protocol, ma un [protocollo proprio](https://playwright.dev/docs/api/class-cdpsession) che opera a un livello più basso.

Il canale aperto è ciò che rende possibile l'auto-waiting: il test non interroga il browser a intervalli, **riceve** gli eventi del ciclo di vita della pagina mentre accadono. I cinque controlli della sezione precedente non sono un ciclo di polling messo sopra a un'API lenta: sono la conseguenza naturale di sapere in tempo reale cosa sta succedendo nel DOM.

**È il motivo per cui la flakiness cala senza che nessuno cambi il modo di scrivere i test.** Non è disciplina: è che il canale attraverso cui il test guarda la pagina ha smesso di essere cieco fra un comando e l'altro.

Va detta anche l'altra metà: **il vantaggio si sta riducendo.** Selenium 4 ha introdotto WebDriver BiDi, anch'esso basato su WebSocket, proprio per colmare questa distanza. Chi valuta oggi una migrazione dovrebbe pesare quanto di quel divario resterà fra due anni.

## Quattro worker, dieci minuti che diventano due e mezzo

Il secondo costo — l'esecuzione — si affronta in modo più banale, ma con un vincolo che vale la pena capire.

Playwright esegue i test in parallelo su più worker, e ogni worker ottiene un **contesto browser isolato**: cookie, storage e sessione separati. Non è una comodità, è ciò che rende la parallelizzazione sicura: senza isolamento, due test concorrenti che scrivono nello stesso `localStorage` si rompono a vicenda in modo non riproducibile — cioè producono esattamente la flakiness che stavamo togliendo.

Su una suite di 100 test: **da ~10 minuti con un worker a ~2.5 minuti con quattro.** Nessuna modifica ai test.

In CI, lo sharding spinge oltre: la suite si divide su più macchine e i report si ricompongono a valle. Il tema è trattato per intero in [CI/CD e strategie avanzate](/blog/verificare/testing/03-cicd-strategie-avanzate/).

Il numero da tenere è quello di prima, non questo: **la parallelizzazione riduce il tempo, l'auto-waiting riduce le volte in cui quel tempo viene sprecato.** Una suite veloce e inaffidabile resta inutile.

## Quando non è la scelta giusta

Tre casi in cui la risposta non è Playwright:

- **App native, o browser mobili reali.** Il supporto mobile è per emulazione — viewport, user agent, eventi touch — e va benissimo per verificare un layout responsive. Non è un dispositivo vero, e non lo sostituisce.
- **Una suite Selenium grande e stabile.** Se la flakiness che state pagando è bassa, il costo della migrazione non si ripaga. La domanda da farsi non è quale framework sia migliore, ma quante ore al mese vi costa oggi il retry cieco.
- **Requisiti di supporto commerciale.** Playwright è open source e il supporto è la community. Se il vostro processo richiede un contratto, va verificato prima e non dopo.

## Cosa cambia per chi paga

I test E2E si abbandonano quando il team smette di credere ai loro fallimenti — e da quel momento la suite continua a costare tempo di CI senza produrre nessuna informazione. **Rendere i fallimenti credibili è quello che riporta i test a essere un filtro invece che un rumore da ignorare prima del rilascio**, ed è la differenza fra scoprire una regressione in pipeline e scoprirla da un cliente.

## Da dove partire

Uno solo, il percorso che se si rompe ve ne accorgete dal fatturato: login, carrello, checkout. Scrivetelo senza un singolo wait esplicito e fatelo girare venti volte in CI. Se passa venti volte su venti, avete un metro nuovo per giudicare tutti gli altri.

Il resto della serie parte da lì: [correlare un test fallito con la trace del backend](/blog/verificare/testing/02-opentelemetry-trace-correlation/), [mockare la rete](/blog/verificare/testing/04-network-mocking/), [inseguire i test flaky](/blog/verificare/testing/07-flaky-debugging/), [organizzare la suite col Page Object Model](/blog/verificare/testing/09-page-object-model/).
