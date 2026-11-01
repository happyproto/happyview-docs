// Turns a docs page's MDX source into plain Markdown: a reader or an LLM
// pasting a page has no use for its component imports or tags. Fenced code
// passes through untouched, since a sample may show the same syntax.
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

export function mdxToMarkdown(source: string): string {
  let fence: string | null = null;
  const out: string[] = [];
  for (const line of source.split('\n')) {
    const marker = line.match(/^\s*(```+|~~~+)/)?.[1];
    if (fence) {
      if (marker?.startsWith(fence)) fence = null;
      out.push(line);
      continue;
    }
    if (marker) {
      fence = marker;
      out.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (/^import\s.+\sfrom\s+['"].+['"];?$/.test(trimmed)) continue;
    if (/^<\/?(Tabs|CardGrid)\b[^>]*>$/.test(trimmed) || trimmed === '</TabItem>') continue;
    if (trimmed.startsWith('<TabItem')) {
      out.push(`**${attr(trimmed, 'label') ?? ''}**`, '');
      continue;
    }
    if (trimmed.startsWith('<LinkCard')) {
      const description = attr(trimmed, 'description');
      out.push(`- [${attr(trimmed, 'title')}](${attr(trimmed, 'href')})${description ? `: ${description}` : ''}`);
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
