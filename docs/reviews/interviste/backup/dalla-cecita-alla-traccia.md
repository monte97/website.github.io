---
title: "Dalla cecità alla traccia"
description: "Il sistema stava bene: i controlli erano verdi. Il cliente no: non aveva idea di cosa succedesse quando il suo codice raggiungeva il nostro. Abbiamo smesso di controllare il prodotto e abbiamo cominciato a guardare cosa faceva il prodotto in uno scenario reale."
type: case-study
pillar: verificare
pillarApplied: verificare
featured: true
weight: 3
eyebrow: "Analisi critica · integrazione fra sistemi"
tags: [Observabilità, Testing, Distributed Tracing, Integrazione]
links:
  blog: "/blog/verificare/testing/mutation-testing-oltre-la-coverage/"
oggetto: >
  Un sistema che rispondeva alle richieste dei clienti e le smistava verso
  un fornitore esterno che faceva i calcoli. Nessuno dei due controllava
  cosa succedeva all'altro: i log erano separati, i test pure.
metodo: >
  Aggiungere un identificativo unico a ogni richiesta, propagarlo in entrata
  e in uscita, e fare in modo che il cliente potesse verificarlo senza dover
  chiedere a noi. Non il tracing completo: il minimo indispensabile.
esito: >
  Il cliente ha iniziato a richiedere la traccia nelle sue richieste. I test
  hanno cominciato a scrivere storie di integrazione complete, e i problemi
  si sono fermati prima di arrivare al cliente.
anonimizzazione: >
  Il prodotto è reale, il fornitore no. Gli attori e i sistemi sono quelli
  veri, i nomi no. La scena è reale, il luogo è anonimo. I testi di
  riferimento sono liberi da licenze.
context: >
  Il nostro sistema smistava le richieste verso un fornitore esterno. I due
  sistemi non si parlavano: i log erano separati, i test pure. Il cliente
  non sapeva cosa succedesse quando il suo codice raggiungeva il nostro, e
  noi non sapevamo cosa succedesse quando il nostro raggiungeva il fornitore.
specs:
  - label: "Perimetro"
    value: "L'integrazione fra i due sistemi"
  - label: "Problema"
    value: "Nessuno dei due controllava cosa succedesse all'altro"
  - label: "Soluzione"
    value: "Un identificativo unico propagato in entrata e in uscita"
  - label: "Risultato"
    value: "Il cliente ha cominciato a richiedere la traccia"
decisions:
  - title: "Cosa tracciare"
    chosen: "Solo l'integrazione, non il prodotto"
    chosenWhy: "Il prodotto funzionava: a mancare era la visibilità sull'integrazione."
    rejected: "Il tracing completo del sistema"
    appeal: "È la soluzione completa, ma troppo complessa per il momento."
  - title: "Come propagare la traccia"
    chosen: "Un identificativo unico, leggero, propagato in entrata e in uscita"
    chosenWhy: "Il cliente doveva poterlo verificare senza chiedere a noi."
    rejected: "Un sistema di logging centralizzato"
    appeal: "È più potente, ma richiede infrastruttura che non avevamo."
  - title: "Dove mettere la traccia"
    chosen: "Nelle richieste del cliente, non nei nostri log"
    chosenWhy: "Il cliente doveva poterla cercare senza dipendere da noi."
    rejected: "Solo nei nostri log interni"
    appeal: "È più semplice, ma non risolve il problema del cliente."
  - title: "Cosa testare"
    chosen: "Le storie di integrazione complete, non i singoli moduli"
    chosenWhy: "I problemi si fermavano prima di arrivare al cliente."
    rejected: "I test unitari del prodotto"
    appeal: "Già esistenti, già verdi, già inutili per questo scopo."
decisionsNote: >
  Le scelte non sono tecniche: sono priorità. Il cliente non chiedeva il
  tracing completo: chiedeva di sapere cosa fosse successo. La traccia
  minima è quella che risponde alla domanda del cliente.
matrix:
  label: "Visibilità sull'integrazione"
  columns: ["Prima", "Dopo"]
  rows:
    - label: "Log separati"
      cells: [empty, full]
    - label: "Traccia unica"
      cells: [empty, full]
    - label: "Test di integrazione"
      cells: [partial, full]
  legend:
    full: "presente"
    partial: "presente in parte"
    empty: "assente"
  caption: "Prima non c'era nessuna visibilità: dopo, il cliente poteva tracciare la richiesta da solo."
sections:
  - n: "01"
    title: "Il sistema stava bene. Il cliente no."
    summary: "I controlli erano verdi, ma il cliente non sapeva cosa succedesse."
  - n: "02"
    title: "Le tracce che non esistevano"
    summary: "Nessuno dei due sistemi controllava cosa succedesse all'altro."
  - n: "03"
    title: "L'identificativo unico"
    summary: "Un id leggero, propagato in entrata e in uscita."
  - n: "04"
    title: "Il cliente che chiede la traccia"
    summary: "Quando il cliente comincia a richiederla, la traccia funziona."
  - n: "05"
    title: "Le storie di integrazione"
    summary: "I test hanno cominciato a raccontare storie complete."
readingPaths:
  - label: "Per il cliente"
    desc: "Non serviva il tracing completo: bastava sapere cosa fosse successo con la sua richiesta."
  - label: "Per lo sviluppatore"
    desc: "La traccia minima è quella che risponde alla domanda del cliente, non quella che copre tutto."
readingNote: >
  Il cliente non chiedeva il tracing completo: chiedeva di sapere cosa fosse
  successo. La traccia minima è quella che risponde alla domanda del cliente.
openItems:
  - "La traccia non copre tutto: copre solo l'integrazione"
  - "Il fornitore potrebbe cambiare le chiamate in qualsiasi momento"
  - "Le storie di integrazione non si auto-aggiornano"
  - "Il cliente ha cominciato a richiedere la traccia, ma non tutti la usano"
cta:
  title: "Il sistema risponde verde. Il cliente non ha idea di cosa succeda quando il suo codice raggiunge il vostro."
  desc: "Non serve il tracing completo: serve un identificativo che il cliente possa cercare senza chiedere a voi."
thesis: >
  Il sistema stava bene: i controlli erano verdi. Il cliente no: non aveva
  idea di cosa succedesse quando il suo codice raggiungeva il nostro.
  Abbiamo smesso di controllare il prodotto e abbiamo cominciato a guardare
  cosa faceva il prodotto in uno scenario reale.
---
