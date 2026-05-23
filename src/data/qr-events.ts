export type QrEventLink = {
  label: string;
  href: string;
};

export type QrEvent = {
  slug: string;    // path: /qr/<slug>
  title: string;   // titolo mostrato nella card, es. "DevRomagna 2025"
  links: QrEventLink[];
};

export const qrEvents: QrEvent[] = [];
