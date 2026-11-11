import type { ImageMetadata } from 'astro';

/**
 * Copertina di un articolo = la sua prima figura.
 * Cerca la prima immagine referenziata nel corpo (cartella imgs/ accanto al
 * file); se il corpo non ne cita nessuna risolvibile, la prima di imgs/ in
 * ordine alfabetico. Se non c'è nulla, restituisce null e la card usa la
 * copertina generata.
 */
const images = import.meta.glob<ImageMetadata>(
  '/src/content/posts/**/imgs/*.{png,jpg,jpeg,webp,gif,avif}',
  { eager: true, import: 'default' },
);

function normalize(path: string): string {
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '..') out.pop();
    else if (seg !== '.' && seg !== '') out.push(seg);
  }
  return '/' + out.join('/');
}

export function getCover(post: { filePath?: string; body?: string }): ImageMetadata | null {
  if (!post.filePath) return null;
  const dir = '/' + post.filePath.replace(/\/[^/]*$/, '');
  const refs = [...(post.body ?? '').matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map(m => m[1]);
  for (const ref of refs) {
    if (/^(https?:)?\/\//.test(ref)) continue;
    const img = images[normalize(`${dir}/${ref}`)];
    if (img) return img;
  }
  const mine = Object.keys(images).filter(k => k.startsWith(dir + '/imgs/')).sort();
  return mine.length ? images[mine[0]] : null;
}
