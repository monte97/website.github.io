# Scripts

Questa directory contiene strumenti per la gestione del blog.

## 📁 Cover Generator

Strumenti per generare automaticamente copertine per gli articoli.

### Documentazione

Vedi [`cover-generator/README.md`](cover-generator/README.md) per la documentazione completa.

### Comandi Rapidi

```bash
# Genera copertine per un singolo articolo
npm run cover:gen -- content/posts/kafka/01-intro

# Con template specifico
npm run cover:gen -- content/posts/kafka/01-intro --template dark

# Genera per tutta una serie
npm run cover:all -- kafka

# Genera serie con template specifico
npm run cover:all -- kafka --template neon
```

### Template Disponibili

| Template | Descrizione |
|----------|-------------|
| `minimal` | Minimal Gradient (default) |
| `dark` | Dark Geometric |
| `split` | Split Color |
| `glass` | Glassmorphism |
| `neon` | Neon Cyber |
| `magazine` | Magazine Style |
| `code` | Code Editor |
| `mesh` | Gradient Mesh |

### Struttura

```
scripts/
├── cover-generator/                    # Strumenti cover generator
│   ├── generate-cover.js               # Generatore singolo
│   ├── generate-all-covers.js          # Generatore batch
│   ├── template-generators.js          # Funzioni template (export)
│   ├── export-templates.js             # Export HTML statici
│   ├── templates/                      # Template HTML
│   │   ├── README.md
│   │   ├── cover-template.html
│   │   ├── examples/                   # Anteprime ed esempi
│   │   │   ├── README.md
│   │   │   ├── alternative-templates.html
│   │   │   └── cover-design-final.html
│   │   └── html/                       # Template statici (git)
│   │       ├── README.md
│   │       ├── index.html
│   │       └── 01-*.html ... 08-*.html
│   ├── README.md                       # Documentazione completa
│   ├── COVER_GENERATOR.md              # Guida dettagliata
│   └── QUICKSTART.md                   # Referenza rapida
├── cover-gen.js                        # Wrapper per cover:gen
├── cover-all.js                        # Wrapper per cover:all
└── README.md                           # Questo file
```

## 📁 Content Management

Script per la creazione di nuovi contenuti:

- `new_post.sh` - Crea un nuovo articolo
- `new_project.sh` - Crea un nuovo progetto
- `new_note.sh` - Crea una nuova nota
- `content_index.sh` - Genera l'indice dei contenuti

## 🔧 Utilizzo

Tutti gli script sono eseguibili direttamente o tramite npm:

```bash
# Tramite npm
npm run cover:gen -- <options>
npm run cover:all -- <options>

# Direttamente
node scripts/cover-gen.js <options>
node scripts/cover-all.js <options>
./scripts/new_post.sh <title>
```
