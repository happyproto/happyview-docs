// Link style in the docs and blog sources. The build's link validator checks
// that every internal link and anchor resolves; this catches the shapes that
// broke the old site even where they happen to resolve today (see the
// happyview.dev audit, 2026-10-30):
// - relative links, which resolve differently with and without a trailing
//   slash (`./changelog` from /experimental/spaces went to /experimental/);
// - `.md` or `/index` left in a URL;
// - hard-coded localhost.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';

const root = new URL('../', import.meta.url).pathname;
const files = [...new Glob('src/content/{docs,blog}/**/*.{md,mdx}').scanSync(root)];

function links(text: string): string[] {
  const out: string[] = [];
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const prose = line.replace(/`[^`]*`/g, '');
    for (const m of prose.matchAll(/\]\(([^)\s]+)/g)) out.push(m[1]);
    for (const m of prose.matchAll(/href="([^"]+)"/g)) out.push(m[1]);
  }
  return out;
}

export function badLink(url: string): string | null {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) return 'localhost';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('#')) return null;
  if (!url.startsWith('/')) return 'relative';
  const path = url.split('#')[0];
  if (/\.mdx?$/.test(path)) return '.md in URL';
  if (/\/index\/?$/.test(path)) return '/index in URL';
  return null;
}

describe('badLink', () => {
  test('the audit cases', () => {
    expect(badLink('./changelog')).toBe('relative');
    expect(badLink('../spaces.md')).toBe('relative');
    expect(badLink('/docs/guides/http-api.md')).toBe('.md in URL');
    expect(badLink('/docs/guides/spaces/index')).toBe('/index in URL');
    expect(badLink('http://localhost:3000/api-reference/lua/record-api')).toBe('localhost');
    expect(badLink('/docs/guides/spaces#members')).toBeNull();
    expect(badLink('https://atproto.com')).toBeNull();
    expect(badLink('#on-first-boot')).toBeNull();
  });
});

describe('content links', () => {
  for (const file of files) {
    test(file, () => {
      const text = readFileSync(`${root}${file}`, 'utf8');
      const bad = links(text)
        .map((url) => [url, badLink(url)] as const)
        .filter(([, why]) => why);
      expect(bad).toEqual([]);
    });
  }
});
