# Tech Review: Micro-frontend in Vue 3 con Module Federation: Shell, Contratto e Deploy Indipendente

**Reviewer:** Claude Sonnet 4.6 (automated)
**Date:** 2026-03-14
**Article:** `src/content/posts/progettare/vue/micro-frontend-module-federation/index.md`

---

**Score: 7.5/10**

## Problemi trovati

### P0 - Errori fatali

Nessun errore fatale rilevato. Il codice funziona come descritto.

---

### P1 - Problemi importanti

**P1-1 — Limitazione dev mode del plugin non documentata — impatto critico sul DX**

`@originjs/vite-plugin-federation` ha una limitazione fondamentale e ben documentata: solo il lato **host** supporta il dev server di Vite. I remote non possono girare con `vite dev` e poi essere consumati dall'host: devono essere compilati (`vite build --watch`) e serviti come build statici tramite `vite preview`.

L'articolo menziona questo nella nota "Nota sul workflow di sviluppo" nella sezione "Struttura del progetto", ma la formulazione e' troppo compatta rispetto alla gravita' dell'impatto. Il lettore che configura tutto e lancia `npm run dev` su tre terminali aspettandosi HMR su tutti e tre i progetti rimane sorpreso. Le conseguenze pratiche:

- HMR non funziona per i componenti remoti consumati dalla shell.
- Il remote deve essere buildato ogni volta che cambia prima che la shell veda le modifiche.
- La configurazione `server.port` nel `vite.config.ts` del remote e' irrilevante in questo contesto — serve solo per `preview.port`, che e' la porta effettivamente usata. L'esempio mostra entrambi (`server.port` e `preview.port`) allo stesso valore, ma non spiega che in pratica si usa solo `preview`.

**Fix richiesto:** Espandere la nota sul workflow di sviluppo con un esempio di comandi concreti per ogni app, chiarendo quale gira in dev mode e quale in preview. Specificare che `server.port` nel remote e' rilevante solo se il remote viene sviluppato in standalone (senza federazione).

---

**P1-2 — Comportamento di `singleton: true` con versioni incompatibili descritto in modo impreciso**

Sezione "Dipendenze condivise" (circa linea 311):

> "Con `singleton: true` e `requiredVersion: '^3.4.0'`, Module Federation usa l'istanza con la versione piu' alta compatibile. Se le versioni non sono compatibili tra loro, ogni applicazione carica la propria istanza."

Questa descrizione e' imprecisa su due punti:

1. Con `singleton: true` e versioni incompatibili, `@originjs/vite-plugin-federation` (che segue la semantica Webpack) **non crea una seconda istanza separata**. Viene usata comunque un'unica istanza (la prima caricata), con un warning a console. Il comportamento "ogni applicazione carica la propria istanza" si verifica solo quando `singleton` e' `false` o assente.
2. Non e' garantito che venga usata la versione piu' alta: viene usata la versione caricata per prima, che dipende dall'ordine di inizializzazione.

Questa distinzione e' rilevante perche' lascia intendere un fallback sicuro ("versione piu' alta compatibile") che in realta' non e' garantito.

**Fix richiesto:** Correggere la descrizione: con `singleton: true` e versioni incompatibili, viene usata la prima versione caricata e viene emesso un warning a console. La seconda istanza viene creata solo senza `singleton: true`.

---

**P1-3 — Mancanza di `pinia` nel blocco `shared` della configurazione del remote**

Nella sezione "Configurazione: il remote (catalog)", il blocco `shared` include `vue` e `vue-router` come singleton, ma non `pinia`. La sezione successiva ("Dipendenze condivise") afferma esplicitamente che anche Pinia deve essere singleton. L'incoerenza tra l'esempio di codice e la spiegazione testuale e' fuorviante: un lettore che copia la configurazione del remote avra' Pinia non-singleton.

**Fix richiesto:** Aggiungere `pinia: { requiredVersion: '^2.0.0', singleton: true }` al blocco `shared` nella configurazione del remote, allineandola alla configurazione della shell e alla sezione teorica.

---

### P2 - Miglioramenti suggeriti

**P2-1 — Pattern store condiviso via ridichiarazione locale — manca chiarezza sull'alternativa errata**

Sezione "State condiviso tra remoti", opzione 1:

Il pattern presentato (remote ridefinisce lo store con la stessa `id`) e' corretto. Tuttavia la spiegazione potrebbe essere fraintesa come "importa lo store dalla shell". Il codice e' chiaro, ma aggiungere una nota esplicita sul fatto che **non si deve importare da `shell/...`** nel remote (creerebbe dipendenza circolare e romperebbe lo standalone) aiuterebbe a prevenire un errore comune.

**Fix consigliato:** Aggiungere un breve avviso che l'import cross-boundary (`import { useAuthStore } from 'shell/stores/auth'`) e' un anti-pattern da evitare, e che il meccanismo corretto e' la ridichiarazione locale con la stessa store id.

---

**P2-2 — `build.target: 'esnext'` — motivo non spiegato, implicazioni browser ignorate**

Sia nella configurazione del remote che della shell, `build: { target: 'esnext' }` viene annotato come "richiesto da vite-plugin-federation" senza spiegarne il motivo. Il plugin usa `top-level await` per il caricamento lazy delle dipendenze condivise, feature non supportata da browser meno recenti (Safari < 15, Chrome < 89).

Per progetti che devono supportare browser datati, esiste l'alternativa `vite-plugin-top-level-await` che transpila il pattern.

**Fix consigliato:** Aggiungere una riga che spiega il motivo tecnico (top-level await) e una nota sulla compatibilita' browser minima o sull'alternativa per target piu' conservativi.

---

**P2-3 — Manca nota sulla differenza di path `remoteEntry.js` tra Vite e Webpack**

Gli URL dei remote nella shell usano `/assets/remoteEntry.js`. Questo e' corretto per Vite (che per default emette gli asset in `dist/assets/`), ma differisce da Webpack dove `remoteEntry.js` e' tipicamente alla radice del dist. Un lettore che tenta di consumare un remote Webpack da una shell Vite usera' il path sbagliato. La nota attuale ("il path `/assets/remoteEntry.js` riflette la struttura di output di Vite") e' presente ma non abbastanza visibile.

**Fix consigliato:** Rendere piu' esplicita la nota sul path, magari con un confronto diretto Vite (`/assets/remoteEntry.js`) vs Webpack (`/remoteEntry.js`).

---

**P2-4 — Nessuna menzione del plugin ufficiale `@module-federation/vite`**

A inizio 2026, il team di Module Federation mantiene un plugin ufficiale per Vite (`@module-federation/vite`) separato da `@originjs/vite-plugin-federation`. Il plugin ufficiale ha supporto HMR in sviluppo anche per i remote (cosa che `@originjs` non ha), supporto per Vite 5+ e una roadmap attiva. Per un articolo che fa scelte di stack, vale la pena menzionare l'alternativa e il razionale della scelta.

**Fix consigliato:** Aggiungere nelle Risorse (o in una nota nel paragrafo sul plugin) una riga che cita `@module-federation/vite` come alternativa ufficiale con supporto HMR in dev mode, con nota sui trade-off rispetto a `@originjs`.

---

## Punti di forza tecnici

- **Contratto esplicito shell/remote**: la scelta di file `.d.ts` dichiarativi per i tipi dei remote e' pragmatica e riflette il vero stato dell'ecosistema (nessuna generazione automatica). La spiegazione e' onesta.
- **Routing con dynamic import diretto**: il codice di routing usa correttamente `() => import('catalog/CatalogView')` invece di `defineAsyncComponent`, in linea con le raccomandazioni ufficiali di Vue Router.
- **Separazione tra uso di `defineAsyncComponent` in route vs in componenti**: l'articolo distingue correttamente i due contesti — `loadRemote` usa `defineAsyncComponent` a livello di componente (corretto), il router usa dynamic import diretto (corretto).
- **Sezione deploy indipendente e versioning**: copre insidie reali (breaking change non coordinate, necessita' di contract testing) spesso ignorate dagli articoli introduttivi sul tema.
- **Tabella "Quando usare"**: pragmatica e onesta, incluso il caso "startup con 5 sviluppatori — overengineering".
- **Configurazione per ambiente con `loadEnv`**: pattern corretto, URL parametrizzato per evitare rebuild della shell al cambio hosting del modulo.
- **Custom events per comunicazione loose-coupled**: il pattern e' corretto e i trade-off (nessuna tipizzazione statica) sono dichiarati esplicitamente.
- **Singleton su Vue/Pinia/Vue-Router**: la spiegazione di perche' il singleton e' obbligatorio (inject non funzionano, reattivita' separata) e' tecnicamente accurata.

---

## Verdetto

L'articolo e' tecnicamente solido nella struttura generale e nei concetti chiave. Non ci sono errori P0 — il codice presentato funziona. I problemi principali sono due: una configurazione di esempio incompleta (Pinia mancante nel remote) e una descrizione imprecisa del comportamento di version negotiation con `singleton: true`. Il problema piu' impattante per il lettore e' la limitazione dev mode del plugin, che merita espansione rispetto alla nota attuale.

Con i fix P1 applicati, l'articolo e' pronto per revisione editoriale. I P2 sono miglioramenti di qualita' che aumenterebbero l'accuratezza tecnica senza essere bloccanti.
