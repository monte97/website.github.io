---
title: Cosa Genera il Compilatore Quando Scrivi una Where() — State Machine, Iteratori e IL
date: 2026-03-07T08:00:00.000Z
description: Dietro ogni .Where() c'è una state machine generata dal compilatore. Esploriamo extension methods, lambda, yield return e le specializzazioni di Enumerable.Where in .NET 8.
pillar: progettare
category: system-design
tags:
  - LINQ
  - CSharp
  - DotNet
  - Compilatore
  - StateMachine
  - ILSpy
  - SharpLab
lang: it
reviewed: true
series: linq
seriesOrder: 30
summary:
  - label: "Contesto"
    value: "Dietro ogni Where() il compilatore genera codice mai visto nel sorgente"
    note: "Una state machine con campo di stato e protocollo di pausa e ripresa"
  - label: "Scoperta"
    value: "In .NET 8 Enumerable.Where non usa yield return ma iteratori specializzati"
    note: "Path dedicati per array e List<T>, con il fallback generico più lento"
  - label: "Problema"
    value: "Castare a IEnumerable<T> manda la query sul path generico"
    note: "Vale anche per le firme: un parametro IEnumerable forza il fallback dentro il metodo"
  - label: "Strumento"
    value: "SharpLab, source.dot.net e ILSpy per leggere il codice generato"
openItems:
  - "L'analisi riguarda System.Linq in memoria: la traduzione a SQL degli IQueryable dipende dal provider e resta solo accennata"
  - "Gli iteratori specializzati descritti sono quelli di .NET 8, e le lambda senza cattura vengono cacheate solo da C# 10 in poi"
  - "Il vantaggio del path specializzato è dichiarato misurabile ma non quantificato: l'articolo non porta numeri di benchmark"
openNote: "Quello che questa discesa nel compilatore non chiude, e che va valutato sul proprio codice."
mode: explanation
---

Nei primi due articoli abbiamo visto *cosa* costa e *quanto* costa. Abbiamo misurato la differenza tra `List.Contains` e `HashSet.Contains`, quantificato il peso delle allocazioni intermedie, osservato `GroupBy` e `ToLookup` trasformare operazioni quadratiche in lineari. I numeri erano chiari, le fix immediate.

Ma resta una domanda: *perché* LINQ costa esattamente quello che costa? Quando scrivi `.Where(x => x > 5)`, il compilatore C# genera una classe intera che non hai mai visto nel tuo codice sorgente. Una state machine con campi privati, uno switch/case, e un protocollo di "pausa e ripresa" che gestisce la lazy evaluation elemento per elemento. Apriamola insieme.

---

## I Tre Pilastri: Perché LINQ Funziona Così

Prima di entrare nella state machine, vale la pena capire i tre meccanismi del linguaggio che rendono possibile la sintassi LINQ. Non sono un tutorial su ciascuno, ma il contesto necessario per comprendere cosa succede dietro le quinte.

### Extension Methods

La prima sorpresa per chi guarda il codice generato: `IEnumerable<T>` non dichiara *nessun* metodo LINQ. Non esiste `Where`, non esiste `Select`, non esiste `OrderBy` nell'interfaccia. Sono tutti **extension methods** definiti nella classe statica `System.Linq.Enumerable`.

```csharp
// Quando scrivi:
var active = restrictions.Where(r => r.IsActive);

// Il compilatore trasforma in:
var active = Enumerable.Where(restrictions, r => r.IsActive);
```

La sintassi fluente che rende LINQ leggibile è zucchero sintattico. Il compilatore risolve la chiamata cercando un metodo statico `Where` il cui primo parametro sia `this IEnumerable<T>`, nella classe `Enumerable` importata tramite `using System.Linq`.

Questo ha una conseguenza pratica importante: la risoluzione degli extension methods avviene a **compile time**. Non c'è dispatch virtuale, non c'è overhead di interfaccia per la risoluzione del metodo. Il costo è nel corpo del metodo, non nella chiamata.

### Lambda Expressions

Il secondo pilastro è il predicato che passiamo a `.Where()`. Quella `r => r.IsActive` non è magia: il compilatore la trasforma in codice concreto.

```csharp
Func<Restriction, bool> predicate = r => r.IsActive;

// Se la lambda non cattura variabili esterne, il compilatore genera:
// - Un metodo statico (o di istanza) nella classe corrente
// - Un delegate cached (da C# 10+, .NET 6+)

// Se la lambda cattura variabili locali:
Func<Restriction, bool> predicate = r => r.VehicleId == vehicleId;
// Il compilatore genera:
// - Una classe con un campo per vehicleId
// - Un metodo di istanza su quella classe
// - Un'allocazione per ogni invocazione del metodo che contiene la lambda
```

Il collegamento con l'articolo 1 è diretto: nel dispatcher per flotta commerciale, le lambda nei `.Where()` catturavano spesso variabili locali come `vehicleId` o `zoneId`. Ogni cattura significava una classe generata dal compilatore e un'allocazione sull'heap. Nell'hot path, con migliaia di chiamate al minuto, quelle allocazioni si accumulavano.

### Anonymous Types

Il terzo pilastro riguarda le proiezioni. Quando si usa `.Select()` per creare un oggetto al volo, il compilatore genera una classe reale.

```csharp
var projected = deliveries.Select(d => new { d.Id, d.ZoneId, d.Priority });

// Il compilatore genera una classe equivalente a:
// internal sealed class <>f__AnonymousType0<TId, TZoneId, TPriority>
// {
//     public TId Id { get; }
//     public TZoneId ZoneId { get; }
//     public TPriority Priority { get; }
//     // + costruttore, Equals(), GetHashCode(), ToString()
// }
```

La classe generata è immutabile (proprietà readonly), implementa `Equals` e `GetHashCode` basati sui valori (value equality), e ha un `ToString` leggibile. Non è un tipo dinamico: il compilatore conosce la struttura a compile time e genera codice tipizzato. Ma è comunque un'allocazione per ogni elemento proiettato.

Questi tre meccanismi, combinati, permettono di scrivere `restrictions.Where(r => r.IsActive).Select(r => r.VehicleId)` e ottenere una pipeline type-safe, lazy, componibile. Il prezzo è il codice che il compilatore genera dietro le quinte.

---

## La State Machine: Il Cuore di `yield return`

Arriviamo al pezzo centrale. Quando si scrive un metodo con `yield return`, il compilatore non lo esegue come un metodo normale. Lo trasforma in una **state machine**: una classe che implementa sia `IEnumerable<T>` che `IEnumerator<T>`, con un campo `_state` che tiene traccia di "dove eravamo rimasti".

### Il Codice che Scrivi

Una versione semplificata di `Where` con `yield return` è sorprendentemente breve:

```csharp
public static IEnumerable<T> Where<T>(
    this IEnumerable<T> source, Func<T, bool> predicate)
{
    foreach (var item in source)
    {
        if (predicate(item))
            yield return item;
    }
}
```

Cinque righe di logica. Ma il compilatore le trasforma in qualcosa di molto diverso.

### Il Codice che il Compilatore Genera

Incollando quel metodo su [SharpLab.io](https://sharplab.io) e selezionando "C#" come output, si può vedere la trasformazione completa. La versione semplificata della classe generata è questa:

```csharp
// Versione semplificata di ciò che genera il compilatore
private sealed class WhereIterator<T> : IEnumerable<T>, IEnumerator<T>
{
    private int _state;           // dove siamo nella state machine
    private T _current;           // l'elemento corrente
    private IEnumerator<T> _enumerator;
    private Func<T, bool> _predicate;
    private IEnumerable<T> _source;

    public T Current => _current;

    public bool MoveNext()
    {
        switch (_state)
        {
            case 0:
                _enumerator = _source.GetEnumerator();
                _state = 1;
                goto case 1;
            case 1:
                while (_enumerator.MoveNext())
                {
                    if (_predicate(_enumerator.Current))
                    {
                        _current = _enumerator.Current;
                        return true;    // "pausa" qui
                    }
                }
                _state = -1;           // fine della sequenza
                return false;
        }
        return false;
    }

    public void Dispose() => _enumerator?.Dispose();
}
```

Il pattern è chiaro: ogni `yield return` nel codice sorgente diventa un punto di "pausa" nella state machine. Quando il chiamante invoca `MoveNext()`, l'esecuzione riprende dall'ultimo punto di pausa, valuta il prossimo elemento, e si ferma di nuovo. Lo stato viene preservato tra una chiamata e l'altra tramite i campi dell'oggetto.

Questo è il meccanismo che rende LINQ **lazy**: nessun elemento viene prodotto finché qualcuno non chiama `MoveNext()`. E quando lo fa, viene prodotto un solo elemento alla volta.

### Il Ping-Pong dell'Esecuzione

Il concetto diventa concreto quando si osserva una pipeline con più operatori. Prendiamo un esempio dal dominio del dispatcher:

```csharp
var result = restrictions
    .Where(r => r.IsActive)
    .Select(r => r.VehicleId)
    .ToList();
```

L'esecuzione non è "prima filtra tutto, poi proietta tutto, poi colleziona tutto". È un ping-pong elemento per elemento:

```text
ToList()               Select(r => r.VehicleId)    Where(r => r.IsActive)
  |                          |                            |
  |-- MoveNext() ---------->|                            |
  |                          |-- MoveNext() ------------>|
  |                          |                            |-- restrictions[0]
  |                          |                            |-- IsActive? si
  |                          |<-- restrictions[0] --------|
  |<-- VehicleId = 42 ------|                            |
  |                                                      |
  |-- MoveNext() ---------->|                            |
  |                          |-- MoveNext() ------------>|
  |                          |                            |-- restrictions[1]
  |                          |                            |-- IsActive? no, skip
  |                          |                            |-- restrictions[2]
  |                          |                            |-- IsActive? si
  |                          |<-- restrictions[2] --------|
  |<-- VehicleId = 91 ------|                            |
```

Un elemento alla volta attraversa l'intera pipeline prima che il successivo inizi il suo percorso. Questo è lo **streaming** (lazy evaluation). Il `ToList()` alla fine è il trigger che avvia il processo chiamando `MoveNext()` sul primo iteratore della catena, che a sua volta chiama `MoveNext()` sul successivo, e così via.

### Streaming vs Non-Streaming

Non tutti gli operatori LINQ possono lavorare in modalità streaming. Alcuni devono necessariamente leggere tutti gli elementi prima di poterne emettere anche uno solo.

| **Tipo** | **Operatori** | **Comportamento** |
| :------- | :------------ | :---------------- |
| **Streaming (lazy)** | `Where`, `Select`, `Take`, `Skip`, `SelectMany`, `Distinct` | Un elemento alla volta attraversa la pipeline |
| **Non-streaming (eager)** | `OrderBy`, `GroupBy`, `Reverse` | Bufferizzano tutto prima di emettere il primo elemento |
| **Trigger** | `ToList`, `ToArray`, `Count`, `First`, `foreach` | Forzano l'esecuzione della pipeline |

Questo spiega un comportamento osservato nell'articolo 2: `OrderBy` ha un costo fisso indipendente da quanti elementi servono *dopo* di lui. Anche se la pipeline prosegue con `.Take(5)`, l'`OrderBy` deve prima leggere e ordinare *tutti* gli elementi nella sorgente. La state machine dell'`OrderBy` bufferizza l'intera sequenza nel suo `MoveNext()` iniziale, e solo dopo inizia a emettere gli elementi ordinati uno alla volta.

Lo stesso vale per `GroupBy`, che nell'errore 2 dell'articolo 1 veniva usato per costruire indici: deve leggere tutto per poter raggruppare, perché non può sapere in anticipo se arriveranno altri elementi per un gruppo già esistente.

---

## Expression Trees vs Delegati

Finora abbiamo parlato di `IEnumerable<T>` e di codice che viene eseguito in memoria. Ma la stessa sintassi LINQ può avere un destino completamente diverso.

### La Stessa Sintassi, Due Destini

```csharp
// DELEGATO: codice compilato, eseguibile direttamente
Func<Vehicle, bool> compiled = v => v.Capacity > 1000;

// EXPRESSION TREE: struttura dati, traducibile da un provider
Expression<Func<Vehicle, bool>> expression = v => v.Capacity > 1000;
```

La differenza è nel tipo. Quando il compilatore incontra una lambda assegnata a `Func<T, bool>`, genera codice IL eseguibile. Quando la stessa lambda è assegnata a `Expression<Func<T, bool>>`, genera codice che *costruisce un albero* che rappresenta la lambda come struttura dati.

### Cosa Contiene un Expression Tree

Un expression tree è un **AST** (Abstract Syntax Tree) della lambda. Per `v => v.Capacity > 1000`, la struttura è:

```text
BinaryExpression (GreaterThan)
+-- Left:  MemberExpression (v.Capacity)
|          +-- Expression: ParameterExpression (v)
+-- Right: ConstantExpression (1000)
```

Questa struttura è ispezionabile e attraversabile a runtime:

```csharp
Expression<Func<Vehicle, bool>> expression = v => v.Capacity > 1000;

var body = expression.Body as BinaryExpression;
Console.WriteLine(body.NodeType);    // GreaterThan
Console.WriteLine(body.Left);       // v.Capacity
Console.WriteLine(body.Right);      // 1000
```

Un provider (come Entity Framework) può attraversare questo albero e tradurlo in un linguaggio diverso, tipicamente SQL. Questo è il meccanismo che rende possibile scrivere query C# che vengono eseguite sul database.

### IEnumerable vs IQueryable

La distinzione pratica si manifesta nelle due interfacce:

```csharp
// IEnumerable -> Enumerable.Where -> accetta Func -> esegue in C#
IEnumerable<Vehicle> inMemory = vehicles
    .Where(v => v.Capacity > 1000);

// IQueryable -> Queryable.Where -> accetta Expression -> tradotto dal provider
IQueryable<Vehicle> fromDb = dbContext.Vehicles
    .Where(v => v.Capacity > 1000);
```

La sintassi è identica. Il compilatore sceglie il metodo giusto in base al tipo della sorgente. Se la sorgente implementa `IQueryable<T>`, viene invocato `Queryable.Where` che accetta un `Expression`. Se implementa solo `IEnumerable<T>`, viene invocato `Enumerable.Where` che accetta un `Func`.

Nel contesto del dispatcher dell'articolo 1, tutto il lavoro avviene in memoria su `IEnumerable<T>`: la flotta viene caricata all'avvio e le decisioni di assegnamento operano sulla cache. Ma se il sistema dovesse interrogare il database per il caricamento iniziale dei veicoli, lo stesso codice LINQ passerebbe da esecuzione C# a generazione SQL, a patto di mantenere il tipo `IQueryable<T>` lungo tutta la pipeline.

### Il Confine IQueryable -> IEnumerable

Il punto critico è dove avviene la **materializzazione**: il passaggio da "query traducibile" a "dati in memoria".

```csharp
// Problematico: ToList() a metà pipeline = "da qui in poi eseguo io in C#"
var result = dbContext.Vehicles
    .ToList()                                    // carica TUTTI i veicoli in memoria
    .Where(v => v.Capacity > 1000)               // filtra in C#, non in SQL
    .Select(v => new { v.Id, v.Capacity });

// Corretto: filtra in SQL, materializza solo il risultato
var result = dbContext.Vehicles
    .Where(v => v.Capacity > 1000)               // tradotto in WHERE Capacity > 1000
    .Select(v => new { v.Id, v.Capacity })       // tradotto in SELECT Id, Capacity
    .ToList();                                    // materializza solo i risultati filtrati
```

Nel primo caso, `.ToList()` forza la materializzazione dell'intera tabella `Vehicles`. Da quel punto in avanti, la pipeline opera su `List<Vehicle>` (che implementa `IEnumerable<T>`, non `IQueryable<T>`), e il filtro avviene in C# con un full scan in memoria.

Nel secondo caso, il filtro e la proiezione restano nell'expression tree e vengono tradotti in SQL. Solo i risultati filtrati attraversano la rete.

### Cosa Non Si Può Tradurre

Non tutto il codice C# è traducibile in SQL. Se il predicato contiene logica che il provider non sa mappare, si ottiene un'eccezione a runtime.

```csharp
// Il provider non sa tradurre metodi C# arbitrari
dbContext.Vehicles
    .Where(v => CustomValidation(v))  // eccezione: non traducibile in SQL
    .ToList();

// Soluzione: spostare la logica non traducibile dopo la materializzazione
dbContext.Vehicles
    .Where(v => v.Capacity > 1000)               // traducibile
    .ToList()                                      // materializza
    .Where(v => CustomValidation(v))               // esegue in C#
    .ToList();
```

La regola è semplice: prima del `.ToList()` (o di qualsiasi trigger di materializzazione), usare solo espressioni che il provider sa tradurre. Dopo il `.ToList()`, si è in territorio `IEnumerable<T>` e qualsiasi codice C# è valido.

---

## Dentro .NET 8 con ILSpy: Le Specializzazioni di Enumerable.Where

Fin qui abbiamo visto una versione semplificata con `yield return`. Ma l'implementazione reale di `Enumerable.Where` in .NET 8 è più sofisticata. Non usa `yield return`: ha **iteratori specializzati** scritti a mano dal team .NET per ottimizzare i casi più comuni.

### Tre Iteratori, Tre Ottimizzazioni

Navigando il sorgente di `System.Linq.Enumerable.Where` su [source.dot.net](https://source.dot.net/#System.Linq/System/Linq/Where.cs), si trova questo pattern di dispatch:

```csharp
// Semplificazione del codice reale in .NET 8
public static IEnumerable<TSource> Where<TSource>(
    this IEnumerable<TSource> source, Func<TSource, bool> predicate)
{
    if (source is TSource[] array)
        return new WhereArrayIterator<TSource>(array, predicate);

    if (source is List<TSource> list)
        return new WhereListIterator<TSource>(list, predicate);

    return new WhereEnumerableIterator<TSource>(source, predicate);
}
```

Tre classi distinte:

* **`WhereArrayIterator<T>`** -- ottimizzato per array. Accede agli elementi tramite indice (`array[i]`), evitando l'overhead dell'interfaccia `IEnumerator<T>`. Nessuna chiamata virtuale per `MoveNext()` e `Current`.

* **`WhereListIterator<T>`** -- ottimizzato per `List<T>`. Usa lo struct enumerator `List<T>.Enumerator` che, essendo un value type, evita il boxing e il dispatch virtuale tipici dell'interfaccia `IEnumerator<T>`.

* **`WhereEnumerableIterator<T>`** -- il fallback generico. Usa `GetEnumerator()` e il protocollo standard `MoveNext()`/`Current`. È il più lento dei tre perché passa attraverso l'interfaccia `IEnumerator<T>`, con dispatch virtuale a ogni iterazione.

### Perché Conta: Il Cast Che Rallenta

Questa specializzazione ha un'implicazione pratica diretta. Passando un `List<Restriction>` a `.Where()`, il runtime sceglie `WhereListIterator<T>` e usa il path ottimizzato. Ma se la stessa lista viene prima castata a `IEnumerable<T>`, il tipo concreto non è più riconoscibile e il runtime cade nel fallback generico.

```csharp
var restrictions = new List<Restriction> { /* ... */ };

// Path ottimizzato: WhereListIterator
var result1 = restrictions.Where(r => r.IsActive).ToList();

// Path generico: WhereEnumerableIterator
IEnumerable<Restriction> asEnumerable = restrictions;
var result2 = asEnumerable.Where(r => r.IsActive).ToList();
```

La differenza di performance è misurabile, soprattutto su collezioni grandi. Il `WhereListIterator` evita l'allocazione dell'enumerator e le chiamate virtuali, che su milioni di iterazioni possono fare la differenza.

Questo spiega anche perché le firme dei metodi contano. Un metodo che accetta `IEnumerable<T>` come parametro (anche se il chiamante passa una `List<T>`) forza il path generico per tutti i `.Where()` e `.Select()` interni. Se la performance è critica, accettare il tipo concreto `List<T>` o `T[]` permette a LINQ di usare le specializzazioni ottimizzate.

### La Pipeline di Ottimizzazioni

Le specializzazioni non si fermano a `Where`. Anche `Select`, `Where.Select` (la combinazione), e altri operatori hanno path ottimizzati. Il runtime .NET riconosce catene comuni e le fonde internamente. Per esempio, un `.Where().Select()` su un array non crea due iteratori separati: la classe `WhereSelectArrayIterator<TSource, TResult>` gestisce entrambe le operazioni in un singolo `MoveNext()`, riducendo le allocazioni e le chiamate virtuali.

Questa architettura è visibile in dettaglio su [source.dot.net](https://source.dot.net/#System.Linq/System/Linq/Where.cs) e ispezionabile localmente con [ILSpy](https://github.com/icsharpcode/ILSpy). Navigare il codice sorgente di `System.Linq` è uno degli esercizi più istruttivi per capire come il framework bilanci leggibilità dell'API e performance dell'implementazione.

---

## Conclusioni

Abbiamo aperto il cofano di LINQ e guardato i meccanismi che lo fanno funzionare:

1. **Extension methods**: LINQ non esiste su `IEnumerable<T>`. È una collezione di metodi statici in `System.Linq.Enumerable` che il compilatore risolve a compile time. La sintassi fluente è zucchero sintattico.

2. **Lambda e catture**: ogni lambda che cattura variabili locali genera una classe con campi. Nell'hot path, significa allocazioni. Le lambda senza cattura vengono cached dal compilatore da .NET 6 in poi.

3. **State machine e `yield return`**: il cuore della lazy evaluation. Ogni `yield return` diventa un punto di pausa in una classe che implementa `IEnumerator<T>`. L'esecuzione è un ping-pong: un elemento alla volta attraversa l'intera pipeline.

4. **Expression trees**: la stessa sintassi lambda può generare codice eseguibile (`Func`) o una struttura dati traducibile (`Expression`). `IEnumerable` esegue in C#, `IQueryable` delega a un provider esterno.

5. **Specializzazioni in .NET 8**: l'implementazione reale non usa `yield return`. Ha iteratori dedicati per array, `List<T>`, e il caso generico, con ottimizzazioni che fondono operatori consecutivi.

Il filo conduttore è uno solo: la sintassi LINQ è dichiarativa, ma l'esecuzione è imperativa e dipende da ciò che il compilatore e il runtime generano dietro le quinte. Conoscere questi meccanismi non serve per riscrivere tutto in `foreach`, ma per sapere *dove* guardare quando il profiler segnala un problema.

Hai visto il "ping-pong" tra iteratori, ma solo come diagramma. Nel prossimo articolo lo rendiamo *visibile* -- con OpenTelemetry e Grafana Tempo. Vedremo ogni elemento attraversare la pipeline, operatore per operatore, in una dashboard di tracing distribuito.

---

## Risorse Utili

* **SharpLab.io**: [sharplab.io](https://sharplab.io) -- incolla codice C# e vedi la trasformazione del compilatore in tempo reale (IL, C# decompilato, AST)
* **source.dot.net**: [source.dot.net](https://source.dot.net) -- il sorgente completo del runtime .NET, navigabile e ricercabile. Il punto di partenza per esplorare `System.Linq.Enumerable`
* **ILSpy**: [github.com/icsharpcode/ILSpy](https://github.com/icsharpcode/ILSpy) -- decompilatore open source per assembly .NET. Utile per ispezionare il codice generato dal compilatore nei propri progetti
