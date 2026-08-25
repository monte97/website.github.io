---
title: "RED dice quando è rotto. USE dice perché."
date: 2025-07-26T09:00:00.000Z
description: "La media nasconde per costruzione la minoranza che sta male. Percentili, metodo RED, metodo USE, e la regola per usarli nell'ordine giusto."
pillar: verificare
category: testing
mode: explanation
tags:
  - Performance Testing
  - Monitoring
  - SRE
  - Metrics
  - Observability
lang: it
reviewed: false
series: performance-engineering
seriesOrder: 20
summary:
  - label: "Problema"
    value: "Il grafico della latenza media è piatto, gli utenti si lamentano lo stesso"
    note: "La media nasconde per costruzione la minoranza che sta peggio"
  - label: "Scelta"
    value: "Percentili al posto della media, poi RED e USE come due domande distinte"
  - label: "Segnali chiave"
    value: "RED sulla prospettiva del servizio, USE sulle risorse sottostanti"
    note: "Rate, Errors, Duration da un lato; Utilization, Saturation, Errors dall'altro"
  - label: "Risultato"
    value: "RED apre l'indagine e dice quando intervenire, USE la chiude e dice dove"
openItems:
  - "RED e USE coprono la latenza e la saturazione, non la correttezza: un sistema veloce che risponde male resta invisibile a entrambi"
  - "Il metodo USE presuppone di conoscere l'inventario delle risorse del sistema, e in un'architettura cresciuta per accumulo quell'inventario spesso non esiste"
  - "I percentili si calcolano su una finestra temporale: la stessa serie letta a un minuto o a un'ora racconta due storie diverse, e la scelta della finestra è una decisione"
  - "Nulla di quanto scritto qui dipende dallo strumento: la traduzione in PromQL, in dashboard e in soglie di alert è un altro lavoro"
---

Il grafico della latenza media è una linea piatta a 180 millisecondi. È piatta da settimane. Nello stesso periodo il supporto raccoglie segnalazioni di lentezza, sempre dagli stessi tre clienti.

Il grafico non sta mentendo: la media *è* 180 millisecondi. Sta facendo esattamente quello che una media fa, cioè nascondere la coda. Se il 97% delle richieste risponde in 90 millisecondi e il 3% in dodici secondi, la media resta buona e quel 3% è la tua casella di posta.

Da qui in avanti: perché i percentili risolvono questo, e due metodi — [RED](#red-le-tre-domande-dal-lato-del-servizio) e [USE](#use-le-tre-domande-dal-lato-della-risorsa) — che rispondono a due domande diverse e vanno usati in quest'ordine. Il pezzo precedente della serie, [Mille richieste al secondo non vogliono dire niente](/blog/verificare/testing/performance-senza-baseline/), è su cosa decidere prima di misurare.

## La media mente, i percentili no

Un percentile risponde a: *sotto quale valore sta questa frazione delle richieste?* Tre bastano.

- **p50**, la mediana: l'esperienza dell'utente tipico.
- **p90**: l'esperienza del 10% più lento.
- **p99**: l'esperienza dell'1% più lento.

Il salto fra p50 e p99 è l'informazione che la media distrugge. Un p50 a 90 millisecondi con un p99 a dodici secondi descrive un sistema in cui quasi tutti stanno bene e una minoranza stabile sta malissimo — che è una diagnosi completamente diversa da «il sistema è mediamente lento», e porta a interventi completamente diversi.

Ragionare per percentili cambia tre cose in concreto:

- **Gli SLO diventano scrivibili.** «Il p99 sotto i due secondi» è verificabile; «il sistema deve essere veloce» no.
- **Il degrado si vede prima.** Un problema che cresce si manifesta sul p99 settimane prima di spostare la media.
- **Segmentando per endpoint si trova dove intervenire.** Un p99 alto aggregato non dice niente; lo stesso p99 diviso per endpoint di solito indica un colpevole solo.

Il resto dell'articolo dà per scontato che si guardino distribuzioni, non medie.

## RED: le tre domande dal lato del servizio

Il metodo RED guarda il sistema da fuori, come lo vede chi lo usa. Tre metriche, tre domande.

**Rate — quanto viene usato?** Il conteggio delle richieste gestite: richieste HTTP per un servizio web, query per un database, messaggi consumati per una coda. Da solo dice poco, ma è il denominatore di tutto il resto: senza il rate non puoi sapere se un aumento degli errori è un peggioramento o solo più traffico.

![Il rate come fondamento delle altre misurazioni: il volume di richieste nel tempo contestualizza errori e latenza](imgs/red_rate.png)

**Errors — quante falliscono?** Ogni richiesta che si chiude con un risultato diverso da quello atteso, quale che sia il motivo: errore esplicito, timeout, risposta formalmente valida ma sbagliata. Va misurato in due modi insieme, perché rispondono a domande diverse: la **percentuale** dice quanto è grave rispetto al traffico, il **valore assoluto** dice quante persone si sono arrabbiate.

**Duration — quanto ci mettono?** È qui che vivono i percentili della sezione precedente.

RED risponde a: **cosa sta andando storto per chi usa il sistema?** È la metrica giusta su cui costruire gli alert, perché è l'unica che corrisponde a qualcosa che qualcuno sta subendo. Un alert su «CPU all'85%» sveglia qualcuno di notte per un sistema che magari funziona benissimo; un alert su «il p99 del checkout è sopra i tre secondi» sveglia qualcuno perché il checkout è lento.

## USE: le tre domande dal lato della risorsa

Il [metodo USE](https://www.brendangregg.com/usemethod.html) di Brendan Gregg guarda dall'altra parte: non il servizio, ma le risorse che lo reggono. La regola sta in una riga:

> For every resource, check utilization, saturation, and errors.

Il passo che si salta più spesso non è nessuno dei tre: è quello prima, cioè **stabilire quali sono le risorse.** CPU, memoria, dischi, rete, ma anche i limiti imposti — connection pool, thread pool, quote API, descrittori di file. Se l'inventario è incompleto, USE non troverà il collo di bottiglia: guarderà nel posto sbagliato con grande precisione.

**Utilization — quanto è impegnata?** La percentuale di tempo in cui la risorsa è occupata. Vicino al 100% è quasi sempre un collo di bottiglia. Ma anche valori più bassi ingannano, per due motivi: un valore aggregato su cinque minuti nasconde burst molto peggiori, e alcune risorse non sono interrompibili — un disco impegnato in un'operazione la finisce, e un'operazione più urgente si accoda comunque.

**Saturation — quanto lavoro non riesco a smaltire?** Il lavoro in eccesso che si accumula: lunghezza delle code, tempi di attesa, load average, uso dello swap, coda I/O del disco, richieste in attesa nel pool. È la metrica più diagnostica delle tre, e va letta con una soglia diversa: mentre per l'utilization il 70% è discutibile, **per la saturation qualsiasi valore diverso da zero è già un segnale.** Una risorsa può essere satura senza essere al 100% di utilizzo.

**Errors — quanto si rompe?** Errori a livello di risorsa: errori di rete, errori del file system, errori di I/O sui dischi. Non diventano subito errori applicativi, e per questo passano inosservati fino a quando non diventano un guasto. Il valore sta nel correlarli: errori di rete che salgono insieme all'utilizzo della rete raccontano una storia che nessuna delle due metriche racconta da sola.

![Il diagramma di flusso del metodo USE: per ogni risorsa si controllano in sequenza errori, utilizzo e saturazione per isolare il collo di bottiglia](imgs/usemethod_flow.png)

## La regola: RED apre l'indagine, USE la chiude

I due metodi non sono alternativi e non si sovrappongono. Rispondono a due domande in sequenza:

| | RED | USE |
|---|---|---|
| Guarda | il servizio | le risorse |
| Risponde a | **quando** e **quanto** è rotto | **perché** e **dove** |
| Serve per | alert e SLO | diagnosi |
| Lo vede | l'utente | l'infrastruttura |

L'ordine non è arbitrario, ed è la parte che vale la pena portarsi via:

**Si allerta su RED, si indaga con USE.** Un alert su una risorsa produce rumore, perché una risorsa carica non è un problema finché qualcuno non ne soffre. Un alert su RED corrisponde per costruzione a un utente che sta aspettando. Quando quell'alert scatta, USE dice dove guardare: quale risorsa è satura, quale sta accumulando errori.

Il caso interessante è quando la sequenza si rompe. **RED degrada e USE non mostra niente**: nessuna risorsa satura, nessun errore, eppure il p99 sale. Vuol dire che il collo di bottiglia non è in questo inventario — è a valle, in un servizio terzo, in un lock applicativo, in una dipendenza che non stai misurando. Quel silenzio è un'informazione, e senza aver guardato entrambi i lati non l'avresti.

![Dashboard USE: utilizzo, saturazione ed errori delle risorse infrastrutturali nel tempo](imgs/use_dashboard.png)

## Cosa costa non separarli

La ragione per cui questa distinzione vale il tempo di impararla è che si paga in ore di persona, e sempre nel momento peggiore.

Un team che allerta sulle risorse riceve notifiche per sistemi che funzionano, e dopo qualche settimana smette di guardarle — così quando arriva quella vera nessuno la vede. Un team che misura solo le risorse sa che un disco è pieno ma non sa quali clienti ne stanno soffrendo, e non può decidere cosa sistemare per primo. **Separare i due livelli è quello che permette di dire «questo tocca il 3% degli utenti sul checkout» invece di «la CPU è alta», che è la differenza fra una decisione di priorità e una discussione.**

## Cosa fare domani

Prendi il servizio da cui passano i soldi e mettici tre grafici: rate, percentuale di errore, p50/p90/p99 della latenza, tutti segmentati per endpoint. È RED, ed è mezza giornata.

Poi scrivi l'inventario delle risorse di quel servizio, i limiti imposti compresi. Non serve strumentarle subito: serve avere la lista pronta il giorno in cui il p99 sale e qualcuno deve decidere dove guardare.

Il primo alert mettilo sul p99 di un endpoint solo, quello che conta di più. Uno che scatta di rado e ha sempre ragione vale più di venti che nessuno legge.
