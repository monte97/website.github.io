#!/bin/bash

# Script interattivo per creare una nuova nota

set -e

echo ""
echo "=== Creazione Nuova Nota ==="
echo ""

read -p "Inserisci lo slug della nota (es: docker-tips): " NOTE_SLUG

if [ -z "$NOTE_SLUG" ]; then
    echo "Errore: lo slug non può essere vuoto!"
    exit 1
fi

NOTE_FILE="content/notes/$NOTE_SLUG.md"

if [ -f "$NOTE_FILE" ]; then
    echo "Errore: la nota '$NOTE_SLUG' esiste già!"
    exit 1
fi

read -p "Inserisci il titolo della nota (es: Docker Tips): " TITLE
read -p "Inserisci il peso/priorità nel menu (es: 10) [default: 10]: " WEIGHT

WEIGHT=${WEIGHT:-10}

# Data in formato ISO 8601
NOTE_DATE=$(date "+%Y-%m-%d")

# Crea il file della nota
cat > "$NOTE_FILE" << CONTENT_EOF
---
title: "$TITLE"
date: $NOTE_DATE
draft: false
menu:
  notes:
    name: $TITLE
    identifier: $NOTE_SLUG
    weight: $WEIGHT
---

{{< note title="Titolo Nota 1" >}}
Contenuto della prima nota...

\`\`\`bash
# Esempio di codice
echo "hello world"
\`\`\`
{{< /note >}}

{{< note title="Titolo Nota 2" >}}
Contenuto della seconda nota...
{{< /note >}}
CONTENT_EOF

echo ""
echo "✓ Nota creata con successo!"
echo ""
echo "Dettagli:"
echo "  File: $NOTE_FILE"
echo "  Slug: $NOTE_SLUG"
echo "  Data: $NOTE_DATE"
echo ""
echo "Prossimi passi:"
echo "  1. Modifica $NOTE_FILE per aggiungere le tue note"
echo "  2. Usa {{< note title=\"...\" >}} per ogni nota"
echo "  3. Esegui 'make dev' per visualizzare l'anteprima"
echo ""
