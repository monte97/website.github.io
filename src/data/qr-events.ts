export type QrEventLink = {
  label: string;
  href: string;
};

export type QrEvent = {
  slug: string;    // path: /qr/<slug>
  title: string;   // titolo mostrato nella card, es. "DevRomagna 2025"
  links: QrEventLink[];
};

export const qrEvents: QrEvent[] = [
  {
    slug: 'working-software-2026',
    title: 'Working Software Conference 2026',
    links: [
      { label: 'Slide e materiale del talk', href: 'https://github.com/monte97/mutation-testing-ws2026-slides' },
    ],
  },
  {
    slug: 'devsecops-day-2026',
    title: 'DevSecOps Day 2026',
    links: [
      { label: 'Il talk su montelli.dev', href: 'https://montelli.dev/talks/oltre-i-ruoli-openfga/' },
    ],
  },
  {
    slug: 'devfest-milano-2026',
    title: 'DevFest Milano 2026',
    links: [
      { label: 'Il talk su montelli.dev', href: 'https://montelli.dev/talks/incidente-non-parla-promql/' },
    ],
  },
];
