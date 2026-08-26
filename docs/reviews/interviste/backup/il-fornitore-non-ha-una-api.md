---
title: "Il fornitore non ha un'API. Il committente sì."
description: "Quando non esiste una chiamata ufficiale per aggiornare lo stato di un'applicazione, la si può inventare, ma serve una struttura diversa dal codice a cui serve."
type: case-study
pillar: progettare
pillarApplied: progettare
featured: true
weight: 1
eyebrow: "Analisi critica · software gestionale per laboratori di analisi"
tags: [Architettura, Integrazione, Documentazione, Automazione]
links: {}
oggetto: >
  Lo strumento di un cliente con diversi laboratori, scritto da un fornitore
  esterno che non espone un'API pubblica. Il sistema doveva aggiornare lo
  stato delle applicazioni in base ai risultati dei test.
metodo: >
  Documentare le chiamate esistenti senza spenderle, creare una schermata che
  mostri lo stato di avanzamento, e separare il codice che legge lo stato
  dal codice che lo modifica.
esito: >
  Le chiamate esistenti sono documentate, lo stato è visibile, e il codice
  può essere testato. Ma il risultato è diverso dal previsto: lo strumento
  è utile, ma non risolve il problema di chi deve aggiornare lo stato.
anonimizzazione: >
  Il prodotto è reale, il settore no. Il sistema è uno strumento interno,
  e le chiamate non sono ufficiali. Non è un'API pubblica: è una serie di
  chiamate che funzionano, ma che il fornitore non espone.
context: >
  Il fornitore non ha un'API. Non è un'assenza tecnica: è una scelta
  commerciale. Il prodotto funziona, i clienti lo usano, ma lo stato delle
  applicazioni non è accessibile dall'esterno. Non perché sia complicato,
  ma perché il fornitore non ha interesse a renderlo pubblico.
specs:
  - label: "Perimetro"
    value: "Lo stato delle applicazioni, non il prodotto"
  - label: "Fornitore"
    value: "Non espone un'API pubblica"
  - label: "Soluzione"
    value: "Documentare le chiamate esistenti e creare una schermata di stato"
  - label: "Fuori scope"
    value: "Aggiornare lo stato delle applicazioni"
decisions:
  - title: "Dove cercare lo stato"
    chosen: "Nelle chiamate esistenti, non in un'API che non esiste"
    chosenWhy: "Se il fornitore non espone un'API, la si può inventare, ma serve una struttura diversa."
    rejected: "Creare un'API pubblica"
    appeal: "È la soluzione naturale, ma il fornitore non la permette."
  - title: "Come mostrare lo stato"
    chosen: "Una schermata che mostri lo stato di avanzamento"
    chosenWhy: "Il committente vuole vedere lo stato, non aggiornarlo."
    rejected: "Un aggiornamento automatico"
    appeal: "È più comodo, ma richiede un'API che non esiste."
  - title: "Come separare il codice"
    chosen: "Separare il codice che legge lo stato dal codice che lo modifica"
    chosenWhy: "Il test può concentrarsi sulla lettura, non sulla modifica."
    rejected: "Un unico modulo che fa entrambe le cose"
    appeal: "È più semplice, ma meno testabile."
  - title: "Cosa testare"
    chosen: "Lo stato delle applicazioni, non il prodotto"
    chosenWhy: "Il prodotto è lo stesso ovunque, lo stato cambia."
    rejected: "Il prodotto in sé"
    appeal: "È ciò che il committente vuole verificare."
decisionsNote: >
  Le scelte non sono tecniche: sono commerciali. Il fornitore non espone un'API
  perché non ha interesse, e il committente vuole vedere lo stato perché deve
  dimostrare che il sistema funziona. La soluzione tecnica è un compromesso.
matrix:
  label: "Lo stato delle applicazioni"
  columns: ["Visibile", "Aggiornabile", "Testabile"]
  rows:
    - label: "Stato attuale"
      cells: [full, empty, empty]
    - label: "Stato desiderato"
      cells: [full, full, full]
    - label: "Stato raggiungibile"
      cells: [full, empty, full]
  legend:
    full: "possibile"
    partial: "possibile in parte"
    empty: "non possibile"
  caption: "Lo stato è visibile ma non aggiornabile: il fornitore non espone un'API per modificarlo."
sections:
  - n: "01"
    title: "Il fornitore non ha un'API"
    summary: "Non è un'assenza tecnica: è una scelta commerciale."
  - n: "02"
    title: "Le chiamate esistenti"
    summary: "Non sono ufficiali, ma funzionano."
  - n: "03"
    title: "La schermata di stato"
    summary: "Il committente vuole vedere lo stato, non aggiornarlo."
  - n: "04"
    title: "La separazione del codice"
    summary: "Leggere e modificare sono due cose diverse."
readingPaths:
  - label: "Per il committente"
    desc: "Lo stato è visibile, ma non aggiornabile. Il fornitore non ha interesse a rendere pubblico lo stato delle applicazioni."
  - label: "Per lo sviluppatore"
    desc: "Le chiamate esistenti sono documentate, ma non ufficiali. Il test può concentrarsi sulla lettura."
readingNote: >
  Il fornitore non ha un'API. Non è un'assenza tecnica: è una scelta
  commerciale. Il prodotto funziona, i clienti lo usano, ma lo stato delle
  applicazioni non è accessibile dall'esterno.
openItems:
  - "Le chiamate non sono ufficiali: il fortnitore potrebbe cambiarle in qualsiasi momento"
  - "Lo stato è visibile ma non aggiornabile: il committente non può fare nulla per modificarlo"
  - "Il test è limitato alla lettura: non può verificare che lo stato sia corretto"
  - "La schermata è utile, ma non risolve il problema di chi deve aggiornare lo stato"
cta:
  title: "Il fornitore non ha un'API. Il committente sì. Ma lo stato non è aggiornabile."
  desc: "Se il fornitore non ha interesse a rendere pubblico lo stato delle applicazioni, la soluzione non è tecnica: è commerciale."
thesis: >
  Il fornitore non ha un'API. Il committente sì. Ma lo stato non è aggiornabile.
  La soluzione non è tecnica: è commerciale.
---
