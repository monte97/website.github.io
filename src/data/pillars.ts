export type Pillar = 'progettare' | 'verificare' | 'automatizzare';

export const pillarLabels: Record<Pillar, { it: string; en: string }> = {
  progettare: { it: 'Progettare', en: 'Design' },
  verificare: { it: 'Verificare', en: 'Verify' },
  automatizzare: { it: 'Automatizzare', en: 'Automate' },
};

export function getPillarLabel(pillar: Pillar, lang: 'it' | 'en' = 'it'): string {
  return pillarLabels[pillar][lang];
}
