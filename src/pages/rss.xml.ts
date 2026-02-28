import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts'))
    .filter(p => p.data.lang === 'it' && !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: 'montelli.dev',
    description: 'Progetto, verifico e automatizzo sistemi software',
    site: context.site!,
    items: posts.map(post => {
      const slug = post.id.replace(/\/index(\.en)?$/, '');
      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description,
        link: `/blog/${slug}/`,
      };
    }),
  });
}
