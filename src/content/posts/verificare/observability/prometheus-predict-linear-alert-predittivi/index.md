---
title: "Quale alert per quale risorsa"
seoTitle: "predict_linear: cinque casi, quattro trappole"
date: 2026-04-16T09:00:00.000Z
description: "Cinque esempi PromQL dal TLS al connection pool, le quattro trappole della regressione lineare, e dieci risorse con l'alert che serve a ciascuna."
pillar: verificare
category: observability
tags:
  - Prometheus
  - Observability
  - Alerting
  - SRE
  - PredictLinear
  - PromQL
lang: it
reviewed: machine
series: saturation-alerting
seriesOrder: 20
reproducibility: true
summary:
  - label: "Problema"
    value: "Rendere predittivo tutto per default è un anti-pattern"
    note: "L'alert giusto è quello che corrisponde alla scala temporale del problema"
  - label: "Casi"
    value: "Cinque esempi PromQL, dal certificato TLS al connection pool"
    note: "Uno è un contro-esempio: la risposta giusta è una soglia statica"
  - label: "Trappole"
    value: "Crescita non lineare, finestra troppo corta, pattern ciclici, soglie non time-aware"
    note: "La finestra storica dovrebbe essere almeno un quarto dell'orizzonte"
  - label: "Regola"
    value: "Predittivo se il time-to-saturation è ore o giorni, reattivo se sono secondi"
openItems:
  - "La query sulla quota mensile è pseudocodice didattico: PromQL non ha `days_until_month_end()` e in produzione serve una recording rule o una metrica custom"
  - "Per le metriche con ciclo giornaliero serve una finestra di almeno 24 ore o un modello con stagionalità esplicita come Holt-Winters o Prophet"
  - "La tabella copre dieci risorse comuni: è un punto di partenza per ragionare sui casi reali, non un catalogo esaustivo"
openNote: "Dove il modello lineare smette di valere, e cosa la tabella non copre."
mode: how-to
---

Il caso del disco che si riempie è l'esempio da manuale, ed è anche quello che fa più danni: dà l'impressione che `predict_linear` sia un martello da usare ovunque ci sia una risorsa che cresce.

Non è così. Ci sono risorse per cui la predizione è perfetta, risorse per cui è la scelta sbagliata, e risorse per cui la predizione è già dentro la metrica e non serve estrapolare niente. Sbagliare famiglia produce due sintomi diversi: alert che scattano per episodi irrilevanti e diventano rumore, oppure alert che scattano quando il problema è in corso da minuti.

[Il pezzo precedente](/blog/verificare/observability/use-golden-signals-saturation/) ha stabilito perché il trend risponde a una domanda diversa dallo stato. Questo risponde alla domanda operativa che viene dopo: **per questa risorsa specifica, quale alert serve davvero?**

## Cinque casi reali, dal più reattivo al più predittivo

Il caso del disco che si riempie è l'esempio da manuale, ma rischia di dare l'impressione che `predict_linear` sia un martello monouso. In realtà lo spettro di casi reali è molto più ampio, e include scenari in cui la funzione è perfetta, scenari in cui è la scelta sbagliata, e scenari in cui la predizione è già incapsulata nella metrica stessa. Seguono cinque esempi che coprono questo spettro, dal più reattivo al più predittivo.

### Il certificato TLS non ha bisogno di predict_linear

```promql
(probe_ssl_earliest_cert_expiry - time()) / 86400 < 7
```

Questo è il caso predittivo per eccellenza, ma vale la pena notare una cosa: **non c'è `predict_linear`**. Il motivo è che la metrica `probe_ssl_earliest_cert_expiry`, esposta dal `blackbox_exporter`, è già definita come "timestamp Unix della scadenza più vicina". Sottraendo `time()` (l'istante corrente) e dividendo per 86400 (i secondi in un giorno) si ottengono i giorni rimanenti prima della scadenza. La forma più pulita di alert predittivo non richiede estrapolazione: è semplice aritmetica tra due timestamp. Il "predittivo" in questo caso vive nella metrica stessa, non nella query, ed è tipicamente il pattern da preferire quando la metrica lo consente: meno assunzioni, meno modelli, meno modi di sbagliare.

### Memory leak progressivo nella JVM

```promql
predict_linear(jvm_memory_used_bytes{area="heap"}[6h], 2 * 3600)
  > on(instance) jvm_memory_max_bytes{area="heap"}
```

I nomi `jvm_memory_used_bytes` e `jvm_memory_max_bytes` con label `area="heap"` sono quelli esposti da Micrometer (Spring Boot Actuator) ed equivalenti, ed è il pattern più comune in produzione su stack JVM moderni. La finestra è lunga (sei ore di storia) deliberatamente, per filtrare il rumore dei cicli di garbage collection che fanno "respirare" l'heap su e giù con oscillazioni anche notevoli. Una finestra corta verrebbe dominata da quelle oscillazioni e produrrebbe una pendenza molto rumorosa; sei ore catturano il trend di fondo, che è quello rilevante per individuare un leak progressivo. La proiezione a due ore dà tempo sufficiente a un oncall in turno diurno di aprire un ticket, coordinare un restart pianificato e intervenire senza drammi prima che la JVM finisca in OOM. La join `on(instance)` è critica: accoppia ogni `jvm_memory_used_bytes` con il `jvm_memory_max_bytes` della stessa istanza, senza la quale Prometheus rifiuta l'operazione perché i due vettori hanno label set diversi. Nota importante: questa è la versione "production realistica". [Il demo del pezzo precedente](/blog/verificare/observability/use-golden-signals-saturation/) usa una metrica custom `jvm_heap_used_bytes` (senza label `area`) e una finestra molto più corta per essere osservabile in pochi minuti anziché ore.

### Quota API mensile

```promql
# Pseudocodice: predict_linear su finestra 24h proiettata fino a fine mese
predict_linear(api_calls_total[24h], 7 * 86400) > monthly_quota
```

Caso classico per integrazioni con servizi tipo Stripe, Twilio, OpenAI, o qualsiasi provider che fattura in base a un budget mensile di chiamate. L'ultima cosa che si vuole è scoprire alle 23:00 del 28 del mese di aver esaurito il budget, con il servizio che smette di funzionare fino al primo del mese successivo. Avvertenza tecnica importante: **PromQL non ha una funzione `days_until_month_end()` built-in**, quindi la query mostrata sopra è una semplificazione didattica. Per fare la cosa giusta in produzione ci sono due opzioni:

- una **recording rule** che calcola `days_to_month_end` usando `month()`, `day_of_month()` e aritmetica giorno per giorno, poi riusata come scalar nella query di alert
- una **metrica esposta dall'applicazione stessa** (ad esempio `billing_period_seconds_remaining`) che incapsula la logica del periodo di fatturazione lato producer, spostando il problema fuori da Prometheus

L'esempio qui sopra usa un orizzonte fisso a sette giorni per semplicità, ma la query reale in produzione dipende dalla recording rule o dalla metrica custom scelta per esporre il periodo residuo.

### Kafka consumer lag: conta la pendenza, non il valore

```promql
deriv(kafka_consumergroup_lag[15m]) > 1000 / 60
```

Qui `deriv()` fa un lavoro migliore di `predict_linear`, ed è istruttivo capire perché. L'informazione rilevante per un consumer Kafka non è il valore assoluto del lag fra due ore, ma il **tasso di crescita sostenuto**: se il lag cresce costantemente di mille messaggi al minuto (circa sedici al secondo), c'è un problema strutturale di capacità del consumer anche partendo da numeri bassi, e il problema peggiorerà finché nessuno interviene. La regola scatta quando la pendenza della retta di regressione su quindici minuti supera sedici messaggi al secondo, sostenuta nel tempo. La predizione qui è implicita: un trend è già una predizione, semplicemente espressa come pendenza invece che come valore estrapolato.

### Il connection pool si satura in secondi, e vuole una soglia

```promql
(db_connection_pool_active / db_connection_pool_max) > 0.9
```

Nessuna predizione, nessuna funzione `predict_linear`, nessun trend: solo una soglia statica sullo stato corrente. Il motivo è operativo: un connection pool si satura in secondi, non in ore, e l'unico alert utile è "sta succedendo adesso, intervenire subito". Non c'è una finestra di intervento da anticipare: quando il rate di richieste salta improvvisamente, il pool si riempie più veloce di qualsiasi `predict_linear[5m]` con un orizzonte sensato, e al momento in cui la predizione scatterebbe il problema è già in corso da minuti. Questo è un contro-esempio deliberato: **non tutto va reso predittivo**. L'alert giusto è quello che corrisponde alla scala temporale del problema, e per problemi che esplodono in secondi la scala temporale giusta è il presente.

> **Regola di selezione**: `predict_linear` è adatto quando esiste una soglia assoluta chiara (limite heap, quota mensile, scadenza certificato) e un orizzonte temporale di ore o giorni in cui agire. `deriv` è la scelta quando l'informazione rilevante è il tasso di cambiamento indipendentemente dal valore assoluto. Una soglia statica reattiva serve quando la risorsa si satura in secondi e non c'è finestra di intervento da anticipare.

## Quattro modi in cui la retta sbaglia

`predict_linear` è uno strumento potente, ma ha quattro modalità di fallimento tipiche in produzione. Vale la pena conoscerle prima di mettere una regola predittiva in pager, perché ciascuna di queste trappole si manifesta come rumore operativo difficile da diagnosticare a posteriori.

### Crescita non lineare

La funzione assume, per definizione, una retta. Ci sono almeno tre famiglie di casi reali in cui questa assunzione si rompe in modo sistematico. La prima è il memory leak che peggiora esponenzialmente, tipicamente un loop di riferimenti che accumula oggetti sempre più velocemente man mano che la struttura cresce. La seconda sono le allocazioni che rallentano avvicinandosi al limite, perché la pressione del garbage collector aumenta e ogni nuova allocation costa progressivamente di più. La terza è la crescita a scalini, come un cronjob che aggiunge cento megabyte ogni notte e resta piatto per le restanti ventitré ore del giorno.

In tutti questi casi la regressione lineare sbaglia: in difetto se la curva è convessa, in eccesso se è concava. Il sintomo tipico è un alert che scatta troppo presto e diventa rumore ignorato, oppure troppo tardi e perde utilità come anticipo.

### Finestra troppo corta

Una query come `predict_linear(metric[5m], 4 * 3600)` reagisce in modo pesante al rumore della finestra. Cinque minuti di storia proiettati quattro ore in avanti amplificano ogni fluttuazione casuale, e la regressione diventa instabile al punto che oggi prevede saturazione fra trenta minuti, fra cinque minuti la prevede fra sei ore, e così via in un pattern che non serve a nessuno.

La regola pratica empirica è che la finestra storica dovrebbe essere almeno **un quarto** dell'orizzonte di proiezione. Proiezione a quattro ore implica finestra di almeno un'ora; proiezione a ventiquattro ore implica finestra di almeno sei ore. Più la finestra è lunga rispetto all'orizzonte, più la regressione è stabile e meno reattiva al rumore istantaneo.

### Pattern ciclici (false positive garantiti)

L'esempio canonico è il disco di un application server che cresce durante il giorno per via dei log applicativi e viene svuotato di notte dalla log rotation. `predict_linear` applicato a una finestra catturata in piena mattinata vede una retta che sale e prevede serenamente "pieno entro stasera", ma la rotazione notturna resetterà tutto e l'alert sarà un falso positivo certo.

Il workaround pragmatico è usare una finestra di almeno ventiquattro ore per qualsiasi metrica con pattern giornaliero, in modo che la regressione veda almeno un ciclo completo di rotazione. La soluzione più solida è passare al forecasting con Holt-Winters o Prophet, che modellano esplicitamente la stagionalità: argomento del terzo articolo della serie.

### Soglia statica vs orario lavorativo

"Pieno entro quattro ore" non equivale a "pieno entro quattro ore lavorative". Un alert predittivo che scatta alle due di notte con un lead time di quattro ore è operativamente inutile se nessuno sta presidiando il sistema fino alle nove del mattino: il risultato è un alert che ha svegliato qualcuno senza fornire una finestra d'azione utile.

Per gestire questo serve splittare il routing: alert predittivo verso un canale low-urgency (Slack del team, email) durante l'orario lavorativo, alert reattivo verso PagerDuty 24/7 come rete di sicurezza. Le recording rule che applicano la predizione solo durante le business hours tramite condizioni come `hour() >= 9 and hour() < 18` sono un altro strumento utile per ridurre i falsi positivi notturni senza rinunciare alla copertura reattiva.

## Dieci risorse e l'alert che serve a ciascuna

La teoria è interessante, ma in pratica serve sapere "per questa risorsa specifica, quale alert mi serve davvero?". La tabella sotto sintetizza dieci risorse comuni e indica quale tipo di alert ha senso in ciascun caso, tenendo conto del time-to-saturation tipico della risorsa e della scala temporale su cui il problema si manifesta. L'obiettivo non è essere esaustivi ma dare un punto di partenza concreto per ragionare sui casi reali.

| Risorsa | Reattiva | Predittiva | Note |
|---|---|---|---|
| CPU run queue | Sì | No | Troppo volatile per regressione lineare |
| Memory / JVM heap | Sì (OOM imminente) | Sì (leak progressivo) | Entrambi, finestre diverse |
| Disk space | Marginale | **Sì** | Caso d'uso classico |
| Connection pool | **Sì** | Marginale | Si satura in secondi |
| Certificato TLS | No | **Sì** | Predittivo per natura |
| Quota API mensile | No | **Sì** | Capacity planning |
| Kafka consumer lag | **Sì** | Sì | `deriv` meglio di `predict_linear` |
| Thread pool | **Sì** | Marginale | Comportamento simile al connection pool |
| Log retention | No | **Sì** | Settimane/mesi |
| Database row count | No | **Sì** | Orizzonte lungo |

> **Regola euristica**: la versione predittiva ha senso quando il time-to-saturation è nell'ordine di ore o giorni e c'è margine per agire prima dell'impatto utente. Per tutto ciò che si satura in secondi o minuti, la versione reattiva è l'unica scelta sensata. Rendere predittivi gli alert per default è un anti-pattern: ogni alert predittivo va giustificato dal lead time effettivo offerto rispetto alla controparte reattiva.

## Cosa fare domani

Aprite il vostro `alerts.yml` e classificate ogni regola con la tabella qui sopra: reattiva dove la risorsa si satura in secondi, predittiva dove la finestra è di ore o giorni. Le righe che non stanno da nessuna delle due parti sono quelle da guardare per prime.

**Ogni alert predittivo va giustificato dal lead time che offre davvero rispetto alla sua controparte reattiva.** Se non ne offre, è un alert in più da mantenere e una sveglia in più senza finestra d'azione — e il costo di un canale di notifica che l'oncall impara a ignorare si paga sull'incidente successivo, non su questo.

## Risorse

- [Prometheus: `predict_linear()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear)
- [Prometheus: Alerting best practices](https://prometheus.io/docs/practices/alerting/)
- [Robust Perception blog](https://www.robustperception.io/blog): esempi pratici e trappole di `predict_linear`
