/**
 * Metadata for blog series.
 * Each key matches the `series` field used in post frontmatter.
 */

export interface SeriesArticle {
  title: string;
  description: string;
  href: string;
  order: number;
  draft?: boolean;
}

export interface SeriesMeta {
  title: string;
  subtitle: string;
  description: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzato';
  pillar: 'progettare' | 'verificare' | 'automatizzare';
  /** Category slug — matches the directory name under content/posts/[pillar]/ */
  category: string;
  tags: string[];
  /** Ultima voce del breadcrumb sulla landing */
  breadcrumb: string;
  /** Slug for the service section CTA link */
  serviceHref: string;
  serviceCTA: string;
  serviceDescription: string;
  /** What the reader will learn — displayed as bullet list */
  learningGoals: string[];
  /** Il cappello della landing: perché la serie esiste */
  cappello: { h2: string; paragrafi: string[] };
  /** Le stesse cose in inglese. L'italiano resta la sorgente di verità. */
  en: {
    title: string;
    subtitle: string;
    description: string;
    breadcrumb: string;
    serviceCTA: string;
    serviceDescription: string;
    learningGoals: string[];
    cappello: { h2: string; paragrafi: string[] };
  };
}

export const seriesMetadata: Record<string, SeriesMeta> = {
  observability: {
    title: 'Observability nei Sistemi Distribuiti',
    subtitle: 'Da console.log a distributed tracing con OpenTelemetry e LGTM stack',
    description:
      'Una guida pratica per implementare observability in un sistema distribuito. ' +
      'Si parte dalla distinzione tra monitoring e observability, si costruisce lo stack LGTM completo, ' +
      'si arriva a gestire tail sampling, routing compliance e PII filtering in produzione. ' +
      'Ogni articolo è accompagnato da codice funzionante su GitHub e scenari di debug reali.',
    level: 'Intermedio',
    pillar: 'verificare',
    category: 'observability',
    breadcrumb: 'Observability',
    tags: ['OpenTelemetry', 'Grafana', 'Loki', 'Tempo', 'Node.js', 'LGTM'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'Vuoi implementare l\'observability nel tuo team?',
    serviceDescription:
      'Posso affiancarti nella progettazione e implementazione di uno stack di observability ' +
      'su misura per il tuo sistema: dal setup iniziale alla gestione in produzione, ' +
      'con focus su costi, compliance e time-to-debug.',
    learningGoals: [
      'Configurare OpenTelemetry su Node.js senza modificare il codice applicativo',
      'Costruire lo stack LGTM (Loki, Grafana, Tempo, Mimir) con Docker Compose',
      'Debuggare scenari distribuiti reali con distributed tracing e correlazione log',
      'Ridurre il volume dati del 90% con tail sampling senza perdere visibilità sugli errori',
      'Separare dati di audit da dati tecnici per compliance GDPR/SOC 2',
    ],
    cappello: {
      h2: 'Monitoraggio e observability non sono la stessa cosa',
      paragrafi: [
        'Il monitoraggio risponde a domande che hai previsto: la CPU è sopra soglia, il disco si sta riempiendo, il servizio non risponde. Funziona finché i guasti somigliano a quelli che avevi immaginato quando hai scritto gli alert.',
        'In un sistema distribuito i guasti smettono di somigliare a quello che avevi previsto. La domanda diventa <em>perché questa richiesta, di questo cliente, ha impiegato dodici secondi</em> — e non è una domanda che si può mettere in una dashboard in anticipo. L\'observability è la proprietà di un sistema che permette di rispondere a domande che nessuno aveva preparato.',
        'I segnali sono tre, e da soli valgono poco. Le <strong>metriche</strong> dicono che qualcosa è cambiato, i <strong>log</strong> dicono cosa è successo in un punto, le <strong>tracce</strong> dicono dove il tempo se n\'è andato lungo il percorso. Il valore sta nel passare dall\'uno all\'altro senza perdere il filo: dall\'alert alla traccia, dalla traccia al log della riga che ha fallito.',
        'Questa serie parte da quel filo e lo segue fino in produzione, dove i problemi smettono di essere concettuali e diventano volume di dati, costi di storage e vincoli di conformita\'.',
      ],
    },
    en: {
      title: 'Observability in distributed systems',
      subtitle: 'From console.log to distributed tracing with OpenTelemetry and the LGTM stack',
      description: 'A practical guide to implementing observability in a distributed system. It starts from the distinction between monitoring and observability, builds the full LGTM stack, and gets to handling tail sampling, compliance routing and PII filtering in production. Every article comes with working code on GitHub and real debugging scenarios.',
      breadcrumb: 'Observability',
      serviceCTA: 'Do you want to bring observability into your team?',
      serviceDescription: 'I can work with you on designing and implementing an observability stack tailored to your system: from the initial setup to running it in production, focused on cost, compliance and time-to-debug.',
      learningGoals: [
        'Configure OpenTelemetry on Node.js without changing application code',
        'Build the LGTM stack (Loki, Grafana, Tempo, Mimir) with Docker Compose',
        'Debug real distributed scenarios with distributed tracing and log correlation',
        'Cut data volume by 90% with tail sampling without losing visibility on errors',
        'Separate audit data from technical data for GDPR/SOC 2 compliance',
      ],
      cappello: {
        h2: 'Monitoring and observability are not the same thing',
        paragrafi: [
          'Monitoring answers questions you anticipated: CPU is above threshold, the disk is filling up, the service is not responding. It works as long as failures look like the ones you imagined when you wrote the alerts.',
          'In a distributed system, failures stop looking like what you anticipated. The question becomes <em>why did this request, from this customer, take twelve seconds</em>. That is not a question you can put in a dashboard in advance. Observability is the property of a system that lets you answer questions nobody prepared for.',
          'There are three signals, and on their own they are worth little. <strong>Metrics</strong> tell you something changed, <strong>logs</strong> tell you what happened at one point, <strong>traces</strong> tell you where the time went along the path. The value is in moving from one to the next without losing the thread: from the alert to the trace, from the trace to the log line that failed.',
          'This series starts from that thread and follows it into production, where the problems stop being conceptual and become data volume, storage cost and compliance constraints.',
        ],
      },
    },
  },
  'mutation-testing-ai': {
    title: 'Mutation testing e AI',
    subtitle: 'Perché i test verdi non bastano, e come gli agenti possono chiudere il loop',
    description:
      'Due articoli, nati da un talk, su cosa significa davvero avere test affidabili. ' +
      'Si parte dalla differenza tra coverage e mutation score, con un bug reale rimasto in produzione per tre settimane, ' +
      'e si arriva a chiudere il loop: agenti che leggono il report dei mutanti per migliorarsi, ' +
      'con i primi numeri di produzione (Meta ACH e Just-in-Time testing).',
    level: 'Intermedio',
    pillar: 'verificare',
    category: 'testing',
    breadcrumb: 'Mutation testing',
    tags: ['Mutation Testing', 'Testing', 'Stryker', 'AI', 'LLM', 'CI/CD'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'Vuoi test che verificano davvero, non solo che passano?',
    serviceDescription:
      'Posso affiancarti a rendere la tua suite capace di trovare i bug, non solo di eseguirli: ' +
      'mutation testing, strategia di test e integrazione in CI, sul tuo codice reale.',
    learningGoals: [
      'Distinguere coverage (il codice viene eseguito) da mutation score (i test verificano davvero)',
      'Riconoscere i buchi tipici di una suite: dato non discriminante, assertion incompleta, boundary non coperto',
      'Usare il report dei mutanti survived come prompt di ritorno per un agente',
      'Capire dove il mutation testing sta entrando in produzione (Meta ACH, Just-in-Time testing)',
    ],
    cappello: {
      h2: 'Test verdi e codice sano non sono la stessa cosa',
      paragrafi: [
        'Diamo per scontata un\'equazione: i test passano, quindi il codice funziona. Quasi sempre regge. Quando non regge, il conto arriva su codice coperto, testato e verde, e nessun test se n\'era accorto.',
        'La coverage risponde a una domanda sola: <em>questo codice viene eseguito?</em> Non risponde a quella che conta: <em>se questo codice fosse sbagliato, i test se ne accorgerebbero?</em> Il mutation testing risponde alla seconda, rompendo il codice apposta e contando quante rotture i test rilevano.',
        'La serie parte da un bug rimasto tre settimane in produzione con il 93% di coverage, e arriva alla domanda che gli agenti AI rendono urgente: se i test li scrive una macchina, chi controlla che funzionino? La risposta è che serve un arbitro esterno e formale, e che quel ruolo il mutation score lo sa fare.',
      ],
    },
    en: {
      title: 'Mutation testing and AI',
      subtitle: 'Why green tests are not enough, and how agents can close the loop',
      description: 'Two articles, born out of a talk, on what having reliable tests really means. It starts from the difference between coverage and mutation score, with a real bug that stayed in production for three weeks, and gets to closing the loop: agents that read the mutant report to improve themselves, with the first production numbers (Meta ACH and Just-in-Time testing).',
      breadcrumb: 'Mutation testing',
      serviceCTA: 'Do you want tests that actually verify, not just pass?',
      serviceDescription: 'I can work with you to make your suite capable of finding bugs, not just running them: mutation testing, test strategy and CI integration, on your real code.',
      learningGoals: [
        'Tell coverage (the code gets executed) apart from mutation score (the tests actually verify)',
        'Recognize the typical holes in a suite: non-discriminating data, incomplete assertion, uncovered boundary',
        'Use the report of survived mutants as a feedback prompt for an agent',
        'See where mutation testing is entering production (Meta ACH, Just-in-Time testing)',
      ],
      cappello: {
        h2: 'Green tests and healthy code are not the same thing',
        paragrafi: [
          'We take an equation for granted: the tests pass, so the code works. Almost always it holds. When it does not, the bill arrives on code that is covered, tested and green, and no test had noticed.',
          'Coverage answers one question only: <em>does this code get executed?</em> It does not answer the one that matters: <em>if this code were wrong, would the tests notice?</em> Mutation testing answers the second, by breaking the code on purpose and counting how many breakages the tests catch.',
          'The series starts from a bug that stayed three weeks in production with 93% coverage, and gets to the question AI agents make urgent: if a machine writes the tests, who checks that they work? The answer is that you need an external, formal referee, and the mutation score can play that role.',
        ],
      },
    },
  },
  playwright: {
    title: 'Test end-to-end con Playwright',
    subtitle: 'Dalla flakiness al Page Object Model, nove articoli su una suite di cui fidarsi',
    description:
      'Le suite E2E non vengono abbandonate perché sono lente: vengono abbandonate quando il team ' +
      'smette di credere ai loro fallimenti. La serie parte dal motivo tecnico per cui i test flaky ' +
      'esistono: il protocollo con cui il test parla al browser. E arriva a una suite che gira in CI, ' +
      'mocka la rete, si correla alle trace del backend e resta leggibile quando cresce.',
    level: 'Intermedio',
    pillar: 'verificare',
    category: 'testing',
    breadcrumb: 'Playwright',
    tags: ['Playwright', 'E2E', 'Testing', 'CI/CD', 'OpenTelemetry', 'Visual Regression'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'La vostra suite E2E vi sta ancora dicendo qualcosa?',
    serviceDescription:
      'Posso affiancarvi a riportare i test end-to-end a essere un filtro invece che rumore: ' +
      'diagnosi della flakiness, strategia di parallelizzazione in CI, e una suite che regge la crescita.',
    learningGoals: [
      'Capire perché l\'auto-waiting elimina i timing bug e cosa non elimina',
      'Correlare un test fallito con la trace del backend che lo ha fatto fallire',
      'Parallelizzare in CI con lo sharding, e sapere quando il collo di bottiglia si sposta altrove',
      'Mockare la rete: da un singolo endpoint al replay di sessioni HAR',
      'Diagnosticare un test flaky invece di aggiungere un retry',
      'Organizzare la suite con il Page Object Model prima che diventi ingestibile',
    ],
    cappello: {
      h2: 'Le suite E2E non muoiono di lentezza, muoiono di sfiducia',
      paragrafi: [
        'Test che passano al terzo tentativo. <code>sleep(5000)</code> sparsi nel codice. Suite che girano venti minuti e falliscono in modo non deterministico, sempre su un test diverso. La spiegazione che si sente di solito è che i test end-to-end sono fragili per natura, e che ci si convive.',
        'Non è vero. Quella fragilita\' non è una proprietà del testing end-to-end: è una conseguenza di <strong>come il test parla al browser</strong>. Cambiato quel canale, la maggior parte dei sintomi sparisce senza toccare una riga di logica di test.',
        'Il momento in cui una suite viene abbandonata non è quando diventa lenta: è quando il team smette di credere ai suoi fallimenti. Da li\' in avanti continua a costare tempo di CI senza produrre informazione, e chi rilascia impara a premere <em>skip</em>.',
        'Questa serie segue il percorso completo: dal protocollo che genera la flakiness fino a una suite che gira in CI parallelizzata, mocka la rete, si correla alle trace del backend e resta leggibile quando i test diventano centinaia.',
      ],
    },
    en: {
      title: 'End-to-end testing with Playwright',
      subtitle: 'From flakiness to the Page Object Model, nine articles on a suite you can trust',
      description: 'E2E suites are not abandoned because they are slow: they are abandoned when the team stops believing their failures. The series starts from the technical reason flaky tests exist at all: the protocol the test uses to talk to the browser. And it ends with a suite that runs in CI, mocks the network, correlates to backend traces, and stays readable as it grows.',
      breadcrumb: 'Playwright',
      serviceCTA: 'Is your E2E suite still telling you anything?',
      serviceDescription: 'I can work with you to make end-to-end tests a filter again instead of noise: diagnosing flakiness, a parallelization strategy in CI, and a suite that holds up as it grows.',
      learningGoals: [
        'Understand why auto-waiting removes timing bugs, and what it does not remove',
        'Correlate a failed test with the backend trace that made it fail',
        'Parallelize in CI with sharding, and know when the bottleneck moves somewhere else',
        'Mock the network: from a single endpoint to replaying HAR sessions',
        'Diagnose a flaky test instead of adding a retry',
        'Organize the suite with the Page Object Model before it becomes unmanageable',
      ],
      cappello: {
        h2: 'E2E suites do not die of slowness, they die of distrust',
        paragrafi: [
          'Tests that pass on the third attempt. <code>sleep(5000)</code> scattered through the code. Suites that run for twenty minutes and fail non-deterministically, always on a different test. The usual explanation is that end-to-end tests are fragile by nature, and that you learn to live with it.',
          'That is not true. The fragility is not a property of end-to-end testing: it is a consequence of <strong>how the test talks to the browser</strong>. Change that channel and most of the symptoms disappear without touching a single line of test logic.',
          'The moment a suite gets abandoned is not when it becomes slow: it is when the team stops believing its failures. From there on it keeps burning CI time without producing information, and whoever ships learns to hit <em>skip</em>.',
          'This series follows the whole path: from the protocol that produces flakiness to a suite that runs parallelized in CI, mocks the network, correlates to backend traces, and stays readable when the tests number in the hundreds.',
        ],
      },
    },
  },
  keycloak: {
    title: 'Keycloak in produzione',
    subtitle: 'Dall\'Authorization Code Flow alla federazione, sei articoli su identità che regge',
    description:
      'Delegare l\'autenticazione a Keycloak è una decisione che si paga per anni: la serie percorre ' +
      'i punti dove si rompe davvero. Il flusso corretto e perché PKCE non è opzionale, ' +
      'l\'autenticazione machine-to-machine, i test end-to-end su un identity provider, ' +
      'la delega delle policy a OPA e infine la federazione con provider esterni.',
    level: 'Intermedio',
    pillar: 'progettare',
    category: 'keycloak',
    breadcrumb: 'Keycloak',
    tags: ['Keycloak', 'OAuth2', 'OIDC', 'PKCE', 'OPA', 'Federation'],
    serviceHref: '/servizi/#architecture',
    serviceCTA: 'State progettando o rimettendo in ordine l\'autenticazione?',
    serviceDescription:
      'Posso affiancarvi sulle scelte che dopo costano una migrazione: modello dei realm, ' +
      'flussi OAuth2 corretti, separazione fra autenticazione e autorizzazione, integrazione con ' +
      'quello che avete già.',
    learningGoals: [
      'Scegliere il flusso OAuth2 giusto, e capire perché PKCE non è un extra',
      'Autenticare servizi fra loro senza inventarsi token applicativi',
      'Testare end-to-end un\'applicazione che dipende da un identity provider',
      'Separare autenticazione da autorizzazione delegando le policy a OPA',
      'Federare provider esterni senza duplicare le identità',
    ],
    cappello: {
      h2: 'Delegare l\'autenticazione è una decisione che si paga per anni',
      paragrafi: [
        'Scrivere l\'autenticazione a mano è un errore che quasi nessuno fa più. Delegarla a un identity provider è la scelta giusta, ma non è la fine del problema: è l\'inizio di una serie di decisioni che si correggono male. Il modello dei realm, quale flusso OAuth2 usare, dove finiscono le policy di autorizzazione, come si testa un\'applicazione che dipende da un servizio esterno.',
        'Sono tutte scelte che si fanno all\'inizio e si pagano per anni, perché cambiarle dopo significa rientrare in ogni servizio che parla con l\'autenticazione.',
        'Questa serie percorre i punti dove Keycloak si rompe davvero in produzione, uno per articolo: il flusso corretto e perché PKCE non è un extra, l\'autenticazione fra servizi, i test end-to-end su un identity provider, la separazione fra autenticazione e autorizzazione delegando le policy a OPA, e infine la federazione con provider esterni.',
      ],
    },
    en: {
      title: 'Keycloak in production',
      subtitle: 'From the Authorization Code Flow to federation, six articles on identity that holds',
      description: 'Delegating authentication to Keycloak is a decision you pay for over years: the series walks through the points where it actually breaks. The correct flow and why PKCE is not optional, machine-to-machine authentication, end-to-end tests against an identity provider, delegating policy to OPA, and finally federation with external providers.',
      breadcrumb: 'Keycloak',
      serviceCTA: 'Are you designing authentication, or putting it back in order?',
      serviceDescription: 'I can work with you on the choices that later cost a migration: the realm model, correct OAuth2 flows, the separation between authentication and authorization, and integration with what you already have.',
      learningGoals: [
        'Pick the right OAuth2 flow, and understand why PKCE is not an extra',
        'Authenticate services to each other without inventing application tokens',
        'Test end-to-end an application that depends on an identity provider',
        'Separate authentication from authorization by delegating policy to OPA',
        'Federate external providers without duplicating identities',
      ],
      cappello: {
        h2: 'Delegating authentication is a decision you pay for over years',
        paragrafi: [
          'Writing authentication by hand is a mistake almost nobody makes any more. Delegating it to an identity provider is the right call, but it is not the end of the problem: it is the start of a series of decisions that are hard to correct. The realm model, which OAuth2 flow to use, where the authorization policies end up, how you test an application that depends on an external service.',
          'They are all choices made at the beginning and paid for over years, because changing them later means going back into every service that talks to authentication.',
          'This series walks through the points where Keycloak actually breaks in production, one per article: the correct flow and why PKCE is not an extra, service-to-service authentication, end-to-end tests against an identity provider, separating authentication from authorization by delegating policy to OPA, and finally federation with external providers.',
        ],
      },
    },
  },
  openfga: {
    title: 'Autorizzazione con OpenFGA',
    subtitle: 'Da Zanzibar alla multi-tenancy, cinque articoli su permessi che scalano',
    description:
      'Quando i permessi smettono di stare in una colonna `role` sulla tabella utenti, il modello ' +
      'a ruoli non regge più. La serie parte dai concetti di Google Zanzibar, li collega a Keycloak, ' +
      'e arriva ai problemi che si incontrano davvero: isolare più organizzazioni, risolvere ' +
      'gerarchie profonde, e il costo di ListObjects quando le risorse diventano molte.',
    level: 'Avanzato',
    pillar: 'verificare',
    category: 'openfga',
    breadcrumb: 'OpenFGA',
    tags: ['OpenFGA', 'Zanzibar', 'ReBAC', 'Keycloak', 'Multi-tenancy', 'Authorization'],
    serviceHref: '/servizi/#architecture',
    serviceCTA: 'I permessi del vostro prodotto stanno diventando ingestibili?',
    serviceDescription:
      'Posso affiancarvi a modellare l\'autorizzazione prima che diventi debito: scelta fra RBAC e ReBAC, ' +
      'modello delle relazioni, multi-tenancy e le performance delle query inverse.',
    learningGoals: [
      'Capire il modello Zanzibar: tuple di relazione al posto dei ruoli',
      'Collegare OpenFGA a Keycloak separando autenticazione e autorizzazione',
      'Isolare più organizzazioni nello stesso sistema senza duplicare il modello',
      'Risolvere gerarchie profonde senza scrivere codice applicativo',
      'Riconoscere quando ListObjects diventa il collo di bottiglia, e come aggirarlo',
    ],
    cappello: {
      h2: 'Il momento in cui i ruoli smettono di bastare',
      paragrafi: [
        'Finché i permessi stanno in una colonna <code>role</code> sulla tabella utenti, il modello a ruoli funziona e non c\'è motivo di cambiarlo. Smette di funzionare quando arriva la prima richiesta che non ci sta dentro: <em>questo documento è condiviso con quell\'utente, ma solo in lettura, e solo finché resta nel progetto di cui è membro</em>.',
        'A quel punto si aggiunge una tabella di eccezioni, poi un flag, poi un <code>if</code> nel controller. Il permesso smette di essere un dato e diventa codice sparso, e nessuno sa più rispondere alla domanda che conta: <strong>chi può vedere questa risorsa, e perché?</strong>',
        'Google ha affrontato lo stesso problema su scala e ne ha pubblicato il modello, Zanzibar: i permessi diventano tuple di relazione, non ruoli. OpenFGA è l\'implementazione open source di quel modello.',
        'La serie parte dai concetti, li collega a Keycloak per separare autenticazione e autorizzazione, e arriva ai problemi che si incontrano davvero: isolare più organizzazioni nello stesso sistema, risolvere gerarchie profonde, e il costo delle query inverse quando le risorse diventano molte.',
      ],
    },
    en: {
      title: 'Authorization with OpenFGA',
      subtitle: 'From Zanzibar to multi-tenancy, five articles on permissions that scale',
      description: 'When permissions stop fitting in a `role` column on the users table, the role model no longer holds. The series starts from the concepts behind Google Zanzibar, connects them to Keycloak, and gets to the problems you actually run into: isolating several organizations, resolving deep hierarchies, and the cost of ListObjects once the resources become many.',
      breadcrumb: 'OpenFGA',
      serviceCTA: 'Are your product permissions becoming unmanageable?',
      serviceDescription: 'I can work with you to model authorization before it turns into debt: choosing between RBAC and ReBAC, the relationship model, multi-tenancy, and the performance of reverse queries.',
      learningGoals: [
        'Understand the Zanzibar model: relationship tuples instead of roles',
        'Connect OpenFGA to Keycloak, separating authentication from authorization',
        'Isolate several organizations in the same system without duplicating the model',
        'Resolve deep hierarchies without writing application code',
        'Recognize when ListObjects becomes the bottleneck, and how to work around it',
      ],
      cappello: {
        h2: 'The moment roles stop being enough',
        paragrafi: [
          'As long as permissions fit in a <code>role</code> column on the users table, the role model works and there is no reason to change it. It stops working with the first request that does not fit inside it: <em>this document is shared with that user, but read-only, and only as long as it stays in the project they are a member of</em>.',
          'At that point you add an exceptions table, then a flag, then an <code>if</code> in the controller. The permission stops being data and becomes code scattered around, and nobody can answer the question that matters any more: <strong>who can see this resource, and why?</strong>',
          'Google faced the same problem at scale and published the model behind it, Zanzibar: permissions become relationship tuples, not roles. OpenFGA is the open source implementation of that model.',
          'The series starts from the concepts, connects them to Keycloak to separate authentication from authorization, and gets to the problems you actually run into: isolating several organizations in the same system, resolving deep hierarchies, and the cost of reverse queries once the resources become many.',
        ],
      },
    },
  },

  kafka: {
    title: 'Kafka in un sistema di telemetria',
    subtitle: "Dall'evento come fatto già successo alle tre strategie di crash recovery",
    description:
      'Passare agli eventi non rende il sistema più veloce: lo rende meno accoppiato. ' +
      'La serie parte da cosa Kafka garantisce davvero: l\'ordine vale per chiave, non in assoluto. ' +
      'Poi attraversa i problemi che arrivano dopo: due servizi che non sono d\'accordo sul formato, ' +
      'attori che bloccano un thread, e un consumer che riparte dopo un crash.',
    level: 'Intermedio',
    pillar: 'progettare',
    category: 'kafka',
    breadcrumb: 'Kafka',
    tags: ['Kafka', 'Avro', 'Schema Registry', 'Pekko', 'Scala', 'Event Streaming'],
    serviceHref: '/servizi/#architecture',
    serviceCTA: 'State portando un sistema verso gli eventi?',
    serviceDescription:
      'Posso affiancarvi sulle scelte che si pagano per anni: dove mettere il confine fra i servizi, ' +
      'come versionare il formato dei messaggi, e cosa deve succedere quando un consumer riparte.',
    learningGoals: [
      'Capire cosa Kafka garantisce sull\'ordine, e a quali condizioni smette di garantirlo',
      'Versionare il formato dei messaggi con Avro e uno Schema Registry, invece che a parole',
      'Migrare da Akka a Pekko sapendo dove si rompe davvero',
      'Togliere l\'I/O bloccante dagli attori senza perdere la backpressure',
      'Scegliere la strategia di recovery dalla natura dello stato, non per preferenza',
    ],
    cappello: {
      h2: 'Un evento non è una richiesta: è un fatto già successo',
      paragrafi: [
        'Una chiamata sincrona chiede a qualcuno di fare qualcosa e aspetta la risposta. Un evento dichiara che qualcosa <em>è successo</em>, e chi lo riceve decide da solo cosa farne. La differenza sembra filosofica finché non si guarda cosa cambia in produzione: un servizio lento smette di rallentare quelli che lo chiamano, e un servizio fermo smette di fermarli.',
        'Il prezzo pero\' c\'è, e questa serie lo paga per intero invece di nominarlo e passare oltre. L\'ordine dei messaggi vale solo per chiave. Lo stato del consumer diventa un problema vostro. Il debug attraversa un componente in più. E due servizi che non sono d\'accordo su cosa contiene un messaggio si rompono a runtime, non a compile-time.',
        'Il sistema da cui vengono questi articoli è una piattaforma di telemetria per mezzi d\'opera: sensori che pubblicano dati odometrici e posizione, tre consumer che leggono lo stesso topic con responsabilità diverse. Un caso abbastanza piccolo da stare in una demo e abbastanza vero da avere già rotto qualcosa.',
      ],
    },
    en: {
      title: 'Kafka in a telemetry system',
      subtitle: 'From the event as something already happened to three crash recovery strategies',
      description: 'Moving to events does not make the system faster: it makes it less coupled. The series starts from what Kafka actually guarantees: ordering holds per key, not in absolute terms. Then it goes through the problems that come afterwards: two services that disagree on the format, actors that block a thread, and a consumer restarting after a crash.',
      breadcrumb: 'Kafka',
      serviceCTA: 'Are you moving a system towards events?',
      serviceDescription: 'I can work with you on the choices you pay for over years: where to put the boundary between services, how to version the message format, and what has to happen when a consumer restarts.',
      learningGoals: [
        'Understand what Kafka guarantees about ordering, and under which conditions it stops guaranteeing it',
        'Version the message format with Avro and a Schema Registry, instead of by convention',
        'Migrate from Akka to Pekko knowing where it actually breaks',
        'Take blocking I/O out of the actors without losing backpressure',
        'Pick the recovery strategy from the nature of the state, not from preference',
      ],
      cappello: {
        h2: 'An event is not a request: it is a fact that already happened',
        paragrafi: [
          'A synchronous call asks somebody to do something and waits for the answer. An event declares that something <em>happened</em>, and whoever receives it decides on their own what to do with it. The difference sounds philosophical until you look at what changes in production: a slow service stops slowing down the ones calling it, and a service that is down stops taking them down with it.',
          'The price is there, though, and this series pays it in full instead of naming it and moving on. Message ordering holds only per key. Consumer state becomes your problem. Debugging crosses one more component. And two services that disagree on what a message contains break at runtime, not at compile time.',
          'The system these articles come from is a telemetry platform for construction machinery: sensors publishing odometric data and position, three consumers reading the same topic with different responsibilities. A case small enough to fit in a demo and real enough to have already broken something.',
        ],
      },
    },
  },
  'saturation-alerting': {
    title: 'Alertare prima che sia tardi',
    subtitle: 'Dalla saturation predittiva al burn-rate sugli SLO, fino a chi riceve la notifica',
    description:
      'Un alert che scatta quando il disco è già pieno ha risposto alla domanda sbagliata. ' +
      'La domanda è sempre la stessa, quando va detto che qualcosa non funziona, e la serie la percorre ' +
      'su tre livelli. Si chiude sul tratto che quasi nessuno cura: cosa succede fra la regola che scatta ' +
      'e la persona che deve agire.',
    level: 'Avanzato',
    pillar: 'verificare',
    category: 'observability',
    breadcrumb: 'Alerting',
    tags: ['Prometheus', 'Alertmanager', 'SRE', 'SLO', 'PromQL', 'Grafana'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'I vostri alert svegliano qualcuno che può fare qualcosa?',
    serviceDescription:
      'Posso affiancarvi a rimettere in ordine l\'alerting partendo dall\'alerts.yml che avete già: ' +
      'quali regole hanno un lead time reale, quali sono rumore, e cosa trova chi apre la notifica.',
    learningGoals: [
      'Distinguere saturation come stato corrente da saturation come trend, e sapere quale vi serve',
      'Riconoscere le quattro trappole della regressione lineare prima di metterla in pager',
      'Alertare sul ritmo di consumo dell\'error budget invece che su una soglia fissa',
      'Installare le tre coppie canoniche del SRE Workbook, e sapere da dove vengono i numeri',
      'Instradare per severity, sopprimere i duplicati e mettere un runbook nel payload',
    ],
    cappello: {
      h2: 'Un alert che scatta quando il disco è pieno ha risposto alla domanda sbagliata',
      paragrafi: [
        'La regola copiata dal primo tutorial segnala che il disco è pieno <em>adesso</em>. Quando scatta, l\'occupazione è al 90%, i log stanno già fallendo e qualche servizio restituisce <code>ENOSPC</code>. Non è un problema di soglia. La domanda giusta era un\'altra: <em>si riempira\' entro una finestra in cui posso ancora intervenire senza svegliare nessuno?</em>',
        'La serie percorre tre livelli della stessa domanda. Il primo guarda le risorse fisiche e il trend con cui si consumano. Il secondo sposta il soggetto dalla risorsa all\'impatto utente: non quando si satura il disco, ma a che ritmo si sta bruciando l\'error budget del servizio. Il terzo si occupa del tratto che quasi nessun repo cura, quello fra la regola che scatta e la persona che deve agire.',
        'Il filo comune è che alertare bene non è una proprietà di una singola query. È una proprietà del sistema intero: dalla metrica alla regola, dalla regola al routing, dal routing al payload, dal payload alla persona che alle tre di notte deve capire cosa fare.',
      ],
    },
    en: {
      title: 'Alerting before it is too late',
      subtitle: 'From predictive saturation to SLO burn rate, all the way to who receives the notification',
      description: 'An alert that fires when the disk is already full has answered the wrong question. The question is always the same, when should you say something is not working, and the series walks it on three levels. It closes on the stretch almost nobody looks after: what happens between the rule that fires and the person who has to act.',
      breadcrumb: 'Alerting',
      serviceCTA: 'Do your alerts wake up somebody who can do something?',
      serviceDescription: 'I can work with you to put alerting back in order starting from the alerts.yml you already have: which rules give a real lead time, which ones are noise, and what the person opening the notification finds.',
      learningGoals: [
        'Tell saturation as a current state apart from saturation as a trend, and know which one you need',
        'Recognize the four traps of linear regression before putting it in a pager',
        'Alert on the rate the error budget is being consumed instead of on a fixed threshold',
        'Install the three canonical pairs from the SRE Workbook, and know where the numbers come from',
        'Route by severity, suppress duplicates and put a runbook in the payload',
      ],
      cappello: {
        h2: 'An alert that fires when the disk is full has answered the wrong question',
        paragrafi: [
          'The rule copied from the first tutorial reports that the disk is full <em>now</em>. By the time it fires, usage is at 90%, the logs are already failing and some service is returning <code>ENOSPC</code>. It is not a threshold problem. The right question was a different one: <em>will it fill up within a window where I can still act without waking anyone?</em>',
          'The series walks three levels of the same question. The first looks at physical resources and the trend they are consumed at. The second moves the subject from the resource to user impact: not when the disk saturates, but at what rate the error budget of the service is burning. The third deals with the stretch almost no repo looks after, the one between the rule that fires and the person who has to act.',
          'The common thread is that alerting well is not a property of a single query. It is a property of the whole system: from the metric to the rule, from the rule to the routing, from the routing to the payload, from the payload to the person who at three in the morning has to figure out what to do.',
        ],
      },
    },
  },
  'homelab-capi': {
    title: 'Cluster API su Proxmox',
    subtitle: 'Il cluster Kubernetes come risorsa Kubernetes, da Talos a Ubuntu',
    description:
      'Lo script che aggiunge un nodo funziona finché non fallisce a metà, e lascia una macchina ' +
      'che nessun inventario conosce. La serie sostituisce quello script con un modello dichiarativo: ' +
      'si dichiara il cluster che si vuole e un controller ci arriva. Il costo è dichiarato: ' +
      'il management cluster diventa una dipendenza critica.',
    level: 'Avanzato',
    pillar: 'automatizzare',
    category: 'kubernetes',
    breadcrumb: 'Cluster API',
    tags: ['Kubernetes', 'Cluster API', 'Proxmox', 'Talos', 'IaC', 'Homelab'],
    serviceHref: '/servizi/#pipeline-automation',
    serviceCTA: 'Quante persone sanno ricreare i vostri cluster?',
    serviceDescription:
      'Posso affiancarvi a portare la creazione e l\'aggiornamento dei cluster fuori dalla testa di ' +
      'chi li ha fatti: modello dichiarativo, provisioning ripetibile e una procedura che regge un guasto.',
    learningGoals: [
      'Capire quando CAPI conviene davvero, e sotto quale scala è più macchinario che guadagno',
      'Leggere le quattro CRD e le cinque fasi per sapere dove guardare quando si blocca',
      'Usare un sistema operativo immutabile per togliere di mezzo il configuration drift',
      'Portare in piedi un cluster dal manifest al kubeconfig',
      'Costruire un\'immagine Ubuntu quando Talos non è la scelta possibile',
    ],
    cappello: {
      h2: 'Lo script che aggiunge un nodo funziona finché non fallisce a metà',
      paragrafi: [
        'La VM è stata creata, <code>kubeadm</code> è installato, il <code>join</code> non è mai partito perché il token era scaduto. Ora c\'è una macchina che non è un nodo, che nessun inventario conosce, e che scoprirete fra tre mesi guardando le risorse dell\'hypervisor.',
        'Quello è il costo dell\'approccio imperativo, e non è la fatica di scrivere lo script. È che uno script descrive <em>come si fa</em>, e quando si interrompe lascia dietro stato che nessuno ha dichiarato e nessuno sa ricostruire. Cluster API gira la direzione: si dichiara il cluster che si vuole, e un controller si occupa di arrivarci e di restarci.',
        'La serie va dal modello ai componenti fino a un cluster in piedi, e dichiara anche il conto: il management cluster diventa una dipendenza critica, e sotto una certa scala imparare e mantenere CAPI costa più di quello che fa risparmiare. Meglio saperlo prima di metterne su uno.',
      ],
    },
    en: {
      title: 'Cluster API on Proxmox',
      subtitle: 'The Kubernetes cluster as a Kubernetes resource, from Talos to Ubuntu',
      description: 'The script that adds a node works until it fails halfway, and leaves behind a machine no inventory knows about. The series replaces that script with a declarative model: you declare the cluster you want and a controller gets there. The cost is stated up front: the management cluster becomes a critical dependency.',
      breadcrumb: 'Cluster API',
      serviceCTA: 'How many people can rebuild your clusters?',
      serviceDescription: 'I can help you move cluster creation and upgrades out of the heads of the people who built them: a declarative model, repeatable provisioning, and a procedure that survives a failure.',
      learningGoals: [
        'Work out when CAPI actually pays off, and below which scale it is more machinery than gain',
        'Read the four CRDs and the five phases, so you know where to look when it stalls',
        'Use an immutable operating system to take configuration drift off the table',
        'Bring a cluster up from the manifest to the kubeconfig',
        'Build an Ubuntu image for when Talos is not an option',
      ],
      cappello: {
        h2: 'The script that adds a node works until it fails halfway',
        paragrafi: [
          'The VM was created, <code>kubeadm</code> is installed, the <code>join</code> never ran because the token had expired. Now there is a machine that is not a node, that no inventory knows about, and that you will discover three months from now looking at the hypervisor\'s resources.',
          'That is the cost of the imperative approach, and it is not the effort of writing the script. It is that a script describes <em>how to do it</em>, and when it stops halfway it leaves behind state nobody declared and nobody knows how to rebuild. Cluster API flips the direction: you declare the cluster you want, and a controller takes care of getting there and of staying there.',
          'The series goes from the model to the components and on to a running cluster, and it states the bill too: the management cluster becomes a critical dependency, and below a certain scale learning and maintaining CAPI costs more than it saves. Better to know that before you stand one up.',
        ],
      },
    },
  },
  linq: {
    title: 'LINQ, dal profiler al compilatore',
    subtitle: 'Quattro errori trovati in produzione, i benchmark, e cosa genera davvero il compilatore',
    description:
      'LINQ è dichiarativo, ma l\'esecuzione è imperativa: la stessa sintassi nasconde costi ' +
      'radicalmente diversi a seconda della struttura dati sotto. La serie parte da un audit reale ' +
      'su un dispatcher di flotta con un budget di latenza sotto i 100ms, mette i numeri con ' +
      'BenchmarkDotNet, e scende fino alla state machine che il compilatore genera.',
    level: 'Intermedio',
    pillar: 'progettare',
    category: 'system-design',
    breadcrumb: 'LINQ',
    tags: ['.NET', 'LINQ', 'Performance', 'BenchmarkDotNet', 'OpenTelemetry'],
    serviceHref: '/servizi/#architecture',
    serviceCTA: 'Avete un percorso critico che è diventato lento senza motivo?',
    serviceDescription:
      'Posso affiancarvi a misurare prima di ottimizzare: dove va il tempo davvero, quali pattern ' +
      'costano un ordine di grandezza, e cosa vale la pena riscrivere e cosa no.',
    learningGoals: [
      'Riconoscere i quattro pattern che trasformano operazioni lineari in quadratiche',
      'Misurare con BenchmarkDotNet invece di indovinare dove sta il costo',
      'Capire cosa genera il compilatore dietro una Where(), e perché cambia il conto',
      'Rendere visibile l\'esecuzione con tracing, invece di leggerla nel codice',
    ],
    cappello: {
      h2: 'Lo stesso codice, due ordini di grandezza di differenza',
      paragrafi: [
        '<code>.Contains()</code> su una <code>List</code> è O(n). <code>.Contains()</code> su un <code>HashSet</code> è O(1). Il codice che scrivete è identico. Il profiler racconta due storie diverse.',
        'È il filo di tutta la serie: LINQ è dichiarativo, ma l\'esecuzione è imperativa, e la stessa sintassi nasconde costi radicalmente diversi a seconda della struttura dati sotto. Il punto di partenza è un audit vero, su un dispatcher per una flotta di veicoli commerciali che tiene tutto in memoria per stare sotto i 100ms di latenza: quattro pattern trovati in produzione, e il più costoso faceva 1.400.000 confronti dove ne bastavano 2000.',
        'Da li\' la serie scende: i numeri misurati con BenchmarkDotNet invece che stimati, la state machine che il compilatore genera dietro una <code>Where()</code>, e infine come rendere visibile l\'esecuzione con il tracing invece di doverla leggere nel codice.',
      ],
    },
    en: {
      title: 'LINQ, from the profiler to the compiler',
      subtitle: 'Four mistakes found in production, the benchmarks, and what the compiler really generates',
      description: 'LINQ is declarative, but execution is imperative: the same syntax hides radically different costs depending on the data structure underneath. The series starts from a real audit on a fleet dispatcher with a latency budget under 100ms, puts numbers on it with BenchmarkDotNet, and goes down to the state machine the compiler generates.',
      breadcrumb: 'LINQ',
      serviceCTA: 'Do you have a critical path that turned slow for no visible reason?',
      serviceDescription: 'I can help you measure before optimizing: where the time actually goes, which patterns cost an order of magnitude, and what is worth rewriting and what is not.',
      learningGoals: [
        'Recognize the four patterns that turn linear operations into quadratic ones',
        'Measure with BenchmarkDotNet instead of guessing where the cost sits',
        'Understand what the compiler generates behind a Where(), and why it changes the bill',
        'Make execution visible with tracing, instead of reading it off the code',
      ],
      cappello: {
        h2: 'The same code, two orders of magnitude apart',
        paragrafi: [
          '<code>.Contains()</code> on a <code>List</code> is O(n). <code>.Contains()</code> on a <code>HashSet</code> is O(1). The code you write is identical. The profiler tells two different stories.',
          'That is the thread running through the whole series: LINQ is declarative, but execution is imperative, and the same syntax hides radically different costs depending on the data structure underneath. The starting point is a real audit, on a dispatcher for a commercial vehicle fleet that keeps everything in memory to stay under 100ms of latency: four patterns found in production, and the most expensive one was doing 1,400,000 comparisons where 2000 would have been enough.',
          'From there the series goes down: the numbers measured with BenchmarkDotNet instead of estimated, the state machine the compiler generates behind a <code>Where()</code>, and finally how to make execution visible with tracing instead of having to read it off the code.',
        ],
      },
    },
  },
  'web-development': {
    title: 'Vue 3 in una SPA che cresce',
    subtitle: 'Da EventBus a Pinia, integrazioni pesanti e i pattern contro la duplicazione',
    description:
      'I problemi di una SPA arrivano quando smette di essere piccola: lo stato passa di mano senza ' +
      'che si capisca dove, una libreria pesante non va d\'accordo con il sistema reattivo, e lo stesso ' +
      'pezzo di logica compare in cinque componenti. La serie affronta i tre casi con pattern concreti.',
    level: 'Intermedio',
    pillar: 'progettare',
    category: 'web-development',
    breadcrumb: 'Vue 3',
    tags: ['Vue 3', 'Pinia', 'TypeScript', 'OpenLayers', 'Composables'],
    serviceHref: '/servizi/#architecture',
    serviceCTA: 'Il vostro frontend è diventato difficile da cambiare?',
    serviceDescription:
      'Posso affiancarvi a rimettere ordine dove la crescita ha lasciato debito: gestione dello stato, ' +
      'confini fra componenti e librerie di terze parti, e duplicazione da estrarre.',
    learningGoals: [
      'Sostituire un EventBus con Pinia in modo progressivo, senza riscrivere tutto',
      'Integrare una libreria pesante tenendola fuori dal sistema reattivo',
      'Estrarre la duplicazione con composable, wrapper e utility, e sapere quando non farlo',
    ],
    cappello: {
      h2: 'I problemi di una SPA arrivano quando smette di essere piccola',
      paragrafi: [
        'Finché i componenti sono pochi, un EventBus funziona e nessuno si lamenta. Il problema arriva dopo: lo stato passa di mano senza che si capisca dove, e per rispondere a <em>chi ha cambiato questo valore</em> bisogna leggere tutto il progetto.',
        'Questa serie affronta tre casi che si presentano in quell\'ordine. Sostituire l\'EventBus con uno store senza riscrivere l\'applicazione in un colpo solo. Integrare una libreria pesante, nel caso concreto una mappa, tenendola fuori dal sistema reattivo invece di lasciare che il framework la gestisca. Ed estrarre la duplicazione quando lo stesso pezzo di logica è finito in cinque componenti.',
        'L\'ultimo articolo porta anche un anti-pattern, perché l\'astrazione sbagliata costa più della duplicazione che voleva togliere.',
      ],
    },
    en: {
      title: 'Vue 3 in a SPA that grows',
      subtitle: 'From EventBus to Pinia, heavy integrations, and the patterns against duplication',
      description: 'A SPA\'s problems arrive when it stops being small: state changes hands without anyone seeing where, a heavy library does not get along with the reactivity system, and the same piece of logic shows up in five components. The series takes on the three cases with concrete patterns.',
      breadcrumb: 'Vue 3',
      serviceCTA: 'Has your frontend become hard to change?',
      serviceDescription: 'I can help you put back in order what growth left as debt: state management, the boundaries between components and third-party libraries, and duplication to extract.',
      learningGoals: [
        'Replace an EventBus with Pinia progressively, without rewriting everything',
        'Integrate a heavy library while keeping it out of the reactivity system',
        'Extract duplication with composables, wrappers and utilities, and know when not to',
      ],
      cappello: {
        h2: 'A SPA\'s problems arrive when it stops being small',
        paragrafi: [
          'As long as the components are few, an EventBus works and nobody complains. The trouble comes later: state changes hands without anyone seeing where, and answering <em>who changed this value</em> means reading the whole project.',
          'This series takes on three cases that show up in that order. Replacing the EventBus with a store without rewriting the application in one go. Integrating a heavy library, in this case a map, keeping it out of the reactivity system instead of letting the framework manage it. And extracting duplication once the same piece of logic has ended up in five components.',
          'The last article brings an anti-pattern too, because the wrong abstraction costs more than the duplication it meant to remove.',
        ],
      },
    },
  },
  'unit-testing': {
    title: 'Unit test che verificano davvero',
    subtitle: 'Logica pura senza montare componenti, e il codice che rende i mock inutili',
    description:
      'Una suite può avere ottantotto test e un mutation score del 19%: il problema quasi mai è nel ' +
      'mocking, è nel codice che ti costringe a mockare. La serie parte da cosa si può testare senza ' +
      'montare niente, mostra dove i mock diventano una toppa, e arriva al refactoring che li rende ' +
      'superflui.',
    level: 'Intermedio',
    pillar: 'verificare',
    category: 'testing',
    breadcrumb: 'Unit test',
    tags: ['Testing', 'Nuxt 3', 'Flask', 'Python', 'Vitest', 'Mutation Testing'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'La vostra suite trova i bug, o li esegue soltanto?',
    serviceDescription:
      'Posso affiancarvi a capire cosa i test verificano davvero e cosa no, e a rendere testabile ' +
      'il codice che oggi vi obbliga a mockare mezzo sistema.',
    learningGoals: [
      'Testare la logica pura senza montare un solo componente',
      'Riconoscere quando un mock sta nascondendo un problema di progettazione',
      'Rendere testabile un servizio con application factory e dependency injection',
    ],
    cappello: {
      h2: 'Ottantotto test, e un mutation score del 19%',
      paragrafi: [
        'La reazione istintiva davanti a una suite che non trova niente è dare la colpa ai mock: mockiamo troppo, mockiamo male, i test verificano i mock invece del codice. Quasi sempre è la diagnosi sbagliata.',
        'Il problema di solito non è nel mocking: è nel codice che vi <em>costringe</em> a mockare. Una connessione a Kafka aperta a livello di modulo, un client MongoDB creato all\'import, un singleton che si inizializza da solo: ognuna di quelle righe rende impossibile istanziare la logica senza tirarsi dietro mezzo sistema, e i mock diventano la toppa.',
        'La serie parte dall\'altro capo: quanto si può verificare senza montare niente. Settantadue test su store, composable e helper, e nessun componente montato. Poi mostra dove i mock stanno nascondendo un problema di progettazione. E finisce con il refactoring che li rende superflui: application factory, dipendenze iniettate, e nessun <code>sys.modules</code> da manomettere.',
      ],
    },
    en: {
      title: 'Unit tests that actually verify',
      subtitle: 'Pure logic without mounting components, and the code that makes mocks pointless',
      description: 'A suite can have eighty-eight tests and a mutation score of 19%: the problem is almost never in the mocking, it is in the code that forces you to mock. The series starts from what you can test without mounting anything, shows where mocks turn into a patch, and gets to the refactoring that makes them unnecessary.',
      breadcrumb: 'Unit tests',
      serviceCTA: 'Does your suite find the bugs, or just run them?',
      serviceDescription: 'I can help you work out what your tests actually verify and what they do not, and make testable the code that today forces you to mock half the system.',
      learningGoals: [
        'Test pure logic without mounting a single component',
        'Recognize when a mock is hiding a design problem',
        'Make a service testable with an application factory and dependency injection',
      ],
      cappello: {
        h2: 'Eighty-eight tests, and a mutation score of 19%',
        paragrafi: [
          'The instinctive reaction in front of a suite that finds nothing is to blame the mocks: we mock too much, we mock badly, the tests verify the mocks instead of the code. Almost always that is the wrong diagnosis.',
          'The problem is usually not in the mocking: it is in the code that <em>forces</em> you to mock. A Kafka connection opened at module level, a MongoDB client created on import, a singleton that initialises itself: every one of those lines makes it impossible to instantiate the logic without dragging half the system along, and the mocks become the patch.',
          'The series starts from the other end: how much can be verified without mounting anything. Seventy-two tests on stores, composables and helpers, and not one component mounted. Then it shows where mocks are hiding a design problem. And it ends with the refactoring that makes them unnecessary: application factory, injected dependencies, and no <code>sys.modules</code> to tamper with.',
        ],
      },
    },
  },
  'performance-engineering': {
    title: 'Misurare le prestazioni con onestà',
    subtitle: 'Perché mille richieste al secondo non vogliono dire niente, e cosa guardare invece',
    description:
      'Un test di carico che passa non dice che il sistema regge: senza una baseline e senza il ' +
      'contesto di produzione, quel numero non è confrontabile con niente. La serie mette in fila ' +
      'cosa serve perché una misura significhi qualcosa, e quali metodi rispondono a quale domanda.',
    level: 'Intermedio',
    pillar: 'verificare',
    category: 'testing',
    breadcrumb: 'Performance',
    tags: ['Performance', 'k6', 'Load Testing', 'RED', 'USE', 'Percentili'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'Sapete cosa regge il vostro sistema, o solo che finora ha retto?',
    serviceDescription:
      'Posso affiancarvi a costruire una misura di cui fidarsi: baseline, scenari realistici, ' +
      'percentili invece di medie, e un criterio per dire se il risultato è accettabile.',
    learningGoals: [
      'Capire perché un numero di throughput senza baseline non è un risultato',
      'Leggere i percentili invece delle medie, e vedere la minoranza che sta male',
      'Sapere quando serve RED e quando serve USE, e perché non sono alternativi',
    ],
    cappello: {
      h2: 'Mille richieste al secondo non vogliono dire niente',
      paragrafi: [
        'È un numero senza denominatore. Mille richieste al secondo di cosa, con quanti dati, con quale distribuzione di endpoint, contro quale stato del database, e confrontate con che cosa? Senza una baseline, un test di carico che passa non dice che il sistema regge: dice che quel giorno, con quello scenario, non si è rotto.',
        'La serie mette in fila cosa serve perché una misura significhi qualcosa. Prima il contesto: la baseline, lo scenario realistico, e il criterio deciso <em>prima</em> per dire se il risultato è accettabile. Poi gli strumenti di lettura, che sono la seconda metà del problema.',
        'Perché la media nasconde per costruzione la minoranza che sta male, ed è esattamente quella minoranza che chiama l\'assistenza. RED dice quando è rotto, USE dice perché: non sono alternativi, rispondono a due domande diverse e servono tutti e due.',
      ],
    },
    en: {
      title: 'Measuring performance honestly',
      subtitle: 'Why a thousand requests per second means nothing, and what to look at instead',
      description: 'A load test that passes does not say the system holds: without a baseline and without the context of production, that number is not comparable to anything. The series lines up what it takes for a measurement to mean something, and which methods answer which question.',
      breadcrumb: 'Performance',
      serviceCTA: 'Do you know what your system holds, or only that it has held so far?',
      serviceDescription: 'I can help you build a measurement you can trust: a baseline, realistic scenarios, percentiles instead of averages, and a criterion for saying whether the result is acceptable.',
      learningGoals: [
        'Understand why a throughput number without a baseline is not a result',
        'Read percentiles instead of averages, and see the minority having a bad time',
        'Know when you need RED and when you need USE, and why they are not alternatives',
      ],
      cappello: {
        h2: 'A thousand requests per second means nothing',
        paragrafi: [
          'It is a number without a denominator. A thousand requests per second of what, with how much data, with which distribution of endpoints, against which state of the database, and compared with what? Without a baseline, a load test that passes does not say the system holds: it says that on that day, with that scenario, it did not break.',
          'The series lines up what it takes for a measurement to mean something. First the context: the baseline, the realistic scenario, and the criterion decided <em>beforehand</em> for saying whether the result is acceptable. Then the reading instruments, which are the second half of the problem.',
          'Because the average hides by construction the minority having a bad time, and it is exactly that minority which calls support. RED tells you when it is broken, USE tells you why: they are not alternatives, they answer two different questions and you need both.',
        ],
      },
    },
  },
  'kubernetes-fondamenti': {
    title: 'Come funziona Kubernetes sotto',
    subtitle: 'Dall\'Ingress che sostituisce il port-forward al reconciliation loop dei controller',
    description:
      'Due pezzi sui meccanismi che stanno sotto l\'uso quotidiano di Kubernetes: come si smette di ' +
      'raggiungere i servizi con un port-forward, e cosa succede davvero fra un kubectl apply e lo ' +
      'stato che cambia. Servono a chi usa il cluster e vuole smettere di considerarlo una scatola nera.',
    level: 'Intermedio',
    pillar: 'automatizzare',
    category: 'kubernetes',
    breadcrumb: 'Kubernetes',
    tags: ['Kubernetes', 'Ingress', 'NGINX', 'Controller', 'CRD'],
    serviceHref: '/servizi/#pipeline-automation',
    serviceCTA: 'Il cluster è una scatola nera per il vostro team?',
    serviceDescription:
      'Posso affiancarvi a portare il team dal "funziona e non sappiamo come" a un modello mentale ' +
      'che regge quando qualcosa si blocca: cosa fa il cluster, dove guardare, e cosa non toccare.',
    learningGoals: [
      'Esporre i servizi con un Ingress invece che con un port-forward per ogni prova',
      'Capire il reconciliation loop, e perché un controller non ha una fine ma un equilibrio',
    ],
    cappello: {
      h2: 'Smettere di trattare il cluster come una scatola nera',
      paragrafi: [
        'Si può usare Kubernetes per mesi senza sapere cosa succede fra un <code>kubectl apply</code> e lo stato che cambia. Funziona, finché non si blocca: e a quel punto la differenza fra chi ha un modello mentale e chi no è mezza giornata di tentativi.',
        'Questi due pezzi guardano sotto. Il primo sostituisce il <code>port-forward</code> con un Ingress Controller. Il <code>port-forward</code> va benissimo per una prova e diventa insostenibile quando i servizi sono più di uno; l\'Ingress è un indirizzo che smette di dipendere da chi lo esegue.',
        'Il secondo apre il meccanismo che sta sotto tutto il resto: informer, work queue e reconciliation loop. Serve a capire perché un controller non ha una fine ma un punto di equilibrio, e perché la stessa riconciliazione verra\' chiamata di nuovo. È il motivo per cui deve essere idempotente.',
      ],
    },
    en: {
      title: 'How Kubernetes works underneath',
      subtitle: 'From the Ingress that replaces port-forward to the controllers\' reconciliation loop',
      description: 'Two pieces on the mechanisms sitting under the everyday use of Kubernetes: how you stop reaching services with a port-forward, and what really happens between a kubectl apply and the state changing. They are for people who use the cluster and want to stop treating it as a black box.',
      breadcrumb: 'Kubernetes',
      serviceCTA: 'Is the cluster a black box for your team?',
      serviceDescription: 'I can help you take the team from "it works and we do not know how" to a mental model that holds when something stalls: what the cluster does, where to look, and what not to touch.',
      learningGoals: [
        'Expose services with an Ingress instead of a port-forward for every try',
        'Understand the reconciliation loop, and why a controller has no end but an equilibrium',
      ],
      cappello: {
        h2: 'Stop treating the cluster as a black box',
        paragrafi: [
          'You can use Kubernetes for months without knowing what happens between a <code>kubectl apply</code> and the state changing. It works, until it stalls: and at that point the difference between having a mental model and not having one is half a day of guesswork.',
          'These two pieces look underneath. The first replaces the <code>port-forward</code> with an Ingress Controller. The <code>port-forward</code> is fine for a try and becomes untenable once there is more than one service; the Ingress is an address that stops depending on whoever is running it.',
          'The second opens the mechanism sitting under everything else: informers, work queue and reconciliation loop. It is there to explain why a controller has no end but a point of equilibrium, and why the same reconciliation will be called again. That is why it has to be idempotent.',
        ],
      },
    },
  },
};
