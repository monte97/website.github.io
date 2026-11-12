/**
 * Clienti reali, per la striscia "Hanno lavorato con me" nella pagina Lavori.
 *
 * BOZZA: finché `clientsPublished` è false la striscia esce solo con `npm run dev`
 * (con un'etichetta BOZZA) e mai nel build di produzione. È un cambio di linea
 * rispetto a "i nomi dei committenti sono omessi" (pagina Lavori,
 * _strategy/tone-of-voice.md): prima di pubblicare, conferma con ogni cliente
 * che il nome può comparire e rileggi la nota della pagina.
 *
 * Il repo è pubblico: finché manca il consenso i clienti stanno in
 * src/data/clients.local.ts, fuori da git, e qui la lista resta vuota. Al momento
 * di pubblicare, sposta le voci qui sotto e i loghi da public/clients/ a
 * public/images/clienti/ (public/clients/ è ignorata da git). Per i loghi serve
 * anche il permesso d'uso del marchio: chiederlo insieme al nome.
 */
export interface Client {
  name: string;
  /** Sito del cliente; se presente la voce diventa un link. */
  url?: string;
  /** Logo in public/ (path assoluto dal sito). Senza logo esce il nome. */
  logo?: string;
  /** Il nome scritto accanto al logo, quando il logo da solo non lo dice. */
  withName?: boolean;
}

export const clientsPublished = false;

// Voci pubblicabili (con consenso). In locale si aggiungono quelle della bozza.
const published: Client[] = [];
const local = Object.values(
  import.meta.glob<{ clients: Client[] }>('./clients.local.ts', { eager: true }),
)[0]?.clients ?? [];

export const clients: Client[] = [...published, ...local];
