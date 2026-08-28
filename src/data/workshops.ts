/**
 * I workshop che vengono erogati davvero: sono il primo livello della sezione.
 *
 * I contenuti vengono dai cataloghi commerciali. I moduli sono un menu, non un
 * programma: la pagina lo dice a chiare lettere, perche' non si fanno tutti.
 */

export interface WModule {
  id: string;
  name: string;
  note?: string;
  desc?: string;
  duration?: string;
}

export interface WGroup {
  label: string;
  modules: WModule[];
}

export interface Workshop {
  slug: string;
  title: string;
  titleEn: string;
  /** Cosa il team sa fare alla fine. */
  goal: string;
  goalEn: string;
  audience: string;
  format: string;
  /** La base su cui si lavora in aula. */
  basis?: string;
  groups: WGroup[];
  /** Confini dichiarati in apertura. */
  notCovered?: string;
  takeaway: { title: string; desc: string }[];
  /** Chiavi `series` dei post, per il materiale pubblicato. */
  series: { key: string; title: string; href?: string }[];
  talks: string[];
  /** Prova di erogazione, dove esiste. */
  delivered?: string;
  repo?: string;
}

export const workshops: Workshop[] = [
  {
    slug: 'agenti-ai-python',
    title: 'Agenti AI in Python',
    titleEn: 'AI agents in Python',
    goal: "Costruire agenti che reggono la produzione: strumentati, con un insieme di casi di prova che gira a ogni modifica, un limite di spesa configurato e le azioni irreversibili sotto controllo.",
    goalEn: 'Building agents that hold up in production: instrumented, with a set of test cases that runs on every change, a spending limit configured and irreversible actions under control.',
    audience: 'Team di prodotto che hanno superato la fase della demo e si trovano davanti ad attriti che prima non c\'erano.',
    format: 'Unità da 2 ore, componibili in mezze giornate o giornate. In presenza o da remoto.',
    basis: "Ogni esercizio è costruito attorno a un guasto: si consegna al team qualcosa che sembra funzionare, si fa scoprire che non funziona, e solo dopo si introduce lo strumento che risolve. Il caso d'uso guida si riscrive sul vostro dominio.",
    groups: [
      {
        label: 'Quattro punti di partenza',
        modules: [
          { id: 'P1', name: 'Alfabetizzazione AI', note: "Tutto il personale, per l'obbligo dell'art. 4 AI Act", duration: '2 h' },
          { id: 'P2', name: 'Briefing per decisori', note: 'Chi valuta e finanzia, senza codice', duration: '2 h' },
          { id: 'P3', name: 'Costruire agenti in Python', note: 'Chi implementa', duration: '2 h' },
          { id: 'P4', name: 'Delegare agli agenti di sviluppo', note: 'Chi programma', duration: '2 h' },
        ],
      },
      {
        label: 'Quattro direzioni',
        modules: [
          { id: 'D1', name: 'Dare accesso ai dati', desc: 'Collegare l\'agente ai sistemi che avete: database, API interne, documenti, progettazione del contesto.', duration: '2 h' },
          { id: 'D2', name: 'Rendere affidabile', desc: 'Osservabilità, valutazione sistematica, controllo delle azioni irreversibili, gestione dei costi.', duration: '2 h' },
          { id: 'D3', name: 'Mettere in sicurezza', desc: 'Input non fidato, sottrazione di dati attraverso gli strumenti, permessi, tracciabilità delle decisioni automatiche.', duration: '2 h' },
          { id: 'D4', name: 'Sviluppare con gli agenti', desc: 'Delega dei compiti, contesto di progetto, revisione del codice generato, misura dell\'adozione.', duration: '2 h' },
        ],
      },
    ],
    notCovered: 'Fine-tuning, addestramento di modelli, infrastruttura di deployment e scaling, ricerca semantica sui documenti e sistemi multi-agente. Vengono nominati con l\'indicazione di dove approfondirli.',
    takeaway: [
      { title: 'Il repository', desc: 'Dataset, esercizi e soluzioni funzionanti.' },
      { title: 'La lista di controllo', desc: 'Sette criteri di accettazione che il responsabile tecnico usa il lunedì dopo.' },
    ],
    series: [
      { key: 'mutation-testing-ai', title: 'Mutation testing e AI', href: '/blog/verificare/mutation-testing-ai/' },
    ],
    talks: ['il-tuo-collega-piu-produttivo'],
  },
  {
    slug: 'observability',
    title: 'Observability',
    titleEn: 'Observability',
    goal: 'Strumentare i servizi e ricostruire cosa è successo dentro un sistema distribuito in esecuzione, sapendo quanto costa tenere acceso lo stack e quando basta molto meno.',
    goalEn: 'Instrumenting services and reconstructing what happened inside a running distributed system, knowing what the stack costs to keep on and when far less is enough.',
    audience: 'Team di sviluppo che devono capire cosa è successo dentro un sistema distribuito in esecuzione.',
    format: 'Due ore in versione compatta, tre giorni in versione aziendale. In presenza o da remoto.',
    basis: 'Uno stack completo in esecuzione: ingresso, coda, elaborazione, persistenza, con la raccolta dei segnali già configurata. Dentro c\'è un servizio che risponde alle richieste e non emette telemetria.',
    groups: [
      {
        label: 'Sempre incluso',
        modules: [
          {
            id: 'BASE',
            name: 'Leggere un sistema e strumentarne un componente',
            note: 'tutti gli altri lo presuppongono',
            desc: 'Avvio dello stack, analisi di un primo guasto e correlazione fra i tre segnali, seguiti dalla prima strumentazione del servizio privo di telemetria.',
            duration: '2 h',
          },
        ],
      },
      {
        label: "A scelta, nell'ordine delle dipendenze",
        modules: [
          { id: 'M1', name: 'Strumentazione avanzata', note: 'richiede la base', desc: 'Ricostruzione completa della richiesta con propagazione del contesto, e strumentazione della persistenza dalla configurazione.', duration: '2 h' },
          { id: 'M2', name: 'Automatica o manuale', note: 'richiede la base', desc: 'Quali risultati offre la strumentazione automatica e quali richiedono un intervento nel codice.', duration: '2 h' },
          { id: 'M3', name: 'SLO e alerting', note: 'richiede la base', desc: 'Definizione di un obiettivo di servizio misurabile e allarme basato sul consumo del margine di errore.', duration: '2 h' },
          { id: 'M4', name: 'Verifica degli allarmi', note: 'richiede SLO e alerting', desc: 'Introduzione di un guasto circoscritto e verifica di quali allarmi non si attivano.', duration: '2 h' },
          { id: 'M5', name: 'Portabilità', note: 'richiede la base', desc: 'Sostituzione del backend dei segnali dalla sola configurazione, e limiti effettivi della portabilità.', duration: '2 h' },
          { id: 'M6', name: 'Costi e dimensionamento', note: 'indipendente', desc: 'Costo misurato di esercizio, conservazione dei dati, campionamento e cardinalità.', duration: '2 h' },
          { id: 'M7', name: 'Contenuti di una dashboard', note: 'richiede la base', desc: 'Quali indicatori si osservano quotidianamente e quali soltanto durante un incidente.', duration: '2 h' },
          { id: 'M8', name: 'Esercitazione conclusiva', note: 'richiede tutti i precedenti', desc: 'Guasto non dichiarato, ruoli assegnati, causa da individuare a partire dai soli segnali.', duration: '2 h' },
        ],
      },
    ],
    notCovered: 'La tabella con cui si chiude il percorso serve a decidere di non installare niente, se è il caso: un servizio e poche richieste all\'ora non giustificano un collector intero.',
    takeaway: [
      { title: 'Lo stack', desc: 'I servizi, la coda, il generatore di carico e la raccolta dei segnali, con due comandi per avviarlo.' },
      { title: 'Gli esercizi', desc: 'I checkpoint scritti passo per passo, e la soluzione di riferimento completa.' },
      { title: 'La parte onesta', desc: 'I costi misurati, la proiezione sulla conservazione dei dati e la tabella per decidere quando basta meno.' },
    ],
    series: [
      { key: 'observability', title: 'Observability nei sistemi distribuiti', href: '/blog/verificare/observability/' },
      { key: 'saturation-alerting', title: 'Saturazione, SLO e alerting' },
    ],
    talks: [],
  },
  {
    slug: 'testing-e2e',
    title: 'Testing end-to-end con Playwright',
    titleEn: 'End-to-end testing with Playwright',
    goal: "Una suite end-to-end di cui il team si fida: gira in CI, non produce fallimenti che nessuno guarda, e il team la mantiene senza assistenza.",
    goalEn: 'An end-to-end suite the team trusts: it runs in CI, it does not produce failures nobody reads, and the team maintains it without help.',
    audience: 'Team che devono introdurre i test end-to-end, o che ne hanno una suite che nessuno guarda più.',
    format: 'Da concordare in fase di discovery call.',
    groups: [],
    takeaway: [
      { title: 'Il repository', desc: 'Suite, fixtures e configurazione della pipeline, pubblici.' },
    ],
    series: [
      { key: 'playwright', title: 'Test end-to-end con Playwright', href: '/blog/verificare/playwright/' },
    ],
    talks: [],
    delivered: 'Erogato a un team di 10 developer con prodotto già in produzione e nessun test end-to-end: costruita una suite con page object model e fixtures, integrata nella pipeline Jenkins.',
    repo: 'https://github.com/monte97/workshop-playwright',
  },
];

/** Temi su cui la formazione è già stata erogata, senza una pagina propria. */
export const alsoDelivered = [
  { title: 'Identity management con Keycloak' },
  { title: 'Mutation testing' },
  { title: 'Performance testing con k6', repo: 'https://github.com/monte97/workshop-k6' },
];
