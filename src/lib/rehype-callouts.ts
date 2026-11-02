// Starlight's asides, drawn as the design system's callouts: the same
// <aside>, its title and its content, with the kind as data-kind and
// Starlight's icon dropped, since hp-callout draws its own mark for each kind.
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

const KINDS: Record<string, string | undefined> = { note: undefined, tip: 'tip', caution: 'caution', danger: 'danger' };

const classes = (node: Element): string[] => {
  const value = node.properties.className;
  return Array.isArray(value) ? value.map(String) : value ? String(value).split(/\s+/) : [];
};

export function rehypeCallouts() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'aside') return;
      const variant = classes(node)
        .map((name) => /^starlight-aside--(\w+)$/.exec(name)?.[1])
        .find(Boolean);
      if (!variant || !(variant in KINDS)) return;
      node.properties.className = [...classes(node), 'hp-callout'];
      if (KINDS[variant]) node.properties.dataKind = KINDS[variant];
      for (const child of node.children) {
        if (child.type !== 'element' || !classes(child).includes('starlight-aside__title')) continue;
        child.properties.className = [...classes(child), 'hp-callout-title'];
        child.children = child.children.filter(
          (part) => !(part.type === 'element' && (part.tagName === 'svg' || classes(part).includes('starlight-aside__icon'))),
        );
      }
    });
  };
}
