# Follow-up / TODO

## Articolo blog dal talk "mutation testing" (Working Software 2026)

**Idea:** trasformare il lungo post LinkedIn sul mutation testing (talk WS2026) in un **articolo del blog** su montelli.dev, così diventa contenuto proprio (URL permanente, SEO) invece che vivere solo su LinkedIn.

**Come:**
- Usare la skill `add-blog-post`. Pilastro **Verificare**, categoria testing / mutation-testing.
- Contenuto già scritto (bozza LinkedIn): storia del caso reale, coverage 93% vs mutation score 65% → 92%, Stryker.NET, le 3 famiglie di survived (dato non discriminante / assertion incompleta / boundary), fix, `--since:main` in CI, soglia `break: 60`.
- Serve: le **immagini** (le slide citate: sistema ordini, test VipOrant, mutazioni Sum→Max e ×→÷, report Stryker before/after) + una **hero**.
- Lingua: IT prima; valutare adattamento EN.

**Cross-link (la catena talk ↔ articolo ↔ servizio):**
- Aggiungere un campo `article?` in `src/data/talks.ts` (TalkLink) e un pulsante "Leggi l'articolo" sulla pagina di dettaglio del talk WS2026 (`/talks/mutation-testing-working-software-2026/`).
- L'articolo linka al talk (`/talks/...`) e al servizio Testing/verifica (`/servizi`).
- Obiettivo: un talk, un articolo, un servizio che si rimandano — prova concreta che compensa l'assenza di case study pubblici.

---

## Altri follow-up aperti (da spec precedenti)

- **Prova/case study #1** (dallo slot `proof` predisposto su /servizi): un prima/dopo reale con un numero, quando disponibile.
- **Riga disponibilità** nell'hero servizi (`heroAvailability`, oggi vuota).
- **Coerenza sito** (P0/P1/P2 in `docs/superpowers/2026-07-02-site-coherence-findings.md`): P1+P2 applicati; resta il nodo strutturale P0 (verbi hero vs pilastri) da valutare, e la pulizia scratch/i18n/methodVariant.
- **Credenziale Ordine**: rimossa da tutte le superfici pubbliche in attesa di verifica normativa; da ripristinare quando ok.
