// Turns ```mermaid fences into <pre class="mermaid"> so they skip syntax
// highlighting; the script in PageTitle renders them in the browser.
import type { Code, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function remarkMermaid() {
  return (tree: Root, file: { path?: string }) => {
    // MDX has no raw HTML node, so it gets a JSX element instead.
    const mdx = file.path?.endsWith('.mdx');
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      parent.children[index] = (mdx
        ? {
            type: 'mdxJsxFlowElement',
            name: 'pre',
            attributes: [{ type: 'mdxJsxAttribute', name: 'className', value: 'mermaid' }],
            children: [{ type: 'text', value: node.value }],
          }
        : { type: 'html', value: `<pre class="mermaid">${escape(node.value)}</pre>` }) as RootContent;
    });
  };
}
