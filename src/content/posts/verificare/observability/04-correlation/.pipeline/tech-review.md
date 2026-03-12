# Tech Review — 04-correlation

**Score: 8/10**

## Errori (P0 — fattuali)

Nessuno.

## Imprecisioni (P1 — fuorvianti)

1. **Overhead estimates generici** (riga ~494-498): "CPU: ~2-5% per servizio, Memoria: ~10-30MB per SDK Node.js" — questi numeri sono ragionevoli come ordine di grandezza ma dipendono fortemente dal carico e dalla configurazione di sampling. Suggerire di specificare che sono stime per workload moderati o aggiungere un riferimento.

2. **Clock skew** (riga ~455): "Il waterfall usa timestamp assoluti e relazioni parent-child per ricostruire il flusso" — corretto, ma la frase successiva "NTP sui nodi e' raccomandato" potrebbe essere rafforzata: senza NTP il waterfall puo' mostrare span child che iniziano prima del parent, rendendo il debug confuso.

## Note minori (P2)

1. **Calcolo storage** (riga ~536-537): Il calcolo usa 5 span/req mentre l'architettura demo mostra 5+ servizi con potenzialmente piu' span. Nella sezione "Limiti" il calcolo corretto (8 span) viene usato nell'articolo successivo (05-management). Sarebbe piu' coerente usare lo stesso numero.

2. **Link LGTM stack** (riga ~886): Il link `https://grafana.com/oss/lgtm-stack/` potrebbe non essere stabile — Grafana riorganizza frequentemente la documentazione OSS.

3. **Versione immagine Docker** (riga ~732): `grafana/otel-lgtm:0.17.1` — verificare che sia ancora una versione supportata al momento della pubblicazione.

4. **Password grant** non menzionato come deprecato in OAuth 2.1 (lo e' nell'articolo 07-keycloak-pii ma non qui, dove si usa Keycloak per l'autenticazione).

## Punti di forza

- Tre scenari di debug ben distinti e progressivi (silent failure, latency, fan-out)
- Ottimo confronto "senza OTel vs con OTel" nello scenario 3
- Appendice di setup dettagliata ma opzionale
- Buon uso di TraceQL con esempi concreti
- La sezione "Quando NON usare" e' rara e molto apprezzabile
