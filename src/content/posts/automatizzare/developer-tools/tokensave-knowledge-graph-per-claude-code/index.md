---
title: "tokensave: knowledge graph semantico locale per Claude Code"
date: 2026-05-27T09:00:00.000Z
description: "MCP server Rust che costruisce un knowledge graph locale del codebase. Claude Code interroga il grafo invece di lanciare agenti Explore — meno token, più contesto."
pillar: automatizzare
category: developer-tools
tags: [Claude Code, MCP, Rust, Developer Tools, AI]
lang: it
draft: true
---

Lavorando su progetti grandi con Claude Code, emerge un pattern ricorrente: il modello spawna agenti Explore che girano per il codebase con `grep` e `glob` alla ricerca di simboli, dipendenze, file collegati. Funziona, ma è lento e costoso in termini di token. Ogni scan apre file che spesso non servono.

**tokensave** risolve questo alla radice: costruisce un knowledge graph semantico del codebase, lo mantiene aggiornato localmente, e lo espone tramite tool MCP. Il modello smette di esplorare e inizia a interrogare.

## Da grep distribuiti a una query sul grafo

tokensave è un MCP server scritto in Rust. All'avvio indicizza il progetto e produce un grafo di dipendenze semantiche: funzioni, classi, tipi, import, call graph. Il grafo è persistito localmente in `.tokensave/` — nessuna chiamata di rete, nessun dato che esce dalla macchina.

Quando Claude Code deve trovare dove viene usata una funzione, invece di aprire tutti i file con `grep`, chiama `tokensave_callers`. Invece di esplorare l'intera directory `src/`, chiama `tokensave_context` con il task corrente. Il risultato è lo stesso, ma con un'unica chiamata MCP invece di decine di letture su file.

Il risparmio medio dichiarato dal progetto è del 93% dei token su operazioni di sviluppo tipiche, con un range dal 44 al 99% a seconda del tipo di task.

## Installazione

### Linux (x86_64)

```bash
curl -LO https://github.com/aovestdipaperino/tokensave/releases/download/v6.1.1/tokensave-v6.1.1-x86_64-linux.tar.gz
tar xzf tokensave-v6.1.1-x86_64-linux.tar.gz
sudo mv tokensave /usr/local/bin/
```

Per ARM64, sostituisci `x86_64` con `aarch64`.

### macOS

```bash
brew install aovestdipaperino/tap/tokensave
```

### Windows

```bash
scoop bucket add tokensave https://github.com/aovestdipaperino/scoop-bucket
scoop install tokensave
```

### Da sorgente (qualsiasi piattaforma)

```bash
cargo install tokensave
```

Dopo l'installazione, è possibile verificare che tutto funzioni:

```bash
tokensave --version
tokensave doctor
```

`doctor` controlla il binary, il database locale, la configurazione utente e l'integrazione con Claude Code. In caso di problemi, segnala l'anomalia con indicazioni su come risolverla.

## Integrazione con Claude Code: un comando unico

L'integrazione si fa con un unico comando:

```bash
tokensave install
```

Questo scrive in `~/.claude/settings.json`:
- La definizione del server MCP
- Un hook `PreToolUse` che intercetta e blocca gli agenti Explore
- I permessi per tutti i tool MCP
- Le regole in `~/.claude/CLAUDE.md` per preferire i tool tokensave alle letture dirette

Il comando è idempotente: è possibile eseguirlo più volte senza effetti collaterali. La configurazione viene letta solo all'avvio di Claude Code, quindi è necessario riavviarlo dopo la prima installazione.

## Inizializzazione per progetto

```bash
cd /path/to/your/project
tokensave init
```

Crea `.tokensave/` con il knowledge graph iniziale. Su progetti piccoli è questione di secondi, su codebase grandi può richiedere qualche minuto.

Per forzare una re-indicizzazione completa:

```bash
tokensave sync --force
```

## Tre strategie di aggiornamento del grafo

Tre opzioni, in ordine di praticità:

**Daemon** - la soluzione con meno overhead operativo. Osserva i file in background e sincronizza ad ogni modifica:

```bash
tokensave daemon --enable-autostart
```

**Sync manuale** - per chi preferisce controllo totale:

```bash
tokensave sync
```

Aggiornamento incrementale: reindicizza solo i file modificati dall'ultimo sync.

**Git hook** — alternativa al daemon, si attiva ad ogni commit. Il modo più semplice è tramite il comando dedicato:

```bash
tokensave install --git-hook
```

Il hook è un no-op nei repo non inizializzati con tokensave: non interferisce con altri progetti.

## I tool MCP esposti al modello

Questi tool vengono usati da Claude Code in automatico, ma è possibile anche chiedergli esplicitamente di usarli. Di seguito i principali (la versione corrente ne espone 48 in totale):

| Tool | A cosa serve |
|------|-------------|
| `tokensave_search` | Trova simboli per nome (funzioni, classi, tipi) |
| `tokensave_context` | Contesto rilevante per un task specifico |
| `tokensave_callers` | Chi chiama una funzione |
| `tokensave_callees` | Cosa viene chiamato da una funzione |
| `tokensave_impact` | Cosa si rompe modificando un simbolo |
| `tokensave_node` | Dettagli e sorgente di un simbolo |
| `tokensave_files` | Lista file indicizzati con filtri |
| `tokensave_affected` | Test file impattati da modifiche |
| `tokensave_dead_code` | Simboli non raggiungibili |
| `tokensave_diff_context` | Contesto semantico per file modificati |
| `tokensave_module_api` | API pubblica di un file o directory |
| `tokensave_circular` | Dipendenze circolari tra file |
| `tokensave_hotspots` | Simboli più connessi (alto rischio di regressioni) |
| `tokensave_similar` | Simboli con nomi simili (utile per refactoring) |
| `tokensave_rename_preview` | Anteprima impatto di un rename |
| `tokensave_unused_imports` | Import mai referenziati |
| `tokensave_changelog` | Diff semantico tra due git ref |
| `tokensave_status` | Stato indice e statistiche |

Dalla CLI è possibile usare direttamente alcuni di questi:

```bash
tokensave query <simbolo>                              # cerca nel grafo
tokensave affected src/main.rs                         # test impattati
git diff --name-only HEAD~1 | tokensave affected --stdin  # da git diff
tokensave status --show-flags                          # statistiche
```

## Modalità operative

| Modalità | Daemon | Branch tracking | Adatta per |
|----------|--------|-----------------|------------|
| Manuale | off | — | Controllo totale |
| Auto-sync | on | off | Set and forget |
| Branch-aware | on | on | Progetti multi-branch |

Con la modalità **branch-aware**, ogni branch mantiene il proprio indice. Cambiando branch, il grafo riflette esattamente il codice corrente, senza risultati stale dalla sessione precedente.

## Linguaggi supportati

34 linguaggi dalla v6.1.1, organizzati in tre tier: **Lite** (11 linguaggi), **Medium** (20), **Full** (34). Tra i supportati: Rust, Go, Java, Scala, TypeScript, JavaScript, Python, C, C++, Kotlin, Dart, C#, Pascal, PHP, Ruby e altri.

## Privacy

tokensave è **100% locale**: il codice non lascia mai la macchina. Fa due chiamate di rete opzionali:

- **Counter mondiale** — invia solo il numero di token risparmiati (nessun codice, nessun nome file) a un worker Cloudflare anonimo. Disabilitabile con `tokensave disable-upload-counter`.
- **Version check** — controlla nuove release su GitHub. Ha timeout di 1 secondo e fallisce silenziosamente.

## Troubleshooting rapido

**"tokensave not initialized"** — la cartella `.tokensave/` non esiste:
```bash
tokensave init
```

**MCP server non connesso** — Claude Code non vede i tool:
1. Verifica che `~/.claude/settings.json` contenga la configurazione MCP
2. Riavvia Claude Code completamente
3. Verifica che `tokensave` sia nel PATH: `which tokensave`
4. Riesegui `tokensave install` se mancano permessi

**Simboli mancanti nel grafo** — esegui `tokensave sync` e verifica che il linguaggio sia supportato e il file non sia escluso da `.gitignore`.

---

tokensave risolve un problema strutturale nel flusso di lavoro con Claude Code su codebase di medie e grandi dimensioni. L'approccio - costruire un indice semantico locale invece di fare esplorare i file al modello ad ogni sessione - elimina una categoria intera di operazioni costose in termini di token. Il repository è disponibile su GitHub con istruzioni di installazione per tutte le piattaforme.

**Repository**: [github.com/aovestdipaperino/tokensave](https://github.com/aovestdipaperino/tokensave)
