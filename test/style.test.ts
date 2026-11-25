// No em or en dashes in v3 docs prose. Code is exempt, and generated
// changelogs quote release notes as written.
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';
import { prose } from '../src/lib/glossary-check';

const root = new URL('../', import.meta.url).pathname;

test('v3 docs prose has no em or en dashes', () => {
  const dashed: string[] = [];
  for (const page of new Glob('src/content/docs/docs/**/*.{md,mdx}').scanSync(root)) {
    if (/changelog\.md$/.test(page)) continue;
    if (/[—–]/.test(prose(readFileSync(root + page, 'utf8')))) dashed.push(page);
  }
  expect(dashed).toEqual([]);
});
