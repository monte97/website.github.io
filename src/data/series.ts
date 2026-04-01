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
};
