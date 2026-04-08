---
title: "Prometheus predict_linear: alert predittivi di saturation in pratica"
date: 2026-04-15T09:00:00.000Z
description: "Come usare predict_linear in Prometheus per alert di saturation predittivi. USE vs Golden Signals, esempi reali (JVM, TLS, Kafka) e demo Docker Compose."
pillar: verificare
category: observability
tags:
  - Prometheus
  - Observability
  - Alerting
  - SRE
  - PredictLinear
  - GoldenSignals
  - USE
  - Grafana
  - PromQL
lang: it
reviewed: false
series: saturation-alerting
seriesOrder: 10
reproducibility: true
---

-----

## Il Problema: l'Alert che Scatta Sempre Tardi

Se hai scritto anche solo una regola di alerting in Prometheus, probabilmente hai già incontrato qualcosa di molto simile a questa:

```promql
node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
```

È la regola che tutti copiamo dal primo tutorial trovato, e che finisce per popolare almeno metà dei file `alerts.yml` in giro per il mondo. Il problema di questa regola non è la sintassi, né il valore della soglia: il problema è **la domanda a cui sta rispondendo**. La query ti dice che il disco è pieno *adesso*, in questo momento preciso. Quando scatta, sei già al 90% di occupazione, i log stanno probabilmente fallendo a scrivere su disco e qualche servizio sta già restituendo `ENOSPC` ai suoi client.

Una domanda diversa, e molto più utile dal punto di vista operativo, sarebbe *"il disco si riempirà entro una finestra temporale in cui posso ancora intervenire senza svegliare nessuno nel cuore della notte?"*. Questa è letteralmente **una domanda diversa**, e richiede un alert diverso — non un aggiustamento di soglia, ma una query che ragiona sul **trend** invece che sullo **stato**.

Questa distinzione non è una curiosità accademica: ha radici teoriche precise in due framework che chiunque si occupi di observability ha sentito nominare, USE e Golden Signals. Nel resto dell'articolo vediamo da dove arriva la differenza, come tradurla in regole Prometheus concrete con `predict_linear`, e soprattutto quando gli alert predittivi sono l'idea giusta e quando invece sono un errore.

-----

## USE vs Golden Signals: Due Definizioni di Saturation

Partiamo dalle fonti primarie, perché qui i dettagli contano. Il **metodo USE** è stato formalizzato da **Brendan Gregg nel 2012**, partendo dal suo lavoro di performance engineering su Solaris prima e Linux poi. L'acronimo sta per Utilization, Saturation, Errors, ed è pensato come checklist operativa per diagnosticare problemi di performance a livello di risorsa hardware: CPU, memoria, disco, rete.

I **Four Golden Signals** arrivano qualche anno dopo, codificati nel **Google SRE Book del 2016**, nel capitolo 6 "Monitoring Distributed Systems". L'approccio è diverso: invece di partire dalla risorsa fisica, parte dal servizio visto dall'esterno. Latency, traffic, errors, saturation — le quattro dimensioni su cui un SRE dovrebbe costruire il proprio monitoring di base.

Entrambi i framework usano la parola "saturation", ma la definiscono in modo sottilmente diverso. Gregg è esplicito:

> "the degree to which the resource has extra work which it can't service, often queued"
>
> — fonte: brendangregg.com/usemethod.html

La saturation USE è, letteralmente, la **coda di lavoro che la risorsa non riesce a smaltire adesso**. È una misura istantanea: lunghezza della run queue della CPU, pagine in swap, pacchetti in attesa nel buffer di rete. Il libro SRE, nel capitolo sui Golden Signals, usa invece una definizione che include esplicitamente la dimensione temporale futura:

> "predictions of impending saturation, e.g., 'the database will fill its hard drive in 4 hours'"
>
> — fonte: sre.google/sre-book/monitoring-distributed-systems/

Questa frase compare letteralmente nel libro, in un paragrafo che discute come strumentare la saturation, quindi non si tratta di una lettura creativa del testo. Il punto chiave, che troppo spesso passa inosservato nelle discussioni su alerting, è che **USE misura saturation come stato corrente, mentre i Golden Signals la definiscono includendo le predizioni**. Sono due framework compatibili ma con focus diversi, e questa differenza si traduce direttamente nel tipo di alert che ciascuno abilita.

| | **USE (Brendan Gregg, 2012)** | **Golden Signals (Google SRE, 2016)** |
|---|---|---|
| **Cosa misura** | Coda di lavoro in attesa *adesso* | Quanto è "piena" la risorsa, **incluse predizioni** |
| **Quando scatta** | Quando il problema sta degradando il servizio | Quando il trend lo prevede entro un orizzonte |
| **Azione abilitata** | Mitigazione reattiva | Pianificazione, scaling preventivo |

Tenere a mente questa distinzione rende molto più facile rispondere alla domanda "che tipo di alert mi serve qui?", perché ti costringe a esplicitare se stai monitorando uno stato o un trend.

-----

## Symptom-based vs Cause-based: Quando Ricevi la Pagina

C'è un altro asse su cui ragionare, ortogonale al precedente, e che la letteratura SRE identifica come **symptom-based vs cause-based**. Un alert reattivo è tipicamente symptom-based: scatta quando il problema si sta manifestando, è tardivo ma molto preciso, perché non stai prevedendo nulla — stai osservando. Un alert predittivo è cause-based con un orizzonte temporale: cerca di anticipare il sintomo osservando un indicatore di causa che tende verso un limite noto. Proattivo ma per definizione stimato, quindi esposto a falsi positivi quando il modello sottostante si rompe. Nessuno dei due approcci è universalmente migliore dell'altro, e trattarli come alternative è il primo errore da evitare.

Per fissare la differenza, immaginiamo lo stesso sistema con due alert diversi sulla stessa metrica — l'heap usato di una JVM in produzione. Il primo è un classico alert reattivo: "se l'heap supera il 90% per più di cinque minuti, pagina l'oncall". Scatta alle 3 di notte di un martedì, perché la metrica ha effettivamente toccato quella soglia. L'heap è al 92%, la JVM è entrata in una GC storm, le latenze p99 sono già degradate di un ordine di grandezza e qualche endpoint sta restituendo timeout. L'oncall si sveglia, capisce cos'è successo, fa un restart di emergenza, mitiga sotto pressione con mezza faccia addormentata. L'alert ha fatto il suo lavoro — il servizio è salvo — ma il costo operativo è altissimo.

Il secondo alert è predittivo, sulla stessa metrica: usa `predict_linear` con una finestra di sei ore di storia e un orizzonte di due ore. Scatta alle 17:00 di un mercoledì, con l'heap ancora al 60%, ma il trend di crescita dice che entro due ore si toccherà il limite massimo. L'oncall in turno diurno apre un ticket, coordina un restart pianificato durante la maintenance window serale prevista, nessuno si sveglia di notte e nessun utente vede timeout.

Entrambi gli alert hanno senso e rispondono a bisogni operativi diversi: il predittivo non sostituisce il reattivo, sono complementari. Il reattivo è la rete di sicurezza quando la predizione fallisce — ad esempio quando l'heap cresce improvvisamente in modo non lineare per un cambio di carico. Capire quale alert risponde a quale domanda è il punto di tutto l'articolo, e senza questa chiarezza si finisce inevitabilmente per scrivere regole che scattano troppo spesso, troppo tardi, o entrambe le cose insieme.

-----

## predict_linear: Anatomia della Funzione

Prima di passare agli esempi, vale la pena guardare in faccia la funzione che faremo lavorare per noi. La firma in PromQL è questa:

```promql
predict_linear(v range-vector, t scalar) float
```

Cosa fa, in una riga: calcola una **regressione lineare semplice** sulla finestra `v` passata come range-vector e proietta il risultato `t` secondi nel futuro, restituendo il valore stimato della metrica al tempo `now + t`. Un esempio concreto rende tutto più chiaro:

```promql
# Stima il valore di una gauge fra 4 ore basandosi sull'ultima ora di dati
predict_linear(some_metric[1h], 4 * 3600)
```

Cosa `predict_linear` **assume**: che la crescita nella finestra osservata sia sostanzialmente lineare. Cosa invece **non fa**: non modella stagionalità, non riconosce cambi di regime, non si accorge di curve esponenziali o di salti a scalini. È un modello volutamente semplice, e questa semplicità è sia il suo punto di forza (prevedibile, veloce, facile da ragionare) sia il suo limite.

Vale la pena confrontarla con due parenti strette che ogni tanto fanno lo stesso lavoro meglio:

- `rate(counter[1m])` — variazione media al secondo di un counter monotono crescente, usato per calcolare throughput ed error rate
- `deriv(gauge[5m])` — pendenza della retta di regressione lineare calcolata su una gauge, espressa come variazione per secondo
- `predict_linear(gauge[1h], t)` — estrapolazione del valore stimato a `t` secondi nel futuro, basata sulla stessa regressione

Il punto chiave da ricordare è che `predict_linear(v, t)` equivale concettualmente a `deriv(v) * t + valore_corrente`: niente di più sofisticato di una retta estrapolata in avanti. Quando l'assunzione lineare regge — ed è il caso di parecchie risorse reali, come la crescita dell'heap in una JVM sana o l'occupazione di un disco di log — la funzione fa esattamente quello che serve. Quando si rompe, servono strategie diverse (ne parliamo nella sezione 7).

-----

## Cinque Esempi PromQL Reali

Il caso del disco che si riempie è l'esempio da manuale, ma rischia di dare l'impressione che `predict_linear` sia un martello monouso. In realtà lo spettro di casi reali è molto più ampio, e include scenari in cui la funzione è perfetta, scenari in cui è la scelta sbagliata, e scenari in cui la predizione è già incapsulata nella metrica stessa. Vediamo cinque esempi che coprono questo spettro, dal più reattivo al più predittivo.

### 5.1 — Certificato TLS in Scadenza

```promql
(probe_ssl_earliest_cert_expiry - time()) / 86400 < 7
```

Questo è il caso predittivo per eccellenza, ma notate una cosa: **non c'è `predict_linear`**. Il motivo è che la metrica `probe_ssl_earliest_cert_expiry`, esposta dal `blackbox_exporter`, è già definita come "timestamp Unix della scadenza più vicina". Sottrai `time()` (l'istante corrente), dividi per 86400 (i secondi in un giorno), ottieni i giorni rimanenti prima della scadenza. La forma più pulita di alert predittivo non richiede estrapolazione: è semplice aritmetica tra due timestamp. Il "predittivo" in questo caso vive nella metrica stessa, non nella query, e questo è tipicamente il pattern da preferire quando puoi permettertelo — meno assunzioni, meno modelli, meno modi di sbagliare.

### 5.2 — Memory Leak Progressivo nella JVM

```promql
predict_linear(jvm_heap_used_bytes{area="heap"}[6h], 2 * 3600)
  > on(instance) jvm_heap_max_bytes{area="heap"}
```

La finestra è lunga (sei ore di storia) deliberatamente, per filtrare il rumore dei cicli di garbage collection che fanno "respirare" l'heap su e giù con oscillazioni anche notevoli. Una finestra corta verrebbe dominata da quelle oscillazioni e produrrebbe una pendenza molto rumorosa; sei ore catturano il trend di fondo, che è quello che ci interessa davvero per individuare un leak progressivo. La proiezione a due ore dà tempo sufficiente a un oncall in turno diurno di aprire un ticket, coordinare un restart pianificato, e intervenire senza drammi prima che la JVM finisca in OOM. La join `on(instance)` è critica: accoppia ogni `jvm_heap_used_bytes` con il `jvm_heap_max_bytes` della stessa istanza, senza la quale Prometheus rifiuta l'operazione perché i due vettori hanno label set diversi. Nota importante: questa è la versione "production realistica". Il demo di accompagnamento nel repository usa una finestra molto più corta per essere osservabile in pochi minuti anziché ore.

### 5.3 — Quota API Mensile

```promql
# Pseudocodice — predict_linear su finestra 24h proiettata fino a fine mese
predict_linear(api_calls_total[24h], 7 * 86400) > monthly_quota
```

Caso classico per integrazioni con servizi tipo Stripe, Twilio, OpenAI, o qualsiasi provider che ti fattura in base a un budget mensile di chiamate. L'ultima cosa che vuoi è scoprire alle 23:00 del 28 del mese di aver esaurito il budget, con il servizio che smette di funzionare fino al primo del mese successivo. Avvertenza tecnica importante: **PromQL non ha una funzione `days_until_month_end()` built-in**, quindi la query mostrata sopra è una semplificazione didattica. Per fare la cosa giusta in produzione hai due opzioni:

- una **recording rule** che calcola `days_to_month_end` usando `month()`, `day_of_month()` e aritmetica giorno per giorno, che poi riusi come scalar nella query di alert
- una **metrica esposta dall'applicazione stessa** (ad esempio `billing_period_seconds_remaining`) che incapsula la logica del periodo di fatturazione lato producer, spostando il problema fuori da Prometheus

L'esempio qui sopra usa un orizzonte fisso a sette giorni per semplicità, ma la query reale in produzione dipende dalla recording rule o dalla metrica custom che hai scelto di esporre.

### 5.4 — Kafka Consumer Lag in Crescita Sostenuta

```promql
deriv(kafka_consumergroup_lag[15m]) > 1000 / 60
```

Qui `deriv()` fa un lavoro migliore di `predict_linear`, ed è istruttivo capire perché. L'informazione che ti interessa per un consumer Kafka non è il valore assoluto del lag fra due ore, ma il **tasso di crescita sostenuto**: se il lag cresce costantemente di mille messaggi al minuto (circa sedici al secondo), hai un problema strutturale di capacità del consumer anche partendo da numeri bassi, e il problema peggiorerà finché non intervieni. La regola scatta quando la pendenza della retta di regressione su quindici minuti supera sedici messaggi al secondo, sostenuta nel tempo. La predizione qui è implicita: un trend è già una predizione, semplicemente espressa come pendenza invece che come valore estrapolato.

### 5.5 — Connection Pool Saturo (Contro-esempio Reattivo)

```promql
(db_connection_pool_active / db_connection_pool_max) > 0.9
```

Nessuna predizione, nessuna funzione `predict_linear`, nessun trend: solo una soglia statica sullo stato corrente. Il motivo è operativo: un connection pool si satura in secondi, non in ore, e l'unico alert utile è "sta succedendo adesso, intervieni subito". Non c'è una finestra di intervento da anticipare — quando il rate di richieste salta improvvisamente, il pool si riempie più veloce di qualsiasi `predict_linear[5m]` con un orizzonte sensato, e al momento in cui la predizione scatterebbe il problema è già in corso da minuti. Questo è un contro-esempio deliberato: **non tutto va predictive-ificato**. L'alert giusto è quello che corrisponde alla scala temporale del problema, e per problemi che esplodono in secondi la scala temporale giusta è il presente.

> **Regola di selezione**: usa `predict_linear` quando hai una soglia assoluta chiara (limite heap, quota mensile, scadenza certificato) e un orizzonte temporale di ore o giorni in cui agire. Usa `deriv` quando ti interessa il tasso di cambiamento indipendentemente dal valore assoluto. Usa una soglia statica reattiva quando la risorsa si satura in secondi e non c'è finestra di intervento da anticipare.

-----
