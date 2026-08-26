import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),   // solo per il <title>: l'H1 resta `title`
    date: z.coerce.date(),
    description: z.string(),
    mode: z.enum(['tutorial', 'how-to', 'reference', 'explanation']).optional(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare']).nullable().default(null),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['it', 'en']).default('it'),
    draft: z.boolean().default(false),
    reviewed: z.union([z.boolean(), z.literal('machine'), z.literal('human')]).default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    reproducibility: z.boolean().optional(),
    // Blocchi a posizione fissa (dal linguaggio dei case study)
    summary: z.array(z.object({        // "In sintesi", in cima
      label: z.string(),
      value: z.string(),
      note: z.string().optional(),
    })).optional(),
    openItems: z.array(z.string()).optional(),  // "Cosa resta aperto", in fondo
    caseStudy: z.object({                      // rimando al case study imparentato
      slug: z.string(),
      hook: z.string().optional(),
    }).optional(),
    openNote: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['project', 'workshop', 'case-study']).default('project'),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare']),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    links: z.object({
      github: z.string().optional(),
      demo: z.string().optional(),
      blog: z.string().optional(),
    }).optional(),
    image: z.string().optional(),
    weight: z.number().default(10),
    // Case study fields (optional — projects without them render legacy layout)
    pillarApplied: z.enum(['progettare', 'verificare', 'automatizzare']).optional(),
    problem: z.string().optional(),
    context: z.string().optional(),
    actions: z.array(z.string()).optional(),
    result: z.union([z.string(), z.array(z.string())]).optional(),
    // Case study document fields (type: 'case-study')
    eyebrow: z.string().optional(),          // "Analisi tecnica · osservabilità di un sistema a eventi"
    thesis: z.string().optional(),           // la tesi in una riga, chiude la pagina
    oggetto: z.string().optional(),          // cosa è stato analizzato
    metodo: z.string().optional(),           // come si è proceduto
    esito: z.string().optional(),            // com'è andata: la sintesi in 2-3 righe
    anonimizzazione: z.string().optional(),  // cosa è stato omesso e perché
    sections: z.array(z.object({             // indice del documento
      n: z.string(),
      title: z.string(),
      summary: z.string().optional(),
    })).optional(),
    readingPaths: z.array(z.object({         // "Per decidere" / "Per valutare"
      label: z.string(),
      desc: z.string(),
    })).optional(),
    readingNote: z.string().optional(),      // come leggere il documento
    // Percorso del dato / architettura — resa come catena di nodi
    flow: z.object({
      label: z.string().optional(),
      caption: z.string().optional(),
      nodes: z.array(z.object({
        kind: z.string().optional(),   // etichetta mono sopra il nome
        name: z.string(),
        desc: z.string().optional(),
        key: z.boolean().default(false),
        edge: z.string().optional(),   // testo sulla freccia che porta al nodo successivo
      })),
    }).optional(),
    // Le decisioni: alternativa scartata (con la sua attrattiva) contro quella scelta
    decisions: z.array(z.object({
      title: z.string(),              // il bivio, in due parole
      chosen: z.string(),
      chosenWhy: z.string().optional(),
      rejected: z.string(),
      appeal: z.string().optional(),  // perché la strada scartata era tentante
      why: z.string().optional(),     // il criterio, sotto la tabella
    })).optional(),
    decisionsNote: z.string().optional(),  // il filo che tiene insieme i bivi
    // Figura: matrice di copertura, con le caselle vuote in evidenza
    timeline: z.object({
      label: z.string().optional(),
      steps: z.array(z.object({
        kind: z.string().optional(),
        title: z.string(),
        desc: z.string().optional(),
        done: z.boolean().default(false),
      })),
      caption: z.string().optional(),
      note: z.string().optional(),
    }).optional(),
    matrix: z.object({
      label: z.string().optional(),
      columns: z.array(z.string()),
      rows: z.array(z.object({
        label: z.string(),
        note: z.string().optional(),
        cells: z.array(z.enum(['full', 'partial', 'empty'])),
      })),
      legend: z.object({
        full: z.string().optional(),
        partial: z.string().optional(),
        empty: z.string().optional(),
      }).optional(),
      caption: z.string().optional(),
      note: z.string().optional(),
    }).optional(),
    // Figura: disallineamento fra ordine chiesto e ordine ricevuto
    swap: z.object({
      label: z.string().optional(),
      requestedLabel: z.string().optional(),
      receivedLabel: z.string().optional(),
      requested: z.array(z.string()),
      order: z.array(z.number()),
      caption: z.string().optional(),
      note: z.string().optional(),
    }).optional(),
    // Griglia di definizione: Feature / Stack / Perimetro / Dati / Fuori scope
    specs: z.array(z.object({
      label: z.string(),
      value: z.string(),
      note: z.string().optional(),
    })).optional(),
    // Cosa resta aperto — confini dichiarati
    openItems: z.array(z.string()).optional(),
    // Blocco alla pubblicazione: il pezzo esiste ma non deve comparire da nessuna parte
    hold: z.object({
      reason: z.string(),
      since: z.coerce.date().optional(),
    }).optional(),
    // CTA specifica del pezzo: sovrascrive quella generica in fondo alla pagina
    cta: z.object({
      title: z.string(),
      desc: z.string().optional(),
    }).optional(),
    // Schermate reali
    shots: z.array(z.object({
      src: z.string(),
      caption: z.string(),
    })).optional(),
    shotsNote: z.string().optional(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pillar: z.enum(['progettare', 'verificare', 'automatizzare', 'tutti']),
    icon: z.string(),
    cta: z.string(),
    weight: z.number().default(10),
  }),
});

export const collections = { posts, projects, services };
