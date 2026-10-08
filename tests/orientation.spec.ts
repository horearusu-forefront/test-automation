import { test, expect } from '@playwright/test';
import { PORTRAIT, LANDSCAPE, snapshot, findOrientationLocks, diff } from './helpers/orientation';

const sites = ['https://www.trr.se/privatperson/karriarvagledning/'];

for (const url of sites) {
  test.describe(`orientation: ${url}`, () => {
    test('no CSS locks orientation and content is equivalent in portrait and landscape', async ({ browser }) => {
      const load = async (viewport: { width: number; height: number }) => {
        const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        const [locks, snap] = [await findOrientationLocks(page), await snapshot(page)];
        await context.close();
        return { locks, snap };
      };

      // 1) Load in portrait and landscape
      const portrait = await load(PORTRAIT);
      const landscape = await load(LANDSCAPE);

      // 2) No CSS locking orientation
      expect.soft(portrait.locks, 'portrait orientation locks').toEqual([]);
      expect.soft(landscape.locks, 'landscape orientation locks').toEqual([]);

      // 3) Same interactive elements and same text
      expect.soft(landscape.snap.interactive.length, 'interactive element count').toBe(portrait.snap.interactive.length);
      expect.soft(diff(portrait.snap.interactive, landscape.snap.interactive), 'interactive only in portrait').toEqual([]);
      expect.soft(diff(landscape.snap.interactive, portrait.snap.interactive), 'interactive only in landscape').toEqual([]);
      expect.soft(diff(portrait.snap.text, landscape.snap.text), 'text only in portrait').toEqual([]);
      expect.soft(diff(landscape.snap.text, portrait.snap.text), 'text only in landscape').toEqual([]);
    });
  });
}
