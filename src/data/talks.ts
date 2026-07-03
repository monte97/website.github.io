export type TalkLink = {
  repo?: string;
  slides?: string;
  linkedin?: string;
  conference?: string;
  recording?: string;
  article?: string;
};

export type Talk = {
  slug: string;
  title: string;
  event: string;
  date: string; // ISO, es. "2026-06-18"
  location: string;
  status: 'delivered' | 'upcoming';
  abstract: { it: string; en: string };
  links?: TalkLink;
};

export const talks: Talk[] = [
  {
    slug: 'oltre-i-ruoli-openfga',
    title: 'Oltre i ruoli: autorizzazione relazionale con OpenFGA',
    event: 'DevSecOpsDay',
    date: '2026-10-14',
    location: 'Bologna, IT',
    status: 'upcoming',
    abstract: {
      it: "I ruoli nel JWT smettono di bastare appena l'accesso dipende dalle relazioni: chi possiede il documento, chi è nel team, chi ha condiviso cosa. OpenFGA porta l'autorizzazione relazionale fuori dal codice applicativo. Come modellarla, e quando serve davvero.",
      en: 'Roles in a JWT stop being enough the moment access depends on relationships: who owns the document, who is on the team, who shared what. OpenFGA moves relational authorization out of your application code. How to model it, and when you actually need it.',
    },
    links: {
      conference: 'https://www.devsecopsday.it',
    },
  },
  {
    slug: 'il-tuo-collega-piu-produttivo',
    title: 'Il tuo collega più produttivo scrive test inutili',
    event: 'DevRomagna',
    date: '2026-05-13',
    location: 'Faenza, IT',
    status: 'delivered',
    abstract: {
      it: "La coverage dice che il codice gira, non che i test lo verificano: col mutation testing scopri quali test passano senza controllare niente. E, in chiusura, un excursus sul futuro: la mutazione guidata da un LLM invece che da un motore a regole come Stryker, e cosa cambia quando sono gli LLM a scrivere codice e test.",
      en: 'Coverage tells you the code runs, not that the tests verify it: mutation testing reveals which tests pass without checking anything. And, to close, a look ahead: mutation guided by an LLM instead of a rule engine like Stryker, and what changes when LLMs write the code and the tests.',
    },
    links: {
      repo: 'https://github.com/monte97/il-tuo-collega-piu-produttivo',
      linkedin: 'https://www.linkedin.com/posts/francesco-montelli_settimana-scorsa-ho-tenuto-un-talk-con-devromagna-share-7463469974242664448-wSo8',
      conference: 'https://www.linkedin.com/posts/devromagna_devromagna-dotnet-testing-activity-7457761526087614464-FFpU',
    },
  },
  {
    slug: 'mutation-testing-working-software-2026',
    title: 'Come il mutation testing mi ha fatto capire che la mia suite di test stava mentendo',
    event: 'Working Software 2026',
    date: '2026-06-18',
    location: 'Reggio Emilia, IT',
    status: 'delivered',
    abstract: {
      it: 'Una demo live su tre servizi .NET 8: 93% di coverage e test verdi, ma Stryker.NET mostra che il 35% dei mutanti sopravvive. Riscrivo i test guidato dal report e il mutation score sale al 92%. La coverage dice se il codice gira, il mutation score se i test funzionano davvero.',
      en: 'A live demo on three .NET 8 services: coverage at 93% and green tests, yet Stryker.NET shows 35% of mutants survive. Guided by the report I rewrite the tests and the mutation score climbs to 92%. Coverage tells you the code runs; the mutation score tells you the tests work.',
    },
    links: {
      article: '/blog/verificare/testing/mutation-testing-oltre-la-coverage/',
      repo: 'https://github.com/monte97/mutation-testing-ws2026-slides',
      linkedin: 'https://www.linkedin.com/feed/update/urn:li:activity:7476566629942759424/',
      conference: 'https://www.agilemovement.it/workingsoftware/',
    },
  },
];
