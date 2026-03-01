export interface Skill {
  name: string;
  logo?: string;
  darkInvert?: boolean;
  summary: string;
  categories: string[];
  url: string;
}

export const skills: Skill[] = [
  {
    name: 'Kubernetes',
    logo: '/images/sections/skills/kubernetes.png',
    summary: 'Capacità di deployment e gestione di applicazioni su Kubernetes. Esperienza nella scrittura di controller per CRD.',
    categories: ['container'],
    url: 'https://kubernetes.io/',
  },
  {
    name: 'Go Development',
    logo: '/images/sections/skills/go.png',
    summary: 'Utilizzato come linguaggio principale per lo sviluppo professionale. Capacità di scrivere programmi scalabili, testabili e mantenibili.',
    categories: ['basic', 'language'],
    url: 'https://golang.org/',
  },
  {
    name: 'Docker',
    logo: '/images/sections/skills/docker.svg',
    summary: 'Scrivo la maggior parte dei programmi come container dockerizzati. Esperienza con build multi-stage e multi-arch.',
    categories: ['container'],
    url: 'https://www.docker.com/',
  },
  {
    name: 'Prometheus',
    logo: '/images/sections/skills/prometheus.png',
    summary: 'Capacità di setup e configurazione delle metriche Prometheus. Esperienza con PromQL, AlertManager e scrittura di metric exporter.',
    categories: ['observability'],
    url: 'https://prometheus.io/',
  },
  {
    name: 'C#',
    logo: '/images/sections/skills/c-sharp.png',
    summary: 'Linguaggio principale per lo sviluppo professionale. Esperienza nello sviluppo di applicazioni enterprise e sistemi distribuiti.',
    categories: ['language'],
    url: 'https://docs.microsoft.com/en-us/dotnet/csharp/',
  },
  {
    name: 'Java',
    logo: '/images/sections/skills/java.png',
    summary: 'Utilizzato per lo sviluppo di applicazioni enterprise e sistemi distribuiti. Esperienza con Spring Framework e architetture microservizi.',
    categories: ['language'],
    url: 'https://www.oracle.com/java/',
  },
  {
    name: 'Scala',
    logo: '/images/sections/skills/scala.png',
    summary: 'Linguaggio funzionale utilizzato per sistemi distribuiti e processing di grandi volumi di dati.',
    categories: ['language'],
    url: 'https://www.scala-lang.org/',
  },
  {
    name: 'Python',
    logo: '/images/sections/skills/python.png',
    summary: 'Utilizzato per scripting, automazione, data analysis e sviluppo di applicazioni backend.',
    categories: ['language'],
    url: 'https://www.python.org/',
  },
  {
    name: 'Apache Pekko',
    logo: '/images/sections/skills/pekko.png',
    summary: 'Framework per sistemi distribuiti e architetture basate su attori. Esperienza con Pekko Streams e Pekko Cluster.',
    categories: ['frameworks'],
    url: 'https://pekko.apache.org/',
  },
  {
    name: 'Apache Kafka',
    logo: '/images/sections/skills/kafka.svg',
    darkInvert: true,
    summary: 'Piattaforma di streaming distribuito per architetture event-driven. Esperienza con Kafka Streams e Kafka Connect.',
    categories: ['frameworks'],
    url: 'https://kafka.apache.org/',
  },
  {
    name: 'Vue.js',
    logo: '/images/sections/skills/vue.png',
    summary: 'Framework JavaScript progressivo per lo sviluppo di interfacce utente moderne e responsive.',
    categories: ['frameworks'],
    url: 'https://vuejs.org/',
  },
  {
    name: 'PostgreSQL',
    logo: '/images/sections/skills/postgre.png',
    summary: 'Database relazionale avanzato. Esperienza con query complesse, ottimizzazione delle performance e design di schema.',
    categories: ['database'],
    url: 'https://www.postgresql.org/',
  },
  {
    name: 'MongoDB',
    logo: '/images/sections/skills/mongodb.png',
    summary: 'Database NoSQL orientato ai documenti. Esperienza con aggregation pipeline e modellazione dei dati.',
    categories: ['database'],
    url: 'https://www.mongodb.com/',
  },
  {
    name: 'Jenkins',
    logo: '/images/sections/skills/jenkins.png',
    summary: 'Piattaforma CI/CD per automazione di build, test e deployment. Esperienza con pipeline declarative e scripted.',
    categories: ['devops'],
    url: 'https://www.jenkins.io/',
  },
  {
    name: 'AWS',
    logo: '/images/sections/skills/aws.png',
    summary: 'Cloud provider principale. Esperienza con EC2, S3, Lambda, RDS e altri servizi core per architetture scalabili.',
    categories: ['cloud'],
    url: 'https://aws.amazon.com/',
  },
  {
    name: 'OpenTelemetry',
    logo: '/images/sections/skills/opentelemetry.svg',
    summary: 'Standard open-source per l\'instrumentazione di applicazioni. Esperienza con SDK, Collector e integrazione con backend di observability.',
    categories: ['observability'],
    url: 'https://opentelemetry.io/',
  },
  {
    name: 'Grafana',
    logo: '/images/sections/skills/grafana.svg',
    summary: 'Piattaforma di visualizzazione e monitoring. Esperienza nella creazione di dashboard, alerting e integrazione con diverse data source.',
    categories: ['observability'],
    url: 'https://grafana.com/',
  },
  {
    name: 'Loki',
    logo: '/images/sections/skills/loki.png',
    summary: 'Sistema di aggregazione log scalabile. Esperienza con LogQL e integrazione con Grafana per il log management.',
    categories: ['observability'],
    url: 'https://grafana.com/oss/loki/',
  },
  {
    name: 'Tempo',
    logo: '/images/sections/skills/tempo.svg',
    darkInvert: true,
    summary: 'Backend per distributed tracing ad alte performance. Esperienza con TraceQL e correlazione tra traces, metriche e log.',
    categories: ['observability'],
    url: 'https://grafana.com/oss/tempo/',
  },
  {
    name: 'Mimir',
    logo: '/images/sections/skills/mimir.svg',
    darkInvert: true,
    summary: 'Storage scalabile per metriche Prometheus in multi-tenancy. Esperienza con deployment e configurazione per ambienti enterprise.',
    categories: ['observability'],
    url: 'https://grafana.com/oss/mimir/',
  },
];
