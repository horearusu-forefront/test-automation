import type { Page } from '@playwright/test';

export const PORTRAIT = { width: 390, height: 844 };
export const LANDSCAPE = { width: 844, height: 390 };

export interface Snapshot {
  interactive: string[];
  text: string[];
}

/** Interactive elements and visible text lines currently exposed on the page. */
export async function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return false;
      if (el.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const selector =
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, ' +
      '[role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], ' +
      '[role="menuitem"], [role="switch"], [role="combobox"], [tabindex]:not([tabindex^="-"])';
    const interactive = [...document.querySelectorAll(selector)]
      .filter(visible)
      .map((el) => {
        const name =
          norm(el.getAttribute('aria-label')) ||
          norm((el as HTMLElement).innerText) ||
          norm(el.getAttribute('title')) ||
          norm(el.getAttribute('placeholder')) ||
          norm(el.getAttribute('name'));
        return `${el.tagName.toLowerCase()}|${name}`;
      });

    const text = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = norm(n.nodeValue);
      const p = n.parentElement;
      if (t && p && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName) && visible(p)) text.add(t);
    }
    return { interactive, text: [...text] };
  });
}

/** Heuristics for CSS that forces a single orientation. Returns human-readable findings. */
export async function findOrientationLocks(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const findings: string[] = [];
    const rotates = /rotate\(\s*-?(90|270)deg|rotate\(\s*-?0?\.25turn|rotate:\s*-?(90|270)deg/;
    const hides = /(display\s*:\s*none|visibility\s*:\s*hidden)/;
    const rootish = /^(html|body|main|#root|#app|#__next|#__nuxt)\b/;

    const walk = (rules: CSSRuleList, underOrientation: string | null, sheet: string) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) {
          const cond = rule.conditionText || rule.media.mediaText;
          walk(rule.cssRules, /orientation\s*:/.test(cond) ? cond : underOrientation, sheet);
        } else if (rule instanceof CSSStyleRule) {
          const css = rule.style.cssText;
          const sel = rule.selectorText.trim();
          if (underOrientation && rotates.test(css)) {
            findings.push(`[${sheet}] rotate under (${underOrientation}): ${sel}`);
          }
          if (underOrientation && rootish.test(sel) && hides.test(css)) {
            findings.push(`[${sheet}] hides ${sel} under (${underOrientation})`);
          }
          if (underOrientation && /rotate|orientation|landscape|portrait/i.test(sel) && hides.test(css) === false && /display\s*:\s*(block|flex)/.test(css)) {
            findings.push(`[${sheet}] shows rotate-device overlay "${sel}" under (${underOrientation})`);
          }
        } else if ('cssRules' in rule) {
          walk((rule as CSSGroupingRule).cssRules, underOrientation, sheet);
        }
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin stylesheet, rules not readable
      }
      walk(rules, null, sheet.href ?? 'inline');
    }

    for (const el of [document.documentElement, document.body]) {
      const t = getComputedStyle(el).transform;
      if (t && t !== 'none') findings.push(`<${el.tagName.toLowerCase()}> has computed transform ${t}`);
      const wm = getComputedStyle(el).writingMode;
      if (wm && wm !== 'horizontal-tb') findings.push(`<${el.tagName.toLowerCase()}> has writing-mode ${wm}`);
    }
    return findings;
  });
}

export function diff(a: string[], b: string[]) {
  const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const ca = count(a);
  const cb = count(b);
  const out: string[] = [];
  for (const [k, n] of ca) if ((cb.get(k) ?? 0) < n) out.push(k);
  return out;
}
