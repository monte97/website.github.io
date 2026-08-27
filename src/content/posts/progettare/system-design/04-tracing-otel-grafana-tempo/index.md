---
title: "Vedere LINQ in Azione: Tracing con OpenTelemetry e Grafana Tempo"
seoTitle: "Tracciare LINQ con OpenTelemetry e Tempo"
date: 2026-03-14T08:00:00.000Z
description: "Rendere visibile l'esecuzione di LINQ con OpenTelemetry e Grafana Tempo: la waterfall mostra lo streaming, e OrderBy nel mezzo lo spezza."
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - OpenTelemetry
  - GrafanaTempo
  - Observability
  - Tracing
lang: it
reviewed: human
series: linq
seriesOrder: 40
summary:
  - label: "Contesto"
    value: "Stack Grafana LGTM in un solo container Docker e tre pacchetti OpenTelemetry"
    note: "Setup pensato per lo sviluppo locale, avvio con docker compose up"
  - label: "Strumento"
    value: "Monitor() e MonitorElements() rendono visibile ogni stage della pipeline LINQ"
    note: "Extension method da incatenare tra gli operatori, senza cambiarne il comportamento"
  - label: "Scoperta"
    value: "La waterfall rende visibile lo streaming elemento per elemento"
    note: "Con OrderBy nel mezzo lo streaming si spezza: bufferizza tutto prima di emettere"
  - label: "Costo reale"
    value: "Ogni span è un'allocazione: il tracing è diagnostica, non decorazione permanente"
    note: "In produzione si protegge con sampling aggressivo, dall'1% al 5%"
openItems:
  - "La percentuale di sampling va scelta per pipeline: le linee guida danno un intervallo, non una soglia"
  - "Su un hot path eseguito centinaia di volte al secondo anche un singolo Monitor() può introdurre latenza misurabile"
  - "Uno span per elemento su migliaia di record rende la trace ingestibile: MonitorElements resta confinato a debug e collezioni piccole"
  - "Lo stack LGTM monolitico copre lo sviluppo locale: collector, storage e retention di un ambiente produttivo non sono toccati"
openNote: "Quello che questo strumento non decide, e che va pesato prima di portarlo in produzione."
mode: how-to
---

Nei tre articoli precedenti abbiamo visto [cosa sbagliare](/blog/progettare/system-design/01-errori-produzione/), [quanto costa](/blog/progettare/system-design/02-benchmark-net8/) e [cosa succede sotto il cofano](/blog/progettare/system-design/03-compilatore-state-machine/). Abbiamo parlato di complessità computazionale, state machine, allocazioni e streaming. Ma finora era tutto teoria e numeri. Tabelle di benchmark, diagrammi ASCII, ragionamenti sulla deferred execution.

E se potessi *vedere* ogni elemento attraversare la tua pipeline LINQ -- operatore per operatore -- in una dashboard? Non una tabella statica, non un breakpoint nel debugger, ma una cascata temporale che mostra esattamente quando ogni stage inizia, quanto dura, e come gli elementi fluiscono da un operatore all'altro?

Si può fare. Con poche righe di codice, **OpenTelemetry** e lo stack **Grafana LGTM** trasformano la pipeline LINQ in qualcosa di osservabile. In questo articolo costruiamo insieme gli strumenti per farlo.

---

## Setup: OpenTelemetry + Grafana LGTM in 5 minuti

Prima di scrivere codice, serve un ambiente funzionante. La buona notizia è che il setup è minimo: un container Docker e tre pacchetti NuGet.

### Grafana LGTM in Docker

L'immagine `grafana/otel-lgtm` racchiude in un singolo container Docker l'intero stack Grafana LGTM: **Grafana** (dashboard e visualizzazione), **Tempo** (trace), **Loki** (log), **Prometheus** (metriche) e un **OpenTelemetry Collector** integrato. Tutto quello che serve per lo sviluppo locale, senza dover orchestrare più servizi.

```yaml
# docker-compose.yml
services:
  lgtm:
    image: grafana/otel-lgtm:latest
    ports:
      - "3000:3000"     # Grafana UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
```

```bash
# Avvio con un comando
docker compose up -d
```

La UI di Grafana sarà disponibile su `http://localhost:3000`. Per visualizzare le trace, navigare su **Explore** e selezionare **Tempo** come datasource. La porta `4317` è quella su cui la nostra applicazione invierà le trace via protocollo OTLP gRPC al collector integrato nello stack.

### Pacchetti NuGet

Tre pacchetti sono sufficienti per instrumentare una console app .NET:

```xml
<!-- LinqDeepDive.Tracing.csproj -->
<PackageReference Include="OpenTelemetry" Version="1.10.*" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.10.*" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.10.*" />
```

`OpenTelemetry` fornisce le API base. `OpenTelemetry.Exporter.OpenTelemetryProtocol` è l'exporter che parla OTLP verso il collector dello stack LGTM. `OpenTelemetry.Extensions.Hosting` semplifica l'integrazione con il lifecycle dell'applicazione.

### Configurazione del TracerProvider

Il cuore del setup è il `TracerProviderBuilder`. Definisce il nome del servizio, registra la sorgente delle nostre activity e configura l'exporter.

```csharp
using System.Diagnostics;
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using LinqDeepDive.Tracing.Extensions;

// Setup OpenTelemetry con OTLP exporter verso Grafana LGTM (Tempo)
using var tracerProvider = Sdk.CreateTracerProviderBuilder()
    .SetResourceBuilder(ResourceBuilder.CreateDefault()
        .AddService("LinqDeepDive.Tracing"))
    .AddSource(LinqTracingExtensions.Source.Name)
    .AddOtlpExporter(opts =>
    {
        opts.Endpoint = new Uri("http://localhost:4317");
    })
    .Build();
```

Il `using var` è fondamentale: quando il `tracerProvider` viene disposto, forza il flush delle trace pendenti verso il collector. Senza di esso, le ultime trace potrebbero andare perse.

L'`ActivitySource` -- registrata con `.AddSource()` -- è il punto di ingresso per creare span. In .NET, `Activity` è l'equivalente di uno *span* OpenTelemetry. Il naming è leggermente diverso dalla specifica, ma il concetto è lo stesso.

> Se hai già letto gli articoli sulla serie OpenTelemetry su questo blog, questo setup ti sarà familiare. In caso contrario, non preoccuparti: è autocontenuto e funzionante così com'è.

---

## Il metodo `.Monitor()`: Rendere LINQ visibile

L'obiettivo è semplice: inserire un extension method tra due operatori LINQ per creare uno span che misura la durata di quella fase della pipeline. Qualcosa come `.Monitor("NomeStage")` che si possa incatenare senza alterare il comportamento funzionale.

### La versione base

```csharp
// LinqTracingExtensions.cs
using System.Diagnostics;

public static class LinqTracingExtensions
{
    public static readonly ActivitySource Source =
        new("LinqDeepDive.Tracing");

    /// <summary>
    /// Wrappa un IEnumerable con uno span che traccia
    /// inizio e fine dell'enumerazione.
    /// </summary>
    public static IEnumerable<T> Monitor<T>(
        this IEnumerable<T> source,
        string operationName)
    {
        using var activity = Source.StartActivity(operationName);
        var count = 0;

        foreach (var item in source)
        {
            count++;
            yield return item;
        }

        activity?.SetTag("linq.element_count", count);
    }
}
```

Il metodo è breve, ma vale la pena scomporlo. `Source.StartActivity(operationName)` crea un nuovo span con il nome fornito. Il `using` garantisce che lo span venga chiuso quando l'enumerazione termina. Il `yield return` trasforma il metodo in un iteratore: ogni elemento passa attraverso senza essere bufferizzato. Alla fine, il tag `linq.element_count` registra quanti elementi sono stati processati.

### Utilizzo nella pipeline

L'inserimento è trasparente. Si aggiunge `.Monitor()` tra un operatore e l'altro, come un probe su un circuito:

```csharp
var result = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Filter-Pending")
    .Where(d => d.WeightKg > 50)
    .Monitor("Filter-Heavy")
    .OrderByDescending(d => d.WeightKg)
    .Monitor("OrderBy-Weight")
    .Take(10)
    .Monitor("Take-10")
    .ToList();
```

Su Grafana Tempo, questa pipeline produce quattro span figli all'interno dello span padre della demo. Ogni span mostra la durata del proprio stage e il numero di elementi processati. Già con questa versione base si ottiene una visione chiara di dove il tempo viene speso.

### Nota importante: `yield return` e il lifecycle dell'`Activity`

C'è un dettaglio sottile che merita attenzione. Con `yield return`, il corpo del metodo non viene eseguito alla chiamata. L'esecuzione reale avviene solo quando qualcuno enumera il risultato -- la **deferred execution** che abbiamo esplorato nell'articolo 3.

Questo significa che l'`Activity` non si apre quando scrivi `.Monitor("Filter-Pending")` nella pipeline. Si apre quando il `ToList()` finale (o un `foreach`, o un `Count()`) inizia a tirare elementi attraverso la catena. Il `Dispose` dell'activity avviene quando l'enumeratore viene disposto, cioè quando l'enumerazione termina o viene interrotta.

Il timing è corretto: lo span misura esattamente il periodo in cui gli elementi fluiscono attraverso quel punto della pipeline. Ma è importante capire che la creazione della pipeline e la sua esecuzione sono due momenti distinti -- come abbiamo visto con le state machine dell'articolo precedente.

---

## Versione avanzata: Span per elemento

La versione base di `.Monitor()` crea uno span per stage. Utile, ma non mostra il flusso dei singoli elementi. Per visualizzare il **ping-pong** dello streaming -- quel pattern in cui ogni elemento attraversa l'intera pipeline prima che il successivo inizi -- serve una granularità maggiore.

### `MonitorElements<T>()`: uno span per ogni elemento

```csharp
/// <summary>
/// Crea uno span per ogni elemento enumerato.
/// WARNING: overhead elevato, usare solo per collezioni piccole
/// o in fase di debug.
/// </summary>
public static IEnumerable<T> MonitorElements<T>(
    this IEnumerable<T> source,
    string operationName)
{
    var index = 0;

    foreach (var item in source)
    {
        using var activity = Source.StartActivity(
            $"{operationName}[{index}]");
        activity?.SetTag("linq.element_index", index);
        index++;
        yield return item;
    }
}
```

La differenza chiave rispetto a `.Monitor()`: qui lo span viene creato *dentro* il `foreach`, non fuori. Ogni iterazione del ciclo produce un nuovo span con il suo indice. Il `using` chiude lo span subito dopo il `yield return`, cioè quando il consumatore richiede l'elemento successivo.

### Utilizzo con la pipeline del dispatcher

```csharp
var result = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .MonitorElements("Source")
    .Where(d => d.WeightKg > 50)
    .MonitorElements("FilterHeavy")
    .Take(5)
    .MonitorElements("Take5")
    .ToList();
```

### Cosa si vede su Grafana Tempo

Aprendo la trace su Grafana Tempo, la waterfall racconta una storia molto diversa da quella che ci si aspetterebbe con un modello mentale "a blocchi". Non si vedono prima tutti gli span `Source[0..N]`, poi tutti i `FilterHeavy[0..M]`, e infine i `Take5[0..5]`.

Si vede invece un pattern alternato: `Source[0]` si apre, poi `FilterHeavy[0]` si apre al suo interno, poi `Take5[0]` si apre dentro a quello. Il primo elemento ha attraversato l'intera pipeline. Solo dopo, `Source[1]` si apre e il ciclo ricomincia.

La cascata su Grafana Tempo assume una forma a zig-zag, con span annidati che mostrano il flusso elemento-per-elemento. Questo è lo **streaming** in azione -- lo stesso concetto che nell'articolo 3 abbiamo descritto con il diagramma ASCII del "ping-pong" tra `MoveNext()`. Qui diventa una visualizzazione temporale reale, con durate misurate in microsecondi.

Se un elemento viene scartato dal `Where`, si vede chiaramente: lo span `Source[N]` si apre, ma nessun `FilterHeavy[N]` lo segue. L'elemento è stato filtrato e la pipeline passa direttamente a `Source[N+1]`. Il `Take(5)` è ancora più evidente: dopo il quinto span `Take5[4]`, non compaiono più span `Source`. La pipeline si è fermata -- non ha consumato tutta la collezione sorgente, ma solo il necessario.

---

## Visualizzare gli errori dell'articolo 1

Le demo teoriche sono utili, ma il vero valore del tracing emerge quando lo si applica ai problemi reali. Riprendiamo due degli errori dell'articolo 1 e rendiamoli visibili.

### Errore 1 visibile: la multiple enumeration

Nell'articolo 1 abbiamo visto come una query `IEnumerable` non materializzata viene rieseguita ad ogni utilizzo. Con `.Monitor()` il problema diventa impossibile da ignorare.

```csharp
// Query non materializzata -- ogni uso la riesegue
var pendingDeliveries = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Pending-Query");

// Prima enumerazione -- genera uno span
var count = pendingDeliveries.Count();

// Seconda enumerazione -- genera un ALTRO span
var maxWeight = pendingDeliveries.Max(d => d.WeightKg);

// Terza enumerazione -- è un terzo span
var first = pendingDeliveries.First();
```

Su Grafana Tempo si vedono **tre span distinti** con lo stesso nome `Pending-Query`, ognuno con il proprio tag `linq.element_count`. Il primo e il secondo span processano tutti gli elementi della collezione sorgente. Il terzo ne processa potenzialmente solo uno (se `First()` trova subito un match), ma ha comunque eseguito il setup dell'iteratore e il filtro da capo.

La versione corretta è semplice: materializzare con `.ToList()` prima dell'uso multiplo.

```csharp
// Una sola enumerazione, un solo span
var materializedPending = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Pending-Materialized")
    .ToList();

// Nessuna riesecuzione -- lavora sulla lista in memoria
var count = materializedPending.Count;
var maxWeight = materializedPending.Max(d => d.WeightKg);
var first = materializedPending.First();
```

Su Grafana Tempo, un solo span `Pending-Materialized`. Le tre operazioni successive non generano trace perché operano su una `List<T>` già materializzata. La differenza tra un singolo span e tre span identici è il segnale visivo più immediato che si possa avere della multiple enumeration.

### Errore 3 visibile: il nesting che esplode

Il triplo nesting dell'articolo 1 -- per ogni veicolo, per ogni consegna, scansiona tutti i vincoli -- era già impressionante nei numeri. Su Grafana Tempo diventa *visceralmente* chiaro.

```csharp
// Nesting diretto con MonitorElements
foreach (var v in data.Vehicles
    .Where(v => v.IsAvailable).Take(5))
{
    using var vehicleSpan = LinqTracingExtensions.Source
        .StartActivity($"Vehicle-{v.Id}");

    var zoneDeliveries = data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending
                 && d.DestinationZoneId == v.CurrentZoneId)
        .MonitorElements($"V{v.Id}-Deliveries");

    foreach (var d in zoneDeliveries)
    {
        var blocked = data.Restrictions
            .Where(r => r.ZoneId == d.DestinationZoneId
                     && r.VehicleType == v.Type)
            .MonitorElements($"V{v.Id}-D{d.Id}-Restrictions")
            .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot));
    }
}
```

La waterfall su Grafana Tempo è esplosiva. Sotto ogni span `Vehicle-X` si apre una cascata di span `VX-Deliveries[0..N]`. Sotto ognuno di quelli, un'altra cascata di span `VX-DY-Restrictions[0..M]`. Con 5 veicoli, 20 consegne per zona e 50 vincoli rilevanti, la trace produce migliaia di span. Il pattern O(n cubo) dell'articolo 1 diventa visivamente cubico: ogni livello di nesting moltiplica il numero di span del livello precedente.

La versione ottimizzata, quella con il pre-indicizzamento tramite `ToLookup`, racconta una storia completamente diversa:

```csharp
// Pre-indicizzamento: una sola scansione delle collezioni
var pendingByZone = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("Index-PendingByZone")
    .ToLookup(d => d.DestinationZoneId);

var restrictionIndex = data.Restrictions
    .Monitor("Index-Restrictions")
    .ToLookup(r => (r.ZoneId, r.VehicleType));

// Il loop accede solo agli indici -- nessuna scansione ripetuta
var count = data.Vehicles
    .Where(v => v.IsAvailable)
    .Take(5)
    .SelectMany(v =>
    {
        var zoneDeliveries = pendingByZone[v.CurrentZoneId];
        var zoneRestrictions = restrictionIndex[(v.CurrentZoneId, v.Type)];
        return zoneDeliveries
            .Where(d => !zoneRestrictions
                .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot)))
            .Select(d => (v.Id, d.Id));
    })
    .Monitor("Assignments")
    .Count();
```

Su Grafana Tempo, la versione ottimizzata mostra due span di indicizzazione (`Index-PendingByZone` e `Index-Restrictions`), seguiti da un singolo span `Assignments`. Nessuna cascata esplosiva. Nessun nesting visivo. La complessità è passata da cubica a lineare, e la waterfall lo dimostra in modo inequivocabile.

---

## Streaming vs Non-Streaming: La prova visiva

Nell'articolo 3 abbiamo classificato gli operatori LINQ in *streaming* (lazy) e *non-streaming* (eager). `Where` e `Select` processano un elemento alla volta. `OrderBy` e `GroupBy` devono bufferizzare tutto prima di emettere il primo risultato. Ma come si presenta questa differenza in una trace?

### `OrderBy` spezza lo streaming

Consideriamo una pipeline con un `OrderBy` nel mezzo:

```csharp
// Scenario 1: OrderBy prima di Take -- ordina TUTTO, poi prende 5
var result = data.Deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .Monitor("S1-Filter")
    .OrderByDescending(d => d.WeightKg)
    .Monitor("S1-OrderBy-ALL")
    .Take(5)
    .Monitor("S1-Take5")
    .ToList();
```

Su Grafana Tempo il comportamento è evidente. Lo span `S1-Filter` processa tutti gli elementi -- supponiamo 800 consegne pending. Immediatamente dopo, lo span `S1-OrderBy-ALL` mostra gli stessi 800 elementi: `OrderBy` ha dovuto consumare l'intero input per poter ordinare. Solo alla fine lo span `S1-Take5` mostra 5 elementi.

Il punto cruciale: `S1-OrderBy-ALL` non inizia finché `S1-Filter` non ha emesso il suo ultimo elemento. Ed `S1-Take5` non inizia finché `S1-OrderBy-ALL` non ha terminato l'ordinamento. La pipeline che *sembrava* streaming ha in realtà un collo di bottiglia nel mezzo. Nonostante il `Take(5)` alla fine richieda solo 5 elementi, `OrderBy` ne ha bufferizzati 800.

### Senza `OrderBy`: streaming puro

Se si rimuove l'`OrderBy`, la pipeline torna a essere puramente streaming. Con `MonitorElements` si vedrebbe il pattern alternato: `Filter[0]` seguito immediatamente da `Take5[0]`, poi `Filter[1]` e `Take5[1]`, e così via. Dopo il quinto elemento, la pipeline si ferma. Non vengono processati tutti gli 800 elementi sorgente -- solo quelli necessari.

La differenza nella waterfall di Grafana Tempo è drammatica. Con `OrderBy` si vedono tre blocchi sequenziali, ognuno largo quanto l'intera collezione. Senza `OrderBy` si vede un flusso compatto che si interrompe dopo pochi elementi. È esattamente la differenza tra processare 800 elementi e processarne 5.

Questa visualizzazione è anche il modo migliore per spiegare a un collega perché "spostare l'`OrderBy` dopo il `Take`" non è la stessa cosa: `OrderBy` *deve* vedere tutto per garantire l'ordinamento corretto. La soluzione, quando serve solo il top-N, è considerare strutture dati alternative (come un min-heap) o accettare consapevolmente il costo del buffering.

---

## Attenzione al costo: Quando NON usare `.Monitor()`

Finora abbiamo trattato `.Monitor()` e `.MonitorElements()` come strumenti neutri. Non lo sono. Ogni invocazione ha un costo, e in contesti sbagliati quel costo può superare il valore diagnostico.

### L'overhead del tracing

Ogni chiamata a `Source.StartActivity()` alloca un oggetto `Activity`. Quell'oggetto viene popolato con tag, timestamp e contesto di propagazione. Al termine, viene serializzato e inviato al collector via OTLP. Il garbage collector dovrà poi recuperare la memoria.

Collegando questo all'articolo 2: le stesse allocazioni che abbiamo misurato con BenchmarkDotNet nei pattern LINQ problematici si applicano anche al tracing. Ogni `Activity` è un oggetto sul managed heap. In un hot path che viene chiamato migliaia di volte al secondo, il solo overhead del tracing può introdurre pressione significativa sul GC.

### Linee guida pratiche

* **Debugging e sviluppo locale**: via libera. `.Monitor()` e `.MonitorElements()` sono strumenti perfetti per capire il comportamento di una pipeline durante lo sviluppo. Il costo è irrilevante quando non c'è traffico reale.

* **Staging con sampling**: accettabile. In un ambiente di staging si può abilitare il tracing su pipeline critiche, ma è buona pratica attivare il sampling per ridurre il volume.

* **Produzione con sampling aggressivo (1-5%)**: possibile per pipeline specifiche che si vogliono monitorare nel tempo. Il `TraceIdRatioBasedSampler` di OpenTelemetry permette di campionare solo una percentuale delle trace.

* **Hot path in produzione senza sampling**: da evitare. Se una pipeline viene eseguita centinaia di volte al secondo, anche un singolo `.Monitor()` può introdurre latenza misurabile.

* **`MonitorElements` su migliaia di elementi**: da evitare sempre in produzione. Creare uno span per elemento su una collezione di 10.000 record significa 10.000 allocazioni di `Activity`, 10.000 serializzazioni OTLP, e un trace su Grafana talmente grande da rendere la UI inutilizzabile.

### Il sampling in pratica

```csharp
// In produzione: campiona solo l'1% delle tracce
using var tracerProvider = Sdk.CreateTracerProviderBuilder()
    .SetResourceBuilder(ResourceBuilder.CreateDefault()
        .AddService("MyService"))
    .AddSource(LinqTracingExtensions.Source.Name)
    .SetSampler(new TraceIdRatioBasedSampler(0.01)) // 1%
    .AddOtlpExporter(opts =>
    {
        opts.Endpoint = new Uri("http://collector:4317");
    })
    .Build();
```

Con un `TraceIdRatioBasedSampler(0.01)`, il 99% delle chiamate a `StartActivity()` restituisce `null`. Il metodo `.Monitor()` gestisce già questo caso grazie all'operatore `?.` su `activity`. Il costo residuo è minimo: una chiamata a `StartActivity()` che ritorna immediatamente e nessuna allocazione.

La regola è chiara: **`.Monitor()` è uno strumento diagnostico, non un decoratore permanente.** Si usa per capire il comportamento, poi si rimuove o si protegge con sampling. Come un breakpoint: fondamentale in fase di debug, da non lasciare in produzione.

---

## Conclusioni

Questo quarto articolo chiude il percorso che abbiamo iniziato con gli errori LINQ trovati in produzione. Riassumiamo il viaggio:

1. **Articolo 1 -- Gli errori**: abbiamo identificato quattro pattern LINQ che trasformavano operazioni lineari in quadratiche o cubiche. `List.Contains()` in un `Where`, scansioni ripetute in `ToDictionary`, triplo nesting, allocazioni inutili nell'hot path.

2. **Articolo 2 -- I numeri**: con BenchmarkDotNet abbiamo quantificato il costo di ogni pattern. Non più "è lento" o "è veloce", ma nanosecondi, byte allocati e rapporti misurabili tra before e after.

3. **Articolo 3 -- Il compilatore**: abbiamo aperto il cofano di LINQ. State machine generate dal compilatore, iteratori specializzati in .NET 8, la differenza tra `IEnumerable` e `IQueryable`, il modello streaming che spiega *perché* certi operatori costano quello che costano.

4. **Articolo 4 -- La visualizzazione**: abbiamo reso tutto osservabile. Due extension method -- `.Monitor()` e `.MonitorElements()` -- che trasformano il comportamento astratto di una pipeline LINQ in span visibili su Grafana Tempo.

Il filo conduttore è sempre lo stesso: **LINQ non è "lento" o "veloce". È uno strumento il cui costo dipende da come lo usi.** La differenza tra chi lo usa bene e chi lo usa male non è la sintassi -- è la comprensione di cosa succede sotto. Chi conosce le state machine non scrive pipeline che rieseguono query. Chi conosce la complessità computazionale non mette un `List.Contains()` dentro un `Where`. Chi conosce il tracing non si affida a intuizioni per ottimizzare.

La prossima volta che un collega dirà "LINQ è lento, usiamo un `for`", avrai gli strumenti per rispondere con dati, non con opinioni.

---

## Risorse Utili

L'intero codice della serie -- errori, benchmark, tracing, demo Grafana Tempo -- è disponibile nel repository pubblico:

[https://github.com/monte97/dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)

Il progetto `src/LinqDeepDive.Tracing/` contiene tutti gli extension method e le demo descritte in questo articolo, pronti da eseguire con `docker compose up -d && dotnet run`.

### Articoli della serie

* [Articolo 1: 4 errori LINQ che ho trovato in produzione](/blog/progettare/system-design/01-errori-produzione/)
* [Articolo 2: Quanto costa davvero LINQ? Benchmark su .NET 8](/blog/progettare/system-design/02-benchmark-net8/)
* [Articolo 3: Cosa genera il compilatore quando scrivi una Where()](/blog/progettare/system-design/03-compilatore-state-machine/)

### Documentazione ufficiale

* **OpenTelemetry .NET SDK**: [opentelemetry.io/docs/languages/dotnet](https://opentelemetry.io/docs/languages/dotnet/)
* **Grafana Tempo**: [grafana.com/docs/tempo](https://grafana.com/docs/tempo/latest/)
* **grafana/otel-lgtm Docker image**: [github.com/grafana/docker-otel-lgtm](https://github.com/grafana/docker-otel-lgtm)
* **System.Diagnostics.Activity**: [learn.microsoft.com/dotnet/api/system.diagnostics.activity](https://learn.microsoft.com/dotnet/api/system.diagnostics.activity)

Se sei arrivato qui senza aver letto gli altri articoli, parti dal primo. Ogni articolo costruisce sul precedente, e il percorso completo -- dagli errori alla visualizzazione -- vale più della somma delle singole parti.
