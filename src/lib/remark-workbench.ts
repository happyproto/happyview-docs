// Turns the fences the pages already use into the design system's workbench
// pieces, so no page needs new markup:
// - a ```text fence that draws a tree (├── and └──) becomes an hp-tree;
// - a ```sh or ```bash fence becomes an hp-term, and a ```text or ```json
//   fence straight after it becomes that terminal's result; a ```text fence
//   one paragraph after a terminal is what it printed, in a terminal of its
//   own;
// - a code fence whose first line is a comment naming a file becomes an
//   hp-editor holding the rest of the code, which Expressive Code still
//   highlights.
// Every other fence is left to Expressive Code.
//
// The pieces are mdast nodes carrying data.hName, which both Markdown and MDX
// turn into elements, so one pass serves both.
import type { Element, ElementContent, Properties } from 'hast';
import type { Code, Parent, Root, RootContent } from 'mdast';

type Child = ElementContent;
const h = (tagName: string, properties: Properties = {}, children: Child[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const t = (value: string): Child => ({ type: 'text', value });

/** An mdast node that becomes `tagName`, with hast children or mdast ones. */
const node = (tagName: string, properties: Properties, children: Child[] | RootContent[], hast = true) =>
  (hast
    ? { type: 'workbench', data: { hName: tagName, hProperties: properties, hChildren: children } }
    : { type: 'workbench', data: { hName: tagName, hProperties: properties }, children }) as unknown as RootContent;

// ---- Files -------------------------------------------------------------------

/** What a file is, for its mark's ink: the design system's data-type. */
export function fileType(name: string): string | undefined {
  if (/\.(lua|[cm]?[jt]s)$/.test(name)) return 'script';
  if (/\.(toml|lock)$/.test(name) || /^\.env/.test(name)) return 'config';
  if (/\.json$/.test(name)) return 'data';
  return undefined;
}

// ---- Trees -------------------------------------------------------------------

export type TreeNode = { name: string; note?: string; children: TreeNode[]; dir: boolean };

const BRANCH = /^((?:│ {3}| {4})*)(?:├── |└── )(.*)$/;

export const isTree = (code: Code) => (code.lang === 'text' || !code.lang) && /^(?:│ {3}| {4})*[├└]── /m.test(code.value);

/** Parse a drawn tree. Text after two or more spaces is the line's note. */
export function parseTree(text: string): TreeNode[] {
  const roots: TreeNode[] = [];
  const stack: TreeNode[] = [];
  const entry = (raw: string): TreeNode => {
    const [name = '', ...rest] = raw.trim().split(/\s{2,}/);
    const note = rest.join(' ').trim() || undefined;
    return { name, note, children: [], dir: name.endsWith('/') };
  };
  for (const line of text.replace(/\s+$/, '').split('\n')) {
    if (!line.trim()) continue;
    const m = BRANCH.exec(line);
    if (!m) {
      const root = entry(line);
      roots.push(root);
      stack.length = 0;
      stack.push(root);
      continue;
    }
    const depth = (m[1]?.length ?? 0) / 4 + 1;
    const item = entry(m[2] ?? '');
    stack.length = depth;
    const parent = stack[depth - 1];
    if (parent) {
      parent.children.push(item);
      parent.dir = true;
    } else roots.push(item);
    stack[depth] = item;
  }
  return roots;
}

/** A folder whose only child is a folder, with no note between, folds into one row. */
function fold(dir: TreeNode): { name: string; tail: string; node: TreeNode } {
  let node = dir;
  const segments: string[] = [];
  while (node.children.length === 1 && node.children[0]!.dir && !node.note && !node.children[0]!.note) {
    node = node.children[0]!;
    segments.push(node.name.replace(/\/$/, ''));
  }
  if (!segments.length) return { name: dir.name, tail: '', node };
  return { name: dir.name.replace(/\/$/, ''), tail: `/${segments.join('/')}/`, node };
}

function treeItems(nodes: TreeNode[]): Element {
  return h(
    'ul',
    {},
    nodes.map((item) => {
      const note = item.note ? [h('span', { className: ['hp-tree-note'] }, [t(item.note)])] : [];
      if (!item.dir) {
        const label = item.name.startsWith('.') ? h('span', { className: ['hp-tree-dim'] }, [t(item.name)]) : t(item.name);
        return h('li', { className: ['hp-tree-row'], dataType: fileType(item.name.replace(/^.*\//, '')) }, [label, ...note]);
      }
      const { name, tail, node: last } = fold(item);
      const row = [t(name), ...(tail ? [h('span', { className: ['hp-tree-fold'] }, [t(tail)])] : []), ...note];
      if (!last.children.length) return h('li', { className: ['hp-tree-row'], dataKind: 'dir' }, row);
      return h('li', {}, [
        h('details', { open: true }, [h('summary', { className: ['hp-tree-row'], dataKind: 'dir' }, row), treeItems(last.children)]),
      ]);
    }),
  );
}

export function tree(code: Code): RootContent {
  const roots = parseTree(code.value);
  const label = roots.length === 1 && roots[0]!.dir ? `Files in ${roots[0]!.name.replace(/\/$/, '')}` : 'Files';
  return node('figure', { className: ['hp-tree', 'not-content'], role: 'group', ariaLabel: label }, [treeItems(roots)]);
}

// ---- Terminals ---------------------------------------------------------------

const isShell = (code: Code) => code.lang === 'sh' || code.lang === 'bash' || code.lang === 'shell';
const isOutput = (code: Code) => code.lang === 'text' || code.lang === 'json' || !code.lang;

/** One shell word at a time: quoted strings, flags, and the rest. */
function words(line: string, program: boolean): Child[] {
  const out: Child[] = [];
  const re = /('[^']*'?|"(?:\\.|[^"\\])*"?)|(\s+)|([^\s'"]+)/g;
  let first = program;
  for (const m of line.matchAll(re)) {
    const [whole, quoted, space, word] = m;
    if (space) out.push(t(space));
    else if (quoted) out.push(h('span', { className: ['hp-term-string'] }, [t(quoted)]));
    else if (word) {
      if (first && !/^[A-Z_][A-Z0-9_]*=/.test(word)) {
        out.push(h('span', { className: ['hp-term-program'] }, [t(word)]));
        first = false;
      } else if (/^--?[A-Za-z]/.test(word)) out.push(h('span', { className: ['hp-term-flag'] }, [t(word)]));
      else out.push(t(word));
      // A pipe or a chain starts another command.
      if (/^(\||&&|\|\||;)$/.test(word)) first = true;
    } else out.push(t(whole));
  }
  return out;
}

export function commandLines(text: string): { lines: Element[]; copy: string } {
  const lines: Element[] = [];
  const copy: string[] = [];
  let continued = false;
  for (const line of text.replace(/\n+$/, '').split('\n')) {
    if (!continued && /^\s*#/.test(line)) {
      lines.push(h('span', { className: ['hp-term-line', 'hp-term-comment'] }, [t(line)]));
      continued = false;
      continue;
    }
    if (!line.trim()) {
      lines.push(h('span', { className: ['hp-term-line'] }, []));
      continued = false;
      continue;
    }
    lines.push(h('span', { className: continued ? ['hp-term-line'] : ['hp-term-line', 'hp-term-cmd'] }, words(line, !continued)));
    copy.push(line);
    continued = /\\$/.test(line);
  }
  return { lines, copy: copy.join('\n') };
}

/** Lines hpy prints that carry a state. */
export function lineState(line: string): 'done' | 'warning' | 'failed' | undefined {
  if (/^(built in |✓ )/.test(line)) return 'done';
  if (/(^error\b|build failed)/i.test(line)) return 'failed';
  if (/(^warning\b|restart required)/i.test(line)) return 'warning';
  return undefined;
}

export function outputLines(text: string): Element[] {
  return text
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => {
      const state = lineState(line);
      return state
        ? h('span', { className: ['hp-term-line'], dataState: state }, [h('span', {}, [t(line)])])
        : h('span', { className: ['hp-term-line', 'hp-term-out'] }, [t(line)]);
    });
}

export function terminal(command: Code, output?: Code): RootContent {
  const { lines, copy } = commandLines(command.value);
  const children: Child[] = [
    h('figcaption', { className: ['hp-term-bar'] }, [
      h('span', { className: ['hp-term-title'] }, [t('Terminal')]),
      ...(copy
        ? [h('button', { className: ['hp-term-copy'], type: 'button', dataCopy: copy, hidden: true }, [t('Copy')])]
        : []),
    ]),
    h('pre', { className: ['hp-term-body'], tabIndex: 0 }, lines),
  ];
  if (output) {
    children.push(
      h('div', { className: ['hp-term-result'] }, [
        h('p', { className: ['hp-term-result-label'] }, [t('Output')]),
        h('pre', { className: ['hp-term-body'], tabIndex: 0 }, outputLines(output.value)),
      ]),
    );
  }
  return marked(node('figure', { className: ['hp-term', 'not-content'] }, children));
}

/** What a command printed, when the page explains it between the two. */
export function output(code: Code): RootContent {
  return marked(
    node('figure', { className: ['hp-term', 'not-content'] }, [
      h('figcaption', { className: ['hp-term-bar'] }, [h('span', { className: ['hp-term-title'] }, [t('Output')])]),
      h('pre', { className: ['hp-term-body'], tabIndex: 0 }, outputLines(code.value)),
    ]),
  );
}

const marked = (piece: RootContent) => {
  (piece.data as Record<string, unknown>).terminal = true;
  return piece;
};
const isTerminal = (piece: RootContent | undefined) => Boolean((piece?.data as Record<string, unknown> | undefined)?.terminal);

// ---- Editors -----------------------------------------------------------------

const PATH_COMMENT = /^(?:--|\/\/|#)\s+((?:[\w.@-]+\/)*[\w.@-]+\.(?:lua|[cm]?[jt]s|json|toml))\s*$/;

/** The file a code fence names on its first line, if it names one. */
export function namedFile(code: Code): string | undefined {
  if (!code.lang || isShell(code) || code.lang === 'text' || code.lang === 'mermaid') return undefined;
  return PATH_COMMENT.exec(code.value.split('\n', 1)[0] ?? '')?.[1];
}

export function editor(code: Code, path: string): RootContent {
  const parts = path.split('/');
  const file = parts.pop()!;
  const crumbs: Child[] = parts.flatMap((part) => [t(part), t(' › ')]);
  const body: Code = { ...code, value: code.value.split('\n').slice(1).join('\n').replace(/^\n+/, '') };
  return node(
    'figure',
    { className: ['hp-editor', 'not-content'], role: 'group', ariaLabel: path },
    [
      node(
        'div',
        { className: ['hp-editor-pane'] },
        [
          node('div', { className: ['hp-editor-tabs'] }, [
            h('span', { className: ['hp-editor-tab'], dataType: fileType(file) }, [t(file)]),
          ]),
          ...(parts.length ? [node('p', { className: ['hp-editor-path'] }, [...crumbs, h('b', {}, [t(file)])])] : []),
          node('div', { className: ['hp-editor-body'] }, [body], false),
        ],
        false,
      ),
    ] as RootContent[],
    false,
  );
}

// ---- The pass ----------------------------------------------------------------

function upgrade(parent: Parent) {
  const children = parent.children as RootContent[];
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    if (child.type !== 'code') {
      if ('children' in child && Array.isArray(child.children)) upgrade(child as Parent);
      continue;
    }
    if (isTree(child)) {
      children[i] = tree(child);
    } else if (child.lang === 'text' && children[i - 1]?.type === 'paragraph' && isTerminal(children[i - 2])) {
      // A command, a sentence about what it prints, then the print.
      children[i] = output(child);
    } else if (isShell(child)) {
      const next = children[i + 1];
      const output = next?.type === 'code' && isOutput(next) && !isTree(next) ? next : undefined;
      children.splice(i, output ? 2 : 1, terminal(child, output));
    } else {
      const path = namedFile(child);
      if (path) children[i] = editor(child, path);
    }
  }
}

export function remarkWorkbench() {
  return (tree: Root) => upgrade(tree);
}
