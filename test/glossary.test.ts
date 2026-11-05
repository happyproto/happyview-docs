// The words GLOSSARY.md says to avoid don't appear in v3 docs prose
// (docs/adr/0004). Code, inline code, bold UI labels and link targets are
// exempt, so a config key such as `superadmin` or a
// dashboard button such as **Retry all matching** can still be named.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';
import { avoided } from '../src/lib/glossary-check';

describe('avoided', () => {
  test('catches prose, spares code, labels and links', () => {
    expect(avoided('The super user can do anything.')).toHaveLength(1);
    expect(avoided('Set `superadmin = "did:plc:x"`.')).toEqual([]);
    expect(avoided('Press **Retry all matching**.')).toEqual([]);
    expect(avoided('```lua\n-- a record hook\n```')).toEqual([]);
    expect(avoided('A webhook fires.')).toEqual([]);
    expect(avoided("Only the key's owner can use it.")).toEqual([]);
    expect(avoided('Ask the instance owner.')).toHaveLength(1);
  });
});

const root = new URL('../', import.meta.url).pathname;
const pages = [...new Glob('src/content/docs/docs/**/*.{md,mdx}').scanSync(root)].filter(
  (p) => !/changelog\.md$/.test(p),
);

describe('v3 docs prose', () => {
  for (const page of pages) {
    test(page, () => {
      expect(avoided(readFileSync(`${root}${page}`, 'utf8'))).toEqual([]);
    });
  }
});
