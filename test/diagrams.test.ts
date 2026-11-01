// Every v3 diagram needs a title, because a Mermaid SVG has no text alternative
// without one. The v2 archive is frozen and exempt.
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Glob } from 'bun';

const root = new URL('../', import.meta.url).pathname;

test('every v3 mermaid diagram has an accTitle', () => {
  const untitled: string[] = [];
  for (const file of new Glob('src/content/docs/docs/**/*.{md,mdx}').scanSync(root)) {
    if (file.includes('/docs/v2/')) continue;
    const text = readFileSync(root + file, 'utf8');
    for (const [, body] of text.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
      if (!/^\s*accTitle:/m.test(body)) untitled.push(file);
    }
  }
  expect(untitled).toEqual([]);
});
