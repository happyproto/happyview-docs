// Every URL the old site served must still answer: as a page in the build, or
// as a redirect to one. Runs against dist/, so build first.
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import redirects from '../src/redirects.json' with { type: 'json' };
import { redirectLines } from '../src/integrations/redirects-file';

const dist = new URL('../dist/', import.meta.url);
const legacy = readFileSync(new URL('legacy-urls.txt', import.meta.url), 'utf8')
  .split('\n')
  .filter((line) => line && !line.startsWith('#'));
const map = redirects as Record<string, string>;

// A target outside the site (v2.happyview.dev, HappyView's CONTRIBUTING.md)
// isn't checked here.
const external = (url: string) => /^https?:\/\//.test(url);

const built = (url: string) => {
  if (external(url)) return true;
  const path = url.split('#')[0].replace(/^\//, '').replace(/\/$/, '');
  return existsSync(new URL(path ? `${path}/index.html` : 'index.html', dist)) || existsSync(new URL(path, dist));
};

describe('legacy URLs', () => {
  test('dist/ exists', () => {
    expect(existsSync(new URL('index.html', dist))).toBe(true);
  });

  for (const url of legacy) {
    test(url, () => {
      const target = map[url];
      if (target === undefined) {
        expect(built(url)).toBe(true);
        return;
      }
      // One hop: a redirect lands on a page, never on another redirect.
      expect(map[target]).toBeUndefined();
      expect(built(target)).toBe(true);
    });
  }
});

describe('redirect map', () => {
  test('every target is a built page', () => {
    const missing = Object.values(map).filter((target) => !built(target));
    expect(missing).toEqual([]);
  });

  test('dist/_redirects carries every rule, with and without a trailing slash', () => {
    const file = readFileSync(new URL('_redirects', dist), 'utf8');
    expect(redirectLines({ '/a/b': '/docs/c' })).toEqual(['/a/b /docs/c 301', '/a/b/ /docs/c 301']);
    expect(redirectLines({ '/a/*': 'https://x.test/:splat' })).toEqual(['/a/* https://x.test/:splat 301']);
    expect(redirectLines({ '/a/': 'https://x.test/a', '/a': 'https://x.test' })).toEqual([
      '/a/ https://x.test/a 301',
      '/a https://x.test 301',
    ]);
    const lines = new Set(file.split('\n'));
    const missing = redirectLines(map).filter((line) => !lines.has(line));
    expect(missing).toEqual([]);
  });
});
