# Style Review — 03-multitenancy

**Score: 7/10 (prima delle correzioni) → 9/10 (dopo)**

## Problemi trovati

### Voce impersonale — violazioni "tu" diretto

Il testo usava ripetutamente il "devi" e "hai un" in senso diretto al lettore, violando la regola della voce impersonale dello style guide.

Istanze corrette:

| Prima | Dopo |
|-------|------|
| `devi aggiungere il contesto del tenant ovunque` | `è necessario aggiungere il contesto del tenant ovunque` |
| `hai un data leak cross-tenant` | `si ha un data leak cross-tenant` |
| `devi fidarti che ogni sviluppatore lo applichi` | `la correttezza dipende da ogni singolo sviluppatore che lo applichi` |
| `se dimentichi il filtro... hai un data leak` | `dimenticare il filtro... produce un data leak` |
| `Con RBAC devi testare che ogni endpoint` | `Con RBAC occorre testare che ogni endpoint` |
| `devi gestire N store` | `N store da gestire` |
| `devi applicare la migrazione su tutti gli store` | `richiede di applicare la migrazione su tutti gli store` |
| `se devi sapere "in quali organizzazioni..."` | `per sapere "in quali organizzazioni..."` |
| `Se il tuo cliente enterprise vuole` | `Se un cliente enterprise richiede` |

### Apertura con "ti rendi conto"

L'apertura conteneva `al terzo ti rendi conto che` — forma di interpellazione diretta al lettore. Corretta in `al terzo emerge che`.

### Frase boilerplate

`In questo articolo vediamo due strategie per gestire il multitenancy con OpenFGA` — forma da "questo articolo mostra", vietata dallo style guide. Corretta in formulazione più diretta.

### Doppio trattino in prosa

`Con RBAC devi testare... -- e sono test negativi` — doppio trattino (`--`) usato come em dash. Corretto in trattino singolo (`-`).

## Punti di forza stilistici

- Apertura costruisce tensione attraverso fatti tecnici, non drammatizzazione. Corretto.
- Sezioni ben strutturate, progressione logica chiara.
- Titoli delle sezioni comunicano l'insight, non solo il topic ("Isolamento strutturale, non applicativo", "Org come radice del grafo").
- Nessun termine motivazionale o da marketing.
- Code block tutti con linguaggio specificato.
- Il confronto RBAC vs ReBAC è presentato come asimmetria fattuale, non come drammatizzazione.
- Tono da diario tecnico: esperienze concrete (VaultDrive demo), non prescrizioni astratte.

## Note

La frase `Questo è potente per i team di prodotto` (sezione override per-tenant) è al limite del tono promozionale, ma è supportata da un esempio concreto e rimane nel registro tecnico-pragmatico. Mantenuta.
