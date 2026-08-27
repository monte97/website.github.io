import { seriesMetadata } from '@/data/series';
import { postHref, estimateReadingTime } from '@/utils/blog';

export interface SeriesEntry {
  key: string;
  title: string;
  subtitle: string | null;
  count: number;
  minutes: number;
  pillar: 'progettare' | 'verificare' | 'automatizzare' | null;
  /** null quando la serie non ha ancora una landing */
  landingHref: string | null;
  /** primo articolo: dove si va quando la landing non c'e' */
  firstHref: string;
  lastDate: Date;
}

/**
 * Raccoglie le serie a partire dai post di una lingua.
 * Il titolo viene da seriesMetadata quando esiste, altrimenti dallo slug.
 */
export function getSeriesIndex(posts: any[]): SeriesEntry[] {
  const groups = new Map<string, any[]>();
  for (const p of posts) {
    const s = p.data.series;
    if (!s) continue;
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s)!.push(p);
  }

  const out: SeriesEntry[] = [];
  for (const [key, items] of groups) {
    items.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
    const meta = seriesMetadata[key];
    // Il pillar della serie e' quello dichiarato dalla maggioranza dei suoi
    // articoli: `homelab-capi` oggi ne dichiara due diversi, e prendere il
    // primo darebbe un risultato che dipende dall'ordine.
    const conteggio = new Map<string, number>();
    for (const p of items) {
      const k = p.data.pillar;
      if (k) conteggio.set(k, (conteggio.get(k) ?? 0) + 1);
    }
    const pillar = ([...conteggio.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as
      SeriesEntry['pillar'];
    out.push({
      key,
      title: meta?.title ?? key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      subtitle: meta?.subtitle ?? null,
      count: items.length,
      minutes: items.reduce((acc, p) => acc + estimateReadingTime(p.body), 0),
      pillar,
      landingHref: meta ? `/blog/${meta.pillar}/${key}/` : null,
      firstHref: postHref(items[0].id),
      lastDate: items.reduce(
        (max, p) => (p.data.date > max ? p.data.date : max),
        items[0].data.date as Date
      ),
    });
  }

  return out.sort((a, b) => b.count - a.count);
}

/** Gli articoli che non appartengono a nessuna serie. */
export function looseposts(posts: any[]): any[] {
  return posts.filter(p => !p.data.series);
}
