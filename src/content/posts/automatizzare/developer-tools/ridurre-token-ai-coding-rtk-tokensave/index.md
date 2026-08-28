---
title: "RTK e tokensave: ridurre i costi dei token nell'AI coding"
seoTitle: "RTK e tokensave: meno token nell'AI coding"
date: 2026-05-27T09:00:00.000Z
description: "Due tool Rust ortogonali: RTK comprime l'output verboso della CLI, tokensave indicizza il codice in un knowledge graph. Circa -80% e -93% di token."
pillar: automatizzare
category: developer-tools
tags: [Claude Code, MCP, Rust, Developer Tools, AI, RTK, tokensave]
lang: it
reviewed: false
draft: false
summary:
  - label: "Problema"
    value: "Consumo di token non lineare rispetto alla complessità dei task"
    note: "Due sorgenti strutturali: output CLI verboso e scansioni ripetute del codebase"
  - label: "Scelta"
    value: "Due tool ortogonali: RTK comprime l'output CLI, tokensave indicizza il codice"
    note: "Uno agisce sull'output dei comandi, l'altro su come il modello naviga il codice"
  - label: "Risultato"
    value: "Circa -80% sui token dell'output CLI, media -93% sulle esplorazioni"
  - label: "Ampiezza"
    value: "RTK indipendente dai linguaggi, tokensave ne copre 34 in tre tier"
openItems:
  - "I risparmi sono stime indicative per una sessione da 30 minuti su un progetto TypeScript/Rust medio: il valore reale si misura con `rtk gain`"
  - "L'hook di RTK intercetta solo le chiamate Bash: i tool nativi Read, Grep e Glob non passano dal rewrite"
  - "Il grafo di tokensave copre i linguaggi dei tre tier: file esclusi da `.gitignore` o linguaggi assenti lasciano buchi nell'indice"
  - "tokensave è tutto locale: le sole chiamate di rete sono opzionali e disattivabili, e non trasportano codice"
openNote: "Numeri dichiarati e coperture: da riportare sul proprio utilizzo."
mode: how-to
---

Claude Code funziona. I task vengono completati, il codice prodotto è corretto. C'è un dettaglio che emerge solo guardando i contatori: i token consumati crescono in modo non lineare rispetto alla complessità dei task. Le sessioni lunghe costano molto più del previsto.

La causa non sono i prompt. Sono due sorgenti strutturali che operano in silenzio, indipendentemente da come si usa il tool.

## Il 90% dei token non viene dai prompt

### 200 token per sapere che il push è andato bene

Ogni volta che Claude Code esegue un comando shell, l'output grezzo entra nel contesto del modello. Un `git push` standard produce circa 200 token di boilerplate ("Enumerating objects", "Counting objects", "Delta compression..."). Il modello ha bisogno solo dell'esito: `ok main`. Gli altri 190 token sono rumore che accumula contesto senza aggiungere informazione. Moltiplicato per decine di operazioni a sessione, il costo diventa rilevante.

### Ogni task inizia con una scansione cieca del codebase

Prima di ogni task complesso, Claude Code spawna agenti Explore che usano `grep`, `glob` e `Read` per orientarsi nel progetto. Su un codebase medio, questo si traduce in decine di tool call e migliaia di token - solo per individuare i file rilevanti. Il codebase non cambia tra un task e l'altro, ma la scansione ricomincia da zero ogni volta.

I due problemi hanno natura diversa. La soluzione per uno non risolve l'altro. Nelle sezioni seguenti: **RTK** per la compressione dell'output CLI, **tokensave** per la navigazione del codebase.

## RTK: da 200 token di boilerplate a uno

RTK è un proxy CLI che intercetta i comandi shell prima che il loro output raggiunga il modello e applica quattro strategie di compressione:

- **Smart Filtering** - rimuove boilerplate, commenti, whitespace
- **Grouping** - aggrega elementi simili (file per directory, errori per tipo)
- **Truncation** - mantiene il contesto rilevante, taglia la ridondanza
- **Deduplication** - collassa log ripetuti con un contatore

Stime indicative su una sessione Claude Code da 30 minuti su un progetto TypeScript/Rust medio. Il risparmio reale varia per progetto e si può misurare con `rtk gain`:

| Operazione | Standard | RTK | Risparmio |
|---|---|---|---|
| `ls` / `tree` (10x) | 2.000 | 400 | -80% |
| `cat` / `read` (20x) | 40.000 | 12.000 | -70% |
| `grep` / `rg` (8x) | 16.000 | 3.200 | -80% |
| `git status` (10x) | 3.000 | 600 | -80% |
| `git diff` (5x) | 10.000 | 2.500 | -75% |
| `git add/commit/push` (8x) | 1.600 | 120 | -92% |
| `cargo test` / `npm test` (5x) | 25.000 | 2.500 | -90% |
| `pytest` (4x) | 8.000 | 800 | -90% |
| **Totale** | **~118.000** | **~23.900** | **-80%** |

### Installazione RTK

**Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**macOS**
```bash
brew install rtk
```

**Cargo**
```bash
cargo install --git https://github.com/rtk-ai/rtk
```

**Verifica**
```bash
rtk --version
rtk gain
```

### Integrazione con Claude Code: un hook che riscrive i comandi

```bash
rtk init -g
# riavvia Claude Code
```

Il comando installa un `PreToolUse` hook in `~/.claude/settings.json` che riscrive automaticamente i comandi Bash (`git status` → `rtk git status`) prima dell'esecuzione. Da quel momento RTK è attivo su ogni sessione senza intervento manuale.

Supporta anche altri tool:

```bash
rtk init -g --gemini         # Gemini CLI
rtk init -g --codex          # Codex (OpenAI)
rtk init -g --agent cursor   # Cursor
rtk init --agent windsurf    # Windsurf
rtk init --agent cline       # Cline / Roo Code
```

> L'hook intercetta solo le Bash tool call. I tool built-in di Claude Code (`Read`, `Grep`, `Glob`) non passano dall'hook. Per quei flussi è possibile usare comandi shell equivalenti (`cat`, `rg`, `find`) oppure chiamare `rtk read`, `rtk grep`, `rtk find` esplicitamente.

### Comandi principali RTK

**File**
```bash
rtk ls .                          # directory tree ottimizzato
rtk read file.rs                  # lettura smart
rtk read file.rs -l aggressive    # solo firme (senza body)
rtk grep "pattern" .              # risultati raggruppati
rtk diff file1 file2              # diff condensato
```

**Git**
```bash
rtk git status    # output compatto
rtk git push      # "ok main"
rtk git commit    # "ok abc1234"
rtk git log -n 10 # commit su una riga
```

**Test e build**
```bash
rtk cargo test    # solo i fallimenti (-90%)
rtk pytest        # solo i fallimenti (-90%)
rtk jest          # solo i fallimenti (-90%)
rtk cargo build
rtk tsc           # errori TypeScript raggruppati per file
```

### Monitoraggio risparmio RTK

```bash
rtk gain                       # statistiche aggregate
rtk gain --graph               # grafico ASCII (ultimi 30 giorni)
rtk gain --history             # storico comandi recenti
rtk gain --daily               # breakdown giornaliero
rtk gain --all --format json   # export JSON
rtk discover                   # opportunità non sfruttate
```

### Configurazione avanzata RTK

`~/.config/rtk/config.toml` (Linux) o `~/Library/Application Support/rtk/config.toml` (macOS):

```toml
[hooks]
exclude_commands = ["curl", "playwright"]  # escludi dal rewrite

[tee]
enabled = true       # salva l'output grezzo in caso di fallimento
mode = "failures"    # "failures" | "always" | "never"
```

Quando un comando fallisce, RTK salva l'output completo non filtrato in `~/.local/share/rtk/tee/` in modo che il modello possa leggerlo senza rieseguire il comando.

La telemetria è disabilitata per default e richiede consenso esplicito durante `rtk init`.

---

## tokensave: il codebase viene indicizzato una volta, non ri-scansionato ogni task

tokensave è un MCP server che costruisce un knowledge graph semantico del progetto tramite Tree-sitter, indicizzato localmente. Invece di lasciare che Claude Code spawni agenti Explore che scansionano file con `grep` e `glob`, il modello interroga il grafo precompilato.

Il funzionamento si basa su tre layer:

| Layer | Funzione |
|---|---|
| **MCP server** | Espone i tool `tokensave_*` a Claude Code |
| **CLAUDE.md rules** | Istruisce il modello a preferire tokensave alle letture dirette |
| **PreToolUse hook** | Blocca gli agenti Explore a livello di sistema |

### Installazione tokensave

**Linux (x86_64)**
```bash
curl -LO https://github.com/aovestdipaperino/tokensave/releases/download/v6.1.1/tokensave-v6.1.1-x86_64-linux.tar.gz
tar xzf tokensave-v6.1.1-x86_64-linux.tar.gz
sudo mv tokensave /usr/local/bin/
```

Per ARM64, sostituire `x86_64` con `aarch64`.

**macOS**
```bash
brew install aovestdipaperino/tap/tokensave
```

**Windows**
```bash
scoop bucket add tokensave https://github.com/aovestdipaperino/scoop-bucket
scoop install tokensave
```

**Cargo**
```bash
cargo install tokensave
```

**Verifica**
```bash
tokensave --version
tokensave doctor
```

`doctor` verifica binary, database locale, configurazione e integrazione con Claude Code. In caso di anomalie, segnala le istruzioni per risolverle.

### Integrazione con Claude Code: un comando unico

```bash
tokensave install
# riavvia Claude Code
```

Scrive in `~/.claude/settings.json`: il server MCP, il PreToolUse hook, i permessi per i tool MCP, le regole in `~/.claude/CLAUDE.md`. Il comando è idempotente.

### Inizializzazione per progetto

```bash
cd /path/to/your/project
tokensave init
```

Crea `.tokensave/` con il knowledge graph. Va eseguito una volta per progetto. Per forzare una re-indicizzazione completa:

```bash
tokensave sync --force
```

### Tre strategie di aggiornamento del grafo

**Sync manuale** - per chi preferisce controllo totale:
```bash
tokensave sync   # incrementale: reindicizza solo i file modificati
```

**Daemon** - aggiornamento automatico ad ogni modifica:
```bash
tokensave daemon --enable-autostart
```

**Git hook** - aggiornamento automatico ad ogni commit:
```bash
tokensave install --git-hook
```

Il hook è un no-op nei repo non inizializzati con tokensave.

Con la modalità **branch-aware** (daemon attivo), ogni branch mantiene il proprio indice. Cambiando branch, il grafo riflette esattamente il codice corrente senza risultati stale.

### Tool MCP esposti al modello

La versione corrente espone 48 tool in totale. Di seguito i principali:

| Tool | Funzione |
|---|---|
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
| `tokensave_hotspots` | Simboli piu' connessi (alto rischio di regressioni) |
| `tokensave_similar` | Simboli con nomi simili |
| `tokensave_rename_preview` | Anteprima impatto di un rename |
| `tokensave_unused_imports` | Import mai referenziati |
| `tokensave_changelog` | Diff semantico tra due git ref |
| `tokensave_status` | Stato indice, statistiche, token risparmiati |

Dalla CLI è possibile usare direttamente alcuni di questi:

```bash
tokensave query <simbolo>
tokensave affected src/main.rs
git diff --name-only HEAD~1 | tokensave affected --stdin
tokensave status --show-flags
```

### Linguaggi supportati

34 linguaggi dalla v6.1.1, organizzati in tre tier: **Lite** (11 linguaggi), **Medium** (20), **Full** (34). Tra i supportati: Rust, Go, Java, Scala, TypeScript, JavaScript, Python, C, C++, Kotlin, Dart, C#, Pascal, PHP, Ruby e altri.

### Privacy

tokensave è **100% locale**: il codice non lascia mai la macchina. Fa due chiamate di rete opzionali:

- **Counter mondiale** - invia solo il numero di token risparmiati (nessun codice, nessun nome file) a un worker Cloudflare anonimo. Disabilitabile con `tokensave disable-upload-counter`.
- **Version check** - controlla nuove release su GitHub. Timeout di 1 secondo, fallisce silenziosamente.

### Troubleshooting tokensave

**"tokensave not initialized"**
```bash
tokensave init
```

**MCP server non connesso**
```bash
which tokensave           # verifica che sia nel PATH
tokensave install         # riesegui se mancano permessi
# poi riavvia Claude Code
```

**Simboli mancanti nel grafo**
```bash
tokensave sync
```
Verificare che il linguaggio sia supportato e il file non sia escluso da `.gitignore`.

---

## I due tool a confronto

| | RTK | tokensave |
|---|---|---|
| **Problema** | Output verboso dei comandi CLI | Esplorazione costosa del codebase |
| **Layer** | Shell - modello | Codebase - modello |
| **Meccanismo** | Proxy + compressione | Knowledge graph + hook |
| **Setup globale** | `rtk init -g` | `tokensave install` |
| **Setup per progetto** | Non necessario | `tokensave init` |
| **Aggiornamento** | Automatico via hook | `tokensave sync` o daemon |
| **Risparmio dichiarato** | -80% su output CLI | Media 93% su tool call esplorative |
| **Linguaggi** | Agnostico | 34 (3 tier) |
| **Licenza** | Apache 2.0 | MIT |

RTK agisce sull'output dei comandi che il modello esegue. tokensave agisce su come il modello naviga il codice. I due problemi sono ortogonali: uno strumento non sostituisce l'altro.

## Risorse

- **RTK**: [github.com/rtk-ai/rtk](https://github.com/rtk-ai/rtk)
- **tokensave**: [github.com/aovestdipaperino/tokensave](https://github.com/aovestdipaperino/tokensave) - [tokensave.dev](https://tokensave.dev)
