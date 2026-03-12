# Tech Review — 07-keycloak-pii

**Score: 8/10**

## Errori (P0 — fattuali)

Nessuno.

## Imprecisioni (P1 — fuorvianti)

1. **Keycloak tracing "stabilizzata nelle release successive"** (riga 38): L'articolo dice "inizialmente come preview, stabilizzata nelle release successive". In realta', il tracing OTel nativo e' feature flag `opentelemetry` in Keycloak 26.0 e abilitabile senza flag dalla 26.1+. Specificare la versione esatta di stabilizzazione eviterebbe ambiguita'.

2. **SHA-256 senza salt** (riga ~252): Il caveat e' corretto e ben scritto ("non e' anonimizzazione completa se input space e' limitato"). Tuttavia, la frase "Per pseudonymizzazione GDPR-compliant, considera HMAC-SHA256 con chiave segreta gestita separatamente" suggerisce un'alternativa ma non chiarisce che il Collector OTel non supporta nativamente HMAC — servirebbe un processor custom o un passaggio esterno.

3. **`IsMatch` deprecato** (riga ~229-231): In versioni recenti del Collector (0.100+), la funzione OTTL `IsMatch` e' stata rinominata in `IsMatch` (case-sensitive). Verificare la compatibilita' con la versione 0.120.0 usata nel compose.

## Note minori (P2)

1. **Versione immagine Grafana** (riga ~113): `grafana/grafana:11.4.0` — la versione corrente e' superiore. Verificare che sia intenzionale (pinning per riproducibilita') o aggiornare.

2. **Password grant deprecato** (riga ~137): Menzionato correttamente come "deprecated in OAuth 2.1, solo per demo" — ben gestito.

3. **Link workshop** (riga ~551): `github.com/monte97/otel-workshop` — verificare che il repo esista e sia pubblico.

4. **Immagini con path diverso** (righe ~156-165): Le immagini usano `imgs/` come prefisso, mentre gli altri articoli della serie usano `images/webp/`. Incoerenza nella struttura della serie.

5. **"Prossimi articoli"** (righe ~539-544): Lista Metrics Deep Dive, Tail Sampling, Multi-Tenancy, Keycloak Extensions — verificare se alcuni di questi articoli esistono gia' nella serie (il tail sampling e' l'articolo 05).

## Punti di forza

- Le quattro tecniche (DELETE, REDACT, HASH, SANITIZE) sono un framework chiaro e riutilizzabile
- Il caveat su SHA-256 senza salt e' onesto e raro da trovare in tutorial
- La sezione "Lo stesso approccio per qualsiasi servizio" generalizza bene
- La checklist "Cosa verificare prima di instrumentare" e' pratica
- Le considerazioni GDPR aggiungono profondita' senza diventare un trattato legale
