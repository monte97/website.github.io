import type { Pillar } from './pillars';

/**
 * Shared pillar CSS class mappings.
 * Single source of truth for all pillar-related Tailwind classes.
 *
 * Il design system prevede un solo accento UI (arancio). I pillar non hanno
 * un'identita' colore propria: si distinguono per tipografia — label mono
 * uppercase e numerazione 01/02/03. Gli hex dedicati (blu/verde/viola) sono
 * stati rimossi insieme ai token --color-pillar-* in global.css.
 */

export const pillarStyles: Record<Pillar, {
  /** Numero d'ordine, per label tipografiche (01/02/03) */
  num: string;
  /** Text color — neutro, il colore non distingue i pillar */
  text: string;
  /** Solid background per pastiglie/numeri su testo bianco */
  bg: string;
  /** Left border: accento unico */
  borderLeft: string;
  /** Full border: accento unico */
  border: string;
  /** Badge: mono uppercase su superficie neutra */
  badge: string;
  /** Subtle bg */
  bgSubtle: string;
  /** Active tab */
  tabActive: string;
}> = {
  progettare: {
    num: '01',
    text: 'text-text-dark dark:text-text-light',
    bg: 'bg-accent',
    borderLeft: 'border-l-accent',
    border: 'border-accent',
    badge: 'bg-surface dark:bg-surface-dark text-text-muted font-mono uppercase',
    bgSubtle: 'bg-surface dark:bg-surface-dark',
    tabActive: 'bg-accent/10 text-accent border-2 border-accent/30',
  },
  verificare: {
    num: '02',
    text: 'text-text-dark dark:text-text-light',
    bg: 'bg-accent',
    borderLeft: 'border-l-accent',
    border: 'border-accent',
    badge: 'bg-surface dark:bg-surface-dark text-text-muted font-mono uppercase',
    bgSubtle: 'bg-surface dark:bg-surface-dark',
    tabActive: 'bg-accent/10 text-accent border-2 border-accent/30',
  },
  automatizzare: {
    num: '03',
    text: 'text-text-dark dark:text-text-light',
    bg: 'bg-accent',
    borderLeft: 'border-l-accent',
    border: 'border-accent',
    badge: 'bg-surface dark:bg-surface-dark text-text-muted font-mono uppercase',
    bgSubtle: 'bg-surface dark:bg-surface-dark',
    tabActive: 'bg-accent/10 text-accent border-2 border-accent/30',
  },
};
