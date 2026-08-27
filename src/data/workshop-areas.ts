import type { Pillar } from './pillars';

type Bilingual = { it: string; en: string };

/** Un gruppo di materiale gia' pubblicato su cui l'area si appoggia. */
export interface AreaMaterialGroup {
  title: Bilingual;
  /** Valore del campo `series` nel frontmatter: il gruppo si aggiorna da solo. */
  key?: string;
  /** Id dei post, per gli articoli che non appartengono a una serie. */
  ids?: string[];
  /** Landing della serie, solo dove esiste (le landing sono in italiano). */
  href?: string;
}

export interface WorkshopArea {
  slug: string;
  pillar: Pillar;
  title: Bilingual;
  /** Il problema che l'area affronta. */
  problem: Bilingual;
  /** A chi è rivolta. */
  audience: Bilingual;
  material: AreaMaterialGroup[];
  /**
   * Cosa contiene il percorso. Si compila solo dove il materiale esiste davvero
   * (oggi: il catalogo dell'osservabilita'). Dove manca, i blocchi non compaiono.
   */
  detail?: {
    format?: Bilingual;
    /** La base su cui si lavora in aula. */
    worksOn?: Bilingual;
    /** Cosa resta al team a fine percorso. */
    takeaway?: { title: Bilingual; desc: Bilingual }[];
    /** Cosa serve dalla parte del cliente. */
    requirements?: Bilingual;
  };
  /** Slug in `data/talks.ts`. */
  talks: string[];
  /**
   * Catalogo del percorso. Il blocco compare solo quando c'e': `href` e' la
   * versione web, `pdf` il file scaricabile, che resta opzionale.
   */
  catalog?: { href: string; pdf?: string };
}

export const workshopAreas: WorkshopArea[] = [
  {
    slug: 'identity-management',
    pillar: 'progettare',
    title: { it: 'Identity management', en: 'Identity management' },
    problem: {
      it: "Delegare autenticazione e autorizzazione a un identity provider è una decisione che si paga per anni. I punti dove si rompe sono quasi sempre gli stessi: il flusso OAuth2 scelto senza PKCE, i servizi che si parlano con token inventati in casa, i permessi che restano in una colonna `role` finché non bastano più.",
      en: "Handing authentication and authorization to an identity provider is a decision you pay for over years. The places where it breaks are almost always the same: an OAuth2 flow picked without PKCE, services talking to each other with home made tokens, permissions living in a `role` column until that column stops being enough.",
    },
    audience: {
      it: 'Team che stanno introducendo Keycloak, o che hanno un modello di permessi diventato difficile da modificare.',
      en: 'Teams adopting Keycloak, or carrying a permission model that has become hard to change.',
    },
    material: [
      {
        key: 'keycloak',
        title: { it: 'Keycloak in produzione', en: 'Keycloak in production' },
        href: '/blog/progettare/keycloak/',
      },
      {
        key: 'openfga',
        title: { it: 'Autorizzazione con OpenFGA', en: 'Authorization with OpenFGA' },
        href: '/blog/verificare/openfga/',
      },
    ],
    talks: ['oltre-i-ruoli-openfga'],
  },
  {
    slug: 'mutation-testing',
    pillar: 'verificare',
    title: { it: 'Mutation testing', en: 'Mutation testing' },
    problem: {
      it: "I test passano, la coverage è alta, le regressioni arrivano in produzione lo stesso. La coverage misura quali righe vengono eseguite: un test che esegue una riga senza verificarne il risultato alza la percentuale e non intercetta niente. Il mutation testing inietta guasti nel codice e conta quanti ne vengono catturati.",
      en: "Tests pass, coverage is high, and regressions reach production anyway. Coverage measures which lines run: a test that runs a line without checking its result raises the percentage and catches nothing. Mutation testing injects faults into the code and counts how many of them the suite catches.",
    },
    audience: {
      it: 'Team con una suite di test già estesa che continua a lasciar passare bug.',
      en: 'Teams with a large test suite that keeps letting bugs through.',
    },
    material: [
      {
        key: 'mutation-testing-ai',
        title: { it: 'Mutation testing e AI', en: 'Mutation testing and AI' },
        href: '/blog/verificare/mutation-testing-ai/',
      },
    ],
    talks: ['il-tuo-collega-piu-produttivo', 'mutation-testing-working-software-2026'],
  },
  {
    slug: 'testing-e2e',
    pillar: 'verificare',
    title: { it: 'Testing end-to-end', en: 'End-to-end testing' },
    problem: {
      it: "Le suite end-to-end vengono abbandonate quando il team smette di credere ai loro fallimenti. Un test flaky viene ritentato, poi disattivato, poi cancellato. La causa sta prima, nel protocollo con cui il test parla al browser e nel modo in cui la suite è organizzata quando cresce.",
      en: "End-to-end suites get abandoned once the team stops believing their failures. A flaky test gets retried, then disabled, then deleted. The cause sits upstream, in the protocol the test uses to talk to the browser and in how the suite is organised as it grows.",
    },
    audience: {
      it: 'Team che devono introdurre i test end-to-end, o che ne hanno una suite che nessuno guarda più.',
      en: 'Teams introducing end-to-end tests, or maintaining a suite nobody reads any more.',
    },
    material: [
      {
        key: 'playwright',
        title: { it: 'Test end-to-end con Playwright', en: 'End-to-end testing with Playwright' },
        href: '/blog/verificare/playwright/',
      },
    ],
    talks: [],
  },
  {
    slug: 'performance-testing',
    pillar: 'verificare',
    title: { it: 'Performance testing', en: 'Performance testing' },
    problem: {
      it: "Lanciare un load test e leggere il valore medio dice poco. Senza scenari costruiti sul traffico reale e senza una baseline con cui confrontarsi, il risultato rassicura e non misura. Servono percentili, soglie dichiarate e run confrontabili nel tempo.",
      en: "Running a load test and reading the average tells you little. Without scenarios built on real traffic and a baseline to compare against, the result reassures without measuring. What is needed are percentiles, declared thresholds and runs that can be compared over time.",
    },
    audience: {
      it: 'Team che devono capire se un sistema regge il carico previsto, e trasformarlo in un controllo ripetibile.',
      en: 'Teams that need to know whether a system holds the expected load, and to turn that into a repeatable check.',
    },
    material: [
      {
        key: 'performance-engineering',
        title: { it: 'Baseline e metriche di performance', en: 'Baselines and performance metrics' },
      },
    ],
    talks: [],
  },
  {
    slug: 'osservabilita',
    pillar: 'verificare',
    title: { it: 'Osservabilità', en: 'Observability' },
    problem: {
      it: "Quando una richiesta attraversa più servizi, i log di ciascuno non bastano a ricostruire cosa è successo. Le tracce distribuite risolvono la ricostruzione e aprono due questioni nuove: quanto costa conservare i dati, e quali dati non possono essere conservati. Poi resta la parte più scomoda: decidere quali segnali meritano una notifica.",
      en: "When a request crosses several services, the logs of each one are not enough to reconstruct what happened. Distributed traces solve the reconstruction and open two new questions: what it costs to keep the data, and which data cannot be kept. Then comes the uncomfortable part: deciding which signals deserve a page.",
    },
    audience: {
      it: 'Team che gestiscono un sistema distribuito e passano troppo tempo a capire dove un errore ha avuto origine.',
      en: 'Teams running a distributed system who spend too long working out where an error started.',
    },
    material: [
      {
        key: 'observability',
        title: { it: 'Observability nei sistemi distribuiti', en: 'Observability in distributed systems' },
        href: '/blog/verificare/observability/',
      },
      {
        key: 'saturation-alerting',
        title: { it: 'Saturazione, SLO e alerting', en: 'Saturation, SLOs and alerting' },
      },
    ],
    detail: {
      format: {
        it: 'Due ore in versione compatta, tre giorni in versione aziendale. In presenza o da remoto.',
        en: 'Two hours in the compact version, three days in the company version. On site or remote.',
      },
      worksOn: {
        it: "Uno stack completo in esecuzione: ingresso, coda, elaborazione, persistenza, con la raccolta dei segnali già configurata. Dentro c'è un servizio che risponde alle richieste e non emette telemetria, e il lavoro consiste nel renderlo osservabile, con una verifica a ogni passo. I componenti si sostituiscono con i vostri e i servizi da strumentare si scrivono nel linguaggio che usate.",
        en: "A full stack in execution: ingress, queue, processing, persistence, with signal collection already configured. Inside it sits a service that answers requests and emits no telemetry, and the work is making it observable, with a check at every step. The components can be swapped for yours, and the services to instrument are written in the language you use.",
      },
      takeaway: [
        {
          title: { it: 'Lo stack', en: 'The stack' },
          desc: {
            it: "I servizi, la coda, il servizio di identità, il generatore di carico e la raccolta dei segnali, con due comandi per avviarlo.",
            en: 'The services, the queue, the identity service, the load generator and the signal collection, with two commands to start it.',
          },
        },
        {
          title: { it: 'Gli esercizi', en: 'The exercises' },
          desc: {
            it: 'I checkpoint scritti passo per passo, e la soluzione di riferimento completa da confrontare.',
            en: 'The checkpoints written step by step, and the complete reference solution to compare against.',
          },
        },
        {
          title: { it: 'La parte onesta', en: 'The honest part' },
          desc: {
            it: 'I costi misurati dello stack, la proiezione sulla conservazione dei dati e la tabella per decidere quando basta meno.',
            en: "The stack's measured costs, the projection on data retention and the table for deciding when far less is enough.",
          },
        },
      ],
      requirements: {
        it: "Docker funzionante e circa 4 GB di RAM libera per macchina, accesso al registry delle immagini, e un avvio di prova dello stack prima del corso.",
        en: 'A working Docker and around 4 GB of free RAM per machine, access to the image registry, and a trial run of the stack before the course.',
      },
    },
    catalog: { href: '/workshop2/osservabilita/catalogo/' },
    talks: [],
  },
  {
    slug: 'devops',
    pillar: 'automatizzare',
    title: { it: 'DevOps', en: 'DevOps' },
    problem: {
      it: "L'infrastruttura cresce per accumulo: una macchina configurata a mano che diverge dalle altre, uno script che aggiunge un nodo e funziona finché non fallisce a metà, un deploy che una persona sola sa fare. Il costo resta invisibile finché qualcosa non va rifatto, e a quel punto nessuno sa dire in che stato sia il sistema.",
      en: "Infrastructure grows by accumulation: a machine configured by hand that drifts from the others, a script that adds a node and works until it fails halfway, a deploy only one person knows how to run. The cost stays invisible until something has to be rebuilt, and by then nobody can say what state the system is in.",
    },
    audience: {
      it: 'Team che gestiscono la propria infrastruttura e vogliono provisioning, deploy e ambienti di sviluppo ricostruibili da un repository.',
      en: 'Teams running their own infrastructure who want provisioning, deploys and development environments rebuildable from a repository.',
    },
    material: [
      {
        key: 'cicd',
        title: { it: 'Provisioning e deploy automatizzati', en: 'Automated provisioning and deploys' },
      },
      {
        key: 'homelab-capi',
        title: { it: 'Cluster API su Proxmox', en: 'Cluster API on Proxmox' },
      },
      {
        key: 'kubernetes-fondamenti',
        title: { it: 'Fondamenti di Kubernetes', en: 'Kubernetes fundamentals' },
      },
      {
        title: { it: 'Ambienti riproducibili', en: 'Reproducible environments' },
        ids: [
          'altro/devcontainer/devcontainer',
          'automatizzare/docker/docker-internals',
          'automatizzare/homelab/homelab-n8n',
        ],
      },
    ],
    talks: [],
  },
];

/**
 * Sessioni già erogate per clienti. Solo dati presenti nelle schede attuali:
 * niente durate, niente numeri che non siano già stati scritti.
 */
export interface PastDelivery {
  title: Bilingual;
  pillar: Pillar;
  facts: { it: string[]; en: string[] };
  repo?: string;
  tags: string[];
}

export const pastDeliveries: PastDelivery[] = [
  {
    title: { it: 'Testing E2E con Playwright', en: 'End-to-end testing with Playwright' },
    pillar: 'verificare',
    facts: {
      it: [
        'Team di 10 developer, prodotto già in produzione, nessun test end-to-end esistente.',
        'Costruita una suite Playwright con page object model e fixtures, integrata nella pipeline Jenkins.',
      ],
      en: [
        'A team of 10 developers, product already in production, no end-to-end tests in place.',
        'Built a Playwright suite with page object model and fixtures, wired into the Jenkins pipeline.',
      ],
    },
    repo: 'https://github.com/monte97/workshop-playwright',
    tags: ['Playwright', 'Docker', 'Jenkins', 'PostgreSQL', 'Vue.js'],
  },
  {
    title: { it: 'Performance testing con k6', en: 'Performance testing with k6' },
    pillar: 'verificare',
    facts: {
      it: [
        'Team di sviluppo che faceva i test di carico a mano prima delle release.',
        'Introdotti scenari k6 in pipeline Jenkins, con gating su soglie e risultati confrontabili in Grafana.',
      ],
      en: [
        'A development team running load tests by hand before each release.',
        'Introduced k6 scenarios in the Jenkins pipeline, gated on thresholds, with results comparable in Grafana.',
      ],
    },
    repo: 'https://github.com/monte97/workshop-k6',
    tags: ['k6', 'JavaScript', 'Grafana', 'Docker', 'Jenkins'],
  },
];
