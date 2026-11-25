export type TalkLink = {
  repo?: string;
  code?: string;   // codice della demo, quando il repo non e' il materiale del talk
  slides?: string;
  linkedin?: string;
  conference?: string;
  recording?: string;
  article?: string;
  speaker?: string;
};

export type Talk = {
  slug: string;
  title: { it: string; en: string };
  language: 'it' | 'en'; // lingua in cui il talk e' tenuto, mostrata in evidenza
  event: string;
  date: string; // ISO, es. "2026-06-18"
  location: string;
  status: 'delivered' | 'upcoming';
  abstract: { it: string; en: string };
  // resoconto della serata scritto da altri: frase introduttiva, poi il titolo linkato
  recap?: { it: string; en: string; title: string; url: string };
  links?: TalkLink;
};

export const talks: Talk[] = [
  {
    slug: 'incidente-non-parla-promql',
    title: {
      it: "L'incidente non parla PromQL: un'interfaccia naturale sopra il tuo stack di osservabilità",
      en: "Incidents don't speak PromQL: a natural interface over your observability stack",
    },
    language: 'it',
    event: 'DevFest Milano 2026',
    date: '2026-10-10',
    location: 'Milano, IT',
    status: 'delivered',
    abstract: {
      it: "Un alert scatta. Apri la dashboard e trovi due indizi che si contraddicono: un segnale punta in una direzione, un altro, nello stesso momento, punta in un'altra. Quale dei due segui? Nessun runbook scritto a priori copre il caso in cui due segnali indipendenti puntano altrove, ed è più o meno sempre così quando l'incidente è quello vero, non quello da manuale.\n\nDurante il talk presenterò un agente che fa esattamente questo mestiere: guarda log, trace e metriche di un incidente reale e sceglie tra più cause plausibili quando le prove non convergono: un'interfaccia che ti risparmia di ricordarti dove cercare e con quale sintassi interrogare ogni backend. Lo dimostro dal vivo con LangGraph, orchestrando query verso uno stack di osservabilità (OpenTelemetry, Loki, Tempo, Mimir).\n\nRacconto la costruzione di un approccio che sto mettendo alla prova, non ancora una soluzione pronta: come si dà al modello la libertà di scegliere quale fonte interrogare più a fondo per ogni ipotesi, quando fermarsi, e come argomenta una conclusione con un livello di confidenza anche quando restano cause aperte, invece di restituire un verdetto univoco e definitivo.",
      en: "An alert fires. You open the dashboard and find two clues that contradict each other: one signal points one way, another, at the same moment, points somewhere else. Which one do you follow? No runbook written in advance covers the case where two independent signals point elsewhere, and that is more or less always how it goes when the incident is the real one, not the one from the manual.\n\nIn the talk I present an agent that does exactly this job: it looks at logs, traces and metrics from a real incident and chooses between several plausible causes when the evidence does not converge: an interface that spares you from remembering where to look and which syntax each backend wants. I demo it live with LangGraph, orchestrating queries against an observability stack (OpenTelemetry, Loki, Tempo, Mimir).\n\nI tell the story of an approach I am putting to the test, not a finished solution: how you give the model the freedom to choose which source to dig into for each hypothesis, when to stop, and how it argues for a conclusion with a confidence level even when causes remain open, instead of handing back a single definitive verdict.",
    },
    links: {
      slides: '/files/talk-promql-devfest-milano-2026.pdf',
      article: '/blog/verificare/observability/incidente-non-parla-promql/',
      code: 'https://github.com/monte97/observability-agent-lab',
      conference: 'https://2026.devfestmilano.it',
      speaker: 'https://2026.devfestmilano.it/it/speakers/3ca13269-73ac-4dad-b02c-b6a6c82fe80c/',
    },
  },
  {
    slug: 'oltre-i-ruoli-openfga',
    title: {
      it: "Oltre i ruoli: autorizzazione relazionale con OpenFGA",
      en: "Beyond roles: relationship-based authorization with OpenFGA",
    },
    language: 'it',
    event: 'DevSecOpsDay',
    date: '2026-10-14',
    location: 'Bologna, IT',
    status: 'delivered',
    abstract: {
      it: "I ruoli nel JWT smettono di bastare appena l'accesso dipende dalle relazioni: chi possiede il documento, chi è nel team, chi ha condiviso cosa. OpenFGA porta l'autorizzazione relazionale fuori dal codice applicativo. Come modellarla, e quando serve davvero.",
      en: 'Roles in a JWT stop being enough the moment access depends on relationships: who owns the document, who is on the team, who shared what. OpenFGA moves relational authorization out of your application code. How to model it, and when you actually need it.',
    },
    links: {
      slides: '/files/talk-openfga-devsecopsday-2026.pdf',
      article: '/blog/verificare/openfga/06-oltre-i-ruoli/',
      conference: 'https://www.devsecopsday.it',
      speaker: 'https://www.devsecopsday.it/speaker/francesco-montelli/',
      linkedin: 'https://www.linkedin.com/posts/grusp_devsecopsday-devsecopsday-activity-7482697988751093762-4zuX?utm_source=share&utm_medium=member_desktop&rcm=ACoAAB73J5QBiTWCzxRrpP2WaZgBtH4empc8hrQ',
    },
  },
  {
    slug: 'waf-open-source-coraza-caddy',
    title: {
      it: "WAF open source: Coraza e Caddy per proteggere i tuoi servizi",
      en: "Open source WAF: Coraza and Caddy to protect your services",
    },
    language: 'it',
    event: 'Linux Day Prato 2026',
    date: '2026-10-24',
    location: 'Prato, IT',
    status: 'delivered',
    abstract: {
      it: "Se esponi un servizio da casa, che sia Nextcloud o un blog, è un bersaglio dal primo giorno. Un Web Application Firewall filtra il traffico ostile prima che arrivi all'applicazione, ma quelli commerciali costano e ti legano a un fornitore.\n\nCoraza parla le regole OWASP CRS, Caddy fa da reverse proxy con HTTPS automatico: insieme diventano uno stack WAF interamente sotto licenza Apache 2.0, da server nudo a filtro attivo in pochi minuti. Nessun vendor, nessun costo, nessun dato lasciato a terzi.\n\nArchitettura, installazione e configurazione pratica, con la parte che di solito fa male: come si passa da DetectionOnly al blocco vero senza tagliare fuori il traffico legittimo.",
      en: "If you expose a service from home, whether it is Nextcloud or a blog, it is a target from day one. A Web Application Firewall filters hostile traffic before it reaches your application, but the commercial ones cost money and tie you to a vendor.\n\nCoraza speaks the OWASP CRS ruleset and Caddy acts as a reverse proxy with automatic HTTPS: together they form a WAF stack entirely under the Apache 2.0 licence, from bare server to active filter in minutes. No vendor, no cost, no data handed to third parties.\n\nArchitecture, installation and practical configuration, including the part that usually hurts: moving from DetectionOnly to actual blocking without cutting off legitimate traffic.",
    },
    links: {
      slides: '/files/talk-waf-linux-day-prato-2026.pdf',
      article: '/blog/verificare/security/waf-open-source-coraza-caddy/',
      repo: 'https://github.com/monte97/waf-open-source-coraza-caddy',
      conference: 'https://day.linux.prato.it',
    },
  },
  {
    slug: 'il-modello-non-ci-sta',
    title: {
      it: "Il modello non ci sta: le leve per usarlo lo stesso",
      en: "The model doesn't fit: the levers to run it anyway",
    },
    language: 'it',
    event: 'mlopsday 2026',
    date: '2026-10-29',
    location: 'Bologna, IT',
    status: 'delivered',
    abstract: {
      it: "Community talk di cinque minuti. Un Mixture of Experts da 400 miliardi di parametri pesa circa 200 GB anche a 4 bit: non sta né su un MacBook da 128 GB né su una H100. Eppure negli ultimi mesi c'è chi ha fatto girare modelli da 744 miliardi su un portatile con 25 GB di RAM.\n\nI progetti cambiano ogni settimana, le leve sono sempre le stesse, e ognuna ha un prezzo: la quantizzazione riduce i byte ma sotto i 4 bit rompe JSON e tool calling; gli esperti restano su SSD e salgono in RAM solo quando il router li sceglie, pagando in latenza; caricarli in anticipo nasconde l'attesa, ma si paga quando la previsione sbaglia.",
      en: "A five-minute community talk. A 400-billion-parameter Mixture of Experts weighs about 200 GB even at 4 bits: it fits neither on a 128 GB MacBook nor on an H100. And yet in recent months people have run 744-billion-parameter models on a laptop with 25 GB of RAM.\n\nThe projects change every week, the levers stay the same, and each one has a price: quantization cuts bytes but below 4 bits breaks JSON and tool calling; experts stay on SSD and move into RAM only when the router picks them, at the cost of latency; loading them ahead hides the wait, but you pay when the prediction is wrong.",
    },
    links: {
      slides: '/files/talk-moe-streaming-mlopsday-2026.pdf',
      repo: 'https://github.com/monte97/mlopsday-2026-moe-streaming',
      conference: 'https://www.mlopsday.it',
    },
  },
  {
    slug: 'dove-sono-finiti-i-tuoi-token-modena',
    title: {
      it: "Dove sono finiti i tuoi token? Tracciare un sistema multi-agente con OpenTelemetry",
      en: "Where did your tokens go? Tracing a multi-agent system with OpenTelemetry",
    },
    language: 'it',
    event: 'Modena Full Stack',
    date: '2026-11-25', // meetup serale, tre giorni prima di DevFest Alps
    location: 'Modena, IT',
    status: 'delivered',
    abstract: {
      it: "Perché il nostro sistema ha prodotto una risposta sbagliata, impiegando più tempo e spendendo più del previsto?\n\nQuando un sistema AI usa più agenti con compiti diversi, capire cosa succede dietro le quinte diventa complicato. Un workflow multi-agente, assieme ai tool coinvolti, è un sistema distribuito a tutti gli effetti: può accumularsi latenza, si possono avere costi più alti del dovuto, i failure si propagano a cascata. Servirebbe visibilità end-to-end per accorgersene prima che i danni aumentino.\n\nMostro come usare OpenTelemetry per seguire passo dopo passo l'esecuzione di un sistema multi-agente, dalla richiesta iniziale alla risposta finale. Vediamo come visualizzare le chiamate ai modelli e ai tool, misurare i tempi di esecuzione, monitorare il consumo di token e stimare i costi, e come individuare errori e colli di bottiglia con le convenzioni OpenTelemetry dedicate alla GenAI.\n\nL'obiettivo è passare da un sistema di agenti difficile da comprendere a uno in cui possiamo ricostruire cosa è successo, capire dove intervenire e tenere sotto controllo prestazioni e costi.\n\nMercoledì 25 novembre, dalle 19 (il talk alle 19:30), poi chiacchiere e birra\nOttantesimo Miglio, via Emilia Ovest 802, Modena",
      en: "Why did our system give a wrong answer, taking longer and spending more than expected?\n\nWhen an AI system uses several agents with different jobs, understanding what happens behind the scenes gets hard. A multi-agent workflow, together with the tools it calls, is a distributed system in every sense: latency piles up, costs run higher than they should, failures cascade. You need end-to-end visibility to notice before the damage grows.\n\nI show how to use OpenTelemetry to follow the execution of a multi-agent system step by step, from the first request to the final answer. We look at how to visualise calls to models and tools, measure execution times, track token usage and estimate costs, and how to spot errors and bottlenecks with the OpenTelemetry conventions for GenAI.\n\nThe goal is to move from an agent system that is hard to understand to one where we can reconstruct what happened, see where to step in, and keep performance and costs under control.\n\nWednesday 25 November, from 7 pm (talk at 7:30 pm), then drinks and chat\nOttantesimo Miglio, via Emilia Ovest 802, Modena, Italy",
    },
    recap: {
      it: "Grazie a Netframe, che ha offerto il primo giro e ha raccontato la serata sul suo blog:",
      en: "Thanks to Netframe, who bought the first round and wrote up the evening on their blog:",
      title: "Osservabilità degli agenti AI: seguire i token per trovare l'errore",
      url: 'https://netframe.it/osservabilita-agenti-ai-opentelemetry/',
    },
    links: {
      slides: '/files/talk-token-modena-full-stack-2026.pdf',
      code: 'https://github.com/monte97/dove-sono-finiti-i-tuoi-token-demo',
      conference: 'https://www.meetup.com/modena-full-stack/events/317552482/',
    },
  },
  {
    slug: 'dove-sono-finiti-i-tuoi-token',
    title: {
      it: "Dove sono finiti i tuoi token? Tracciare un sistema multi-agente con OpenTelemetry",
      en: "Where did your tokens go? Tracing a multi-agent system with OpenTelemetry",
    },
    language: 'it',
    event: 'DevFest Alps 2026',
    date: '2026-11-28', // sabato 28/11, giornata dei talk (mail organizzatori 24/10)
    location: 'Torino, IT',
    status: 'upcoming',
    abstract: {
      it: "Un workflow multi-agente che chiama tool e altri agenti è, a tutti gli effetti, un sistema distribuito: latenza che si accumula, costi token che esplodono, fallimenti che si propagano a cascata. Eppure spesso manca visibilità end-to-end.\n\nIn questo talk mostro come strumentare un sistema agentico con OpenTelemetry e le GenAI semantic conventions: lo span tree ufficiale (invoke_agent, poi un chat span per ogni chiamata LLM, poi execute_tool per ogni tool), gli attributi gen_ai.* per token, modello e finish-reason, la latenza end-to-end. La domanda a cui rispondere dal vivo: perché questo workflow ha dato una risposta sbagliata dopo aver speso più tempo e più denaro del previsto?\n\nIl costo non è un attributo standard: si ricava dai token e dal pricing, e mostro come. Lo stesso span tree diventa log di audit: chi ha chiamato quale tool, con quali token, quando e perché è fallito.\n\nTre cose oneste: le GenAI semantic conventions sono ancora sperimentali, le presento come standard in fase di consolidamento. La demo la costruisco per questo talk, portando la disciplina dell'observability in un dominio nuovo per me. E se catturo prompt e risposte, quei testi finiscono negli span verso il backend: servono redazione o filtri prima di esportarli.",
      en: "A multi-agent workflow that calls tools and other agents is, for all practical purposes, a distributed system: latency that piles up, token costs that explode, failures that cascade. And yet end-to-end visibility is often missing.\n\nIn this talk I show how to instrument an agentic system with OpenTelemetry and the GenAI semantic conventions: the official span tree (invoke_agent, then a chat span for each LLM call, then execute_tool for each tool), the gen_ai.* attributes for tokens, model and finish reason, and end-to-end latency. The question to answer live: why did this workflow give a wrong answer after spending more time and more money than expected?\n\nCost is not a standard attribute: you derive it from tokens and pricing, and I show how. The same span tree becomes an audit log: who called which tool, with which tokens, when and why it failed.\n\nThree honest notes: the GenAI semantic conventions are still experimental, and I present them as a standard that is still settling. I am building the demo for this talk, bringing observability discipline into a domain that is new to me. And if you capture prompts and responses, that text ends up in the spans sent to your backend: you need redaction or filtering before exporting it.",
    },
    links: {
      slides: '/files/talk-token-devfest-alps-2026.pdf',
      code: 'https://github.com/monte97/dove-sono-finiti-i-tuoi-token-demo',
      conference: 'https://devfest.gdgtorino.it/',
      speaker: 'https://devfest.gdgtorino.it/en/talks/dove-sono-finiti-i-tuoi-token-tracciare-un-sistema-multi-agente-/',
    },
  },
  {
    slug: 'arresta-il-sistema-2026',
    title: {
      it: "Arresta il sistema: dibattito e quiz sulla nostra dipendenza dalle big tech",
      en: "Shut the system down: a debate and quiz on our dependence on big tech",
    },
    language: 'it',
    event: 'Circolo Arci Gianni dal Monte',
    date: '2026-12-03',
    location: 'Castel Bolognese, IT',
    status: 'upcoming',
    abstract: {
      it: "Email, mappe, chat: la nostra vita gira su server che non controlliamo.\n\nDue ipotesi: spegniamo tutto e passiamo all'open source, oppure cerchiamo una via di mezzo, ibrida e piena di sfumature. Chi ha ragione?\n\nUna serata tra quiz e dibattiti per capire quanto siamo davvero dipendenti dalle big tech americane e cosa significa sovranità digitale. Fino alla domanda più difficile: siamo davvero pronti a spegnere tutto?\n\nSul palco:\nIvan Zini, formatore e consulente sul free open source software\nFabio Trigari, Platform Software Engineer @ Aruba\nFrancesco Montelli, Freelance Software Engineer\nModera Lara Lombardi, formatrice per le competenze digitali\n\nGiovedì 3 dicembre, ore 21\nCircolo Arci Gianni dal Monte, via Emilia interna 137, Castel Bolognese (RA)",
      en: "Email, maps, chat: our lives run on servers we do not control.\n\nTwo hypotheses: switch everything off and move to open source, or look for a middle ground, hybrid and full of nuance. Who is right?\n\nAn evening of quizzes and debate to understand how dependent we really are on American big tech and what digital sovereignty means. Up to the hardest question: are we really ready to switch everything off?\n\nOn stage:\nIvan Zini, trainer and consultant on free open source software\nFabio Trigari, Platform Software Engineer @ Aruba\nFrancesco Montelli, Freelance Software Engineer\nModerated by Lara Lombardi, digital skills trainer\n\nThursday 3 December, 9 pm\nCircolo Arci Gianni dal Monte, via Emilia interna 137, Castel Bolognese (RA), Italy",
    },
  },
  {
    slug: 'test-stryker-net-copilot',
    title: {
      it: "I tuoi test controllano davvero qualcosa? Migliorarli con Stryker.NET e Copilot",
      en: "Do your tests really check anything? Improving them with Stryker.NET and Copilot",
    },
    language: 'it',
    event: '.NET Conference 2026',
    date: '2026-12-04',
    location: 'Milano, IT',
    status: 'upcoming',
    abstract: {
      it: "Tempo fa, in un progetto .NET, un bug è rimasto in produzione per settimane con la coverage alta e la pipeline verde. I test passavano sulla riga sbagliata, perché i dati che usavano davano lo stesso risultato sia con il codice giusto sia con quello sbagliato. Parte di quella suite l'avevano scritta agenti AI.\n\nDa allora faccio ai test un'altra domanda: se questa riga fosse sbagliata, qualcuno se ne accorgerebbe? Stryker.NET risponde introducendo piccoli difetti nel codice e mostrando quali sopravvivono. Ogni sopravvissuto indica un punto preciso in cui i test non controllano abbastanza, ed è una richiesta che si può passare a GitHub Copilot.\n\nNel talk costruiamo questo ciclo su un progetto .NET: Copilot scrive i test, Stryker.NET li misura, i sopravvissuti tornano all'assistente e lo strumento si rilancia per verificare che il buco sia chiuso davvero. Vediamo come si legge il report, come si riconoscono i mutanti che nessun test può uccidere, quale lavoro resta a chi conosce il dominio e come tenere una soglia in CI sul codice che cambia.\n\nSi esce con un metodo per migliorare i test, scritti a mano o generati, sapendo quanto ci si può fidare.",
      en: "A while ago, on a .NET project, a bug sat in production for weeks with high coverage and a green pipeline. The tests ran through the faulty line and still passed, because their data gave the same result with the right code and with the wrong code. Part of that suite had been written by AI agents.\n\nSince then I ask my tests another question: if this line were wrong, would anyone notice? Stryker.NET answers by introducing small defects into the code and showing which ones survive. Each survivor marks a specific spot where the tests don't check enough, and you can hand it to GitHub Copilot as a request.\n\nIn the talk we build this loop on a .NET project: Copilot writes the tests, Stryker.NET measures them, the survivors go back to the assistant, and Stryker runs again to confirm the gap is closed. We look at how to read the report, how to recognise mutants that no test can kill, what work is left to the people who know the domain, and how to keep a threshold in CI on the code that changes.\n\nYou leave with a method for improving tests, handwritten or generated, and a sense of how far you can trust them.",
    },
    links: {
      conference: 'https://dotnetconference.it/',
    },
  },
  {
    slug: 'mutation-testing-devfest-bari-2026',
    title: {
      it: "Come il mutation testing mi ha fatto capire che la suite stava mentendo",
      en: "How mutation testing showed me my test suite was lying",
    },
    language: 'it',
    event: 'DevFest Bari 2026',
    date: '2026-12-12',
    location: 'Bari, IT',
    status: 'upcoming',
    abstract: {
      it: "Un progetto senza test, ripreso dopo anni. La scelta ovvia: aggiungere una suite e usare gli strumenti a disposizione, agenti AI compresi, per fare prima. Qualche settimana dopo: centinaia di test verdi, coverage alta, CI configurata. La sensazione di aver saldato un debito.\n\nPoi un bug in produzione. Coperto dai test, promosso da ogni controllo, rimasto lì tranquillo per tre settimane. Il codice c'entrava poco. I test erano formalmente corretti, scritti bene, impeccabili nello stile: semplicemente non erano in grado di trovare quel bug.\n\nÈ lì che ho lanciato per la prima volta il mutation testing. Mi ha detto quello che la coverage non poteva dirmi. La coverage chiede se questo codice è stato eseguito; il mutation testing chiede se i test se ne accorgerebbero, nel caso in cui questo codice fosse sbagliato.\n\nQuesto talk racconta quella storia. Vediamo da dove nasce la distanza tra coverage e mutation score, come si legge un report di mutation testing per ricavarne test migliori senza moltiplicarli, e come portarlo in CI senza che diventi rumore.",
      en: "A project with no tests, picked up again after years. The obvious choice: add a suite and use every tool at hand, AI agents included, to get there faster. A few weeks later: hundreds of green tests, high coverage, CI in place. The feeling of having paid off a debt.\n\nThen a bug in production. Covered by the tests, passed by every check, sitting there quietly for three weeks. The code had little to do with it. The tests were formally correct, well written, flawless in style: they simply could not find that bug.\n\nThat is when I ran mutation testing for the first time. It told me what coverage could not. Coverage asks whether this code was executed; mutation testing asks whether the tests would notice if this code were wrong.\n\nThis talk tells that story. We look at where the gap between coverage and mutation score comes from, how to read a mutation testing report to get better tests out of it without multiplying them, and how to bring it into CI without it turning into noise.",
    },
    links: {
      conference: 'https://bari.devfest.it',
      article: '/blog/verificare/testing/mutation-testing-oltre-la-coverage/',
      code: 'https://github.com/monte97/mutation-testing-demo',
    },
  },
  {
    slug: 'il-tuo-collega-piu-produttivo',
    title: {
      it: "Il tuo collega più produttivo scrive test inutili",
      en: "Your most productive colleague writes useless tests",
    },
    language: 'it',
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
    title: {
      it: "Come il mutation testing mi ha fatto capire che la mia suite di test stava mentendo",
      en: "How mutation testing showed me my test suite was lying",
    },
    language: 'it',
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
