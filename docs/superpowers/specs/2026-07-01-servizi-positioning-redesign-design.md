# Servizi — riposizionamento e riduzione del caos CTA

**Data:** 2026-07-01
**Stato:** in revisione
**Autore:** Francesco Montelli (+ Claude, brainstorming)
**File principale toccato:** `src/components/pages/ServicesPage.astro` (usato da `/servizi/` e `/en/services/`)

---

## 1. Problema

Un amico dell'autore, atterrando sulla pagina `/servizi`, ha detto chiaramente: **"non si capisce cosa fai."** Analizzando la pagina, due difetti concreti:

1. **Nessuna risposta a "cosa fa" nei primi 5 secondi.** L'hero apre col *metodo astratto* ("Progettare, verificare, automatizzare. In quest'ordine") e uno stepper verso il funnel prezzi. Non compare mai, in alto, cosa fa concretamente né per chi.
2. **Caos di call-to-action.** ~4 varianti dello stesso invito (Cal.com) + link workshop + mail, distribuite su **offerte parallele in competizione**: il funnel a 3 gradini *e* una banda "Su misura" con altre 2 card/pulsanti.

## 2. Obiettivo

La pagina deve **spiegare una cosa sola** e avere **una sola azione**. Un visitatore (tiepido, arriva da LinkedIn) deve poter completare in 10 secondi la frase: *"montelli.dev è la persona che chiamo quando ___"*.

## 3. Decisione di posizionamento (la più importante)

**Il compratore è la PMI che modernizza sistemi datati/fragili** — non la "startup in crescita". Stesso lavoro consegnato, ma auto-immagine e budget diversi da una startup. Conseguenza: la voce canonica del sito si sposta su **PMI-modernizza**, e sono **home + bio** ("startup / team in crescita") a diventare l'outlier, non Servizi.

I due trigger d'ingresso (scelti dall'autore) diventano protagonisti:
- **la tecnologia è ferma al palo** — aggiungere una funzione costa una fatica enorme;
- **manca la competenza dentro** — nessuno presidia infra / deploy / sicurezza, e serve anche che qualcuno lo insegni.

## 4. Voce canonica (fonte di verità)

Estratta da home/about/LinkedIn dove già funziona, con l'aggiustamento sul compratore PMI:

- **Chi:** Francesco Montelli, ingegnere del software freelance, iscritto all'Ordine degli Ingegneri di Ravenna (credenziale rara tra i freelance dev: chi firma ne risponde).
- **Per chi:** aziende di prodotto con **sistemi cresciuti più in fretta della loro infrastruttura** / irrigiditi nel tempo.
- **Cosa faccio (in sostantivi da ingegnere):** container, CI/CD, test, observability e sicurezza — messi dove non c'erano — su sistemi che vanno modernizzati.
- **Il metodo (il *come*):** progetta → verifica → automatizza. Da presentare come sostanza, non come slogan.
- **La promessa:** occhio esterno + rendere autonomo il team ("rendermi inutile") — ma con **meccanismo concreto**, non come frase.
- **Aggancio (di supporto, non protagonista):** metafora AI/robot — "la parte del software ancora umana, progettare e collaudare, è la mia".
- **Una sola azione:** prenota una discovery call gratuita (Cal.com).
- **Tono:** diretto, concreto, prima→dopo. Zero aforismi.

## 5. Cosa ha detto il panel avversariale (4 revisori) — recepito

Revisori: stratega marketing B2B, CTO-cliente ideale, engineering manager scottato, critico UX/conversione. Punti su cui erano **unanimi**:

1. **Guidare con i nomi concreti, non con la metafora.** La metafora AI ritarda la comprensione → scende a riga di supporto; l'H1 è la frase piana.
2. **La sezione "segnali" è la parte più autentica** ("venerdì pomeriggio", "quelle teste vanno in ferie"). Tenerla, è il modello di voce.
3. **Manca la PROVA (buco #1):** un case study vero con risultato/numero, sotto i segnali. → si predispone lo **slot**, si riempie appena disponibile (vedi §9).
4. **"Rendermi inutile" va tenuto in basso e con meccanismo** (handover doc, runbook, owner interno formato). In cima spaventa e contraddice il €2.500/mese.
5. **Il metodo è sovra-spiegato / sa di marketing.** Tagliare "pilastri che si moltiplicano", "l'ordine non è negoziabile", "costruire vs ricostruire". Tenere la **tabella scenari** (il vero argomento). Ammorbidire l'ordine ("di solito in quest'ordine, e quando si piega").

Punti dove il panel **ha contraddetto** le decisioni precedenti (→ ribaltate qui, da confermare in revisione):

- **[RIBALTATO] Metafora AI in cima:** scende a occhiello/supporto. L'H1 è la frase concreta.
- **[RIBALTATO] Prezzi "nascosti in basso":** il €1.200 (primo passo, rimborsabile) è filtro + credibilità per traffico tiepido → resta **visibile**; si collassano i 3 tier (niente "in che fascia sono io?"); il €2.500/mese va in un "come prosegue" richiudibile.

Altri colpi recepiti:
- **Disponibilità:** una riga sulla capacità ("disponibile da …") — il CTO ha "un incendio adesso".
- **Leakage:** le pillar-card hanno ~10 link in uscita (6 blog + 4 case study) su una pagina il cui unico lavoro è la call → sostituire con **una frase-risultato inline per pilastro** + **un solo** "Vedi i case study →" accanto alla CTA finale.
- **Upsell "si scala se prosegui":** sa di guinzaglio → scollegare rimborso da credito, "decidi tu, senza domande".

## 6. Nuova struttura pagina Servizi (banda per banda)

**Banda 1 — Hero (comprensione prima dell'intrigo)**
- **H1 piano** (bozza IT): *"Modernizzo sistemi di prodotto irrigiditi nel tempo: container, CI/CD, test, observability e sicurezza, messi dove non c'erano."*
- **Riga per-chi:** *"Per aziende di prodotto cresciute più in fretta della loro infrastruttura."*
- **Riga di supporto (metafora, demota):** *"La parte del software ancora umana — progettare bene e collaudare sul serio — è la mia."*
- **Riga disponibilità:** (da compilare) *"Disponibile per nuovi progetti da …"*
- **Una CTA:** "Prenota una discovery call".
- **Rimosso:** lo stepper (puntava ai gradini declassati).

**Banda 2 — Per chi è / i segnali** *(la parte più forte, tenuta concreta; sostantivo pubblico spostato su PMI)*
- Riecheggia `home/ForWho`: **deploy che fanno paura / guasti difficili da leggere / pezzi senza owner**, + intreccia i due trigger (tecnologia ferma al palo / manca la competenza dentro).
- Chiusura tenuta: *"Se due di queste te le sei già sentite addosso, il momento giusto è prima della terza."*

**Banda 3 — PROVA** *(nuova, slot predisposto — vedi §9)*
- Subito sotto i segnali: blocco "risultato" — `[cliente/settore] · [sintomo] → [cosa ho cambiato] → [risultato/numero]`.
- **Al lancio:** la banda **non viene renderizzata** (nessun box vuoto), non si inventano prove. Il markup/struttura è pronto e commentato/condizionato, così si attiva riempiendo una sola variabile appena c'è un caso pubblicabile.

**Banda 4 — Il metodo** *(sostanza = "come lavoro", sfrondata)*
- Progetta → verifica → automatizza, **senza aforismi**; ordine ammorbidito.
- **Tabella scenari tenuta** (è l'argomento vero).
- Pillar-card: **niente link in uscita**; una frase-risultato inline per pilastro.

**Banda 5 — Come si lavora dopo la call** *(prezzi, collassati)*
- Riga singola visibile: *"Di solito si parte da un affondo mirato: 2 settimane, €1.200 fisso, rimborsabile — decidi tu, senza domande."*
- **"Come prosegue"** richiudibile (`<details>` o simile): affiancamento da €2.500/mese, mese per mese, + "rendermi inutile" **col meccanismo** (handover doc, runbook, owner interno formato).

**Banda 6 — CTA finale** *(singola, come `home/ContactSection`)*
- "Parliamone" + un pulsante (discovery call) + mail/LinkedIn come link piccoli + l'unico "Vedi i case study →" adiacente.

**Fuori pagina:** "A Progetto" e "Formazione/Workshop" → pagine dedicate, link da menu/footer. (Workshop ha già `/workshop/`; per "A progetto" valutare in fase di piano se serve una paginetta o basta convogliare in discovery.)

**Risultato CTA:** un'unica azione su tutta la pagina, ripetuta al massimo in hero + chiusura, stessa etichetta.

## 7. Ritocco leggero home / bio (coerenza, non redesign)

Spostare il **sostantivo del pubblico** da "startup / team in crescita" verso il compratore PMI-modernizza (i **segnali concreti restano**):
- `src/components/home/Hero.astro` — subtitle.
- `src/components/home/ForWho.astro` — title/intro (segnali invariati).
- `src/data/author.ts` — bio (oggi "infrastrutture che scalano senza far impazzire il team").
- `src/components/pages/AboutPage.astro` — `whoBody` (riga "team in crescita che scricchiolano").

## 8. Fuori scope (per ora)

- Redesign della home (solo ritocco copy).
- Pagine sperimentali `servizi-2/3/4`, `home-2/3` (eventuale cleanup separato).
- Creazione ex-novo di case study con metriche (dipende da §9).

## 9. Follow-up (in ordine di priorità)

1. **PROVA #1** — inserire nello slot (Banda 3) un prima/dopo reale con un numero (es. tempo di deploy, MTTR, incidenti) ed eventuale reference. È la leva di conversione più alta secondo tutti e quattro i revisori. *(Al momento non disponibile — annotato.)*
2. **Disponibilità** — testo reale della riga capacità nell'hero.
3. **Rimborso/credito** — verificare wording per scollegare il rimborso dal credito "se prosegui".
4. **Parità EN** — adattare tutte le stringhe `en` (IT prima, EN dopo, per convenzione).

## 10. Criteri di "fatto"

- Nei primi 5 secondi l'H1 dice cosa fa in sostantivi concreti, per un compratore PMI.
- Una sola azione primaria su tutta la pagina; zero pulsanti concorrenti.
- Segnali concreti presenti; slot prova predisposto.
- Metodo senza aforismi; tabella scenari tenuta; zero link in uscita dalle pillar-card (tranne l'unico "Vedi i case study" finale).
- "Su misura" fuori pagina; home/bio ritoccate sul compratore PMI.
- IT e EN allineate; build `make build` verde.
