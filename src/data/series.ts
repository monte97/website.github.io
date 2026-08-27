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
  },
  playwright: {
    title: 'Test end-to-end con Playwright',
    subtitle: 'Dalla flakiness al Page Object Model, nove articoli su una suite di cui fidarsi',
    description:
      'Le suite E2E non vengono abbandonate perche\' sono lente: vengono abbandonate quando il team ' +
      'smette di credere ai loro fallimenti. La serie parte dal motivo tecnico per cui i test flaky ' +
      'esistono — il protocollo con cui il test parla al browser — e arriva a una suite che gira in CI, ' +
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
      'Capire perche\' l\'auto-waiting elimina i timing bug e cosa non elimina',
      'Correlare un test fallito con la trace del backend che lo ha fatto fallire',
      'Parallelizzare in CI con lo sharding, e sapere quando il collo di bottiglia si sposta altrove',
      'Mockare la rete: da un singolo endpoint al replay di sessioni HAR',
      'Diagnosticare un test flaky invece di aggiungere un retry',
      'Organizzare la suite con il Page Object Model prima che diventi ingestibile',
    ],
  },
  keycloak: {
    title: 'Keycloak in produzione',
    subtitle: 'Dall\'Authorization Code Flow alla federazione, sei articoli su identita\' che regge',
    description:
      'Delegare l\'autenticazione a Keycloak e\' una decisione che si paga per anni: la serie percorre ' +
      'i punti dove si rompe davvero. Il flusso corretto e perche\' PKCE non e\' opzionale, ' +
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
      'quello che avete gia\'.',
    learningGoals: [
      'Scegliere il flusso OAuth2 giusto, e capire perche\' PKCE non e\' un extra',
      'Autenticare servizi fra loro senza inventarsi token applicativi',
      'Testare end-to-end un\'applicazione che dipende da un identity provider',
      'Separare autenticazione da autorizzazione delegando le policy a OPA',
      'Federare provider esterni senza duplicare le identita\'',
    ],
  },
  openfga: {
    title: 'Autorizzazione con OpenFGA',
    subtitle: 'Da Zanzibar alla multi-tenancy, cinque articoli su permessi che scalano',
    description:
      'Quando i permessi smettono di stare in una colonna `role` sulla tabella utenti, il modello ' +
      'a ruoli non regge piu\'. La serie parte dai concetti di Google Zanzibar, li collega a Keycloak, ' +
      'e arriva ai problemi che si incontrano davvero: isolare piu\' organizzazioni, risolvere ' +
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
      'Isolare piu\' organizzazioni nello stesso sistema senza duplicare il modello',
      'Risolvere gerarchie profonde senza scrivere codice applicativo',
      'Riconoscere quando ListObjects diventa il collo di bottiglia, e come aggirarlo',
    ],
  },
};
