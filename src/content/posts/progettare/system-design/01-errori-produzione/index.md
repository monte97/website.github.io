---
title: 4 Errori LINQ che Ho Trovato in Produzione (e Come Costavano 1000x)
seoTitle: "LINQ: quattro errori trovati in produzione"
date: 2026-02-21T08:00:00.000Z
description: "Quattro pattern LINQ che trasformano operazioni lineari in quadratiche, da un audit su un dispatcher di flotta con budget di latenza sotto i 100ms."
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - Performance
  - HashSet
  - ToLookup
lang: it
draft: false
reviewed: human
series: linq
seriesOrder: 10
summary:
  - label: "Contesto"
    value: "Audit performance su un dispatcher di flotta commerciale"
    note: "Flotta interamente in memoria, budget di latenza sotto i 100ms"
  - label: "Problema"
    value: "Quattro pattern LINQ trasformavano operazioni lineari in quadratiche"
    note: "Singolarmente sembravano ragionevoli, insieme sforavano il budget"
  - label: "Strumento"
    value: "ToHashSet, GroupBy e ToLookup: costruire l'indice prima del loop"
  - label: "Costo reale"
    value: "Il filtraggio del primo pattern passa da 1.400.000 confronti a circa 2000"
    note: "Da centinaia di millisecondi a meno di 1ms"
openItems:
  - "Le stime di costo derivano dal conteggio delle operazioni sulle cardinalità del dispatcher: il confronto misurato con BenchmarkDotNet non fa parte dell'articolo"
  - "La soglia dei 500 elementi sotto cui AsParallel non conviene presuppone lavoro per elemento trascurabile: serve misura prima di parallelizzare"
  - "Con liste di lookup piccole il costo è impercettibile: dove intervenire dipende dalle cardinalità del proprio dominio"
  - "La scelta tra pipeline LINQ e foreach esplicito nell'hot path resta aperta: il foreach è più verboso ma porta early exit e zero allocazioni"
openNote: "I confini che l'audit non chiude, e che spettano a chi porta questi pattern nel proprio codice."
mode: explanation
---

Qualche mese fa ho fatto un audit di performance su un servizio di dispatch per una flotta di veicoli commerciali. Il sistema gestisce centinaia di consegne al giorno e decide in tempo reale quale veicolo assegnare a ogni nuovo ordine, rispettando vincoli di zona, capacità, orario e tipo merce.

Per garantire tempi di risposta sotto i 100ms, l'intera flotta vive in memoria: veicoli, autisti, consegne, zone e vincoli. Il database viene letto all'avvio; durante l'operatività, tutto passa dalla cache. Il codice funzionava. L'assegnamento produceva risultati corretti. Ma con flotte grandi (400+ veicoli, 2000+ vincoli, 5000+ consegne), le operazioni di inizializzazione e i picchi di carico facevano sforare il budget di latenza.

Il profiler ha rivelato quattro pattern LINQ che, singolarmente, sembravano ragionevoli. Insieme, trasformavano operazioni lineari in quadratiche -- o peggio.

---

## Il Dominio: Dispatch per Flotta Commerciale

Prima di entrare nel dettaglio degli errori, è utile avere una visione d'insieme delle entità coinvolte. Il servizio lavora su un modello di dominio relativamente semplice, ma le cardinalità rendono ogni scelta algoritmica significativa.

| Entità | Descrizione | Cardinalità |
|--------|-------------|-------------|
| `Vehicle` | Veicolo della flotta (Van, Truck, Bike) | 50-500 |
| `Driver` | Autista con patenti e abilitazioni | 50-500 |
| `Delivery` | Consegna da assegnare o già assegnata | 200-5000 |
| `Zone` | Zona geografica (provincia, CAP, ZTL) | 20-200 |
| `Restriction` | Vincolo su tipo veicolo per zona e fascia oraria | 100-2000 |
| `TimeSlot` | Fascia oraria (inizio-fine) | 5 standard |
| `DeliveryRequirement` | Requisito specifico di una consegna (Refrigerato, Fragile, HazMat) | 500-5000 |

Le relazioni tra le entità seguono questo schema:

```text
Vehicle ──── Driver             (1:1 per turno)
Vehicle ──── Zone               (N:M — zone coperte)
Vehicle ──── Restriction        (via Type + Zone)
Delivery ──── Zone              (N:1 — zona di destinazione)
Delivery ──── DeliveryRequirement  (1:N — requisiti della consegna)
Zone ──── Restriction           (1:N — vincoli della zona)
```

Con 500 veicoli, 2000 vincoli e 5000 consegne, ogni operazione che scansiona l'intera collezione per ogni elemento di un'altra collezione genera milioni di confronti. Vediamo dove si nascondono.

---

## Errore 1: `List.Contains()` dentro `.Where()` -- L'O(n^2) Invisibile

### Il Problema

Il primo pattern problematico riguarda il filtraggio dei veicoli che si trovano in zone con restrizioni attive. Lo scenario è semplice: dato un elenco di zone ristrette, trovare tutti i veicoli attualmente posizionati in quelle zone.

Il codice originale sembrava perfettamente innocuo:

```csharp
// Le zone ristrette vengono estratte come List<string>
var restrictedZoneIds = zones
    .Where(z => z.IsRestricted)
    .Select(z => z.Id)
    .ToList();

// Per ogni veicolo, si verifica se la sua zona è nella lista
var vehiclesInRestrictedZones = vehicles
    .Where(v => restrictedZoneIds.Contains(v.CurrentZoneId))
    .ToList();
```

Il codice compila, supera la code review, e produce risultati corretti. Ma nasconde un costo computazionale che cresce in modo non lineare.

### Perché `List.Contains` è O(n)

Quando si chiama `.Contains()` su una `List<T>`, il runtime non ha altra scelta che scorrere gli elementi uno per uno fino a trovare una corrispondenza o raggiungere la fine della lista. Non esiste un indice, non esiste una struttura di hash. È una **scansione lineare** pura.

Immaginiamo di cercare un nome in un elenco telefonico non ordinato: bisogna leggere ogni riga, dalla prima all'ultima, finché non si trova quello giusto. Con 6 zone ristrette la cosa è impercettibile. Ma il pattern diventa pericoloso quando la lista di lookup cresce.

In un contesto più realistico dello stesso servizio, il filtraggio non avviene su 6 zone ma su centinaia di ID. Consideriamo il caso in cui si filtrano 2000 vincoli (`Restriction`) verificando se il loro `ZoneId` appartiene a una lista di 700 zone coperte dalla flotta attiva:

* **2000 vincoli** da scansionare
* Per ciascuno, `.Contains()` su una lista di **700 ID**
* Caso peggiore: **2000 x 700 = 1.400.000 confronti**

Il `.Where()` esterno è O(n). Il `.Contains()` interno è O(m). Il risultato complessivo è **O(n * m)** -- una complessità quadratica nascosta dietro due righe di codice dichiarativo.

### La Soluzione: `ToHashSet()`

La fix è una singola parola: `ToHashSet()` al posto di `ToList()`.

```csharp
// Stesse zone, ma come HashSet — lookup O(1)
var restrictedZoneIds = zones
    .Where(z => z.IsRestricted)
    .Select(z => z.Id)
    .ToHashSet();

// Ora ogni Contains è O(1) invece di O(n)
var vehiclesInRestrictedZones = vehicles
    .Where(v => restrictedZoneIds.Contains(v.CurrentZoneId))
    .ToList();
```

Un `HashSet<T>` mantiene internamente una **hash table**: quando si chiama `.Contains()`, il runtime calcola l'hash dell'elemento cercato, determina il bucket corrispondente e verifica la presenza in tempo costante -- **O(1)** ammortizzato, indipendentemente dalla dimensione della collezione.

Tornando all'analogia dell'elenco telefonico: è come passare da un elenco non ordinato a una rubrica indicizzata per lettera. Non si scorre più ogni riga: si va direttamente alla sezione giusta.

### La Variante Insidiosa: IEnumerable Lazy che si Ri-enumera

Esiste una variante ancora più subdola di questo pattern. Quando la collezione di lookup non viene materializzata, ogni chiamata a `.Contains()` ri-esegue l'intera pipeline LINQ dall'inizio:

```csharp
// Select() restituisce un IEnumerable lazy — nessuna materializzazione
var completedIds = deliveries.Select(d => d.Id);

// Ogni chiamata a completedIds.Contains() ri-esegue il Select da capo
var pending = allDeliveries.FindAll(d => !completedIds.Contains(d.Id));
```

In questo caso il costo non è solo O(n * m): ogni `.Contains()` ri-enumera l'intero `IEnumerable`, ricalcolando la proiezione `.Select()` da zero. Con 5000 consegne totali e 3000 già completate, si arriva a **5000 x 3000 = 15 milioni** di operazioni, ognuna delle quali include l'esecuzione del delegate nel `.Select()`.

La fix è la stessa, ma con un passaggio mentale diverso -- bisogna **materializzare** prima di usare come lookup:

```csharp
// Materializzare sempre prima del lookup
var completedIds = deliveries.Select(d => d.Id).ToHashSet();
var pending = allDeliveries.Where(d => !completedIds.Contains(d.Id)).ToList();
```

### Impatto

Da ~1.4M confronti a ~2000 (uno per ogni vincolo, con lookup O(1)). Il tempo di filtraggio passa da centinaia di millisecondi a meno di 1ms.

### Regola Pratica

> Se usi `.Contains()` su una collezione dentro un `.Where()`, chiediti: è un `HashSet` o una `List`? La sintassi è identica. Il costo no.

---

## Errore 2: Scan Ripetuto dentro `ToDictionary` -- L'Indice che Non C'è

### Il Problema

Il secondo pattern riguarda la costruzione di strutture di lookup all'avvio del servizio. L'obiettivo è creare dizionari che permettano di rispondere rapidamente a domande come "per questa zona, quante consegne pending ci sono?".

Il codice originale utilizzava `ToDictionary` con un lambda che, per ogni zona, scansionava **tutte** le consegne:

```csharp
// O(zone * consegne) — riscansiona tutta la lista per ogni zona
var pendingPerZone = zones.Select(z => new
{
    Zone = z.Name,
    PendingCount = deliveries
        .Count(d => d.DestinationZoneId == z.Id
                  && d.Status == DeliveryStatus.Pending)
}).ToList();
```

### L'Analogia del Database

Per chi ha familiarità con i database relazionali, questo pattern è l'equivalente esatto di una query senza indice eseguita N volte. Immaginiamo di avere una tabella `deliveries` senza indice su `DestinationZoneId`. Per ogni zona, il database dovrebbe fare un **full table scan** di tutte le consegne.

Con 20 zone e 5000 consegne, il costo è **20 x 5000 = 100.000** confronti. Non catastrofico, ma lo stesso pattern in contesti più complessi esplode. Consideriamo la costruzione di un indice vincoli-per-veicolo:

```csharp
// Per ogni veicolo, filtra TUTTI i vincoli — 500 x 2000 = 1M confronti
var restrictionsByVehicle = vehicles.ToDictionary(
    v => v.Id,
    v => restrictions
        .Where(r => r.VehicleType == v.Type
                  && r.ZoneId == v.CurrentZoneId)
        .ToList()
);
```

Il lambda nel **value selector** di `ToDictionary` viene eseguito una volta per ogni veicolo. Ogni esecuzione scorre l'intera lista di vincoli. Con 500 veicoli e 2000 vincoli: **1.000.000 di confronti** per costruire un dizionario.

### La Soluzione: `GroupBy` + `ToDictionary` (Singola Scansione)

L'idea è invertire l'approccio: invece di cercare i vincoli *per ogni* veicolo, si raggruppano i vincoli *una sola volta* e poi si assemblano i risultati.

```csharp
// O(consegne) — una sola scansione, poi lookup O(1) per zona
var pendingByZone = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .GroupBy(d => d.DestinationZoneId)
    .ToDictionary(g => g.Key, g => g.Count());

// Assemblaggio: O(zone) con lookup O(1)
var pendingPerZone = zones.Select(z => new
{
    Zone = z.Name,
    PendingCount = pendingByZone.GetValueOrDefault(z.Id, 0)
}).ToList();
```

La scansione delle consegne avviene **una sola volta**. Il `GroupBy` crea i raggruppamenti in un singolo passaggio, e il `ToDictionary` finale li trasforma in una struttura con lookup O(1). Il costo totale passa da O(zone * consegne) a **O(consegne + zone)**.

### `ToLookup` vs `GroupBy` + `ToDictionary`

Per scenari con relazioni più complesse, `ToLookup` è spesso preferibile a `GroupBy` + `ToDictionary`. Un [`ILookup<TKey, TElement>`](https://learn.microsoft.com/dotnet/api/system.linq.ilookup-2) è essenzialmente un dizionario immutabile dove ogni chiave mappa a una collezione di valori -- e, a differenza di un `Dictionary`, restituisce una **sequenza vuota** per chiavi inesistenti invece di lanciare un'eccezione.

Consideriamo uno scenario con relazione doppia: per ogni veicolo si vogliono trovare sia le restrizioni standard (che si applicano a tutti i veicoli di quel tipo in quella zona) sia quelle specifiche per quel singolo veicolo:

```csharp
// Due indici costruiti in un singolo passaggio ciascuno
var restrictionsByZoneAndType = restrictions
    .ToLookup(r => (r.ZoneId, r.VehicleType));

// Assemblaggio: O(veicoli) con lookup O(1) per coppia (zona, tipo)
var restrictionsByVehicle = vehicles.ToDictionary(
    v => v.Id,
    v =>
    {
        // Lookup diretto sulla coppia (zona, tipo) — O(1)
        var applicable = restrictionsByZoneAndType[(v.CurrentZoneId, v.Type)];
        return applicable.ToList();
    }
);
```

La chiave composta con tupla `(ZoneId, VehicleType)` permette di indicizzare su **due dimensioni contemporaneamente**. `ToLookup` supporta nativamente qualsiasi tipo come chiave, purché implementi `GetHashCode` e `Equals` -- e le tuple di valore in C# lo fanno automaticamente.

### Impatto

Da ~1M iterazioni a ~2500 (una scansione dei vincoli + un lookup per veicolo). Il tempo di costruzione dell'indice passa da decine di millisecondi a meno di 1ms.

### Regola Pratica

> Se dentro un `ToDictionary` hai un `.Where()` su un'altra collezione, stai facendo un nested loop. `GroupBy` e `ToLookup` sono l'equivalente di creare un indice prima della query.

---

## Errore 3: Triple Nesting -- L'O(n^3) in Tre Righe di Codice

### Il Problema

Questo è l'errore più pericoloso della lista, perché il codice **sembra ragionevole**. Lo scenario: per ogni veicolo disponibile, si cercano le consegne pending nella sua zona, e per ciascuna si verifica che non esistano restrizioni che bloccano quel tipo di veicolo nello slot orario richiesto.

```csharp
// O(V * D * R) — tre livelli di iterazione annidati
var assignments = vehicles
    .Where(v => v.IsAvailable)
    .SelectMany(v => deliveries
        .Where(d => d.Status == DeliveryStatus.Pending
                 && d.DestinationZoneId == v.CurrentZoneId)
        .Where(d => !restrictions
            .Any(r => r.ZoneId == d.DestinationZoneId
                   && r.VehicleType == v.Type
                   && r.BlockedSlot.Overlaps(d.PreferredSlot)))
        .Select(d => new { VehicleId = v.Id, DeliveryId = d.Id }))
    .ToList();
```

Letto in modo dichiarativo, il codice dice esattamente quello che deve fare: "per ogni veicolo disponibile, trova le consegne nella sua zona che non hanno restrizioni bloccanti". Tre concetti, tre livelli di query. Tutto molto LINQ-idiomatico.

### Perché è O(n^3)

Contiamo i livelli di iterazione:

1. **Livello 1**: ciclo sui veicoli disponibili (~200 su 500)
2. **Livello 2**: per ogni veicolo, scansione di *tutte* le consegne pending (~1000 su 5000)
3. **Livello 3**: per ogni coppia veicolo-consegna, `.Any()` su *tutti* i vincoli (~2000)

Il costo nel caso peggiore: **200 x 1000 x 2000 = 400.000.000** di operazioni. In pratica, il `.Where()` sulla zona e lo short-circuit di `.Any()` riducono il numero effettivo, ma anche con fattori di riduzione generosi si resta nell'ordine dei milioni.

Il .Where() interno alla `.Any()` è particolarmente insidioso: viene eseguito potenzialmente per ogni combinazione veicolo-consegna, e ogni volta scorre l'intera lista dei vincoli. È un full scan ripetuto all'interno di un full scan ripetuto all'interno di un ciclo. Tre livelli.

### La Soluzione: Pre-indicizzazione in 4 Step

La strategia è sempre la stessa: **costruire gli indici prima del ciclo**, così che ogni lookup sia O(1) invece di O(n).

```csharp
// Step 1: indicizzare le consegne pending per zona — O(D)
var pendingByZone = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .ToLookup(d => d.DestinationZoneId);

// Step 2: indicizzare i vincoli per coppia (zona, tipo veicolo) — O(R)
var restrictionsByZoneAndType = restrictions
    .ToLookup(r => (r.ZoneId, r.VehicleType));

// Step 3: assemblare con lookup O(1) — O(V * D_zona * R_zona_tipo)
var assignments = vehicles
    .Where(v => v.IsAvailable)
    .SelectMany(v =>
    {
        // O(1) — lookup per zona, restituisce solo le consegne di QUELLA zona
        var zoneDeliveries = pendingByZone[v.CurrentZoneId];

        // O(1) — lookup per coppia, restituisce solo i vincoli pertinenti
        var zoneRestrictions = restrictionsByZoneAndType[
            (v.CurrentZoneId, v.Type)];

        return zoneDeliveries
            .Where(d => !zoneRestrictions
                .Any(r => r.BlockedSlot.Overlaps(d.PreferredSlot)))
            .Select(d => new { VehicleId = v.Id, DeliveryId = d.Id });
    })
    .ToList();
```

La differenza fondamentale: nel codice originale, per ogni veicolo si scansionavano *tutte* le consegne e *tutti* i vincoli. Nella versione ottimizzata, `pendingByZone` restituisce solo le consegne nella zona del veicolo corrente, e `restrictionsByZoneAndType` restituisce solo i vincoli per quella coppia (zona, tipo).

Se le 1000 consegne pending sono distribuite su 20 zone, ogni veicolo vede in media **50 consegne** invece di 1000. Se i 2000 vincoli sono distribuiti su 20 zone x 3 tipi, ogni coppia ha in media **~33 vincoli** invece di 2000. Il costo effettivo scende a **200 x 50 x 33 = 330.000** operazioni -- tre ordini di grandezza in meno rispetto al caso originale.

### Impatto

Da secondi a millisecondi. Il `ToLookup` con chiave composta (tupla) è la chiave: permette di indicizzare su due dimensioni contemporaneamente, trasformando un full scan in un lookup diretto.

### Regola Pratica

> Conta i livelli di nesting. Loop + loop + Where = O(n^3). La soluzione è sempre: costruire l'indice *prima* del loop.

---

## Errore 4: Allocazioni Inutili e Mancato Early Exit -- Quando il `foreach` Vince

### Il Pattern delle Allocazioni Intermedie

I primi tre errori riguardano la complessità algoritmica. Il quarto è più sottile: non cambia la complessità asintotica, ma il **costo costante** di ogni operazione. Nell'hot path -- codice eseguito migliaia di volte al minuto durante i picchi -- anche piccole inefficienze si accumulano.

Il codice originale costruiva liste intermedie per rispondere a domande che non richiedevano materializzazione:

```csharp
// Tre allocazioni per ottenere una lista filtrata e ordinata
var heavyDeliveries = deliveries
    .Where(d => d.WeightKg > 100)
    .ToList()                           // allocazione 1
    .Where(d => d.Status == DeliveryStatus.Pending)
    .ToList()                           // allocazione 2
    .OrderByDescending(d => d.WeightKg)
    .ToList();                          // allocazione 3
```

Ogni `.ToList()` intermedio alloca un nuovo `List<T>`, copia gli elementi, e produce pressione sul Garbage Collector. In questo caso specifico, la prima `ToList()` è del tutto inutile: i due `.Where()` possono essere concatenati in una singola pipeline lazy, materializzando solo alla fine.

### La Soluzione: Pipeline Lazy + Operatori Corretti

```csharp
// Pipeline lazy — materializzazione solo alla fine
var heavyDeliveries = deliveries
    .Where(d => d.WeightKg > 100)
    .Where(d => d.Status == DeliveryStatus.Pending)
    .OrderByDescending(d => d.WeightKg)
    .ToList(); // una sola allocazione
```

Ma l'ottimizzazione più importante riguarda gli operatori scelti. Due pattern frequenti nell'hot path del servizio di dispatch:

**`.Count() > 0` vs `.Any()`**: quando si vuole solo sapere se esiste almeno un elemento che soddisfa una condizione, `.Any()` esce al primo match. `.Count()` scorre l'intera collezione anche se il primo elemento già risponde alla domanda.

```csharp
// Count() scorre TUTTA la collezione
var hasHazMat = deliveries
    .Where(d => d.Requirements.Any(r => r.Type == "HazMat"))
    .Count() > 0;

// Any() esce al primo match
var hasHazMat = deliveries
    .Any(d => d.Requirements.Any(r => r.Type == "HazMat"));
```

**`.OrderBy().First()` vs `.MaxBy()`**: quando serve solo l'elemento con il valore massimo (o minimo), `OrderBy` ordina l'intera collezione con complessità O(n log n), mentre [`MaxBy`](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.maxby) (disponibile da .NET 6) fa una singola scansione in O(n):

```csharp
// OrderBy ordina tutto — O(n log n) + allocazione
var heaviest = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .OrderByDescending(d => d.WeightKg)
    .ToList()
    .First();

// MaxBy — singola scansione O(n), zero allocazioni intermedie
var heaviest = deliveries
    .Where(d => d.Status == DeliveryStatus.Pending)
    .MaxBy(d => d.WeightKg)!;
```

### Quando il `foreach` Batte LINQ

In alcuni casi, la scelta più performante è abbandonare LINQ a favore di un `foreach` esplicito. Consideriamo la validazione di un assegnamento veicolo-consegna, un metodo chiamato centinaia di volte al minuto:

```csharp
// Versione LINQ: 3 allocazioni per una risposta booleana
public bool IsAssignmentValid(Vehicle vehicle, Delivery currentDelivery, List<Restriction> restrictions)
{
    var vehicleRestrictions = restrictions
        .Where(r => r.VehicleType == vehicle.Type)
        .ToList();                                           // allocazione 1
    var zoneRestrictions = vehicleRestrictions
        .Where(r => r.ZoneId == vehicle.CurrentZoneId)
        .Select(r => r.BlockedSlot)
        .ToList();                                           // allocazione 2

    return !zoneRestrictions.Any(slot =>
        slot.Overlaps(currentDelivery.PreferredSlot));
}
```

La versione con `foreach` elimina tutte le allocazioni e introduce l'**early exit** -- se il primo vincolo già invalida l'assegnamento, non serve controllare i restanti:

```csharp
// Versione foreach: zero allocazioni, early exit
public bool IsAssignmentValid(Vehicle vehicle, Delivery currentDelivery, List<Restriction> restrictions)
{
    foreach (var restriction in restrictions)
    {
        if (restriction.VehicleType != vehicle.Type) continue;
        if (restriction.ZoneId != vehicle.CurrentZoneId) continue;

        if (restriction.BlockedSlot.Overlaps(currentDelivery.PreferredSlot))
            return false; // early exit — non serve controllare altro
    }
    return true;
}
```

Nel servizio di dispatch, l'early exit saltava in media il **60% delle valutazioni**: nella maggior parte dei casi, il primo o il secondo vincolo già determinava il risultato.

### La Trappola di `AsParallel`

Un ultimo pattern emerso dall'audit: l'uso di `AsParallel()` su collezioni piccole. La parallelizzazione introduce overhead di partitioning, scheduling e sincronizzazione dei thread. Su collezioni con meno di 500 elementi e lavoro per elemento trascurabile, questo overhead **supera il beneficio**:

```csharp
// AsParallel su collezioni piccole — l'overhead supera il beneficio
var results = vehicles
    .AsParallel()
    .ToDictionary(
        v => v.Id,
        v => IsAssignmentValid(v, restrictions));
```

La versione sequenziale con `Dictionary` pre-allocato è più veloce:

```csharp
// Sequenziale con pre-allocazione — più veloce per collezioni <500
var results = new Dictionary<int, bool>(capacity: vehicles.Count);

foreach (var vehicle in vehicles)
{
    results[vehicle.Id] = IsAssignmentValid(vehicle, restrictions);
}
```

### Regola Pratica

> LINQ non è sempre la risposta. Nell'hot path, ogni `.ToList()` è un'allocazione, ogni `.Where()` crea un iteratore. Un `foreach` con `break` è più verboso ma a volte è la scelta giusta. E `.AsParallel()` conviene solo se il lavoro per elemento è significativo -- misura prima di parallelizzare.

---

## Il Denominatore Comune

Ricapitoliamo i quattro errori e le rispettive soluzioni in una tabella sinottica:

| # | Pattern | Complessità Before | Fix | Complessità After |
|---|---------|-------------------|-----|------------------|
| 1 | `List.Contains()` in `.Where()` | O(n * m) | `ToHashSet()` | O(n) |
| 2 | `.Where()` dentro `ToDictionary` | O(n * m) | `GroupBy` / `ToLookup` | O(n + m) |
| 3 | Triple nesting `foreach` + `Where` | O(n * m * k) | Pre-indicizzazione con `ToLookup` composito | O(n + m + V * avg_D * avg_R) |
| 4 | Allocazioni intermedie, no early exit | O(n) con k allocazioni | `foreach` + `break`, `Any()`, `MaxBy()` | O(n) con 0 allocazioni |

Il filo conduttore è uno solo: **LINQ è dichiarativo, ma l'esecuzione è imperativa**. La stessa sintassi -- `.Contains()`, `.Where()`, `.Select()` -- nasconde costi radicalmente diversi a seconda della struttura dati sottostante. `.Contains()` su una `List` è O(n). `.Contains()` su un `HashSet` è O(1). Il codice è identico. Il profiler racconta una storia diversa.

La buona notizia è che le fix sono quasi sempre semplici: `ToHashSet()`, `ToLookup()`, `GroupBy()`, o un `foreach` esplicito quando serve il controllo sul flusso. Non si tratta di ottimizzazione prematura -- si tratta di scegliere la struttura dati giusta per l'operazione richiesta.

---

## Prossimi Passi

L'intero codice degli esempi è disponibile nel repository pubblico:

[https://github.com/monte97/dotnet-linq-demo](https://github.com/monte97/dotnet-linq-demo)

Il repository contiene il modello di dominio completo (`Vehicle`, `Driver`, `Delivery`, `Zone`, `Restriction`, `TimeSlot`, `DeliveryRequirement`), i quattro errori con le rispettive versioni before/after, e un generatore di dati realistici con [Bogus](https://github.com/bchavez/Bogus) per riprodurre le stesse cardinalità.

Ora sai *cosa* fixare. Ma *quanto* costano davvero questi pattern? Nel prossimo articolo mettiamo i numeri con [BenchmarkDotNet](https://benchmarkdotnet.org/) su .NET 8: allocazioni, throughput, distribuzioni di latenza. Vedremo se le differenze teoriche reggono sotto misurazione rigorosa -- e scopriremo qualche sorpresa.

## Risorse Utili

* **Documentazione HashSet<T>**: [Microsoft Learn -- HashSet](https://learn.microsoft.com/dotnet/api/system.collections.generic.hashset-1)
* **ILookup<TKey, TElement>**: [Microsoft Learn -- ILookup](https://learn.microsoft.com/dotnet/api/system.linq.ilookup-2)
* **MaxBy / MinBy (.NET 6+)**: [Microsoft Learn -- Enumerable.MaxBy](https://learn.microsoft.com/dotnet/api/system.linq.enumerable.maxby)
* **BenchmarkDotNet**: [benchmarkdotnet.org](https://benchmarkdotnet.org/)
