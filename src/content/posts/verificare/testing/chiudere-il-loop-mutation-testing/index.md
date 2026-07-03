---
title: "Gli agenti scrivono i test. Chi controlla che funzionino davvero?"
date: 2026-07-10T09:00:00.000Z
description: "Gli LLM moltiplicano codice e test, ma più test verdi non significa più garanzie. Come il mutation testing diventa l'arbitro che lascia agli agenti chiudere il loop, e i primi numeri di produzione: Meta ACH e Just-in-Time testing."
pillar: verificare
category: testing
tags:
  - Mutation Testing
  - Testing
  - AI
  - LLM
  - Stryker
  - CI/CD
lang: it
draft: false
series: mutation-testing-ai
seriesOrder: 20
---

Nel post precedente ho raccontato la storia: coverage al 93%, test tutti verdi, un bug in produzione per tre settimane perché nessun test distingueva `Sum` da `Max`. Buona parte di quei test li avevano scritti gli agenti AI — ed è lì che si apre la domanda che voglio affrontare qui: il problema non è chi scrive i test, umano o agente, ma se qualcuno li mette alla prova.

C'è una parte del talk che ho aggiunto per l'edizione estesa a [DevRomagna 2026](/talks/il-tuo-collega-piu-produttivo/), ed è quella che guarda avanti. Non "come mi sono accorto del buco", ma: gli stessi agenti che hanno moltiplicato il codice — e con esso i test che sembrano coprire ma non verificano — possono chiudere loro stessi il loop? Non è una domanda retorica. Ci sono già numeri di produzione, e sono più recenti di quanto pensassi quando ho preparato le slide.

## Più codice, meno certezze

Gli LLM hanno moltiplicato quanto codice scriviamo, e con esso quanti test "sembrano" coprirlo. Il problema è sempre lo stesso descritto nel post precedente, solo a un ordine di grandezza più grande: più test verdi non significa più garanzie. Significa più superficie da rileggere, e nessuno rilegge davvero migliaia di test generati in un pomeriggio.

Il collo di bottiglia si è spostato. Prima era scrivere i test. Ora è **giudicarli**.

## La freccia che mancava

Il ciclo classico è aperto: scrivete una spec, un agente genera test da quella spec, uno strumento di mutation testing (Stryker, PIT, mutmut) produce un report con i mutanti *survived* — i punti dove i test non si accorgono di nulla. Poi il report finisce in un tab del browser, e in pratica nessuno lo rilegge riga per riga.

La chiusura del loop è semplice da descrivere: lo stesso agente che ha scritto i test legge anche il report dei survived, e li usa come prompt di ritorno per migliorarsi. Non è più "scrivi altri test", ma "copri esattamente questo caso, che il report ti ha appena indicato". È esattamente il workflow che Meta ha messo in produzione con il sistema **ACH (Automated Compliance Hardening)**.

## Mutanti che sanno di cosa hanno paura

Uno Stryker "classico" muta a tappeto: `+` diventa `-`, `>` diventa `>=`, `Sum` diventa `Max`. Sono mutazioni generiche, cieche rispetto al dominio.

ACH fa un passo diverso: un ingegnere descrive in linguaggio naturale un'area di rischio — privacy, sicurezza, compliance — e un LLM genera mutanti *specifici per quell'area*: `log(user.email)`, `skip(consent.check)`, `role.bypass()`. Poi un secondo modello filtra i mutanti equivalenti (sintassi diversa, comportamento identico — inutili da testare), e un terzo genera il test che uccide quelli rimasti. L'ingegnere umano non scrive niente: rivede.

Tra ottobre e dicembre 2024 Meta ha fatto un trial su Facebook, Instagram, WhatsApp e i dispositivi indossabili (Quest, Ray-Ban): su migliaia di mutanti e centinaia di test generati, gli ingegneri privacy ne hanno accettati il **73%**, e il **36%** di quelli accettati è stato giudicato effettivamente privacy-relevant — non copertura facile, ma proprio dove contava ([Meta Engineering Blog](https://engineering.fb.com/2025/09/30/security/llms-are-the-key-to-mutation-testing-and-better-compliance/), [InfoQ](https://www.infoq.com/news/2026/01/meta-llm-mutation-testing/)).

## Il problema irrisolto da trent'anni

C'è un limite teorico del mutation testing che non ho toccato nel post precedente: alcuni mutanti sono *equivalenti*. Cambiano la sintassi ma non il comportamento osservabile — nessun test potrà mai ucciderli, non perché la suite sia debole, ma perché non c'è niente da distinguere. Decidere se un mutante è equivalente è, in generale, indecidibile: si riduce all'halting problem.

Per trent'anni questo è stato affrontato con euristiche grossolane (confronto del bytecode compilato, analisi statica), con falsi positivi alti. Un paper ISSTA 2024 mostra che un modello fine-tuned su embedding di codice migliora il rilevamento degli equivalenti del **35,7%** in F1-score medio rispetto alle tecniche precedenti ([arXiv 2408.01760](https://arxiv.org/abs/2408.01760)). Il detector di ACH, con preprocessing basato su analisi statica, arriva a **0,95 di precision e 0,96 di recall** — da 0,79/0,47 senza preprocessing. Non è la soluzione teorica del problema. È la prima volta che smette di essere un ostacolo pratico.

## Perché conviene fidarsi del mutation score

Un mutation score più alto trova davvero più bug reali, o è solo un altro numero verde su una dashboard? Just et al. hanno risposto nel 2014 confrontando mutation score e capacità di rilevare bug storici reali su cinque progetti open source: correlazione **R² ≈ 0,70**. La line coverage, sugli stessi dati, resta intorno a **0,25**.

È il motivo per cui ha senso che sia proprio questo segnale — e non "il codice è stato eseguito" — a guidare un agente che rivede se stesso.

## Il passo successivo: test scritti mentre rivedete il codice

Cercando aggiornamenti più recenti ho trovato qualcosa che non era ancora uscito quando ho scritto le slide: ad aprile 2026 Meta ha esteso ACH con un sistema chiamato **Just-in-Time testing**, dentro un'architettura interna soprannominata "Dodgy Diff". Invece di mantenere una suite statica, genera test mirati durante la code review stessa: test che falliscono sulla modifica proposta ma passano sulla revisione precedente, combinando LLM, analisi del programma, mutation testing e un modello di rischio della modifica ([InfoQ](https://www.infoq.com/news/2026/04/meta-jit-testing-ai-detection/)).

I numeri: **4x** il bug detection rispetto ai test generati da un baseline, **20x** meno segnalazioni coincidentali (fallimenti che non indicano un vero difetto), oltre **22.000 test** valutati, **41 problemi** emersi e **8 confermati** come difetti reali con potenziale impatto in produzione.

Mark Harman, research scientist a Meta, l'ha detto meglio di come lo direi io: *"Mutation testing, after decades of purely intellectual impact, confined to academic circles, is finally breaking out into industry."* Dopo decenni da tecnica da paper accademico, sta diventando infrastruttura.

## La tesi

Il giudizio non sparisce. Si sposta. Prima la domanda "questo test è buono?" la decideva un umano, spesso a sensazione, guardando quanto è verde la dashboard. Ora un secondo sistema può porla con un criterio oggettivo e ripetibile — *questo mutante è killed o survived?* — e un agente può leggerne la risposta senza aspettare che tocchi a un umano scorrere un report.

Ma il loop si chiude perché c'è un arbitro esterno, formale, indipendente da chi ha scritto codice e test — non perché l'agente si fidi di sé stesso. Resta valido lo stesso principio che uso ogni volta che delego a un agente: deleghi l'esecuzione, mai il giudizio finale su cosa sia *corretto* per il dominio. Cambia solo chi legge il verdetto per primo.

## Cosa fare domani

Non serve l'infrastruttura di Meta per iniziare a chiudere il loop in piccolo. Lanciate il vostro strumento di mutation testing, prendete l'output dei survived (Stryker e PIT lo esportano anche in JSON) e passatelo a un LLM con un prompt strutturato: "questo mutante è equivalente o manca un test? Se manca, scrivilo." Non è ancora un prodotto maturo — sono workflow artigianali, cuciti a mano sopra tool che non hanno integrazione LLM nativa — ma iniziano a comparire progetti open source che provano a incollare questo layer sopra Stryker o PIT.

Il punto non è avere il loop perfetto dal primo giorno. È smettere di trattare il report come l'ultimo passo di una pipeline, e iniziare a trattarlo come l'input del prossimo.

---

*Ho approfondito questa parte per l'edizione del talk portata a [DevRomagna 2026](/talks/il-tuo-collega-piu-produttivo/). È la continuazione del [post precedente](/blog/verificare/testing/mutation-testing-oltre-la-coverage/): slide e codice demo sono pubblici su GitHub.*
