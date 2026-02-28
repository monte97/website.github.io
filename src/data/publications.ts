export interface Publication {
  title: string;
  publishedIn: {
    name: string;
    date: number;
    url: string;
  };
  authors?: string;
  paper: {
    summary: string;
    url: string;
  };
  categories: string[];
  tags: string[];
}

export const publications: Publication[] = [
  {
    title: 'Comparison of two technologies in 3D surveying of Real Estate Assets and Cultural Heritage',
    publishedIn: {
      name: 'IMEKO - International Measurement Confederation',
      date: 2023,
      url: 'https://doi.org/10.21014/tc4-ARC-2023.083',
    },
    authors: 'Giulia Fiorini, Maria Alessandra Tini, Francesco Montelli, Gabriele Bitelli',
    paper: {
      summary: 'Studio comparativo di due tecnologie per il rilievo 3D di beni immobiliari e patrimonio culturale, con focus sull\'applicazione pratica e l\'efficacia delle metodologie utilizzate.',
      url: 'https://doi.org/10.21014/tc4-ARC-2023.083',
    },
    categories: ['3d-surveying', 'cultural-heritage', 'real-estate'],
    tags: ['3D Technologies', 'Cultural Heritage', 'Real Estate', 'Technology Comparison'],
  },
  {
    title: '3D technologies in surveying real estate assets and industrial archaeology',
    publishedIn: {
      name: 'Tesi Laurea Magistrale - Dip. Geomatica',
      date: 2023,
      url: '#',
    },
    paper: {
      summary: 'Tesi di laurea magistrale focalizzata sull\'applicazione delle tecnologie 3D nel rilievo di beni immobiliari e archeologia industriale, con supervisione di Francesco Montelli.',
      url: 'https://amslaurea.unibo.it/id/eprint/28217',
    },
    categories: ['3d-surveying', 'real-estate'],
    tags: ['3D Technologies', 'Real Estate', 'Industrial Archaeology', 'Thesis Supervision'],
  },
];
