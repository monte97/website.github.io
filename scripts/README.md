# scripts/

Strumenti a mano. **Nessuno di questi fa parte di `npm run build`**: si lanciano
quando servono, e i loro output (dove ci sono) sono asset committati.

| Script | Cosa fa |
|---|---|
| `post-facts.py` | Scheda meccanica di un articolo: modo, lunghezza di titolo e description, numeri del frontmatter non ancorati al corpo, marcatori di lavorazione, doppioni strutturali, drift con la versione EN. Conta, non giudica. |
| `og/generate-og.py` | Card Open Graph delle sezioni del sito, in `public/og/*.png`. |
| `og/generate-post-og.py` | Card Open Graph di ogni articolo, IT ed EN, in `public/og/posts/**`. Da rilanciare quando cambiano i titoli. |
| `smoke.sh` | Verifica che la produzione (o un'istanza locale) serva davvero il contenuto atteso. Build verde non vuol dire contenuto online. |

## Uso

```bash
python3 scripts/post-facts.py                      # tabella su tutti gli articoli
python3 scripts/post-facts.py 01-keycloak-intro    # scheda di un articolo

python3 scripts/og/generate-og.py                  # tutte le card di sezione
python3 scripts/og/generate-post-og.py             # tutte le card articolo
python3 scripts/og/generate-post-og.py kafka       # solo i path che contengono "kafka"

bash scripts/smoke.sh                              # contro https://montelli.dev
bash scripts/smoke.sh http://localhost:4321        # contro una build locale
```

Gli script `og/` richiedono `playwright` (python) con Chromium in cache.
`post-facts.py` richiede `pyyaml`.

## Rimossi

`new_post.sh`, `new_project.sh`, `new_note.sh`, `content_index.sh` e
`migrate-content.ts` scrivevano o leggevano sotto `content/`, l'albero
pre-migrazione Hugo rimosso il 2026-08-25. Per creare contenuti si usano le skill
in `.claude/skills/` (`add-blog-post`, `add-series`, `add-case-study`).
I wrapper `cover-gen.js` e `cover-all.js` puntavano a un generatore di copertine
che non esisteva più.
