import { getCollection } from 'astro:content';
import type { WorkshopArea, AreaMaterialGroup } from '@/data/workshop-areas';
import { talks, type Talk } from '@/data/talks';
import { postHref, estimateReadingTime } from '@/utils/blog';

export interface MaterialPost {
  title: string;
  href: string;
  description: string;
  readingTime: number;
}

export interface MaterialGroup {
  group: AreaMaterialGroup;
  posts: MaterialPost[];
}

/**
 * Il materiale di un'area si ricava dai post già pubblicati: per chiave `series`,
 * oppure per id quando l'articolo non appartiene a una serie. Un articolo aggiunto
 * a una serie compare qui senza toccare altro.
 */
export async function getAreaMaterial(area: WorkshopArea, lang: 'it' | 'en') {
  const all = await getCollection('posts');

  // EN: l'id di `index.en.md` finisce in `/indexen`
  const matches = (id: string, ids: string[]) =>
    ids.some((base) => id === base || id === `${base}/indexen`);

  const material: MaterialGroup[] = area.material.map((g) => ({
    group: g,
    posts: all
      .filter(
        (p) =>
          p.data.lang === lang &&
          !p.data.draft &&
          ((g.key !== undefined && p.data.series === g.key) ||
            (g.ids !== undefined && matches(p.id, g.ids)))
      )
      .sort((a, b) => {
        const oa = a.data.seriesOrder ?? Infinity;
        const ob = b.data.seriesOrder ?? Infinity;
        if (oa !== ob) return oa - ob;
        return a.data.date.valueOf() - b.data.date.valueOf();
      })
      .map((p) => ({
        title: p.data.title,
        href: postHref(p.id, lang),
        description: p.data.description,
        readingTime: estimateReadingTime(p.body),
      })),
  }));

  const areaTalks: Talk[] = area.talks
    .map((slug) => talks.find((t) => t.slug === slug))
    .filter((t): t is Talk => Boolean(t));

  const postCount = material.reduce((n, g) => n + g.posts.length, 0);
  const readingTime = material.reduce(
    (n, g) => n + g.posts.reduce((m, p) => m + p.readingTime, 0),
    0
  );

  return { material, talks: areaTalks, postCount, readingTime };
}
