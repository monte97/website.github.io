# Dalla cecità alla traccia: strumentare una pipeline esistente

> **Questo è il testo integrale dell'articolo**, così com'è oggi sul sito, con dentro
> **6 blocchi da compilare**. Cerca `DA COMPILARE` per saltare da uno all'altro.
>
> Scrivi sulla riga `RISPOSTA:`. Se non hai niente, scrivi `NIENTE`: il blocco sparisce,
> non viene annacquato. Un campo assente batte sempre un campo vago.
>
> I blocchi marcati `DA COMPILARE` stanno **nel punto in cui la tua risposta andrà a finire**.
> Quelli in fondo al file sono i tre che non appartengono a un punto preciso del testo:
> la frase del cliente (diventa una citazione prima della tesi), il cambiamento osservabile
> (entra nel risultato) e il momento in cui il problema diventa urgente (riscrive la CTA,
> che vive nel frontmatter e non nel corpo).
>
> Il testo intorno e' quello reale: se leggendolo vuoi cambiare una frase, cambiala qui.

---


## Il quadro

Il dato attraversa quattro servizi e tre topic prima di diventare una risposta HTTP. Il quadro generale — perché in un sistema distribuito le metriche da sole non bastano — l'ho raccontato [qui](/blog/verificare/observability/01-observability/). Finché ogni servizio parlava solo di sé, un dato mancante in fondo non aveva un'origine: si poteva sapere che l'API restituiva poco, non dove il flusso si era interrotto. Il perimetro di questa strumentazione è il percorso critico del dato, per intero; il resto del sistema viene dopo.

Accanto al percorso del dato ne corre uno secondo, quello dei segnali:

- **Agent e distro** — agent sui due servizi JVM, wrapper sulle tre API Python.
- **Collector** — unico punto di uscita: raggruppa, marca l'ambiente, smista. I segnali arrivano via gRPC sulla porta 4317.
- **Tracce · metriche · log** — uno stack di osservabilità già esistente presso il committente, non introdotto da questo lavoro.

Il percorso dei segnali è deliberatamente parallelo a quello del dato e non lo attraversa: **nessun servizio parla direttamente con le destinazioni finali**. Cambiare backend è una modifica alla configurazione del collector, non ai nove servizi.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 3 · COSA NON SI RIUSCIVA A CAPIRE, PRIMA
                ════════════════════════════════════════════════

    Il pezzo dice che un dato mancante in fondo non aveva un'origine. Serve un episodio:
      · un caso concreto in cui non si riusciva a capire dove si era fermato il flusso
      · quanto tempo ci si perdeva
      · chi veniva chiamato quando succedeva

    RISPOSTA:


                ════════════════════════════════════════════════


## Le decisioni

Su un sistema in esercizio, ogni modifica al codice dei servizi è un rischio che va giustificato dal valore che porta. L'osservabilità, all'inizio, non porta nessuna funzionalità: serve a sapere. Da qui il criterio che governa tutte le decisioni di questo lavoro: prendere il massimo che si ottiene senza toccare la logica, e ricorrere al codice solo dove l'automatismo dimostra di non bastare.

**Tre linguaggi, tre meccanismi · un solo protocollo in uscita**

- **Servizi JVM** — agent allegato all'avvio: strumenta client Kafka, chiamate HTTP in uscita e metriche di macchina virtuale senza ricompilare nulla.
- **Servizi Python** — entrypoint avvolto dal wrapper della distribuzione: coperte le rotte HTTP, il driver del database e i client Kafka.
- **Servizio anagrafiche** — inizializzazione caricata prima dell'applicazione, in un file a parte: l'applicazione resta ignara della strumentazione.
- **Gateway** — nessun modulo aggiuntivo: log strutturati in uscita standard, correlabili per identificativo di richiesta.

**Rollout · dal percorso critico verso il perimetro**

- **Prima fase** — il percorso del dato di telemetria, dalla sorgente esterna alle API. È la parte dove un guasto silenzioso costa di più.
- **Poi il resto** — anagrafiche, rapportini, perimetro: pianificati, non ancora in esercizio. Dichiararlo è parte del risultato.

### La decisione che vale la pena raccontare per intero

Il criterio si mette alla prova su un punto solo: i confini tra i servizi. Un sistema a eventi si osserva bene o male a seconda che una traccia sopravviva al passaggio attraverso un topic, e questa era la parte per cui era previsto scrivere codice.

La strada prevista era propagare il contesto a mano su ogni confine Kafka, da subito: iniezione ed estrazione degli header nei sei punti produttore/consumatore, pianificata prima di provare.

Le tracce sono risultate collegate attraverso i topic senza alcun intervento sul codice: gli header di contesto viaggiano fuori dal payload, quindi gli schemi dei messaggi non sono stati toccati e i consumatori non strumentati li ignorano. Sei modifiche pianificate non sono state fatte — e non perché siano state rinviate, ma perché la verifica ha mostrato che non servivano. Il costo di quella verifica è stato una traccia guardata in faccia; il costo di non farla sarebbe stato codice di trasporto sparso in sei file, da mantenere per sempre.

La verifica prima del codice non è prudenza generica: **vale quando l'alternativa è codice permanente in punti di passaggio**. Un'ora di controllo contro sei file da mantenere.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 6 · LE SEI MODIFICHE NON FATTE
                ════════════════════════════════════════════════

    E' la parte migliore del pezzo: sei modifiche pianificate non sono state fatte perche'
    la verifica ha mostrato che non servivano.

    Serve sapere quanto e' costata quella verifica — un'ora? mezza giornata? — e se
    qualcuno aveva gia' cominciato a scrivere quel codice prima che tu controllassi.

    RISPOSTA:


                ════════════════════════════════════════════════


## Configurazione

Tutto ciò che segue è configurazione, non codice.

### Strumentare un servizio JVM

*Cinque variabili d'ambiente, zero righe di codice applicativo* — `docker-compose` del servizio di arricchimento, blocco `environment`:

```yaml
JAVA_TOOL_OPTIONS: "-javaagent:/otel/opentelemetry-javaagent.jar"
OTEL_SERVICE_NAME: "servizio-arricchimento"
OTEL_EXPORTER_OTLP_ENDPOINT: "http://${HOST_IP}:4317"
OTEL_LOGS_EXPORTER: "otlp"
OTEL_METRICS_EXPORTER: "otlp"
```

La prima riga è la decisione: l'agent si allega alla macchina virtuale all'avvio e riconosce da sé le librerie in uso — i tre consumatori Kafka, il produttore, le chiamate HTTP verso l'esterno. Le altre quattro righe dicono soltanto come si chiama il servizio e dove spedire. Senza l'agent, la stessa copertura significava aprire il codice di ogni consumatore e circondare a mano ogni operazione.

### Il punto di uscita unico

*Tre segnali, tre destinazioni, una sola cosa da riconfigurare* — configurazione del collector, sezione `service`:

```yaml
processors:
  resource:            # marca ogni segnale con ambiente e namespace
service:
  pipelines:
    traces:  { receivers: [otlp], processors: [batch, resource], exporters: [tracce] }
    metrics: { receivers: [otlp], processors: [batch, resource], exporters: [metriche] }
    logs:    { receivers: [otlp], processors: [batch, resource], exporters: [log] }
```

I nove servizi conoscono un solo indirizzo: il collector. Le destinazioni finali sono nominate qui e in nessun altro posto. È la ragione per cui il campionamento è rimasto «tutto» in prima battuta: ridurlo è una modifica a questo file, non ai servizi.

## I segnali

Una strumentazione si giudica da cosa permette di chiedere. Per ciascun segnale la tabella dichiara l'origine e la domanda a cui risponde: è questo a rendere la copertura valutabile, perché «strumentato» da solo non si può discutere.

## Evidenze

È la cattura che regge tutto il documento. Un unico albero di span parte dal prelievo presso il fornitore esterno e arriva alla scrittura nell'API di consultazione, attraversando due topic: se la propagazione del contesto non funzionasse, qui si vedrebbero quattro tracce separate invece di una.

1. **Prelievo esterno** — la prima riga, `poll provider-telematico-1`, dura 201,66 ms: quasi tutto il tempo della traccia sta nell'attesa del fornitore, non nella nostra elaborazione. È la risposta immediata alla domanda «è lento il sistema o è lento il fornitore».
2. **Attraversamento del primo topic** — `standardized publish` e `standardized process` sono padre e figlio: la pubblicazione del servizio di normalizzazione e il consumo del servizio di arricchimento stanno nello stesso albero. Nessuna riga di codice è stata scritta per ottenerlo.
3. **Arrivo all'API** — `enriched receive` in `api-storico`, centinaia di microsecondi, chiude la catena.

Anche la correlazione fra log e tracce è arrivata senza codice: l'iniezione di `trace_id` e `span_id` nel formato di log è una funzione della strumentazione automatica, non una modifica ai punti in cui l'applicazione scrive.

## Esito dell'analisi

Il percorso critico del dato è tracciabile dall'inizio alla fine: una singola traccia collega il prelievo dalla sorgente esterna, la normalizzazione, l'attraversamento dei due topic e la scrittura nelle API di consultazione. È stato ottenuto senza modificare una riga della logica dei servizi.

- **Realizzato · Il percorso critico, strumentato e verificato** — collector locale, agent sui due servizi JVM, auto-strumentazione sulle tre API. Tracce collegate attraverso i topic, controllate su una traccia reale end-to-end.
- **Pianificato · Il perimetro, non ancora in esercizio** — anagrafiche, rapportini, gateway, assegnazioni: stesso meccanismo, nessuna incognita tecnica nuova. È lavoro dimensionabile, non da progettare.
- **Rinviato per scelta · Campionamento e allarmi** — entrambi decidibili a valle, sul collector e sull'interfaccia di consultazione, senza rientrare nei servizi. Rinviarli è ciò che ha reso la prima fase breve.
- **Non affrontato · Ciò che l'osservabilità rende visibile ma non risolve** — alcune fragilità note del sistema (un consumatore senza supervisione, un buffer che scarta sotto carico) ora si vedono. Vederle era il presupposto per poterle discutere.

**Estendere la strumentazione al perimetro, con lo stesso meccanismo.** La prima fase ha già pagato il costo di apprendimento: le fasi successive sono repliche di una configurazione verificata, servizio per servizio, e ognuna vale da sola.

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 1 · LA FRASE DEL CLIENTE
                ════════════════════════════════════════════════

    IL BLOCCO PIU' IMPORTANTE. Sostituisce da solo tutte le metriche: il case study
    di Dropbox non ha un solo numero e regge su una frase del cliente.

    Serve una frase detta da qualcuno del committente sul lavoro fatto. Anche breve, anche tiepida,
    anche presa da una chat. Meglio se detta da chi decide.

    Se non esiste, va bene il fatto osservato: qualcuno che ha smesso di fare una
    cosa, o che ha iniziato a farne una che prima non poteva.

    CHI L'HA DETTA (ruolo, non nome):

    RISPOSTA:


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 2 · IL DOMINIO REALE — serve per la chiave
                ════════════════════════════════════════════════

    Questo pezzo e' arrivato gia' anonimizzato, e la mappatura verso il dominio reale
    non e' mai stata registrata. Nella chiave (`_strategy/anonimizzazioni.yaml`) risulta
    DA CONFERMARE.

    Serve solo per l'archivio riservato, non entra nel pezzo:
      · settore reale del committente
      · e' lo stesso cliente della telemetria macchine, o un altro?

    RISPOSTA:


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 4 · CHI STA MEGLIO, E COME SI VEDE
                ════════════════════════════════════════════════

    Serve un fatto osservabile: qualcosa che un estraneo avrebbe potuto vedere
    entrando in azienda. Chi apre cosa, quando, al posto di cosa faceva prima.

    La precisione qui e' il sostituto del numero.

    RISPOSTA:


                ════════════════════════════════════════════════

                ════════════════════════════════════════════════
                ▶ DA COMPILARE — 5 · IL MOMENTO IN CUI FA MALE  →  riscrive la CTA
                ════════════════════════════════════════════════

    Un problema tollerato per anni diventa urgente solo quando succede qualcosa:
    una migrazione, un aggiornamento di versione, un cliente nuovo piu' grosso,
    l'uscita di chi sapeva le cose a memoria, un rilascio andato male, un audit.

    Nel progetto vero c'era una di queste cose all'orizzonte?
    Questo blocco non entra nel corpo: riscrive il campo `cta` nel frontmatter.

    RISPOSTA:


                ════════════════════════════════════════════════
