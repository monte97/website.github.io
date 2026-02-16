#!/usr/bin/env bash
set -euo pipefail

# Genera CONTENT_INDEX.md con l'indice di tutti i post del blog.
# Uso: ./scripts/content_index.sh

CONTENT_DIR="content/posts"
OUTPUT_FILE="CONTENT_INDEX.md"

published=()
drafts=()

while IFS= read -r -d '' file; do
    # Estrai frontmatter (tra i due ---)
    frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')

    # Titolo
    title=$(echo "$frontmatter" | grep -m1 '^title:' | sed 's/^title: *//;s/^"//;s/"$//')

    # Data (troncata a YYYY-MM-DD)
    raw_date=$(echo "$frontmatter" | grep -m1 '^date:' | sed 's/^date: *//')
    date=$(echo "$raw_date" | grep -oP '^\d{4}-\d{2}-\d{2}')

    # Draft
    is_draft=$(echo "$frontmatter" | grep -m1 '^draft:' | sed 's/^draft: *//' || true)
    if [[ "$is_draft" == "true" ]]; then
        draft="yes"
    else
        draft="no"
    fi

    # Categoria (primo segmento dopo content/posts/)
    rel_path="${file#$CONTENT_DIR/}"
    category=$(echo "$rel_path" | cut -d'/' -f1)

    # Tags - gestisce sia formato array inline che lista YAML
    tags=""
    if echo "$frontmatter" | grep -qP '^tags:\s*\['; then
        # Formato inline: tags: ["Tag1", "Tag2"]
        tags=$(echo "$frontmatter" | grep -m1 '^tags:' | \
            sed 's/^tags: *\[//;s/\].*$//' | \
            tr ',' '\n' | sed 's/^ *"//;s/" *$//;s/^ *//;s/ *$//' | \
            paste -sd',' | sed 's/,/, /g')
    elif echo "$frontmatter" | grep -qP '^tags:$'; then
        # Formato lista YAML:
        # tags:
        #   - Tag1
        #   - Tag2
        tags=$(echo "$frontmatter" | sed -n '/^tags:$/,/^[^ -]/p' | \
            grep '^ *- ' | sed 's/^ *- *//;s/^"//;s/"$//' | \
            paste -sd',' | sed 's/,/, /g')
    fi

    # Conteggio parole (escludendo frontmatter)
    body=$(sed '1{/^---$/!q}; 1,/^---$/d' "$file")
    word_count=$(echo "$body" | wc -w | tr -d ' ')

    # Riga tabella
    row="| $date | $title | $category | $tags | $word_count |"

    if [[ "$draft" == "yes" ]]; then
        drafts+=("$date|$row")
    else
        published+=("$date|$row")
    fi
done < <(find "$CONTENT_DIR" -name "index.md" -not -name "_index.md" -print0)

# Ordina per data decrescente
IFS=$'\n' sorted_pub=($(printf '%s\n' "${published[@]}" | sort -t'|' -k1 -r)); unset IFS
IFS=$'\n' sorted_drafts=($(printf '%s\n' "${drafts[@]}" | sort -t'|' -k1 -r)); unset IFS

# Data aggiornamento
update_date=$(date '+%-d %B %Y')

# Genera output
{
    echo "# Content Index - montelli.dev"
    echo ""
    echo "**Ultimo aggiornamento**: $update_date"
    echo "**Totale**: ${#sorted_pub[@]} pubblicati, ${#sorted_drafts[@]} draft"
    echo ""
    echo "## Pubblicati"
    echo ""
    echo "| Data | Titolo | Categoria | Tags | Parole |"
    echo "|------|--------|-----------|------|--------|"
    for entry in "${sorted_pub[@]}"; do
        echo "${entry#*|}"
    done
    echo ""
    echo "## Draft"
    echo ""
    echo "| Data | Titolo | Categoria | Tags | Parole |"
    echo "|------|--------|-----------|------|--------|"
    if [[ ${#sorted_drafts[@]} -gt 0 ]]; then
        for entry in "${sorted_drafts[@]}"; do
            echo "${entry#*|}"
        done
    fi
} > "$OUTPUT_FILE"

echo "Generato $OUTPUT_FILE: ${#sorted_pub[@]} pubblicati, ${#sorted_drafts[@]} draft"
