/** Risolve gli URL foto di un talk da un glob eager su src/assets/talks/<slug>/*, ordinati per nome file. */
export function talkImagesFrom(
  glob: Record<string, { default: { src: string } }>,
  slug: string,
): string[] {
  return Object.entries(glob)
    .filter(([path]) => path.includes(`/talks/${slug}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, mod]) => mod.default.src);
}
