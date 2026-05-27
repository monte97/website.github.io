---
title: "tokensave: il knowledge graph semantico che trasforma Claude Code"
date: 2026-05-27T09:00:00.000Z
description: "tokensave è un MCP server scritto in Rust che costruisce un knowledge graph locale del codebase. Invece di agenti Explore che scansionano file con grep e glob, Claude Code interroga il grafo — meno chiamate, meno token, più contesto."
pillar: automatizzare
category: developer-tools
tags: [Claude Code, MCP, Rust, Developer Tools, AI]
lang: it
draft: true
---

Quando lavori su un progetto grande con Claude Code, prima o poi ti accorgi di un pattern: il modello spawna agenti Explore che girano per il codebase con `grep` e `glob` alla ricerca di simboli, dipendenze, file collegati. Funziona, ma è lento e costoso. Ogni scan consuma token, ogni agente apre file che magari non servono.

**tokensave** risolve questo problema alla radice: costruisce un knowledge graph semantico del tuo codebase, lo mantiene aggiornato localmente, e lo espone a Claude Code tramite tool MCP. Il modello smette di esplorare e inizia a interrogare.

## Come funziona

tokensave è un MCP server scritto in Rust. All'avvio indicizza il progetto e produce un grafo di dipendenze semantiche: funzioni, classi, tipi, import, call graph. Il grafo è persistito localmente in `.tokensave/` — nessuna chiamata di rete, nessun dato che esce dalla macchina.

Quando Claude Code deve trovare dove viene usata una funzione, invece di aprire tutti i file con `grep`, chiama `tokensave_callers`. Invece di esplorare l'intera directory `src/`, chiama `tokensave_context` con il task corrente. Il risultato è lo stesso, ma con un'unica chiamata MCP invece di decine di letture su file.

Il risparmio medio dichiarato dal progetto è tra il 60 e il 90% dei token su operazioni di sviluppo tipiche.

## Installazione

### Linux (x86_64)

```bash
curl -LO https://github.com/aovestdipaperino/tokensave/releases/download/v1.4.2/tokensave-v1.4.2-x86_64-linux.tar.gz
tar xzf tokensave-v1.4.2-x86_64-linux.tar.gz
sudo mv tokensave /usr/local/bin/
```

Per ARM64, sostituisci `x86_64` con `aarch64`.

### macOS

```bash
brew install aovestdipaperino/tap/tokensave
```

### Windows

```bash
scoop bucket add tokensave https://github.com/aovestdipaperino/scoop-aovestdipaperino
scoop install tokensave
```

### Da sorgente (qualsiasi piattaforma)

```bash
cargo install tokensave
```

Dopo l'installazione, verifica che tutto funzioni:

```bash
tokensave --version
tokensave doctor
```

`doctor` controlla il binary, il database locale, la configurazione utente e l'integrazione con Claude Code. Se qualcosa non torna, ti dice cosa fare.

## Configurazione con Claude Code

L'integrazione si fa con un unico comando:

```bash
tokensave install
```

Questo scrive in `~/.claude/settings.json`:
- La definizione del server MCP
- Un hook `PreToolUse` che intercetta e blocca gli agenti Explore
- I permessi per tutti i tool MCP
- Le regole in `~/.claude/CLAUDE.md` per preferire i tool tokensave alle letture dirette

Il comando è idempotente — puoi eseguirlo più volte senza problemi. Dopo, riavvia Claude Code: la configurazione viene letta solo all'avvio.

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

## Mantieni il grafo aggiornato

Tre opzioni, in ordine di praticità:

**Daemon** — la soluzione più comoda. Osserva i file in background e sincronizza ad ogni modifica:

```bash
tokensave daemon --enable-autostart
```

**Sync manuale** — quando vuoi controllo totale:

```bash
tokensave sync
```

Aggiornamento incrementale: reindicizza solo i file modificati dall'ultimo sync.

**Git hook** — alternativa al daemon, si attiva ad ogni commit:

```bash
git config --global core.hooksPath ~/.git-hooks
mkdir -p ~/.git-hooks
cp scripts/post-commit ~/.git-hooks/post-commit
chmod +x ~/.git-hooks/post-commit
```

Il hook è un no-op nei repo non inizializzati con tokensave: non interferisce con altri progetti.

## I tool MCP disponibili

Questi tool vengono usati da Claude Code in automatico, ma puoi anche chiedere esplicitamente di usarli:

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

Dalla CLI puoi usare direttamente alcuni di questi:

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

Con la modalità **branch-aware**, ogni branch mantiene il proprio indice. Quando cambi branch non ottieni risultati stale dal branch precedente — il grafo riflette esattamente il codice che stai leggendo.

## Linguaggi supportati

Rust, Go, Java, Scala, TypeScript, JavaScript, Python, C, C++, Kotlin, Dart, C#, Pascal, PHP, Ruby — 15 linguaggi dalla v1.4.2.

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

tokensave risolve un problema reale che emerge lavorando quotidianamente con Claude Code su codebase di dimensioni non banali. L'approccio — costruire un indice semantico locale invece di lasciare che il modello esplori i file ogni volta — è concettualmente semplice ma praticamente efficace. Se già usi Claude Code in modo intensivo, vale la pena provarlo.

**Repository**: [github.com/aovestdipaperino/tokensave](https://github.com/aovestdipaperino/tokensave)
