# Tech Review — 06-routing

**Score: 8/10**

## Errori (P0 — fattuali)

Nessuno.

## Imprecisioni (P1 — fuorvianti)

1. **RULE PostgreSQL per immutabilita'** (riga ~399-401): Le `RULE` PostgreSQL (`no_update`, `no_delete`) sono un approccio valido ma con caveat importanti: le rules possono essere disabilitate da un utente con privilegi `ALTER TABLE` o `DROP RULE`. Per un audit trail realmente a prova di manomissione, servirebbero anche: `REVOKE DELETE, UPDATE ON audit_logs FROM public`, row-level security, e idealmente un utente applicativo con soli permessi INSERT. L'articolo menziona "protezione" ma non chiarisce che le RULE da sole non sono sufficienti per compliance SOC 2.

2. **Routing connector `default_pipelines`** (riga ~564-568): Nel pattern "scartare debug log", il commento dice "Nessun default_pipelines: i log non instradati vengono scartati". In realta', se `default_pipelines` e' omesso, i log non matchati vengono droppati silenziosamente. Questo e' corretto funzionalmente ma potrebbe causare perdita di dati inattesa se la condizione OTTL ha errori. Suggerire di aggiungere un contatore/metrica per i log droppati.

## Note minori (P2)

1. **Demo usa repo diverso** (riga ~457): Questo articolo usa `otel-demo` mentre gli articoli 04 e 05 usano `MockMart`. Il cambio di repository potrebbe confondere il lettore della serie. Potrebbe valere un paragrafo di contesto.

2. **Loki OTLP endpoint** (riga ~137): `http://loki:3100/otlp` — il supporto OTLP nativo di Loki e' disponibile da Loki 3.x. L'articolo non specifica la versione minima richiesta.

3. **`action: copy`** (riga ~591): Nel pattern errori critici, `action: copy` e' documentato per il routing connector ma e' relativamente recente. Verificare che sia disponibile nella versione del Collector usata nella demo.

4. **HIPAA link** (riga ~49): Il link a HHS.gov e' corretto ma potrebbe non essere il riferimento piu' rilevante per un pubblico italiano. Considerare se aggiungere un riferimento alla normativa italiana/EU equivalente.

## Punti di forza

- L'apertura con lo scenario compliance ("Servono i log di audit degli ultimi tre anni") e' molto efficace
- La mappa completa rotta/destinazione/persistenza e' un ottimo riferimento
- Il collegamento con il tail sampling dell'articolo precedente crea continuita' nella serie
- I pattern aggiuntivi (scartare debug, errori critici) aggiungono valore pratico
- Schema SQL per audit table ben pensato
