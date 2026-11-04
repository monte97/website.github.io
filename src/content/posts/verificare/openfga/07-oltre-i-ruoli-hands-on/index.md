---
title: "Oltre i ruoli, con le mani sulla tastiera"
seoTitle: "OpenFGA in pratica: audit e migrazione con un backend .NET"
date: 2026-11-04T07:20:00.000Z
description: "Un repo da clonare per rifare l'audit: due accessi di troppo con ListUsers, un test del modello in CI e un backend .NET che passa dai ruoli a OpenFGA."
pillar: verificare
category: openfga
mode: how-to
tags:
  - OpenFGA
  - ReBAC
  - Authorization
  - .NET
  - Audit
lang: it
draft: false
reviewed: human
series: openfga
seriesOrder: 70
summary:
  - label: "Problema"
    value: "Gli output di un articolo non si possono lanciare, e un sistema vero lo si capisce solo provandolo"
    note: "Il repo rifà la storia dell'articolo precedente: stesse persone, stesso modello, stessi passi"
  - label: "Audit"
    value: "ListUsers, Expand, Read e ReadChanges con la CLI fga, contro un'anagrafica"
    note: "Cinque utenti su corso 42, due di troppo: Diego ed Elena"
  - label: "Correzione"
    value: "Una riga nel modello, un test che la difende, un workflow che lo lancia a ogni PR"
    note: "La scrittura senza scadenza viene rifiutata, e una PR che rende Anna editor fa fallire il test"
  - label: "Migrazione"
    value: "Un backend .NET 8 con tre authorizer: shadow con i mismatch nel log, poi cutover con una variabile"
    note: "Anna sul corso 43 passa da 200 a 403 senza toccare il codice"
openItems:
  - "Le date di ReadChanges sono quelle del seed di chi esegue la demo: OpenFGA registra la scrittura nel momento in cui avviene"
  - "Expand apre un livello per volta: l'albero completo si ricostruisce con una chiamata per relazione"
  - "Nella demo lo shadow è sincrono, per leggere il codice in una schermata: in produzione la domanda a OpenFGA va in asincrono, con un timeout"
  - "Il datastore della demo è in memoria: riavviare OpenFGA cancella store, modello e tuple"
  - "La chiave HS256 della demo è pubblica: in produzione il token lo firma l'identity provider"
openNote: "I confini della demo, da tenere presenti prima di portarne il codice in un servizio vero."
---

Questo articolo è pensato come versione "hands-on" dell'[articolo riguardante la gestione dei ruoli con OpenFGA](/blog/verificare/openfga/06-oltre-i-ruoli/)


Alla fine del percorso avrete:

1. trovato i due accessi di troppo sul corso 42 con `list-users` e un'anagrafica;
2. ricostruito da dove arrivano e in che ordine sono stati concessi;
3. chiuso gli accessi e prodotto l'evidenza;
4. corretto il modello, e visto un test fallire su una PR sbagliata;
5. acceso OpenFGA in un backend .NET 8: prima in shadow, con i mismatch nel log, poi come fonte di verità.

## Lo scenario

| Utente | Sul corso 42 | Secondo l'anagrafica |
|---|---|---|
| `mario` | `author` | autore, attivo |
| `diego` | `assistant`, senza scadenza | contratto finito a giugno |
| `elena` | `assistant`, senza scadenza | uscita a maggio |
| `luca` | `assistant`, scadenza 30/06/2026 | fino al 30 giugno |
| `anna`, `giulia` | `student` via `org:acme#member` | dipendenti Acme |
| `paolo` | `student` via Acme, ma `blocked` | sospeso dal corso 42 |

Il corso 43 serve al passo 7: Marta ne è l'autrice, Mario solo studente, e Acme non l'ha comprato.

## Prerequisiti

- Docker con Compose
- git, per clonare il repo

Niente da installare: la CLI [`fga`](https://github.com/openfga/cli) (v0.7.19), `curl`, `jq` e `openssl` stanno in un container `toolbox`, e il backend si compila nel suo container. Niente Keycloak: i token di prova li firma uno script con una chiave locale (in produzione li firma l'identity provider, vedi [Keycloak e OpenFGA](/blog/verificare/openfga/02-openfga-keycloak/)). Chi ha già la CLI può usarla anche dall'host, contro la porta 8180.

**Due terminali.** I blocchi di codice dicono dove si lancia ogni comando, con un commento nella prima riga:

| Prima riga | Dove | Cosa ci si fa |
|---|---|---|
| `# host` | il terminale della vostra macchina, nella cartella del repo | `git`, `docker compose` |
| `# toolbox` | la shell dentro il container | `fga`, `curl`, `./scripts/token.sh` |

Ogni passo si apre con il suo **obiettivo**: cosa si cerca, e cosa si ha in mano alla fine.

## Passo 0 · Avvio

**Obiettivo:** avere OpenFGA con il modello e le tuple della storia, il backend, e una shell da cui lanciare i comandi.

```bash
# host
git clone https://github.com/monte97/openfga-oltre-i-ruoli-demo.git
cd openfga-oltre-i-ruoli-demo
docker compose up -d --build
```

In questo modo, l'ambiente messo a disposizione sarà così composto:

- `openfga`: OpenFGA v1.22.1 con datastore in memoria;
- `init`: un servizio che gira una volta e si ferma. Crea lo store con il modello `fga/corsi.fga` e scrive le tuple una alla volta, nell'ordine della storia, così il registro delle modifiche le restituisce nello stesso ordine;
- `backend`: il backend .NET 8, che legge l'id dello store scritto da `init`;
- `toolbox`: il container in cui entrare.

Il seed, in `scripts/seed.sh`, comincia così:

```bash
w user:diego assistant course:42
w user:elena assistant course:42
w user:luca assistant course:42 --condition-name non_expired --condition-context '{"valid_until":"2026-06-30T23:59:59Z"}'
```

Ora si apre la shell del toolbox, in un secondo terminale:

```bash
# host
docker compose exec toolbox sh
```

> **Nota**: tutti i blocchi marcati `# toolbox` si lanciano in questa shell. Se l'avete chiusa, riapritela con `docker compose exec toolbox sh` dalla cartella del repo. Dentro, la cartella del repo è `/work`, montata dall'host, quindi vede subito i file che cambiate fuori; `fga` parla con `openfga:8080`, e lo store è già impostato in `FGA_STORE_ID`.

Come primo comando, verificate che il modello sia quello dell'articolo precedente:

```bash
# toolbox
$ fga model test --tests fga/corsi.fga.yaml
# Test Summary #
Tests 6/6 passing
Checks 12/12 passing
```

Resta una variabile da preparare. La tupla di Luca porta la condizione `non_expired`, che nel modello è scritta così:

```
condition non_expired(current_time: timestamp, valid_until: timestamp) {
  current_time < valid_until
}
```

`valid_until` sta nella tupla, scritto dal seed. `current_time` invece non ce l'ha nessuno: OpenFGA non legge l'orologio da solo, e l'ora la deve passare chi chiede, a ogni chiamata, nel campo `context`. Senza, il motore non sa dire se Luca è ancora dentro. Si fissa una volta, così tutti i comandi dei passi successivi usano la stessa ora:

```bash
# toolbox
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Se riaprite la shell del toolbox, questa riga va rilanciata.

## Passo 1 · Chi vede il corso 42

**Obiettivo:** l'elenco di chi può vedere il corso 42 adesso, confrontato con l'anagrafica, per trovare chi non dovrebbe esserci.

```bash
# toolbox
$ fga query list-users --object course:42 --relation viewer --user-filter user --context "{\"current_time\":\"$NOW\"}"
{"users":[{"object":{"id":"diego","type":"user"}},{"object":{"id":"elena","type":"user"}},{"object":{"id":"mario","type":"user"}},{"object":{"id":"anna","type":"user"}},{"object":{"id":"giulia","type":"user"}}]}
```

Confronta con l'anagrafica:

```bash
# toolbox
$ cat anagrafica.csv
utente,chi_e,fonte,stato
anna,dipendente Acme,HR Acme,attiva
giulia,dipendente Acme,HR Acme,attiva
paolo,dipendente Acme,HR Acme,sospeso dal corso 42
mario,autore del corso 42,fornitore,attivo
diego,assistente del corso 42,fornitore,contratto finito a giugno
elena,assistente del corso 42,fornitore,uscita a maggio
luca,assistente del corso 42,fornitore,fino al 30 giugno
```

Cosa notare:

- cinque utenti; l'ordine cambia da una chiamata all'altra;
- Anna, Giulia e Mario tornano con l'anagrafica;
- Paolo manca: la tupla `blocked` lo esclude;
- Luca manca: la scadenza è passata;
- **Diego ed Elena sono i due accessi di troppo.**

> **Attenzione**: senza `--context` la chiamata fallisce per intero. OpenFGA non può valutare la condizione di Luca e lo dice:
>
> ```
> Error: failed to list users due to POST validation error for ListUsers POST with body {"code":"validation_error","message":"failed to evaluate relationship condition: 'non_expired' - tuple 'course:42#assistant@user:luca' is missing context parameters '[current_time]'"}
> ```

## Passo 2 · Da dove arriva l'accesso

**Obiettivo:** capire per quale strada Diego ed Elena arrivano a `viewer`, e cosa distingue le loro tuple da quella di Luca.

Si usano tre comandi, e ognuno risponde in un formato diverso:

| Comando | Risponde | Come si legge |
|---|---|---|
| `fga query expand` | un albero JSON | `union` è un «oppure», `difference` è «`base` meno `subtract`»; una foglia `computed` rimanda a un'altra relazione, da espandere con un'altra chiamata; una foglia `users` elenca chi c'è davvero |
| `fga tuple read` | le tuple scritte | `key` è la tupla, con l'eventuale `condition`; `timestamp` è il momento della scrittura |
| `fga query check` | `{"allowed": true}` o `false` | la decisione per un utente, con le condizioni valutate |

`expand` scende un livello per chiamata. Il primo livello è la regola:

```bash
# toolbox
$ fga query expand viewer course:42
{"tree":{"root":{"difference":{"base":{"name":"course:42#viewer","union":{"nodes":[{"leaf":{"computed":{"userset":"course:42#student"}},"name":"course:42#viewer"},{"leaf":{"computed":{"userset":"course:42#editor"}},"name":"course:42#viewer"}]}},"subtract":{"leaf":{"computed":{"userset":"course:42#blocked"}},"name":"course:42#viewer"}},"name":"course:42#viewer"}}}
```

`viewer` è `student` o `editor`, meno `blocked`. `editor` rimanda ad `author` e `assistant`. Si espande `assistant`:

```bash
# toolbox
$ fga query expand assistant course:42
{"tree":{"root":{"leaf":{"users":{"users":["user:diego","user:elena","user:luca"]}},"name":"course:42#assistant"}}}
```

Le tuple così come sono state scritte:

```bash
# toolbox
$ fga tuple read --object course:42 --relation assistant
{
  "continuation_token":"",
  "tuples": [
    {
      "key": {
        "object":"course:42",
        "relation":"assistant",
        "user":"user:diego"
      },
      "timestamp":"2026-11-02T16:25:49.97022125Z"
    },
    {
      "key": {
        "object":"course:42",
        "relation":"assistant",
        "user":"user:elena"
      },
      "timestamp":"2026-11-02T16:25:49.984516791Z"
    },
    {
      "key": {
        "condition": {
          "context": {
            "valid_until":"2026-06-30T23:59:59Z"
          },
          "name":"non_expired"
        },
        "object":"course:42",
        "relation":"assistant",
        "user":"user:luca"
      },
      "timestamp":"2026-11-02T16:25:50.004316375Z"
    }
  ]
}
```

E il check di oggi:

```bash
# toolbox
$ fga query check user:luca viewer course:42 --context "{\"current_time\":\"$NOW\"}"
{"allowed":false,"resolution":""}
$ fga query check user:diego viewer course:42 --context "{\"current_time\":\"$NOW\"}"
{"allowed":true,"resolution":""}
$ fga query check user:elena viewer course:42 --context "{\"current_time\":\"$NOW\"}"
{"allowed":true,"resolution":""}
```

Cosa notare:

- Luca compare in `expand` anche se è scaduto: expand mostra la struttura e non valuta le condizioni;
- `expand student` restituisce `org:acme#member`, cioè uno userset, e si ferma lì (l'output è in `docs/output-reali.md`);
- solo la tupla di Luca porta una condizione;
- **la causa è un modo di dare accesso**: due assistenti come Luca, ma senza scadenza. E `assistant` implica `editor`, quindi potevano anche modificare.

## Passo 3 · Da quando

**Obiettivo:** ricostruire in che ordine sono stati concessi gli accessi, e verificare che nessuno li abbia mai tolti.

```bash
# toolbox
$ fga tuple changes --type course
{"changes":[{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:49.97022125Z","tuple_key":{"object":"course:42","relation":"assistant","user":"user:diego"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:49.984516791Z","tuple_key":{"object":"course:42","relation":"assistant","user":"user:elena"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:50.004316375Z","tuple_key":{"condition":{"context":{"valid_until":"2026-06-30T23:59:59Z"},"name":"non_expired"},"object":"course:42","relation":"assistant","user":"user:luca"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:50.0851825Z","tuple_key":{"object":"course:42","relation":"student","user":"org:acme#member"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:50.119239208Z","tuple_key":{"object":"course:42","relation":"blocked","user":"user:paolo"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:50.136455291Z","tuple_key":{"object":"course:42","relation":"author","user":"user:mario"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:50.148437458Z","tuple_key":{"object":"course:43","relation":"author","user":"user:marta"}},{"operation":"TUPLE_OPERATION_WRITE","timestamp":"2026-11-02T16:25:50.162809708Z","tuple_key":{"object":"course:43","relation":"student","user":"user:mario"}}],"continuation_token":"MDFNNkVIOU1USlZNMTUxUjJUWFBXNDdXMTN8Y291cnNl"}
```

Cosa notare:

- il filtro è per tipo di oggetto: compaiono tutte le tuple di `course`, anche del corso 43;
- le prime tre righe sono quelle dell'indagine: Diego, Elena, poi Luca con `non_expired`;
- nessun `DELETE`: nessuno ha mai tolto Diego ed Elena;
- le date sono quelle del vostro avvio (il servizio `init`), perché OpenFGA registra la scrittura quando avviene. Il 9 febbraio dell'articolo precedente qui non si può riprodurre; l'ordine sì.

## Passo 4 · Chiudere e dimostrarlo

**Obiettivo:** togliere i due accessi di troppo, e avere l'output che dimostra che sono chiusi.

```bash
# toolbox
$ fga tuple delete user:diego assistant course:42
{}
$ fga tuple delete user:elena assistant course:42
{}
$ fga query check user:diego viewer course:42 --context "{\"current_time\":\"$NOW\"}"
{"allowed":false,"resolution":""}
$ fga query check user:elena viewer course:42 --context "{\"current_time\":\"$NOW\"}"
{"allowed":false,"resolution":""}
$ fga query list-users --object course:42 --relation viewer --user-filter user --context "{\"current_time\":\"$NOW\"}"
{"users":[{"object":{"id":"giulia","type":"user"}},{"object":{"id":"anna","type":"user"}},{"object":{"id":"mario","type":"user"}}]}
```

Restano Giulia, Mario e Anna, tutti in anagrafica. Questi output, con quelli dei passi 1-3, sono l'evidenza da allegare all'audit.

## Passo 5 · Correggere il modello

**Obiettivo:** fare in modo che un assistente senza scadenza non si possa più scrivere, così l'errore non si ripete.

Il prossimo assistente entrerebbe come Diego ed Elena. La correzione:

```diff
 type course
   relations
-    define assistant: [user, user with non_expired]
+    define assistant: [user with non_expired]
```

Modifica `fga/corsi.fga` a mano, oppure prendi il file dal branch `soluzione`. Il `git checkout` si fa sull'host: il repo è montato nel toolbox, che vede subito il file cambiato (nel toolbox non c'è git).

```bash
# host
git checkout soluzione -- fga/corsi.fga
```

Poi pubblica e prova, nella shell del toolbox (se l'avete chiusa: `docker compose exec toolbox sh`, e di nuovo la riga `NOW=...`):

```bash
# toolbox
$ fga model write --file fga/corsi.fga
{"authorization_model_id":"01M6EH9Y1M23MFXR4R4TK11KM9"}
$ fga tuple write user:sara assistant course:42
Error: failed to write tuple: POST validation error for Write POST with body {"code":"validation_error","message":"Invalid tuple 'course:42#assistant@user:sara'. Reason: condition is missing"}
$ fga tuple write user:sara assistant course:42 --condition-name non_expired --condition-context '{"valid_until":"2026-12-31T23:59:59Z"}'
{"successful":[{"condition":{"context":{"valid_until":"2026-12-31T23:59:59Z"},"name":"non_expired"},"object":"course:42","relation":"assistant","user":"user:sara"}]}
```

Cosa notare:

- senza scadenza il server rifiuta la scrittura, con la scadenza la accetta;
- `fga model test` passa anche dopo la correzione: i test descrivono i permessi che non devono cambiare.

## Passo 6 · Il test che ferma una PR sbagliata

**Obiettivo:** vedere un test del modello fallire su una modifica sbagliata, prima che arrivi in produzione.

Il passo ha tre pezzi: il test che descrive un permesso, la modifica che lo rompe, e il comando che se ne accorge.

### Il test

`fga/corsi.fga.yaml` contiene sei test. Uno dice che Anna, studentessa di Acme, vede il corso 42 e non lo modifica:

```yaml
# fga/corsi.fga.yaml (estratto)
  - name: Anna vede il corso 42 e non lo modifica
    check:
      - user: user:anna
        object: course:42
        context:
          current_time: "2026-11-02T10:00:00Z"
        assertions:
          viewer: true
          editor: false
          can_publish: false
```

Ogni `assertion` è un check con la risposta attesa. Il `context` fissa l'ora, per lo stesso motivo del `NOW` del passo 0.

### La modifica sbagliata

Il branch `esempio-pr-rotta` cambia una riga sola del modello: anche gli studenti diventano `editor`.

```diff
-    define editor: author or assistant
+    define editor: author or assistant or student
```

A leggerla sembra innocua. Ma Anna è `student` del 42, quindi diventa `editor`, e il test qui sopra si aspetta `editor: false`.

### Il comando che se ne accorge

Sull'host si scarta la correzione del passo 5 e si passa al branch. `git restore` serve perché `fga/corsi.fga` è stato modificato al passo 5, e git non cambierebbe branch con un file modificato:

```bash
# host
git restore --staged --worktree fga/corsi.fga
git checkout esempio-pr-rotta
```

Nel toolbox, che vede subito il file del branch:

```bash
# toolbox
$ fga model test --tests fga/corsi.fga.yaml
(FAILING) Anna vede il corso 42 e non lo modifica: Checks (2/3 passing)
ⅹ Check(user=user:anna,relation=editor,object=course:42, context:&map[current_time:2026-11-02T10:00:00Z]): expected=false, got=true
---
# Test Summary #
Tests 5/6 passing
Checks 11/12 passing
```

Cosa notare:

- fallisce un check solo, `editor` di Anna, con il nome del test e il valore atteso: si sa subito quale permesso è cambiato;
- il comando esce con codice 1.

In CI succede la stessa cosa. Il workflow `.github/workflows/model-test.yml` parte a ogni pull request che tocca `fga/`, installa la CLI e lancia lo stesso comando:

```yaml
# .github/workflows/model-test.yml (estratto)
on:
  pull_request:
    paths:
      - "fga/**"
# ...
      - name: Test del modello
        run: fga model test --tests fga/corsi.fga.yaml
```

Con codice di uscita 1 il job fallisce, e la PR non si unisce. Per tornare al modello giusto, sull'host:

```bash
# host
git checkout main
```

## Passo 7 · Il backend in shadow

**Obiettivo:** far decidere ancora il vecchio controllo a ruoli, con OpenFGA che risponde in parallelo, e leggere nel log dove i due non sono d'accordo.

Il backend .NET 8 sta in `backend/`. Tutte le decisioni passano da un'interfaccia:

```csharp
public interface IAuthorizer
{
    Task<bool> AllowedAsync(ClaimsPrincipal user, string relation, string @object);
}
```

Tre implementazioni:

| Authorizer | Decide da | Limite |
|---|---|---|
| `RbacAuthorizer` | ruoli nel token | non sa su quale corso: `student` vede tutto, `author` modifica tutto |
| `OpenFgaAuthorizer` | `Check` su OpenFGA, con `current_time` | serve il motore raggiungibile |
| `DualCheckAuthorizer` | entrambi, logga i mismatch | risponde con la fonte scelta da `AUTHZ__SOURCEOFTRUTH` |

La chiamata a OpenFGA:

```csharp
public sealed class OpenFgaAuthorizer : IAuthorizer
{
    private readonly OpenFgaClient _fga;

    public OpenFgaAuthorizer(OpenFgaClient fga) => _fga = fga;

    public async Task<bool> AllowedAsync(ClaimsPrincipal user, string relation, string @object)
    {
        var response = await _fga.Check(new ClientCheckRequest
        {
            User = UserRef.Of(user),
            Relation = relation,
            Object = @object,
            Context = new { current_time = DateTime.UtcNow.ToString("o") },
        });
        return response.Allowed ?? false;
    }
}
```

Il confronto:

```csharp
    public async Task<bool> AllowedAsync(ClaimsPrincipal user, string relation, string @object)
    {
        var rbac = await _rbac.AllowedAsync(user, relation, @object);
        var fga = await _fga.AllowedAsync(user, relation, @object);

        if (rbac != fga)
        {
            _log.LogWarning(
                "dual-check mismatch: {User} {Relation} {Object} -> rbac={Rbac} openfga={Fga}",
                UserRef.Of(user), relation, @object, rbac, fga);
        }

        return _opts.SourceOfTruth switch
        {
            "openfga" => fga,
            "dual" => rbac && fga,   // per confronto, non usato in migrazione
            _ => rbac,               // "rbac": fonte di verita' finche' i log non sono puliti
        };
    }
}
```

> **Nota**: nella demo lo shadow è sincrono, così il codice sta in una schermata. In un sistema reale la domanda a OpenFGA va in asincrono, con un timeout, e non rallenta la risposta all'utente.

Il default è `rbac`: decide il vecchio controllo, OpenFGA osserva. I token li firma `scripts/token.sh` con la chiave di sviluppo HS256 dichiarata nel `docker-compose.yml` (non è un segreto). `./scripts/token.sh anna student` stampa un JWT di Anna con il ruolo `student`. Dal toolbox il backend risponde su `backend:8080`; dall'host è sulla porta 5180.

```bash
# toolbox
$ curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(./scripts/token.sh anna student)" backend:8080/courses/42
200
$ curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(./scripts/token.sh anna student)" backend:8080/courses/43
200
$ curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $(./scripts/token.sh mario author)" backend:8080/courses/43
200
$ curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(./scripts/token.sh giulia)" backend:8080/courses/42
403
```

Il log del backend, sull'host:

```bash
# host
$ docker compose logs backend --no-log-prefix | grep -B1 mismatch | grep -v -- '^--'
warn: ElearningApi.Authz.DualCheckAuthorizer[0]
      dual-check mismatch: user:anna viewer course:43 -> rbac=True openfga=False
warn: ElearningApi.Authz.DualCheckAuthorizer[0]
      dual-check mismatch: user:mario editor course:43 -> rbac=True openfga=False
warn: ElearningApi.Authz.DualCheckAuthorizer[0]
      dual-check mismatch: user:giulia viewer course:42 -> rbac=False openfga=True
```

Come leggere i mismatch:

| Mismatch | Cosa significa | Cosa fare |
|---|---|---|
| Anna legge il 43, che Acme non ha comprato | vecchia regola troppo larga | è un bug di autorizzazione: il cutover lo chiude |
| Mario modifica il 43, dove è solo studente | vecchia regola troppo larga | come sopra |
| Giulia respinta sul 42, che le spetta | al vecchio sistema manca un ruolo | spiegarlo prima del cutover |

Il cutover si fa quando non resta nessun mismatch senza spiegazione.

## Passo 8 · Cutover

**Obiettivo:** passare la decisione a OpenFGA cambiando una variabile, e verificare che i mismatch del passo 7 si chiudano.

```bash
# host
AUTHZ__SOURCEOFTRUTH=openfga docker compose up -d backend
```

Poi di nuovo le stesse richieste, nella shell del toolbox (`docker compose exec toolbox sh`, se l'avete chiusa):

```bash
# toolbox
$ curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(./scripts/token.sh anna student)" backend:8080/courses/42
200
$ curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(./scripts/token.sh anna student)" backend:8080/courses/43
403
$ curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "Authorization: Bearer $(./scripts/token.sh mario author)" backend:8080/courses/43
403
$ curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $(./scripts/token.sh giulia)" backend:8080/courses/42
200
```

| Richiesta | Prima (`rbac`) | Dopo (`openfga`) |
|---|---|---|
| Anna, corso 42 | 200 | 200 |
| Anna, corso 43 | 200 | 403 |
| Mario modifica il 43 | 200 | 403 |
| Giulia, corso 42 | 403 | 200 |

Fra le due colonne è cambiata solo la variabile. Rollback: lo stesso comando con `rbac`. Per spegnere, sull'host: `docker compose down`; con `-v` si cancella anche lo store id e il prossimo `up` riparte da zero.

## Cosa resta fuori

- sync fra identity provider e OpenFGA: [Keycloak e OpenFGA](/blog/verificare/openfga/02-openfga-keycloak/);
- gerarchie profonde e query inverse: [gerarchie e query inverse](/blog/verificare/openfga/04-gerarchie-query/);
- cache dei check e ListObjects sotto carico: [ListObjects in produzione](/blog/verificare/openfga/05-listobjects-performance/);
- il modello spiegato da zero: [Zanzibar per tutti](/blog/verificare/openfga/01-zanzibar-concetti/).

Per portarlo sul vostro sistema bastano tre mosse: il modello di un solo tipo di risorsa con il suo test, un `DualCheckAuthorizer` accanto al controllo che c'è sull'endpoint dove i ruoli hanno già un identificativo nel nome, e due settimane di log. A quel punto, quando qualcuno chiede chi vede cosa, la risposta è un comando che si lancia e un output che si allega.
