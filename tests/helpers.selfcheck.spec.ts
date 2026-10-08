import { test, expect } from '@playwright/test';
import { snapshot, findOrientationLocks, diff } from './helpers/orientation';

const css = (extra: string) => `<style>${extra}</style><a href="#">A</a><button>B</button><p>Hello</p>`;

test('helpers: clean page has no locks and identical snapshots', async ({ page }) => {
  await page.setContent(css('@media (orientation: landscape){ p{color:red} }'));
  expect(await findOrientationLocks(page)).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  const a = await snapshot(page);
  await page.setViewportSize({ width: 844, height: 390 });
  const b = await snapshot(page);
  expect(diff(a.interactive, b.interactive)).toEqual([]);
  expect(diff(a.text, b.text)).toEqual([]);
  expect(a.interactive).toHaveLength(2);
});

test('helpers: detects rotate lock and orientation-dependent content', async ({ page }) => {
  await page.setContent(css('@media (orientation: landscape){ body{transform:rotate(90deg)} } @media (max-height:400px){ button{display:none} }'));
  expect((await findOrientationLocks(page)).join()).toContain('rotate');
  await page.setViewportSize({ width: 390, height: 844 });
  const a = await snapshot(page);
  await page.setViewportSize({ width: 844, height: 390 });
  const b = await snapshot(page);
  expect(diff(a.interactive, b.interactive)).toEqual(['button|B']);
});
