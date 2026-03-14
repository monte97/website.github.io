# Review Summary — 06-keycloak-federation

**Data: 2026-03-14**
**File: `progettare/keycloak/06-keycloak-federation/index.md`**

---

## Score

| Dimensione | Pre | Post |
|------------|-----|------|
| Tech       | 8/10 | 8/10 |
| Style      | 5/10 | 7/10 |

---

## Modifiche applicate

1. **Apertura riscritta** - eliminato hook narrativo "In un mondo ideale..." sostituito con dichiarazione diretta del problema tecnico.

2. **Trattini lunghi (—) rimossi** - oltre 10 occorrenze sostituite con `:` o `-` in tutto l'articolo, incluse liste, tabella comparativa e sezione risorse.

3. **ASCII box elaborati rimossi** - 3 diagrammi con box `+--+` sostituiti con flussi lineari compatti compatibili con le regole dello style guide.

4. **Tono colloquiale rimosso** - frase con dialogo simulato ("dammi le credenziali...") sostituita con parafrasi tecnica. Espressione "il lavoro sporco" sostituita.

5. **Micro-correzioni stile** - "Considera questa situazione:" → "Uno scenario tipico:"; "Vediamole." → "...descritte nelle sezioni seguenti."

---

## Non modificato

- Frontmatter (come da istruzioni).
- Contenuto tecnico: nessun problema P0/P1.
- Diagrammi sequence a colonne (User Federation e Identity Brokering): format sequence multi-attore, tollerato per flussi temporali.
- Struttura heading H2/H3.
- Tabella comparativa (solo fix trattini).

---

## Note residue

- I diagrammi sequence (flusso login) potrebbero essere convertiti in Mermaid in una revisione futura per maggiore leggibilita'.
- P2 tech: `Sync Mode` per OIDC brokering (Keycloak 12+) non menzionato - non critico per articolo concettuale.
