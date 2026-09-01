export type TalkLink = {
  repo?: string;
  slides?: string;
  linkedin?: string;
  conference?: string;
  recording?: string;
  article?: string;
  speaker?: string;
};

export type Talk = {
  slug: string;
  title: string;
  event: string;
  date: string; // ISO, es. "2026-06-18"
  location: string;
  status: 'delivered' | 'upcoming';
  abstract: { it: string; en: string };
  links?: TalkLink;
};

export const talks: Talk[] = [
  {
    slug: 'incidente-non-parla-promql',
    title: "L'incidente non parla PromQL: un'interfaccia naturale sopra il tuo stack di osservabilità",
    event: 'DevFest Milano 2026',
    date: '2026-10-10',
    location: 'Milano, IT',
    status: 'upcoming',
    abstract: {
      it: "Un alert scatta. Apri la dashboard e trovi due indizi che si contraddicono: un segnale punta in una direzione, un altro, nello stesso momento, punta in un'altra. Quale dei due segui? Nessun runbook scritto a priori copre il caso in cui due segnali indipendenti puntano altrove, ed è più o meno sempre così quando l'incidente è quello vero, non quello da manuale.\n\nDurante il talk presenterò un agente che fa esattamente questo mestiere: guarda log, trace e metriche di un incidente reale e sceglie tra più cause plausibili quando le prove non convergono: un'interfaccia che ti risparmia di ricordarti dove cercare e con quale sintassi interrogare ogni backend. Lo dimostro dal vivo con LangGraph, orchestrando query verso uno stack di osservabilità (OpenTelemetry, Loki, Tempo, Mimir).\n\nRacconto la costruzione di un approccio che sto mettendo alla prova, non ancora una soluzione pronta: come si dà al modello la libertà di scegliere quale fonte interrogare più a fondo per ogni ipotesi, quando fermarsi, e come argomenta una conclusione con un livello di confidenza anche quando restano cause aperte, invece di restituire un verdetto univoco e definitivo.",
      en: "An alert fires. You open the dashboard and find two clues that contradict each other: one signal points one way, another, at the same moment, points somewhere else. Which one do you follow? No runbook written in advance covers the case where two independent signals point elsewhere, and that is more or less always how it goes when the incident is the real one, not the one from the manual.\n\nIn the talk I present an agent that does exactly this job: it looks at logs, traces and metrics from a real incident and chooses between several plausible causes when the evidence does not converge: an interface that spares you from remembering where to look and which syntax each backend wants. I demo it live with LangGraph, orchestrating queries against an observability stack (OpenTelemetry, Loki, Tempo, Mimir).\n\nI tell the story of an approach I am putting to the test, not a finished solution: how you give the model the freedom to choose which source to dig into for each hypothesis, when to stop, and how it argues for a conclusion with a confidence level even when causes remain open, instead of handing back a single definitive verdict.",
    },
    links: {
      conference: 'https://devfestmilano.it',
    },
  },
  {
    slug: 'oltre-i-ruoli-openfga',
    title: 'Oltre i ruoli: autorizzazione relazionale con OpenFGA',
    event: 'DevSecOpsDay',
    date: '2026-10-14',
    location: 'Bologna, IT',
    status: 'upcoming',
    abstract: {
      it: "I ruoli nel JWT smettono di bastare appena l'accesso dipende dalle relazioni: chi possiede il documento, chi è nel team, chi ha condiviso cosa. OpenFGA porta l'autorizzazione relazionale fuori dal codice applicativo. Come modellarla, e quando serve davvero.",
      en: 'Roles in a JWT stop being enough the moment access depends on relationships: who owns the document, who is on the team, who shared what. OpenFGA moves relational authorization out of your application code. How to model it, and when you actually need it.',
    },
    links: {
      conference: 'https://www.devsecopsday.it',
      speaker: 'https://www.devsecopsday.it/speaker/francesco-montelli/',
      linkedin: 'https://www.linkedin.com/posts/grusp_devsecopsday-devsecopsday-activity-7482697988751093762-4zuX?utm_source=share&utm_medium=member_desktop&rcm=ACoAAB73J5QBiTWCzxRrpP2WaZgBtH4empc8hrQ',
    },
  },
  {
    slug: 'il-tuo-collega-piu-produttivo',
    title: 'Il tuo collega più produttivo scrive test inutili',
    event: 'DevRomagna',
    date: '2026-05-13',
    location: 'Faenza, IT',
    status: 'delivered',
    abstract: {
      it: "La coverage dice che il codice gira, non che i test lo verificano: col mutation testing scopri quali test passano senza controllare niente. E, in chiusura, un excursus sul futuro: la mutazione guidata da un LLM invece che da un motore a regole come Stryker, e cosa cambia quando sono gli LLM a scrivere codice e test.",
      en: 'Coverage tells you the code runs, not that the tests verify it: mutation testing reveals which tests pass without checking anything. And, to close, a look ahead: mutation guided by an LLM instead of a rule engine like Stryker, and what changes when LLMs write the code and the tests.',
    },
    links: {
      article: '/blog/verificare/testing/chiudere-il-loop-mutation-testing/',
      repo: 'https://github.com/monte97/il-tuo-collega-piu-produttivo',
      linkedin: 'https://www.linkedin.com/posts/francesco-montelli_settimana-scorsa-ho-tenuto-un-talk-con-devromagna-share-7463469974242664448-wSo8',
      conference: 'https://www.linkedin.com/posts/devromagna_devromagna-dotnet-testing-activity-7457761526087614464-FFpU',
    },
  },
  {
    slug: 'mutation-testing-working-software-2026',
    title: 'Come il mutation testing mi ha fatto capire che la mia suite di test stava mentendo',
    event: 'Working Software 2026',
    date: '2026-06-18',
    location: 'Reggio Emilia, IT',
    status: 'delivered',
    abstract: {
      it: 'Una demo live su tre servizi .NET 8: 93% di coverage e test verdi, ma Stryker.NET mostra che il 35% dei mutanti sopravvive. Riscrivo i test guidato dal report e il mutation score sale al 92%. La coverage dice se il codice gira, il mutation score se i test funzionano davvero.',
      en: 'A live demo on three .NET 8 services: coverage at 93% and green tests, yet Stryker.NET shows 35% of mutants survive. Guided by the report I rewrite the tests and the mutation score climbs to 92%. Coverage tells you the code runs; the mutation score tells you the tests work.',
    },
    links: {
      article: '/blog/verificare/testing/mutation-testing-oltre-la-coverage/',
      repo: 'https://github.com/monte97/mutation-testing-ws2026-slides',
      linkedin: 'https://www.linkedin.com/feed/update/urn:li:activity:7476566629942759424/',
      conference: 'https://www.agilemovement.it/workingsoftware/',
    },
  },
];
