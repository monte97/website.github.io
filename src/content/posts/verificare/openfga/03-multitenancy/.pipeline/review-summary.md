# Review Summary — 03-multitenancy

**Tech score: 9/10**
**Style score: 9/10** (era 7/10 prima delle correzioni)
**Modifiche applicate: 11**

## Top issues

1. **[Style P1]** Voce diretta al lettore ("devi", "hai un", "il tuo") in 9 punti del testo — corretti tutti con forma impersonale
2. **[Style P1]** Frase boilerplate "In questo articolo vediamo..." — riformulata
3. **[Style P2]** Apertura con "ti rendi conto" — corretta in "emerge che"
4. **[Style P2]** Doppio trattino (`--`) in prosa — corretto in trattino singolo
5. **[Tech P2]** Il testo descrive `admin from org` su `document.editor` ma il modello DSL non include questa regola su `document` — l'isolamento funziona via `can_edit from parent`, ma il caso di documento senza parent non è coperto. Non corretto nel testo (richiederebbe aggiunta di contenuto); segnalato nel tech-review per revisione futura.

## Modifiche applicate

- `al terzo ti rendi conto che` → `al terzo emerge che`
- `la paura costante che un bug` → `il rischio costante che un bug`
- `In questo articolo vediamo due strategie` → formulazione diretta senza boilerplate
- `devi aggiungere il contesto del tenant ovunque` → `è necessario aggiungere`
- `hai un data leak cross-tenant` → `si ha un data leak cross-tenant`
- `devi fidarti che ogni sviluppatore` → `la correttezza dipende da ogni singolo sviluppatore`
- Bullet list cons store-per-tenant: rimosso "devi" da 3 voci
- `se dimentichi il filtro... hai un data leak` → `dimenticare il filtro... produce un data leak`
- `Con RBAC devi testare` → `Con RBAC occorre testare`
- `-- e sono test negativi` → `- e sono test negativi`
- `Se il tuo cliente enterprise vuole` → `Se un cliente enterprise richiede`
