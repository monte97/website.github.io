export interface Degree {
  name: string;
  timeframe: string;
  institution: {
    name: string;
    url: string;
    logo: string;
  };
  grade?: {
    scale: string;
    achieved: string;
    outOf: number;
  };
  thesis?: string;
}

export const degrees: Degree[] = [
  {
    name: 'LM in Ingegneria e Scienze Informatiche',
    timeframe: '2019-2021',
    institution: {
      name: 'Università di Bologna (UNIBO)',
      url: 'https://www.unibo.it',
      logo: '/images/sections/education/unibo.jpg',
    },
    grade: {
      scale: '/110',
      achieved: '110 cum Laude',
      outOf: 110,
    },
    thesis: 'Design and Implementation of a Data Platform for Stream Analysis: WeLASER as a Case Study - Base architetturale per il Progetto Europeo WeLaser',
  },
  {
    name: 'Laurea in Ingegneria e Scienze Informatiche',
    timeframe: '2016-2019',
    institution: {
      name: 'Università di Bologna (UNIBO)',
      url: 'https://www.unibo.it',
      logo: '/images/sections/education/unibo.jpg',
    },
    grade: {
      scale: '/110',
      achieved: '105',
      outOf: 110,
    },
    thesis: 'Studio e Sperimentazione di Tecnologie di Machine Learning in Ambito Genomico ed Healthcare',
  },
];
