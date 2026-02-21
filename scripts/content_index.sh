#!/usr/bin/env bash
set -euo pipefail

# Genera CONTENT_INDEX.md con l'indice di tutti i post del blog.
# Uso: ./scripts/content_index.sh

CONTENT_DIR="content/posts"
OUTPUT_FILE="CONTENT_INDEX.md"

published=()
drafts=()
linkedin=()
reviewed_human=()
reviewed_machine=()
not_reviewed=()

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

    # LinkedIn (data di pubblicazione su LinkedIn, se presente)
    linkedin_date=$(echo "$frontmatter" | grep -m1 '^linkedin:' | sed 's/^linkedin: *//' || true)

    # Reviewed (false, machine, human)
    reviewed=$(echo "$frontmatter" | grep -m1 '^reviewed:' | sed 's/^reviewed: *//' || true)

    # Riga tabella
    row="| $date | $title | $category | $tags | $word_count |"

    if [[ "$draft" == "yes" ]]; then
        drafts+=("$date|$row")
    else
        published+=("$date|$row")
    fi

    # Traccia stato review
    review_row="| $title | $category | $draft |"
    if [[ "$reviewed" == "human" && "$draft" != "yes" ]]; then
        reviewed_human+=("$date|$review_row")
    elif [[ "$reviewed" == "machine" ]]; then
        reviewed_machine+=("$date|$review_row")
    else
        not_reviewed+=("$date|$review_row")
    fi

    # Traccia articoli con LinkedIn
    if [[ -n "$linkedin_date" ]]; then
        linkedin+=("$linkedin_date|$linkedin_date | $title | $category |")
    fi
done < <(find "$CONTENT_DIR" -name "index.md" -not -name "_index.md" -print0)

# Ordina per data decrescente
IFS=$'\n' sorted_pub=($(printf '%s\n' "${published[@]}" | sort -t'|' -k1 -r)); unset IFS
IFS=$'\n' sorted_drafts=($(printf '%s\n' "${drafts[@]}" | sort -t'|' -k1 -r)); unset IFS
if [[ ${#linkedin[@]} -gt 0 ]]; then
    IFS=$'\n' sorted_linkedin=($(printf '%s\n' "${linkedin[@]}" | sort -t'|' -k1 -r)); unset IFS
else
    sorted_linkedin=()
fi
if [[ ${#reviewed_human[@]} -gt 0 ]]; then
    IFS=$'\n' sorted_reviewed_human=($(printf '%s\n' "${reviewed_human[@]}" | sort -t'|' -k1 -r)); unset IFS
else
    sorted_reviewed_human=()
fi
if [[ ${#reviewed_machine[@]} -gt 0 ]]; then
    IFS=$'\n' sorted_reviewed_machine=($(printf '%s\n' "${reviewed_machine[@]}" | sort -t'|' -k1 -r)); unset IFS
else
    sorted_reviewed_machine=()
fi
if [[ ${#not_reviewed[@]} -gt 0 ]]; then
    IFS=$'\n' sorted_not_reviewed=($(printf '%s\n' "${not_reviewed[@]}" | sort -t'|' -k1 -r)); unset IFS
else
    sorted_not_reviewed=()
fi

# Data aggiornamento
update_date=$(date '+%-d %B %Y')

# Genera output
{
    echo "# Content Index - montelli.dev"
    echo ""
    echo "**Ultimo aggiornamento**: $update_date"
    echo "**Totale**: ${#sorted_pub[@]} pubblicati, ${#sorted_drafts[@]} draft"
    echo "**Review**: ${#sorted_reviewed_human[@]} human, ${#sorted_reviewed_machine[@]} machine, ${#sorted_not_reviewed[@]} non reviewati"
    echo "**LinkedIn**: ${#sorted_linkedin[@]} pubblicati"
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
    echo ""
    echo "## LinkedIn"
    echo ""
    echo "| Pubblicato | Titolo | Categoria |"
    echo "|------------|--------|-----------|"
    if [[ ${#sorted_linkedin[@]} -gt 0 ]]; then
        for entry in "${sorted_linkedin[@]}"; do
            echo "${entry#*|}"
        done
    fi
    echo ""
    echo "## Review"
    echo ""
    echo "### Human Review"
    echo ""
    echo "| Titolo | Categoria | Draft |"
    echo "|--------|-----------|-------|"
    if [[ ${#sorted_reviewed_human[@]} -gt 0 ]]; then
        for entry in "${sorted_reviewed_human[@]}"; do
            echo "${entry#*|}"
        done
    fi
    echo ""
    echo "### Machine Review"
    echo ""
    echo "| Titolo | Categoria | Draft |"
    echo "|--------|-----------|-------|"
    if [[ ${#sorted_reviewed_machine[@]} -gt 0 ]]; then
        for entry in "${sorted_reviewed_machine[@]}"; do
            echo "${entry#*|}"
        done
    fi
    echo ""
    echo "### Non Reviewati"
    echo ""
    echo "| Titolo | Categoria | Draft |"
    echo "|--------|-----------|-------|"
    if [[ ${#sorted_not_reviewed[@]} -gt 0 ]]; then
        for entry in "${sorted_not_reviewed[@]}"; do
            echo "${entry#*|}"
        done
    fi
} > "$OUTPUT_FILE"

echo "Generato $OUTPUT_FILE: ${#sorted_pub[@]} pubblicati, ${#sorted_drafts[@]} draft, ${#sorted_linkedin[@]} LinkedIn"
