---
title: "Mille richieste al secondo non vogliono dire niente"
seoTitle: "Performance: un numero senza baseline"
date: 2025-07-26T08:00:00.000Z
description: "Un test di carico che passa non dice che il sistema regge: senza baseline e senza contesto di progetto, un numero di performance è vero e inutile."
pillar: verificare
category: testing
mode: explanation
tags:
  - Performance Testing
  - Monitoring
  - SRE
  - Metrics
lang: it
reviewed: false
series: performance-engineering
seriesOrder: 10
summary:
  - label: "Problema"
    value: "Il test di carico passa e gli utenti si lamentano lo stesso"
    note: "Il numero è corretto: manca il termine di paragone che lo rende leggibile"
  - label: "Scelta"
    value: "Baseline prima dei test, criteri di accettazione dal business"
    note: "Il tool non sa quale latenza sia accettabile per il tuo prodotto"
  - label: "Costo reale"
    value: "Uno scenario che non somiglia all'uso reale produce numeri veri e inutili"
  - label: "Risultato"
    value: "Le tipologie di test smettono di essere una tassonomia e diventano una scelta"
openItems:
  - "La baseline invecchia: cambia il codice, cambiano i dati, cambia l'infrastruttura, e un confronto contro una misura di sei mesi fa dice poco"
  - "Definire i criteri di accettazione richiede qualcuno che conosca il valore di business della funzionalità: non è una decisione che il team di sviluppo può prendere da solo"
  - "L'articolo non copre strumenti né configurazioni: k6, JMeter, Gatling e Locust hanno vincoli propri che cambiano le scelte"
  - "Su un sistema già in produzione la baseline si può leggere dal traffico reale, ed è più affidabile di qualunque simulazione: qui si parla del caso in cui quel traffico non c'è ancora"
---

Il test di carico è passato. Mille richieste al secondo, nessun errore, latenza media 180 millisecondi. Il report è verde, si rilascia.

Due settimane dopo il supporto raccoglie le stesse tre lamentele: «l'export è lentissimo», «a fine mese non si riesce a lavorare», «da mobile non carica».

Nessuno ha sbagliato la misura. Mille richieste al secondo è un numero corretto. Il problema è che non è **una misura**: è un numero senza il termine di paragone che lo renderebbe leggibile. Non sappiamo se sia meglio o peggio di ieri, se sia abbastanza per il traffico vero, né se quelle mille richieste somiglino a quello che gli utenti fanno davvero.

Questo articolo è sul lavoro che viene prima di lanciare il test. Il successivo, [RED dice quando è rotto, USE dice perché](/blog/verificare/testing/red-use-quando-e-perche/), è su come si leggono i numeri una volta che li hai.

## Un numero da solo non è una misura

Una misura è un numero **più un riferimento**. Senza riferimento hai statistica, non diagnostica.

Il riferimento può essere di tre tipi, in ordine di affidabilità decrescente:

- **Il traffico reale**, se il sistema è già in produzione. È il migliore: non lo stai simulando, lo stai osservando.
- **La baseline**, cioè la misura delle condizioni *as-is* fatta apposta prima di cambiare qualcosa. Serve a due cose: dire se un'ottimizzazione ha funzionato, e accorgersi di una regressione futura.
- **Il requisito**, quando esiste. Raramente esiste in una forma utilizzabile.

Senza nessuno dei tre, il risultato del performance testing non è bianco o nero: va interpretato, e interpretare senza riferimento significa decidere a naso quale numero sia preoccupante.

**La baseline va presa prima**, non dopo il primo problema. Presa dopo è contaminata: stai misurando un sistema che qualcuno ha già toccato di fretta, e non sai più cosa stai confrontando.

## Il tool non sa cosa sia accettabile

La seconda metà del problema è che il numero, anche con un riferimento, non dice se va bene.

Nessuno strumento può saperlo. k6 non sa che il tuo p99 sull'export può stare a otto secondi perché è un'operazione che l'utente lancia e poi va a prendere un caffè, mentre sulla ricerca a tendina trecento millisecondi sono già troppi. Quella distinzione non sta nel codice né nell'infrastruttura: sta nel prodotto.

Da qui la parte scomoda: **i criteri di accettazione devono venire da chi conosce il valore di business della funzionalità.** Non è una decisione che il team di sviluppo può prendere per conto proprio, e non è una decisione che si può rimandare al momento in cui il report è già verde — a quel punto il numero c'è già e la soglia si adatta al numero.

La domanda da portare a quella conversazione non è «quanto deve essere veloce». È: *cosa succede al business quando questa operazione impiega dieci secondi invece di uno?* La risposta produce una soglia difendibile; «il più veloce possibile» no.

## Lo scenario deve somigliare all'uso reale

C'è un modo di ottenere numeri perfettamente veri e completamente inutili: testare uno scenario che nessuno esegue.

Simulare un milione di utenti concorrenti quando ne hai trecento è il caso più visibile, ma non il più frequente. I più frequenti sono più insidiosi:

- **Il dataset sbagliato.** Il database di test ha diecimila righe, quello di produzione ne ha undici milioni. Le query che passano nel primo sono le stesse che vanno in timeout nel secondo.
- **La distribuzione sbagliata.** Il test colpisce tutti gli endpoint uniformemente. Il traffico vero è concentrato su tre, e uno dei tre è quello lento.
- **Il momento sbagliato.** Il carico arriva su un sistema a riposo. In produzione arriva mentre gira il backup notturno o mentre un deploy sta ricreando i container.
- **L'utente sbagliato.** Tutte le richieste sono dello stesso tenant, con la stessa cache calda. In produzione ogni tenant è una cache fredda.

Nessuno di questi rende il test *sbagliato*. Lo rende *risposta a una domanda che nessuno aveva fatto*.

## Le tipologie di test sono una conseguenza, non una tassonomia

A questo punto la distinzione fra i tipi di test smette di essere una lista da imparare e diventa la scelta della domanda:

| Domanda | Test |
|---|---|
| Regge il carico che ci aspettiamo? | Load test, dentro i limiti progettuali |
| Cosa si rompe per primo quando il carico va oltre? | Stress test, deliberatamente oltre le stime |
| È più lento di ieri? | Confronto contro baseline, in CI |
| Regge il carico atteso per otto ore di fila? | Soak test, dove emergono i memory leak |

Sono domande diverse e producono numeri non confrontabili. Uno stress test che "fallisce" ha avuto successo: ha trovato il punto di rottura. Un load test che fallisce è un problema. Se non sai quale dei due stai facendo, non sai nemmeno come leggere il risultato.

## Perché conviene farlo prima

Vale la vecchia regola dello *shift-left*: più tardi emerge un problema di performance, più costa. Ma per le performance c'è un aggravante rispetto a un bug funzionale.

Un bug funzionale si isola: c'è un input che produce l'output sbagliato, si riproduce, si corregge. Un problema di performance in produzione spesso non è *un* problema: è una query, più una cache che non c'è, più un indice mancante, più una scelta di architettura fatta due anni fa. E l'unica finestra in cui puoi cambiare quella scelta di architettura è prima di costruirci sopra.

È qui che sta il ponte con il resto dell'organizzazione: **una baseline presa prima della prima riga di codice costa mezza giornata, mentre scoprire a sistema costruito che la latenza non regge il carico atteso costa una riprogettazione — con il team fermo e la data di rilascio già comunicata al cliente.**

## Cosa fare prima del prossimo test

Tre cose, in ordine, e nessuna richiede uno strumento:

1. **Scrivi il riferimento.** Se il sistema è in produzione, leggi il traffico reale. Se non lo è, misura le condizioni attuali e salvale con la data e la versione.
2. **Porta una soglia a chi conosce il prodotto.** Non «quanto deve essere veloce», ma «cosa succede se ci mette dieci secondi». Scrivi la risposta accanto alla soglia.
3. **Descrivi lo scenario prima di implementarlo.** Quanti utenti, quali endpoint, con che dati, in che condizioni del sistema. Se non lo sai scrivere in cinque righe, il test misurerà qualcos'altro.

Poi si può lanciare. Il pezzo successivo della serie, [RED dice quando è rotto, USE dice perché](/blog/verificare/testing/red-use-quando-e-perche/), è su cosa guardare nei numeri che escono.
