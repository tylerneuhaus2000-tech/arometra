import 'server-only';

export type UiPreviewFixture = {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  image: 'bottle-amber.jpg' | 'bottle-green.jpg' | 'bottle-frosted.jpg';
  tags: [string, string];
};

// Synthetic layout fixtures only. They do not describe products, taste, quality, reviews, or sales.
export const uiPreviewFixtures: UiPreviewFixture[] = [
  {
    slug: 'designprofil-a',
    name: 'Designprofil A',
    category: 'Whisky',
    categorySlug: 'whisky',
    image: 'bottle-amber.jpg',
    tags: ['Beispielmerkmal A', 'Beispielmerkmal B'],
  },
  {
    slug: 'designprofil-b',
    name: 'Designprofil B',
    category: 'Rum',
    categorySlug: 'rum',
    image: 'bottle-frosted.jpg',
    tags: ['Beispielmerkmal C', 'Beispielmerkmal D'],
  },
  {
    slug: 'designprofil-c',
    name: 'Designprofil C',
    category: 'Gin',
    categorySlug: 'gin',
    image: 'bottle-green.jpg',
    tags: ['Beispielmerkmal E', 'Beispielmerkmal F'],
  },
];

export function isLocalUiPreviewEnabled(host: string | null): boolean {
  if (process.env.NODE_ENV === 'production' || process.env.AROMETRA_UI_PREVIEW !== 'true' || !host) return false;
  try {
    const hostname = new URL(`http://${host}`).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}
