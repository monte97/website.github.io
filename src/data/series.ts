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
  },
  'saturation-alerting': {
    title: 'Alertare prima che sia tardi',
    subtitle: 'Dalla saturation predittiva al burn-rate sugli SLO, fino a chi riceve la notifica',
    description:
      'Un alert che scatta quando il disco è già pieno ha risposto alla domanda sbagliata. ' +
      'La domanda e\' sempre la stessa, quando va detto che qualcosa non funziona, e la serie la percorre ' +
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
  },
  'homelab-capi': {
    title: 'Cluster API su Proxmox',
    subtitle: 'Il cluster Kubernetes come risorsa Kubernetes, da Talos a Ubuntu',
    description:
      'Lo script che aggiunge un nodo funziona finché non fallisce a metà, e lascia una macchina ' +
      'che nessun inventario conosce. La serie sostituisce quello script con un modello dichiarativo: ' +
      'si dichiara il cluster che si vuole e un controller ci arriva. Il costo e\' dichiarato: ' +
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
  },
};
