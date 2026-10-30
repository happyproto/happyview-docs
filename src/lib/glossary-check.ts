// The words GLOSSARY.md says to avoid, as the build checks them
// (docs/adr/0004), and the prose they're checked in.
//
// Only words that can't be innocent in prose are enforced. "Owner" is
// enforced only as the owner of an instance: a repo's or an API key's owner is
// a different, correct use. Server, handler, schema, module and permission
// are guidance for reviewers, not checked here.
export const AVOIDED: { pattern: RegExp; use: string }[] = [
  { pattern: /\bsuper[- ]?users?\b/i, use: 'operator, or the superadmin privilege' },
  { pattern: /\bsuper[- ]admins?\b/i, use: 'superadmin (the privilege), or operator' },
  { pattern: /\b(instance|HappyView)['’]?s? owners?\b/i, use: 'operator' },
  { pattern: /\badmin users?\b/i, use: 'operator' },
  { pattern: /\btenants?\b/i, use: 'instance' },
  { pattern: /\b(record )?hooks?\b/i, use: 'record script (or query, procedure, label, job script)' },
  { pattern: /\bevent handlers?\b/i, use: 'record script or label script' },
  { pattern: /\bWASM plugins?\b/i, use: 'plugin' },
  { pattern: /\bmarketplace\b/i, use: 'registry' },
  { pattern: /\bplugin store\b/i, use: 'registry' },
];

// Product text quoted as it stands, and other meanings of an avoided word:
// a permission's description from HappyView's own table, the JS SDK's
// `sessionHooks` API, and GitHub Marketplace.
export const ALLOWED_PHRASES = [
  /View failed hook executions/g,
  /session event hooks/gi,
  /event hooks for session lifecycle events/gi,
  /GitHub Marketplace/g,
];

// Prose only: drop fenced code, inline code, bold UI labels, link targets,
// HTML/JSX tags, comments and frontmatter.
export function prose(text: string): string {
  return text
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^([ \t]*)(`{3,}|~{3,})[\s\S]*?^\1\2[ \t]*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\*\*[^*\n]+\*\*/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>\n]+>/g, '')
    .replace(new RegExp(ALLOWED_PHRASES.map((p) => p.source).join('|'), 'gi'), '');
}

export function avoided(text: string): string[] {
  const found: string[] = [];
  for (const line of prose(text).split('\n')) {
    for (const { pattern, use } of AVOIDED) {
      const m = line.match(pattern);
      if (m) found.push(`"${m[0]}" (use ${use}): ${line.trim().slice(0, 100)}`);
    }
  }
  return found;
}
