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
      'Una guida pratica in 8 articoli per implementare observability in un sistema distribuito. ' +
      'Si parte dalla distinzione tra monitoring e observability, si costruisce lo stack LGTM completo, ' +
      'si arriva a gestire tail sampling, routing compliance e PII filtering in produzione. ' +
      'Ogni articolo è accompagnato da codice funzionante su GitHub e scenari di debug reali.',
    level: 'Intermedio',
    pillar: 'verificare',
    category: 'observability',
    tags: ['OpenTelemetry', 'Grafana', 'Loki', 'Tempo', 'Node.js', 'LGTM'],
    serviceHref: '/servizi/#observability-security',
    serviceCTA: 'Vuoi implementare l\'observability nel tuo team?',
    serviceDescription:
      'Posso affiancarti nella progettazione e implementazione di uno stack di observability ' +
      'su misura per il tuo sistema: dal setup iniziale alla gestione in produzione, ' +
      'con focus su costi, compliance e time-to-debug.',
    learningGoals: [
      'Distinguere monitoring e observability e scegliere quando serve ciascuno',
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
};
