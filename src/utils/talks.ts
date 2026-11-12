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

/** Logo dell'evento (public/images/loghi/), abbinato per nome; null se non c'e'. */
export const LOGHI: [RegExp, string][] = [
  [/devfest milano/i, 'devfest-milano.png'],
  [/devsecops/i, 'devsecopsday.svg'],
  [/linux day prato/i, 'linuxday-prato.png'],
  [/mlopsday/i, 'mlopsday.svg'],
  [/devfest alps/i, 'devfest-alps.svg'],
  [/modena full ?stack/i, 'modena-fullstack.png'],
  [/devfest bari/i, 'devfest-bari.svg'],
  [/devromagna/i, 'devromagna-orizz.png'],
  [/working software/i, 'working-software.svg'],
];
export function eventLogo(event: string): string | null {
  const hit = LOGHI.find(([re]) => re.test(event));
  return hit ? `/images/loghi/${hit[1]}` : null;
}
