// Wraps each Markdown table in a scroller that names itself after the heading
// above it, and labels each cell with its column so that CSS can stack a table
// when its column is narrow. Stacking changes the display of every
// table part, which drops their table semantics, so those tables state their
// roles outright.
import type { Element, ElementContent, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

const text = (node: ElementContent | Element): string =>
  node.type === 'text' ? node.value : 'children' in node ? node.children.map(text).join('') : '';

const elements = (node: Element, ...tags: string[]) =>
  node.children.filter((child): child is Element => child.type === 'element' && tags.includes(child.tagName));

// A name in the first column stays whole, except that a long variable name
// may break after an underscore.
function holdName(cell: Element) {
  for (const code of elements(cell, 'code')) {
    const [only] = code.children;
    if (code.children.length !== 1 || only.type !== 'text' || /\s/.test(only.value)) continue;
    if (only.value.includes('_')) {
      code.children = only.value.split(/(?<=_)/).flatMap((part, i): ElementContent[] => [
        ...(i ? [{ type: 'element', tagName: 'wbr', properties: {}, children: [] } as Element] : []),
        { type: 'text', value: part },
      ]);
    } else {
      code.properties.className = ['name'];
    }
  }
}

function labelCells(table: Element) {
  const thead = elements(table, 'thead')[0];
  const headRow = thead && elements(thead, 'tr')[0];
  const columns = headRow ? elements(headRow, 'th', 'td').map((cell) => text(cell).trim()) : [];
  if (columns.length < 2) return;

  table.properties.className = ['stack'];
  table.properties.role = 'table';
  for (const section of elements(table, 'thead', 'tbody')) {
    section.properties.role = 'rowgroup';
    for (const row of elements(section, 'tr')) {
      row.properties.role = 'row';
      elements(row, 'th', 'td').forEach((cell, i) => {
        cell.properties.role = cell.tagName === 'th' ? 'columnheader' : 'cell';
        if (cell.tagName === 'td' && columns[i]) cell.properties.dataLabel = columns[i];
        if (cell.tagName === 'td' && i === 0) holdName(cell);
      });
    }
  }
}

export function rehypeTables() {
  return (tree: Root) => {
    let heading = '';
    visit(tree, 'element', (node, index, parent) => {
      if (/^h[1-6]$/.test(node.tagName)) heading = text(node).trim();
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      labelCells(node);
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          role: 'region',
          tabIndex: 0,
          ariaLabel: heading ? `Table: ${heading}` : 'Table',
        },
        children: [node],
      };
      return [SKIP, index + 1];
    });
  };
}
