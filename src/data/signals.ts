export type Signal = { title: string; body: string };

export const signals: Record<'it' | 'en', Signal[]> = {
  it: [
    { title: 'Deploy che fanno paura', body: 'Ogni rilascio è un evento. Lo rimandi al venerdì pomeriggio per evitare il weekend di guardia. Quando qualcosa si rompe, recuperare costa ore, non minuti.' },
    { title: 'Tecnologia ferma al palo', body: 'Aggiungere una funzione nuova costa una fatica enorme. Lo stack è vecchio e ogni modifica combatte con le precedenti. Stai restando indietro, e lo senti.' },
    { title: 'Stai per costruire qualcosa di nuovo', body: 'Un servizio, un\'integrazione, una funzionalità importante. È il momento in cui le scelte di architettura contano di più: sono le più costose da cambiare dopo.' },
  ],
  en: [
    { title: 'Deploys you dread', body: 'Every release is an event. You push it to Friday afternoon to dodge the on-call weekend. When something breaks, recovery takes hours, not minutes.' },
    { title: 'Tech stuck in place', body: 'Adding a new feature costs an enormous effort. The stack is old, and every change fights the ones before it. You are falling behind, and you can feel it.' },
    { title: 'You are about to build something new', body: 'A service, an integration, an important feature. This is when architecture choices matter most: they are the most expensive to change later.' },
  ],
};
