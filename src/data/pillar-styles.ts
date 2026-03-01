import type { Pillar } from './pillars';

/**
 * Shared pillar CSS class mappings.
 * Single source of truth for all pillar-related Tailwind classes.
 * Color tokens defined in src/styles/global.css (@theme).
 */

export const pillarStyles: Record<Pillar, {
  /** Text color: text-pillar-{name} */
  text: string;
  /** Solid background: bg-pillar-{name} */
  bg: string;
  /** Left border: border-l-pillar-{name} */
  borderLeft: string;
  /** Full border: border-pillar-{name} */
  border: string;
  /** Badge: 10% opacity bg + text color */
  badge: string;
  /** Subtle bg at 8% opacity */
  bgSubtle: string;
  /** Active tab: 15% bg + text + 30% border */
  tabActive: string;
  /** Hex value for CSS custom properties */
  hex: string;
}> = {
  progettare: {
    text: 'text-pillar-progettare',
    bg: 'bg-pillar-progettare',
    borderLeft: 'border-l-pillar-progettare',
    border: 'border-pillar-progettare',
    badge: 'bg-pillar-progettare/10 text-pillar-progettare',
    bgSubtle: 'bg-pillar-progettare/8',
    tabActive: 'bg-pillar-progettare/15 text-pillar-progettare border-2 border-pillar-progettare/30',
    hex: '#5B7FA5',
  },
  verificare: {
    text: 'text-pillar-verificare',
    bg: 'bg-pillar-verificare',
    borderLeft: 'border-l-pillar-verificare',
    border: 'border-pillar-verificare',
    badge: 'bg-pillar-verificare/10 text-pillar-verificare',
    bgSubtle: 'bg-pillar-verificare/8',
    tabActive: 'bg-pillar-verificare/15 text-pillar-verificare border-2 border-pillar-verificare/30',
    hex: '#6B9B78',
  },
  automatizzare: {
    text: 'text-pillar-automatizzare',
    bg: 'bg-pillar-automatizzare',
    borderLeft: 'border-l-pillar-automatizzare',
    border: 'border-pillar-automatizzare',
    badge: 'bg-pillar-automatizzare/10 text-pillar-automatizzare',
    bgSubtle: 'bg-pillar-automatizzare/8',
    tabActive: 'bg-pillar-automatizzare/15 text-pillar-automatizzare border-2 border-pillar-automatizzare/30',
    hex: '#9B7FB5',
  },
};
