import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const syntheticQrCode = 'fixture000000000000000000001';
const screenshotDir = 'artifacts/qa/ui-redesign';

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

async function hideDevelopmentIndicator(page: import('@playwright/test').Page) {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
}

test('home page is accessible, compact, and provides the global catalog path', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entdecke besondere Spirituosen' })).toBeVisible();
  await expect(page.getByText(/synthetische Prüfprofile, keine realen Produkt/i)).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Spirituose suchen' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Spirituosenkategorien' }).getByRole('link', { name: 'Entdecken' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('navigation', { name: 'Spirituosenkategorien' }).getByRole('link', { name: 'Alle Spirituosen' }).click();
  await expect(page).toHaveURL(/\/entdecken$/);

  await page.goto('/');
  await hideDevelopmentIndicator(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(scrollBehavior).toBe('auto');
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: `${screenshotDir}/home-1440.png`, fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('search opens a dynamic product profile with explained test recommendations', async ({ page }) => {
  page.on('pageerror', (error) => console.error(`[browser pageerror] ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    if (failure && failure !== 'net::ERR_ABORTED') console.error(`[request failed] ${request.method()} ${request.url()} ${failure}`);
  });
  await page.goto('/entdecken?q=Alpha');
  await expect(page.getByRole('heading', { name: 'Synthetisches Prüfprofil Alpha' })).toBeVisible();
  await page.getByRole('link', { name: /Synthetisches Prüfprofil Alpha/ }).click();
  await expect(page).toHaveURL(/\/p\/synthetisches-pruefprofil-alpha$/);
  await expect(page.getByRole('heading', { name: 'Geschmack & Aroma' })).toBeVisible();
  await expect(page.getByText(/Synthetische Prüfmerkmale sind nur für interne Funktionstests bestimmt/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ähnliche Produkte' })).toBeVisible();
  await expect(page.getByText(/Gemeinsame Testmerkmale: Prüfmerkmal/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wissenswertes & besondere Fakten' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Erfahrungen echter Nutzer' })).toHaveCount(0);
  await expect(page.locator('.product-source-details')).toHaveCount(0);
  await hideDevelopmentIndicator(page);
});

test('category navigation expands, collapses, preserves search, and opens as a mobile drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/entdecken?q=Alpha');
  const search = page.getByRole('searchbox', { name: 'Spirituose suchen' });
  await expect(search).toHaveValue('Alpha');
  expect(await search.evaluate((input) => input.clientWidth)).toBeGreaterThan(200);
  const categoryNavigation = page.getByRole('navigation', { name: 'Spirituosenkategorien' });
  await expect(categoryNavigation.getByRole('link', { name: 'Whisky', exact: true })).toBeVisible();
  await expect(categoryNavigation.getByRole('link', { name: 'Scotch Whisky' })).toBeHidden();
  const whiskyToggle = categoryNavigation.getByRole('button', { name: 'Unterkategorien von Whisky' });
  await whiskyToggle.click();
  await expect(whiskyToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(categoryNavigation.getByRole('link', { name: 'Scotch Whisky' })).toBeVisible();
  await page.screenshot({ path: `${screenshotDir}/category-expanded-1440.png`, fullPage: true });

  await page.getByRole('button', { name: 'Navigation einklappen' }).click();
  await expect(page.getByRole('button', { name: 'Navigation ausklappen' })).toHaveAttribute('aria-pressed', 'true');
  const columns = await page.locator('.site-layout').evaluate((node) => getComputedStyle(node).gridTemplateColumns);
  expect(columns.startsWith('76px')).toBe(true);
  await page.getByRole('button', { name: 'Navigation ausklappen' }).click();

  await categoryNavigation.getByRole('link', { name: 'Gin', exact: true }).click();
  await expect(page).toHaveURL(/q=Alpha&category=gin/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const categoryToggle = page.getByRole('button', { name: 'Kategorien' });
  await expect(categoryToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.catalog-sidebar')).not.toHaveClass(/catalog-sidebar--collapsed/);
  await categoryToggle.click();
  await expect(page.getByRole('button', { name: 'Kategorien', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const mobileNavigation = page.getByRole('navigation', { name: 'Spirituosenkategorien' });
  await expect(mobileNavigation.getByRole('link', { name: 'Gin', exact: true })).toBeVisible();
  expect(Number.parseFloat(await page.locator('.catalog-sidebar').evaluate((node) => getComputedStyle(node).width))).toBeGreaterThanOrEqual(270);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Kategorien', exact: true })).toHaveAttribute('aria-expanded', 'false');
});

test('local visual preview is synthetic, searchable, and has no real review or taste claims', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/ui-preview');
  await expect(page.getByRole('status').getByText('Lokale UI-Vorschau')).toBeVisible();
  await expect(page.getByText(/keine realen Produkte oder Bewertungen/i)).toBeVisible();
  await expect(page.locator('.ui-preview-card')).toHaveCount(3);
  const previewNavigation = page.getByRole('navigation', { name: 'Spirituosenkategorien' });
  const previewWhiskyToggle = previewNavigation.getByRole('button', { name: 'Unterkategorien von Whisky' });
  await previewWhiskyToggle.click();
  await expect(previewNavigation.getByRole('link', { name: 'Scotch Whisky' })).toBeVisible();
  await hideDevelopmentIndicator(page);
  await page.screenshot({ path: `${screenshotDir}/category-expanded-1440.png`, fullPage: true });
  await previewWhiskyToggle.click();

  const photoResponse = await page.request.get('/api/ui-preview/bottle-amber.jpg');
  expect(photoResponse.status()).toBe(200);
  expect(photoResponse.headers()['content-type']).toContain('image/jpeg');
  expect((await photoResponse.body()).byteLength).toBeGreaterThan(100_000);
  expect((await page.request.get('/api/ui-preview/not-a-preview-image.jpg')).status()).toBe(404);
  const nonLocalHost = await page.request.get('/api/ui-preview/bottle-amber.jpg', {
    headers: { host: 'arometra-preview.invalid' },
  });
  expect(nonLocalHost.status()).not.toBe(200);

  await page.getByRole('searchbox', { name: 'Spirituose suchen' }).fill('Rum');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await expect(page).toHaveURL(/\/ui-preview\?q=Rum/);
  await expect(page.locator('.ui-preview-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Designprofil B' })).toBeVisible();

  for (const width of [1440, 1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    await page.goto('/ui-preview');
    await expect(page.locator('.ui-preview-card')).toHaveCount(3);
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
    const columnCount = await page.locator('.product-grid').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
    expect(columnCount, `card columns at ${width}px`).toBe(width > 900 ? 3 : width > 680 ? 2 : 1);
    await hideDevelopmentIndicator(page);
    await page.screenshot({ path: `${screenshotDir}/catalog-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/ui-preview');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole('link', { name: /Designprofil A/ }).click();
  await expect(page).toHaveURL(/\/ui-preview\/designprofil-a$/);
  await expect(page.getByRole('heading', { name: 'Steckbrief' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ähnliche Produkte' })).toBeVisible();
  await expect(page.getByText(/keine berechneten Empfehlungen/i)).toBeVisible();
  await page.goto('/ui-preview/designprofil-a');
  await expect(page.locator('.ui-preview-banner')).toBeVisible();
  const productNavigation = page.getByRole('navigation', { name: 'Spirituosenkategorien' });
  await expect(productNavigation.getByRole('link', { name: 'Whisky', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(productNavigation.getByRole('link', { name: 'Alle Spirituosen' })).not.toHaveAttribute('aria-current', 'page');
  await hideDevelopmentIndicator(page);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.locator('.skip-link').evaluate((link) => link.remove());
  await page.screenshot({
    path: `${screenshotDir}/product-similar-1440.png`,
    fullPage: true,
    style: '.skip-link:focus { transform: translateY(-160%); }',
  });
});

test('QR fixture resolves directly while an unknown code returns not found', async ({ page }) => {
  const followedQr = await page.request.get(`/q/${syntheticQrCode}`);
  expect(followedQr.status()).toBe(200);
  expect(followedQr.url()).toMatch(/\/p\/synthetisches-pruefprofil-alpha$/);
  await page.goto(followedQr.url());
  await expect(page).toHaveURL(/\/p\/synthetisches-pruefprofil-alpha$/);
  await expect(page.getByText(/synthetische Prüfprofile, keine realen Produkt/i)).toBeVisible();

  const unknown = await page.request.get('/q/fixture000000000000000000002');
  expect(unknown.status()).toBe(404);

  const disabled = await page.request.get('/q/fixture000000000000000000000');
  expect(disabled.status()).toBe(410);
});

test('catalog and drawer fit a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entdecken');
  await expect(page.getByRole('searchbox', { name: 'Spirituose suchen' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetisches Prüfprofil Alpha' })).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await hideDevelopmentIndicator(page);
  await page.screenshot({ path: `${screenshotDir}/catalog-real-route-mobile-390.png`, fullPage: true });

  await page.getByRole('button', { name: 'Kategorien' }).click();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/entdecken');
  await expect(page.getByRole('searchbox', { name: 'Spirituose suchen' })).toBeVisible();
  const narrowWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(narrowWidth).toBeLessThanOrEqual(320);
});
