# Review Summary — 03-keycloak-m2m

**Data review**: 2026-03-14
**Articolo**: `progettare/keycloak/03-keycloak-m2m/index.md`

---

## Score

| Dimensione | Score iniziale | Score post-correzioni |
|------------|:--------------:|:---------------------:|
| Tech       | 7/10           | 8/10                  |
| Style      | 6/10           | 8/10                  |

---

## Modifiche Applicate (5)

1. **[TECH P1] Claim name errato** — `payload.clientId` → `payload.client_id` nel middleware `requireServiceAuth` e nel commento "Punto critico". In Keycloak, il claim nei token di service account è `client_id` (snake_case).

2. **[STYLE P1] Frase boilerplate rimossa** — "Questo articolo mostra come implementare..." sostituita con apertura diretta che dichiara l'approccio e la struttura senza meta-commenti sull'articolo stesso.

3. **[STYLE P1] ASCII box scenario** — Box con `┌──────────────┐` sostituito con flusso a frecce su singola riga (`shop-api → notification-service`). Conformità allo style guide.

4. **[STYLE P1] ASCII box Client Credentials Flow** — Box multi-riga con `┌┐└┘` sostituito con 4 righe a frecce testuali. Mantiene chiarezza del flusso senza usare caratteri vietati.

5. **[STYLE P2] Conclusione drammatizzante** — "diventa il punto debole che espone tutto il sistema" sostituita con descrizione tecnica neutra del vettore di rischio (accesso laterale tra servizi).

---

## Non Modificato

- **URL legacy `/auth`**: il curl di esempio usa il path Keycloak <= 16, ma la nota esistente spiega già la differenza con Keycloak 17+. Sufficiente.
- **JWKS singleton**: `createRemoteJWKSet` di `jose` gestisce la rotazione chiavi internamente. Nessun problema pratico.
- **Sezione "La Domanda"**: domanda tecnica, non retorica. Accettabile.
