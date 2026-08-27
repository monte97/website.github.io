export const author = {
  name: 'Francesco Montelli',
  nickname: 'Monte',
  image: '/images/author/monte.webp',
  /** Il ruolo dichiarato: unico posto in cui vive, cosi' non diverge fra le pagine */
  role: {
    it: 'Software Engineer freelance',
    en: 'Freelance Software Engineer',
  },
  linkedin: 'https://linkedin.com/in/francesco-montelli',
  bio: {
    it: "Software Engineer freelance. Progetto, sviluppo e automatizzo il software di prodotto: dall'architettura alla realizzazione, fino ai processi che ne garantiscono la qualità nel tempo. Da zero o su sistemi irrigiditi.",
    en: "Freelance Software Engineer. I design, build and automate product software: from architecture to the build, to the processes that keep quality high over time. From scratch or on systems grown rigid over time.",
  },
} as const;
