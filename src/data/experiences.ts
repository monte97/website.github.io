export interface Position {
  designation: string;
  start: number;
  end?: number;
  responsibilities: string[];
}

export interface Experience {
  company: {
    name: string;
    location: string;
    overview: string;
  };
  positions: Position[];
}

export const experiences: Experience[] = [
  {
    company: {
      name: 'Freelance',
      location: 'Italia',
      overview: 'Attività di consulenza freelance specializzata in Fullstack Software Development, DevOps, System Design & Architecture e formazione di team di sviluppo.',
    },
    positions: [
      {
        designation: 'Freelance Software Engineer',
        start: 2025,
        responsibilities: [
          "Iscrizione all'Ordine degli Ingegneri della Provincia di Ravenna (N. 2467)",
          'Consulenza in Fullstack Software Development e architetture scalabili',
          'Implementazione di metodologie DevOps e CI/CD pipeline',
          'System Design & Architecture per sistemi distribuiti',
          'Formazione e gestione di team di sviluppo per migliorare la Developer Experience (DevEx)',
          'Progettazione di architetture basate sugli eventi e sistemi di observability',
        ],
      },
    ],
  },
  {
    company: {
      name: 'TheRedCode',
      location: 'theredcode.it',
      overview: 'Community e blog tecnico italiano dedicato a sviluppo software, DevOps, cloud e best practice ingegneristiche.',
    },
    positions: [
      {
        designation: 'Technical Writer',
        start: 2025,
        responsibilities: [
          'Redazione di articoli tecnici su testing, observability, DevOps e architettura software',
          'Collaborazione editoriale con la community per la produzione di contenuti di qualita\'',
        ],
      },
    ],
  },
  {
    company: {
      name: "Operai dell'Arte APS",
      location: 'Italia',
      overview: 'Associazione che promuove la formazione, la cultura e la coesione sociale, con particolare attenzione alla sensibilizzazione sulla protezione del patrimonio culturale.',
    },
    positions: [
      {
        designation: 'Membro del Comitato Tecnico Scientifico',
        start: 2022,
        responsibilities: [
          'Supporto agli studenti nella stesura di tesi di laurea e ricerca accademica',
          'Guida nella pubblicazione di articoli scientifici su riviste peer-reviewed',
          'Mentoring nella ricerca, redazione e revisione di contenuti scientifici',
          'Collaborazione con istituzioni accademiche per progetti di ricerca',
          'Promozione della cultura scientifica e della protezione del patrimonio culturale',
        ],
      },
    ],
  },
  {
    company: {
      name: 'HyperVista',
      location: 'Startup',
      overview: "Startup dedicata allo sviluppo di software per l'applicazione di tecnologie Industria 4.0 nel settore edile.",
    },
    positions: [
      {
        designation: 'R&D Engineer',
        start: 2022,
        end: 2024,
        responsibilities: [
          'Progettazione e sviluppo di Data Platform per la gestione del ciclo di vita dei dati prodotti dai macchinari',
          'Implementazione di sistemi di Project Workflow Management per ottimizzare i processi aziendali',
          'Sviluppo di soluzioni di Gestione Documentale integrate con tecnologie Industria 4.0',
          'Ricerca e sviluppo di nuove tecnologie per il settore edile',
          "Collaborazione con team multidisciplinari per l'innovazione tecnologica",
        ],
      },
    ],
  },
  {
    company: {
      name: 'Consorzio Ediltecnica',
      location: 'Ravenna, Italia',
      overview: 'Consorzio che raggruppa diverse società operanti nel settore edilizio e tecnologico, con focus su innovazione e digitalizzazione.',
    },
    positions: [
      {
        designation: 'Sistemista & Sviluppatore',
        start: 2016,
        end: 2021,
        responsibilities: [
          "Evoluzione dal supporto IT di base all'amministrazione completa dell'infrastruttura IT",
          'Sviluppo di applicativi personalizzati per le esigenze specifiche delle società del consorzio',
          'Gestione e manutenzione di sistemi server e reti aziendali',
          'Collaborazione con diverse società del consorzio durante il percorso di studi universitari',
          "Implementazione di soluzioni tecnologiche per migliorare l'efficienza operativa",
        ],
      },
    ],
  },
];
