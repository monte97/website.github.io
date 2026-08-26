---
title: Quanto Costa Davvero LINQ? Benchmark su .NET 8 con i Numeri
seoTitle: "Quanto costa LINQ: benchmark su .NET 8"
date: 2026-02-28T08:00:00.000Z
description: "Benchmark con BenchmarkDotNet su .NET 8: List contro HashSet fino a 63x, pipeline lazy con il 60% di allocazioni in meno, e il costo fisso di AsParallel."
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - Performance
  - BenchmarkDotNet
  - Allocazioni
lang: it
reviewed: true
series: linq
seriesOrder: 20
summary:
  - label: "Contesto"
    value: "I quattro pattern della serie rimisurati con BenchmarkDotNet su .NET 8"
    note: "Dataset sulle cardinalità del dispatcher: 50-500 veicoli, 200-5000 consegne, 100-2000 vincoli"
  - label: "Risultato"
    value: "List contro HashSet: fino a 63x a 500 elementi, a parità di allocazioni"
    note: "Il rapporto parte da circa 7x a 50 elementi e cresce col dataset"
  - label: "Scoperta"
    value: "La pipeline lazy alloca circa il 60% in meno delle liste intermedie"
    note: "Sul tempo la differenza è più contenuta: tra 1.5x e 1.6x"
  - label: "Costo reale"
    value: "Il costo fisso di AsParallel domina quando il lavoro per elemento è leggero"
    note: "Nei test la versione parallela è più lenta e alloca il doppio o il triplo"
openItems:
  - "I risultati sono indicativi sulla macchina di test: i numeri esatti vanno riprodotti eseguendo i benchmark dal repository"
  - "La soglia tra qualche microsecondo e qualche millisecondo per AsParallel è una regola empirica, non una misura del benchmark"
  - "Per indici oltre 500 elementi e hot path ad alto throughput la matrice resta sul «dipende»: decidere richiede misurazione sul proprio codice"
  - "Il trade-off del GroupBy non è gratis: l'indice costruito in una passata alloca più memoria dello scan ripetuto"
openNote: "Quello che i numeri non decidono, e che va misurato sul proprio codice."
mode: explanation
---

In ogni code review C# prima o poi qualcuno dice "qui LINQ è troppo lento, usa un for". Ma nessuno tira fuori un benchmark. Oggi lo facciamo -- su .NET 8, con BenchmarkDotNet, e con i pattern reali dell'articolo precedente.

Nel [primo articolo della serie](/blog/progettare/system-design/01-errori-produzione/) abbiamo visto quattro pattern LINQ trovati in un dispatcher per flotta commerciale. Le fix erano semplici -- `ToHashSet`, `GroupBy`, `ToLookup`, `foreach`. Ma *quanto* cambia in pratica? Dire "passa da O(n^2) a O(n)" è corretto sul piano teorico. Sul piano pratico, la domanda del tech lead è un'altra: "Quanti microsecondi risparmiamo? Quanta memoria in meno? Vale la pena del refactoring?". Oggi mettiamo i numeri.

---

## Setup: Come Misurare senza Mentire a Se Stessi

### Perché non basta Stopwatch

Il primo istinto per misurare le performance è usare `Stopwatch`. Sembra ragionevole, ma produce risultati inaffidabili:

```csharp
// Il modo sbagliato
var sw = Stopwatch.StartNew();
var result = items.Where(x => x > 50).ToList();
sw.Stop();
Console.WriteLine($"Elapsed: {sw.ElapsedMilliseconds}ms");
```

Questo approccio soffre di almeno quattro problemi. Il **JIT cold start** gonfia la prima esecuzione perché il codice viene compilato al volo. Il **rumore del GC** può inserire una pausa di raccolta nel bel mezzo della misurazione. Non c'è **warm-up** per stabilizzare la cache CPU. E con una singola esecuzione, il **rumore statistico** rende il numero sostanzialmente privo di significato.

### BenchmarkDotNet in 30 secondi

**BenchmarkDotNet** risolve tutti questi problemi. Gestisce warm-up, iterazioni multiple, statistiche robuste, e misura le allocazioni heap. La configurazione di base per i nostri test è questa:

```csharp
[MemoryDiagnoser]                       // misura allocazioni e pressione GC
[SimpleJob(RuntimeMoniker.Net80)]       // target runtime .NET 8
public class LinqBenchmarks
{
    [Params(50, 200, 500)]              // parametri variabili per dimensione
    public int VehicleCount { get; set; }

    private FleetData _data = null!;

    [GlobalSetup]
    public void Setup()
    {
        // DataGenerator genera dati realistici del dispatcher
        _data = DataGenerator.Generate(/* size from VehicleCount */);
    }
}
```

Tre attributi sono sufficienti: `[MemoryDiagnoser]` per le allocazioni, `[SimpleJob]` per il runtime target, `[Params]` per testare a diverse cardinalità.

### Cosa misuriamo

Per ogni benchmark raccogliamo tre categorie di dati:

* **Tempo**: mean, median e deviazione standard -- il mean da solo può nascondere outlier significativi
* **Allocazioni heap**: bytes allocati per singola operazione -- ogni allocazione è un futuro lavoro per il GC
* **Pressione GC**: quante raccolte Gen0, Gen1 e Gen2 per 1000 operazioni

Un insight fondamentale: in un contesto come il dispatcher dell'articolo 1, le **allocazioni sono spesso più importanti del tempo**. Un metodo che completa in 50 microsecondi ma alloca 100 KB ad ogni invocazione può causare pause GC imprevedibili durante i picchi di carico. Quando il budget di latenza è 100 ms, una pausa GC Gen2 da 50 ms è un problema serio.

> Tutti i benchmark usano il `DataGenerator` del progetto demo, che simula le cardinalità reali del dispatcher: 50-500 veicoli, 200-5000 consegne, 100-2000 vincoli.

---

## Benchmark 1: List.Contains vs HashSet.Contains

Questo benchmark corrisponde all'**errore 1** dell'articolo precedente: l'uso di `List.Contains()` dentro un `.Where()`, che trasformava un filtraggio lineare in quadratico.

### I contendenti

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/ListVsHashSetBenchmark.cs

[GlobalSetup]
public void Setup()
{
    _data = DataGenerator.Generate(/* size */);

    // Zone con restrizioni: simula gli ID da cercare
    _restrictedList = _data.Zones
        .Where(z => z.IsRestricted)
        .Select(z => z.Id)
        .ToList();

    _restrictedSet = _restrictedList.ToHashSet();
}

[Benchmark(Baseline = true)]
public List<Vehicle> ListContains()
{
    return _data.Vehicles
        .Where(v => _restrictedList.Contains(v.CurrentZoneId))
        .ToList();
}

[Benchmark]
public List<Vehicle> HashSetContains()
{
    return _data.Vehicles
        .Where(v => _restrictedSet.Contains(v.CurrentZoneId))
        .ToList();
}
```

L'unica differenza tra i due metodi è il tipo della collezione di lookup: `List<string>` contro `HashSet<string>`. Il codice LINQ è identico.

### Risultati

> Risultati indicativi su .NET 8 -- esegui i benchmark dal repo per i numeri sulla tua macchina.

| Method | VehicleCount | Mean | Allocated |
|--------|-------------|------|-----------|
| ListContains | 50 | 8.4 us | 2.1 KB |
| HashSetContains | 50 | 1.2 us | 2.1 KB |
| ListContains | 200 | 98.6 us | 7.8 KB |
| HashSetContains | 200 | 4.1 us | 7.8 KB |
| ListContains | 500 | 614.3 us | 18.4 KB |
| HashSetContains | 500 | 9.7 us | 18.4 KB |

### Analisi

Le allocazioni sono **identiche**. Entrambi i metodi producono lo stesso output, costruiscono la stessa `List<Vehicle>` risultante. Il costo non sta nell'allocazione: sta nel **confronto**.

`List.Contains()` esegue una scansione lineare: con 500 veicoli e una lista di lookup di ~150 zone ristrette, ogni chiamata a `Contains` attraversa in media metà della lista. Moltiplicato per 500 veicoli, si arriva a decine di migliaia di confronti. `HashSet.Contains()` è O(1) ammortizzato grazie alla hash table interna.

Il rapporto di velocità cresce con la dimensione del dataset: da ~7x a 50 veicoli, fino a ~63x a 500. La complessità asintotica non è un concetto astratto -- si vede nei numeri.

Vale la pena sottolineare un aspetto che spesso sfugge nelle discussioni da code review: il passaggio da `List` a `HashSet` non richiede nessun cambiamento alla query LINQ. Il `.Where()` resta identico. Cambia solo la struttura dati a monte. Questo è un principio generale: **scegliere la struttura dati giusta è quasi sempre più impattante che riscrivere la query**.

---

## Benchmark 2: Scan Ripetuto vs GroupBy con Indice

Questo benchmark corrisponde all'**errore 2**: la costruzione di strutture di lookup dove il value selector del `ToDictionary` scansionava l'intera collezione per ogni chiave.

### I contendenti

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/ScanVsGroupByBenchmark.cs

[Benchmark(Baseline = true)]
public List<(string Zone, int Count)> RepeatedScan()
{
    // Per ogni zona, conta le consegne pendenti scansionando TUTTE le consegne
    return _data.Zones.Select(z => (
        Zone: z.Name,
        Count: _data.Deliveries
            .Count(d => d.DestinationZoneId == z.Id
                     && d.Status == DeliveryStatus.Pending)
    )).ToList();
}

[Benchmark]
public List<(string Zone, int Count)> GroupByDictionary()
{
    // Singola passata: costruisce l'indice, poi lookup O(1) per zona
    var pendingByZone = _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .GroupBy(d => d.DestinationZoneId)
        .ToDictionary(g => g.Key, g => g.Count());

    return _data.Zones.Select(z => (
        Zone: z.Name,
        Count: pendingByZone.GetValueOrDefault(z.Id, 0)
    )).ToList();
}
```

`RepeatedScan` è il pattern "per ogni X, scansiona tutti gli Y". `GroupByDictionary` costruisce un indice in una singola passata e poi esegue lookup O(1).

### Risultati

> Risultati indicativi su .NET 8 -- esegui i benchmark dal repo per i numeri sulla tua macchina.

| Method | VehicleCount | Mean | Allocated |
|--------|-------------|------|-----------|
| RepeatedScan | 50 | 42.8 us | 4.6 KB |
| GroupByDictionary | 50 | 9.3 us | 8.2 KB |
| RepeatedScan | 200 | 1,284.5 us | 14.1 KB |
| GroupByDictionary | 200 | 78.6 us | 52.8 KB |
| RepeatedScan | 500 | 8,932.1 us | 33.7 KB |
| GroupByDictionary | 500 | 196.4 us | 128.4 KB |

### Analisi

Il pattern è chiarissimo. `RepeatedScan` scala in modo **quadratico**: raddoppiando le zone e le consegne, il tempo quadruplica. `GroupByDictionary` scala in modo **lineare**: la singola passata sulle consegne domina, e il lookup successivo è trascurabile.

A 500 veicoli (che corrisponde a 5000 consegne e ~30 zone nel dataset di test), il rapporto è di circa **45x**. In un dispatcher reale con centinaia di zone, il divario sarebbe ancora più marcato.

C'è però un trade-off: `GroupByDictionary` alloca di più. Il `ToDictionary` crea una struttura dati intermedia che `RepeatedScan` non necessita. In questo caso il trade-off è ovviamente favorevole -- pochi KB in più di allocazioni in cambio di un ordine di grandezza sul tempo. Ma è importante notarlo: l'ottimizzazione non è mai "gratis" su tutti gli assi.

Questo pattern è l'equivalente in memoria di ciò che un database fa con gli indici. Nessuno si sognerebbe di eseguire una query SQL senza indice su una tabella con migliaia di righe. Eppure nel codice applicativo si fa continuamente con i `.Where()` annidati. La regola è la stessa: se devi cercare più volte nella stessa collezione, **costruisci l'indice una volta sola**.

---

## Benchmark 3: Allocazioni Intermedie vs Pipeline Lazy

Questo benchmark affronta un tema diverso dagli errori di complessità algoritmica: il **costo delle allocazioni intermedie** nelle catene LINQ. Corrisponde alla parte dell'**errore 4** dell'articolo precedente.

### I contendenti

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/AllocationsVsForeachBenchmark.cs

[Benchmark(Baseline = true)]
public List<Delivery> IntermediateToList()
{
    // Tre .ToList() intermedi: materializza ad ogni passo
    return _data.Deliveries
        .Where(d => d.WeightKg > 100)
        .ToList()                                   // alloca lista 1
        .Where(d => d.Status == DeliveryStatus.Pending)
        .ToList()                                   // alloca lista 2
        .OrderByDescending(d => d.WeightKg)
        .ToList();                                  // alloca lista 3
}

[Benchmark]
public List<Delivery> LazyPipeline()
{
    // Pipeline lazy: un solo .ToList() finale
    return _data.Deliveries
        .Where(d => d.WeightKg > 100)
        .Where(d => d.Status == DeliveryStatus.Pending)
        .OrderByDescending(d => d.WeightKg)
        .ToList();                                  // alloca una sola volta
}
```

La differenza sembra banale: togliere due `.ToList()` intermedi. Ma ogni `ToList()` materializza l'intera sequenza in una nuova lista, allocando memoria heap e copiando i riferimenti.

### Risultati

> Risultati indicativi su .NET 8 -- esegui i benchmark dal repo per i numeri sulla tua macchina.

| Method | VehicleCount | Mean | Allocated |
|--------|-------------|------|-----------|
| IntermediateToList | 50 | 6.8 us | 14.2 KB |
| LazyPipeline | 50 | 4.1 us | 5.6 KB |
| IntermediateToList | 200 | 52.3 us | 98.4 KB |
| LazyPipeline | 200 | 34.7 us | 38.1 KB |
| IntermediateToList | 500 | 178.6 us | 241.8 KB |
| LazyPipeline | 500 | 112.4 us | 94.6 KB |

### Il punto chiave

Il messaggio qui non è "LINQ è lento". Il messaggio è: le **liste intermedie** sono il vero costo. La pipeline lazy fa esattamente lo stesso lavoro logico -- stessi filtri, stesso ordinamento -- ma alloca circa il **60% in meno** di memoria. Sul tempo la differenza è più contenuta (1.5-1.6x), ma sotto carico sostenuto quelle allocazioni extra significano raccolte GC più frequenti.

Questo benchmark contiene anche due confronti illuminanti:

```csharp
// .Count() > 0 vs .Any() — early exit a livello semantico
[Benchmark]
public bool CountGreaterZero()
    => _data.Deliveries
        .Where(d => d.Requirements.Any(r => r.Type == "HazMat"))
        .Count() > 0;

[Benchmark]
public bool AnyEarlyExit()
    => _data.Deliveries
        .Any(d => d.Requirements.Any(r => r.Type == "HazMat"));
```

`.Count() > 0` enumera **tutta** la sequenza per poi controllare se il conteggio è positivo. `.Any()` si ferma al **primo elemento** trovato. Con 5000 consegne di cui solo una manciata contiene requisiti "HazMat", la differenza è di un ordine di grandezza.

Stesso principio per `.OrderByDescending().First()` contro `.MaxBy()`:

```csharp
// OrderBy + First: O(n log n) per trovare il massimo
[Benchmark]
public Delivery OrderByFirst()
    => _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .OrderByDescending(d => d.WeightKg)
        .First();

// MaxBy: O(n), una sola passata
[Benchmark]
public Delivery MaxByLinear()
    => _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .MaxBy(d => d.WeightKg)!;
```

`OrderByDescending` ordina l'intera sequenza con complessità O(n log n) e alloca un buffer interno. `MaxBy` (introdotto in .NET 6) attraversa la sequenza una sola volta in O(n) senza il buffer di ordinamento intermedio. Per trovare un singolo estremo, ordinare è uno spreco.

---

## Benchmark 4: Il Costo Nascosto di AsParallel

L'ultimo benchmark affronta un anti-pattern particolarmente insidioso: l'uso di `AsParallel()` su collezioni dove l'overhead di parallelizzazione supera il beneficio.

### I contendenti

```csharp
// src/LinqDeepDive.Benchmarks/Benchmarks/AsParallelBenchmark.cs

[Benchmark(Baseline = true)]
public List<(int VehicleId, int DeliveryId)> SequentialNesting()
{
    var pendingByZone = _data.Deliveries
        .Where(d => d.Status == DeliveryStatus.Pending)
        .ToLookup(d => d.DestinationZoneId);

    var restrictionsByZoneType = _data.Restrictions
        .ToLookup(r => (r.ZoneId, r.VehicleType));

    return _data.Vehicles
        .Where(v => v.IsAvailable)
        .SelectMany(v =>
        {
            var zoneDeliveries = pendingByZone[v.CurrentZoneId];
            var zoneRestrictions = restrictionsByZoneType[
                (v.CurrentZoneId, v.Type)];

            return zoneDeliveries
                .Where(d => !zoneRestrictions
                    .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot)))
                .Select(d => (VehicleId: v.Id, DeliveryId: d.Id));
        })
        .ToList();
}

[Benchmark]
public List<(int VehicleId, int DeliveryId)> ParallelNesting()
{
    // Stesso codice, con AsParallel() prima di SelectMany
    // ... identico ma con .AsParallel() dopo il .Where()
}
```

La versione parallela aggiunge una singola chiamata `.AsParallel()` al punto d'ingresso della `SelectMany`. L'idea sembra ragionevole: ogni veicolo viene valutato in modo indipendente, il lavoro è parallelizzabile.

### Risultati

> Risultati indicativi su .NET 8 -- esegui i benchmark dal repo per i numeri sulla tua macchina.

| Method | VehicleCount | Mean | Gen0 | Allocated |
|--------|-------------|------|------|-----------|
| SequentialNesting | 200 | 148.2 us | 12.2 | 51.3 KB |
| ParallelNesting | 200 | 287.4 us | 18.7 | 142.6 KB |
| SequentialNesting | 500 | 412.8 us | 34.1 | 142.8 KB |
| ParallelNesting | 500 | 486.3 us | 42.5 | 318.7 KB |

### Dove se ne va il tempo

`AsParallel()` ha un **costo fisso** che viene pagato indipendentemente dalla dimensione del lavoro:

* **Partitioning**: dividere la sequenza in chunk per i diversi thread
* **Task scheduling**: creare e coordinare i task nel thread pool
* **Sincronizzazione risultati**: raccogliere gli output parziali nell'ordine corretto (o in ordine arbitrario con `AsUnordered`)
* **Allocazioni extra**: buffer per ogni partizione, oggetti di sincronizzazione

Con lavoro leggero per elemento -- pochi lookup in strutture pre-indicizzate -- quel costo fisso **domina**. La versione parallela è più lenta della sequenziale, e alloca il doppio o il triplo di memoria.

### Quando AsParallel conviene davvero

`AsParallel` diventa vantaggioso quando il lavoro per singolo elemento è **computazionalmente pesante**: calcoli matematici complessi, I/O bloccante, elaborazione di immagini. Per operazioni leggere come lookup in dizionari o confronti semplici, il costo del coordinamento supera il beneficio della parallelizzazione.

Una regola empirica: se il corpo della lambda impiega meno di qualche microsecondo per elemento, `AsParallel` sarà quasi certamente più lento. Se impiega millisecondi, vale la pena provare.

C'è anche un aspetto spesso trascurato: la **thread safety**. `AsParallel` esegue la lambda su thread diversi. Se la lambda accede a stato condiviso mutabile -- un contatore, una lista non thread-safe, un dizionario -- il risultato può essere corretto il 99% delle volte e sbagliato nell'1% più difficile da debuggare. Il codice sequenziale non ha questo problema.

---

## La Matrice Decisionale

Dopo quattro benchmark, possiamo costruire una guida pratica. Non ogni riga di LINQ va ottimizzata -- la leggibilità ha un valore concreto in termini di manutenzione e debugging.

| Contesto | LINQ OK? | Perché |
|----------|----------|---------|
| Startup / inizializzazione (una volta) | Sì | Leggibilità pesa più della performance |
| Business logic CRUD | Sì | Il database è il bottleneck, non LINQ |
| Costruzione indici su dati in memoria | Dipende | Con cardinalità > 500, valutare GroupBy/ToLookup |
| Hot path ad alto throughput | Dipende | Misurare le allocazioni con `[MemoryDiagnoser]` |
| Tight loop su dati grandi | No | foreach con break vince per early exit e zero allocazioni |
| Collezioni piccole + AsParallel | No | Overhead di coordinamento > beneficio |

### Il messaggio

Non riscrivere tutto in `foreach`. Sarebbe un errore nella direzione opposta. La maggior parte del codice di un'applicazione **non è un hot path**. Quello che serve è:

1. **Identificare** gli hot path con un profiler
2. **Misurare** con BenchmarkDotNet prima di toccare il codice
3. **Ottimizzare** solo dove i numeri lo giustificano
4. **Validare** che l'ottimizzazione abbia prodotto il miglioramento atteso

LINQ è un eccellente strumento di espressività. Il problema non è mai "LINQ in sé" -- è la **complessità algoritmica nascosta** (scan ripetuti, lookup lineari) e le **allocazioni non necessarie** (materializzazioni intermedie, parallelismo inutile).

In altre parole: la prossima volta che qualcuno dice "LINQ è troppo lento" in code review, la risposta giusta non è "riscrivi in foreach". È "apri BenchmarkDotNet e mostrami i numeri".

---

## Conclusioni

I benchmark di questo articolo raccontano una storia coerente:

* **List vs HashSet**: stessa sintassi, fino a 63x di differenza. Il tipo della struttura dati conta più dell'espressione LINQ.
* **Scan vs GroupBy**: costruire un indice prima del loop trasforma una complessità quadratica in lineare. Il rapporto cresce con il dataset.
* **Allocazioni intermedie**: il `.ToList()` nel mezzo della pipeline è il nemico silenzioso. La pipeline lazy alloca il 60% in meno. E operatori come `.Any()` e `.MaxBy()` eliminano lavoro inutile per costruzione.
* **AsParallel**: su operazioni leggere con collezioni < 500 elementi, il parallelismo è controproducente. Il coordinamento costa più del lavoro.

Tutti i benchmark sono eseguibili dal repository del progetto:

[https://github.com/monte97/dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)

Il progetto si trova in `src/LinqDeepDive.Benchmarks/`. Per eseguire i benchmark sulla propria macchina:

```bash
cd src/LinqDeepDive.Benchmarks
dotnet run -c Release
```

Ora sai *quanto* costa. Ma *perché* costa esattamente quello che costa? Nel prossimo articolo apriamo il cofano: cosa genera il compilatore quando scrivi una `.Where()`? State machine, iteratori, closure -- il codice che non hai mai scritto ma che viene eseguito ad ogni chiamata LINQ.

## Risorse Utili

* **BenchmarkDotNet Documentation**: [BenchmarkDotNet Docs](https://benchmarkdotnet.org/articles/overview.html)
* **Repository demo della serie**: [dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)
* **Performance best practices .NET**: [Microsoft Docs - Performance](https://learn.microsoft.com/en-us/dotnet/core/performance/)
* **MemoryDiagnoser deep dive**: [BenchmarkDotNet Memory Diagnoser](https://benchmarkdotnet.org/articles/configs/diagnosers.html)
