import { getCollection } from 'astro:content';
import { workshops, type Workshop } from '@/data/workshops';
import { talks, type Talk } from '@/data/talks';
import { postHref, estimateReadingTime } from '@/utils/blog';

/** Slug leggibile per la pagina di un modulo. */
export function moduleSlug(workshopSlug: string, name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${workshopSlug}/${clean}`;
}

/** Materiale e conteggi dei workshop, ricavati dai post pubblicati. */
export async function getWorkshops() {
  const all = await getCollection('posts');

  return workshops.map((w: Workshop) => {
    const series = w.series.map((s) => ({
      ...s,
      posts: all
        .filter((p) => p.data.series === s.key && p.data.lang === 'it' && !p.data.draft)
        .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0))
        .map((p) => ({
          title: p.data.title,
          href: postHref(p.id),
          description: p.data.description,
          readingTime: estimateReadingTime(p.body),
        })),
    }));

    const wTalks: Talk[] = w.talks
      .map((slug) => talks.find((t) => t.slug === slug))
      .filter((t): t is Talk => Boolean(t));

    const moduleCount = w.groups.reduce((n, g) => n + g.modules.length, 0);
    const postCount = series.reduce((n, s) => n + s.posts.length, 0);

    return { ...w, series, talks: wTalks, moduleCount, postCount };
  });
}

export type EnrichedWorkshop = Awaited<ReturnType<typeof getWorkshops>>[number];
