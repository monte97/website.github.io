#!/bin/bash

# Script interattivo per creare un nuovo progetto

set -e

echo ""
echo "=== Creazione Nuovo Progetto ==="
echo ""

read -p "Inserisci lo slug del progetto (es: my-awesome-project): " PROJECT_SLUG

if [ -z "$PROJECT_SLUG" ]; then
    echo "Errore: lo slug non può essere vuoto!"
    exit 1
fi

PROJECT_DIR="content/posts/projects/$PROJECT_SLUG"

if [ -d "$PROJECT_DIR" ]; then
    echo "Errore: il progetto '$PROJECT_SLUG' esiste già!"
    exit 1
fi

read -p "Inserisci il titolo del progetto (italiano): " TITLE_IT
read -p "Inserisci il titolo del progetto (inglese): " TITLE_EN
read -p "Inserisci una breve descrizione (italiano): " DESC_IT
read -p "Inserisci una breve descrizione (inglese): " DESC_EN
read -p "Inserisci le tecnologie separate da virgola (es: Kubernetes,Docker,Go): " TECHNOLOGIES
read -p "Inserisci le categorie separate da virgola (es: Platform Engineering,Observability): " CATEGORIES

echo ""
echo "Tag disponibili per i filtri homepage:"
echo "  platform, event-driven, observability, cloud, testing"
read -p "Inserisci i tag per i filtri separati da virgola: " FILTER_TAGS

read -p "Inserisci il peso/priorità nel menu (es: 10) [default: 100]: " WEIGHT

WEIGHT=${WEIGHT:-100}

# Converti lo slug per l'identifier del menu
MENU_SLUG=$(echo "$PROJECT_SLUG" | tr '-' '_')

# Data in formato ISO 8601
PROJECT_DATE=$(date -u "+%Y-%m-%dT%H:%M:%SZ")

# Crea la cartella del progetto
mkdir -p "$PROJECT_DIR"

# Crea il file italiano
cat > "$PROJECT_DIR/index.md" << 'CONTENT_EOF'
---
title: "TITLE_IT_PLACEHOLDER"
date: PROJECT_DATE_PLACEHOLDER
draft: true
description: "DESC_IT_PLACEHOLDER"
menu:
  sidebar:
    name: TITLE_IT_PLACEHOLDER
    identifier: MENU_SLUG_PLACEHOLDER
    parent: projects
    weight: WEIGHT_PLACEHOLDER
technologies: [TECHNOLOGIES_PLACEHOLDER]
categories: [CATEGORIES_PLACEHOLDER]
---

## Overview

Descrizione del progetto: cosa fa, perché esiste, quale problema risolve.

## Stack Tecnologico

* **Tecnologia 1** — ruolo nel progetto
* **Tecnologia 2** — ruolo nel progetto

## Architettura

```text
┌─────────────┐     ┌─────────────┐
│ Component A │────▶│ Component B │
└─────────────┘     └─────────────┘
```

## Sfide e Soluzioni

### Sfida 1: Titolo

Descrizione del problema e come è stato risolto.

## Risultati

* **Metrica 1**: da X a Y (miglioramento Z%)
* **Metrica 2**: risultato ottenuto

## Articoli Correlati

* [Titolo articolo](/posts/slug-articolo/)
CONTENT_EOF

# Sostituisci i placeholder nel file italiano
sed -i "s|TITLE_IT_PLACEHOLDER|$TITLE_IT|g" "$PROJECT_DIR/index.md"
sed -i "s|DESC_IT_PLACEHOLDER|$DESC_IT|g" "$PROJECT_DIR/index.md"
sed -i "s|PROJECT_DATE_PLACEHOLDER|$PROJECT_DATE|g" "$PROJECT_DIR/index.md"
sed -i "s|MENU_SLUG_PLACEHOLDER|$MENU_SLUG|g" "$PROJECT_DIR/index.md"
sed -i "s|WEIGHT_PLACEHOLDER|$WEIGHT|g" "$PROJECT_DIR/index.md"
sed -i "s|TECHNOLOGIES_PLACEHOLDER|$TECHNOLOGIES|g" "$PROJECT_DIR/index.md"
sed -i "s|CATEGORIES_PLACEHOLDER|$CATEGORIES|g" "$PROJECT_DIR/index.md"

# Crea il file inglese
cat > "$PROJECT_DIR/index.en.md" << 'CONTENT_EOF'
---
title: "TITLE_EN_PLACEHOLDER"
date: PROJECT_DATE_PLACEHOLDER
draft: true
description: "DESC_EN_PLACEHOLDER"
menu:
  sidebar:
    name: TITLE_EN_PLACEHOLDER
    identifier: MENU_SLUG_PLACEHOLDER
    parent: projects
    weight: WEIGHT_PLACEHOLDER
technologies: [TECHNOLOGIES_PLACEHOLDER]
categories: [CATEGORIES_PLACEHOLDER]
---

## Overview

Project description: what it does, why it exists, what problem it solves.

## Tech Stack

* **Technology 1** — role in the project
* **Technology 2** — role in the project

## Architecture

```text
┌─────────────┐     ┌─────────────┐
│ Component A │────▶│ Component B │
└─────────────┘     └─────────────┘
```

## Challenges and Solutions

### Challenge 1: Title

Description of the problem and how it was solved.

## Results

* **Metric 1**: from X to Y (Z% improvement)
* **Metric 2**: achieved result

## Related Articles

* [Article title](/posts/article-slug/)
CONTENT_EOF

# Sostituisci i placeholder nel file inglese
sed -i "s|TITLE_EN_PLACEHOLDER|$TITLE_EN|g" "$PROJECT_DIR/index.en.md"
sed -i "s|DESC_EN_PLACEHOLDER|$DESC_EN|g" "$PROJECT_DIR/index.en.md"
sed -i "s|PROJECT_DATE_PLACEHOLDER|$PROJECT_DATE|g" "$PROJECT_DIR/index.en.md"
sed -i "s|MENU_SLUG_PLACEHOLDER|$MENU_SLUG|g" "$PROJECT_DIR/index.en.md"
sed -i "s|WEIGHT_PLACEHOLDER|$WEIGHT|g" "$PROJECT_DIR/index.en.md"
sed -i "s|TECHNOLOGIES_PLACEHOLDER|$TECHNOLOGIES|g" "$PROJECT_DIR/index.en.md"
sed -i "s|CATEGORIES_PLACEHOLDER|$CATEGORIES|g" "$PROJECT_DIR/index.en.md"

echo ""
echo "✓ Progetto creato con successo!"
echo ""
echo "Dettagli:"
echo "  Cartella: $PROJECT_DIR"
echo "  Slug: $PROJECT_SLUG"
echo "  Data: $PROJECT_DATE"
echo ""
echo "IMPORTANTE: Aggiungi il progetto alla homepage!"
echo ""
echo "Aggiungi in data/it/sections/projects.yaml:"
echo ""
echo "- name: $TITLE_IT"
echo "  url: /posts/projects/$PROJECT_SLUG/"
echo "  summary: $DESC_IT"
echo "  tags: [\"${FILTER_TAGS//,/\", \"}\"]"
echo ""
echo "Aggiungi in data/en/sections/projects.yaml:"
echo ""
echo "- name: $TITLE_EN"
echo "  url: /posts/projects/$PROJECT_SLUG/"
echo "  summary: $DESC_EN"
echo "  tags: [\"${FILTER_TAGS//,/\", \"}\"]"
echo ""
echo "Prossimi passi:"
echo "  1. Modifica i file index.md e index.en.md per aggiungere il contenuto"
echo "  2. Aggiungi il progetto ai file projects.yaml (vedi sopra)"
echo "  3. Rimuovi 'draft: true' quando pronto"
echo "  4. Esegui 'make dev' per visualizzare l'anteprima"
echo ""
