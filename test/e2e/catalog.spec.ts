import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

const syntheticQrCode = 'fixture000000000000000000001';

async function hideDevelopmentIndicator(page: import('@playwright/test').Page) {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
}

test('home page is accessible and provides a direct discovery path', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Spirituosen verstehen. Neues entdecken.' })).toBeVisible();
  await expect(page.getByText(/synthetische Prüfprofile, keine realen Produkt/i)).toBeVisible();
  await page.getByRole('link', { name: 'Katalog öffnen' }).click();
  await expect(page).toHaveURL(/\/entdecken$/);

  await page.goto('/');
  await hideDevelopmentIndicator(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(scrollBehavior).toBe('auto');
  await mkdir('artifacts/qa/sprint-2-5', { recursive: true });
  await page.screenshot({ path: 'artifacts/qa/sprint-2-5/home-desktop.png', fullPage: true });
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(accessibility.violations).toEqual([]);
});

test('search opens a dynamic product profile with an explained recommendation', async ({ page }) => {
  await page.goto('/entdecken?q=Alpha');
  await expect(page.getByRole('heading', { name: 'Synthetisches Prüfprofil Alpha' })).toBeVisible();
  await page.getByRole('link', { name: /Synthetisches Prüfprofil Alpha/ }).click();
  await expect(page).toHaveURL(/\/p\/synthetisches-pruefprofil-alpha$/);
  await expect(page.getByRole('heading', { name: 'Synthetische Testmerkmale' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ähnliche Produkte' })).toBeVisible();
  await expect(page.getByText(/Gemeinsame Testmerkmale: Prüfmerkmal/)).toBeVisible();
  await expect(page.getByText(/keine Verkostungsnotizen/i)).toBeVisible();
  await hideDevelopmentIndicator(page);
  await mkdir('artifacts/qa/sprint-2-5', { recursive: true });
  await page.screenshot({ path: 'artifacts/qa/sprint-2-5/product-desktop.png', fullPage: true });
});

test('category navigation expands on desktop and opens on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/entdecken?q=Alpha');
  const search = page.getByRole('searchbox', { name: 'Spirituose suchen' });
  await expect(search).toHaveValue('Alpha');
  expect(await search.evaluate((input) => input.clientWidth)).toBeGreaterThan(200);
  const categoryNavigation = page.getByRole('navigation', { name: 'Spirituosenkategorien' });
  await expect(categoryNavigation.getByRole('link', { name: 'Whisky', exact: true })).toBeVisible();
  await expect(categoryNavigation.getByRole('link', { name: 'Scotch Whisky' })).toBeHidden();
  await categoryNavigation.locator('summary[aria-label="Unterkategorien von Whisky"]').click();
  await expect(categoryNavigation.getByRole('link', { name: 'Scotch Whisky' })).toBeVisible();
  await categoryNavigation.getByRole('link', { name: 'Gin', exact: true }).click();
  await expect(page).toHaveURL(/q=Alpha&category=gin/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const categoryToggle = page.getByRole('button', { name: 'Kategorien' });
  await expect(categoryToggle).toHaveAttribute('aria-expanded', 'false');
  await categoryToggle.click();
  await expect(categoryToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Spirituosenkategorien' }).getByRole('link', { name: 'Gin', exact: true })).toBeVisible();
});

test('QR fixture resolves directly while an unknown code returns not found', async ({ page }) => {
  await page.goto(`/q/${syntheticQrCode}`);
  await expect(page).toHaveURL(/\/p\/synthetisches-pruefprofil-alpha$/);
  await expect(page.getByText(/synthetische Prüfprofile, keine realen Produkt/i)).toBeVisible();

  const unknown = await page.request.get('/q/fixture000000000000000000002');
  expect(unknown.status()).toBe(404);

  const disabled = await page.request.get('/q/fixture000000000000000000000');
  expect(disabled.status()).toBe(410);
});

test('mobile discovery fits a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/entdecken');
  await expect(page.getByRole('searchbox', { name: 'Spirituose suchen' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetisches Prüfprofil Alpha' })).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await hideDevelopmentIndicator(page);
  await mkdir('artifacts/qa/sprint-2-5', { recursive: true });
  await page.screenshot({ path: 'artifacts/qa/sprint-2-5/catalog-mobile.png', fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/entdecken');
  await hideDevelopmentIndicator(page);
  await page.screenshot({ path: 'artifacts/qa/sprint-2-5/catalog-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 320, height: 640 });
  await expect(page.getByRole('searchbox', { name: 'Spirituose suchen' })).toBeVisible();
  const narrowWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(narrowWidth).toBeLessThanOrEqual(320);
});
