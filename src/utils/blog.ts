export function postHref(postId: string, lang: 'it' | 'en' = 'it'): string {
  const slug = lang === 'en'
    ? postId.replace(/\/index(-en|\.en)?$/, '')
    : postId.replace(/\/index(\.en)?$/, '');
  const prefix = lang === 'en' ? '/en' : '';
  return `${prefix}/blog/${slug}/`;
}

/** Career start year — used to compute years of experience. */
const CAREER_START = 2021;

export function yearsExperience(): number {
  return new Date().getFullYear() - CAREER_START;
}

/** Estimate reading time from raw body text (~200 wpm, min 1 min). */
export function estimateReadingTime(body: string | undefined): number {
  const words = body?.split(/\s+/).length || 0;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Resolve a hero image from a pre-loaded glob result.
 * The glob must be `import.meta.glob<{ default: { src: string } }>('/src/content/posts/** /hero.webp', { eager: true })`.
 */
export function getHeroImage(
  postId: string,
  heroImages: Record<string, { default: { src: string } }>
): string | null {
  const dir = postId.replace(/\/index(\.en|-en)?$/, '');
  const key = `/src/content/posts/${dir}/hero.webp`;
  const img = heroImages[key];
  return img?.default?.src || null;
}
