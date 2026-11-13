// Writes dist/_redirects, the file wisp.place reads for server-side redirects
// (https://docs.wisp.place/redirects/). Every URL the site served before the
// move to /docs keeps working as a 301, and every v2 URL goes to
// v2.happyview.dev. The map is src/redirects.json; the frozen-URL test in test/
// checks that it covers every old URL.
import { writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';
import redirects from '../redirects.json' with { type: 'json' };

export function redirectLines(map: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const [from, to] of Object.entries(map)) {
    lines.push(`${from} ${to} 301`);
    // The old site answered with and without a trailing slash. A splat already
    // matches both, and wisp drops a rule with anything after its splat.
    if (from !== '/' && !from.endsWith('/') && !from.endsWith('*') && !(`${from}/` in map)) {
      lines.push(`${from}/ ${to} 301`);
    }
  }
  return lines;
}

export function redirectsFile(): AstroIntegration {
  return {
    name: 'happyview-redirects-file',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        await writeFile(new URL('_redirects', dir), redirectLines(redirects).join('\n') + '\n');
      },
    },
  };
}
