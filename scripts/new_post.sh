#!/bin/bash

# Script interattivo per creare un nuovo blog post

set -e

echo ""
echo "=== Creazione Nuovo Blog Post ==="
echo ""

read -p "Inserisci lo slug del post (es: my-awesome-post): " POST_SLUG

if [ -z "$POST_SLUG" ]; then
    echo "Errore: lo slug non può essere vuoto!"
    exit 1
fi

POST_DIR="content/posts/$POST_SLUG"

if [ -d "$POST_DIR" ]; then
    echo "Errore: il post '$POST_SLUG' esiste già!"
    exit 1
fi

read -p "Inserisci il titolo del post (italiano): " TITLE_IT
read -p "Inserisci il titolo del post (inglese): " TITLE_EN
read -p "Inserisci una breve descrizione (italiano): " DESC_IT
read -p "Inserisci una breve descrizione (inglese): " DESC_EN
read -p "Inserisci i tag separati da virgola (es: Docker,Linux,Kubernetes): " TAGS
read -p "Inserisci le categorie separate da virgola (es: Tecnologie,DevOps): " CATEGORIES
read -p "Inserisci il peso/priorità nel menu (es: 10) [default: 1]: " WEIGHT

WEIGHT=${WEIGHT:-1}

# Converti lo slug per l'identifier del menu
MENU_SLUG=$(echo "$POST_SLUG" | tr '-' '_')

# Data in formato ISO 8601 con timezone
POST_DATE=$(date -u "+%Y-%m-%dT%H:%M:%SZ")

# Crea la cartella del post
mkdir -p "$POST_DIR"

# Crea il file italiano
cat > "$POST_DIR/index.md" << 'CONTENT_EOF'
---
title: "TITLE_IT_PLACEHOLDER"
date: POST_DATE_PLACEHOLDER
description: DESC_IT_PLACEHOLDER
menu:
  sidebar:
    name: TITLE_IT_PLACEHOLDER
    identifier: MENU_SLUG_PLACEHOLDER
    weight: WEIGHT_PLACEHOLDER
tags: [TAGS_PLACEHOLDER]
categories: [CATEGORIES_PLACEHOLDER]
---

## Introduzione

Scrivi qui l'introduzione del tuo articolo...

---

## Sezione Principale

Aggiungi il contenuto principale qui.
CONTENT_EOF

# Sostituisci i placeholder nel file italiano
sed -i "s|TITLE_IT_PLACEHOLDER|$TITLE_IT|g" "$POST_DIR/index.md"
sed -i "s|DESC_IT_PLACEHOLDER|$DESC_IT|g" "$POST_DIR/index.md"
sed -i "s|POST_DATE_PLACEHOLDER|$POST_DATE|g" "$POST_DIR/index.md"
sed -i "s|MENU_SLUG_PLACEHOLDER|$MENU_SLUG|g" "$POST_DIR/index.md"
sed -i "s|WEIGHT_PLACEHOLDER|$WEIGHT|g" "$POST_DIR/index.md"
sed -i "s|TAGS_PLACEHOLDER|$TAGS|g" "$POST_DIR/index.md"
sed -i "s|CATEGORIES_PLACEHOLDER|$CATEGORIES|g" "$POST_DIR/index.md"

# Crea il file inglese
cat > "$POST_DIR/index.en.md" << 'CONTENT_EOF'
---
title: "TITLE_EN_PLACEHOLDER"
date: POST_DATE_PLACEHOLDER
description: DESC_EN_PLACEHOLDER
menu:
  sidebar:
    name: TITLE_EN_PLACEHOLDER
    identifier: MENU_SLUG_PLACEHOLDER
    weight: WEIGHT_PLACEHOLDER
tags: [TAGS_PLACEHOLDER]
categories: [CATEGORIES_PLACEHOLDER]
---

## Introduction

Write here the introduction of your article...

---

## Main Section

Add the main content here.
CONTENT_EOF

# Sostituisci i placeholder nel file inglese
sed -i "s|TITLE_EN_PLACEHOLDER|$TITLE_EN|g" "$POST_DIR/index.en.md"
sed -i "s|DESC_EN_PLACEHOLDER|$DESC_EN|g" "$POST_DIR/index.en.md"
sed -i "s|POST_DATE_PLACEHOLDER|$POST_DATE|g" "$POST_DIR/index.en.md"
sed -i "s|MENU_SLUG_PLACEHOLDER|$MENU_SLUG|g" "$POST_DIR/index.en.md"
sed -i "s|WEIGHT_PLACEHOLDER|$WEIGHT|g" "$POST_DIR/index.en.md"
sed -i "s|TAGS_PLACEHOLDER|$TAGS|g" "$POST_DIR/index.en.md"
sed -i "s|CATEGORIES_PLACEHOLDER|$CATEGORIES|g" "$POST_DIR/index.en.md"

echo ""
echo "✓ Blog post creato con successo!"
echo ""
echo "Dettagli:"
echo "  Cartella: $POST_DIR"
echo "  Slug: $POST_SLUG"
echo "  Data: $POST_DATE"
echo ""
echo "Prossimi passi:"
echo "  1. Modifica i file index.md e index.en.md per aggiungere il contenuto"
echo "  2. Aggiungi immagini nella cartella $POST_DIR"
echo "  3. Quando pronto, rimuovi 'draft: true' dal frontmatter (se presente)"
echo "  4. Esegui 'make dev' per visualizzare l'anteprima"
echo ""
