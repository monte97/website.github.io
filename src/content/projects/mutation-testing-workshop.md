---
title: "Workshop Mutation Testing: i tuoi test si accorgono dei bug?"
description: "La coverage dice quali righe esegui, non se i test reggono davvero. Il mutation testing inietta guasti nel codice e misura quanti ne catturano: dove i mutanti sopravvivono, lì il test è scenografia."
type: workshop
pillar: verificare
pillarApplied: verificare
problem: "I test passano e la coverage è alta, ma le regressioni arrivano comunque in produzione. La coverage misura quali righe vengono eseguite, non se i test si accorgerebbero di un cambiamento che rompe il comportamento. Un test che esegue una riga senza verificarne il risultato gonfia la percentuale e non protegge da niente."
context: "Sessione hands-on sul codice del team: si introduce il mutation testing su un modulo reale e si lavora sui mutanti sopravvissuti, non su esempi giocattolo."
featured: false
tags: ["Mutation Testing", "Test quality", "Coverage", "TDD", "CI"]
weight: 30
actions:
  - "Perché una coverage alta non garantisce test efficaci: cosa misura davvero e cosa le sfugge"
  - "Come funziona il mutation testing: mutanti, mutanti uccisi, mutanti sopravvissuti"
  - "Far girare il mutation testing su un modulo reale del team e leggere il report"
  - "Trasformare i mutanti sopravvissuti in test mancanti, e capire quando fermarsi (costo contro valore)"
  - "Integrarlo in CI senza far esplodere i tempi: dove conviene e dove la coverage basta"
result: "Il team esce sapendo distinguere un test che protegge da un test che fa solo passare la pipeline, e con un primo modulo coperto da test verificati col mutation testing. E con un criterio per decidere dove spingere la verifica e dove fermarsi."
---

Workshop hands-on sul mutation testing: la tecnica che verifica i test invece del codice. Si parte dai limiti della coverage, si introduce il mutation testing su un modulo reale del team e si lavora sui mutanti sopravvissuti per chiudere i buchi che la percentuale di coverage nasconde.
