export function postHref(postId: string, lang: 'it' | 'en' = 'it'): string {
  // Astro 5 glob loader: IT index.md → ID without trailing /index
  //                      EN index.en.md → ID with trailing /indexen
  const slug = postId.replace(/\/indexen$/, '');
  const prefix = lang === 'en' ? '/en' : '';
  return `${prefix}/blog/${slug}/`;
}

/** Estimate reading time from raw body text (~200 wpm, min 1 min). */
export function estimateReadingTime(body: string | undefined): number {
  const words = body?.split(/\s+/).length || 0;
  return Math.max(1, Math.ceil(words / 200));
}

