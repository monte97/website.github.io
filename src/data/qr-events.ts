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
];
