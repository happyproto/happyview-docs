// remark-workbench turns the fences pages already use into the design
// system's terminal, tree and editor. These pin what it reads from a fence
// and what it leaves alone, using the shapes the getting-started pages use.
import { describe, expect, test } from 'bun:test';
import type { Element, Root as HastRoot } from 'hast';
import type { Root } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toHast } from 'mdast-util-to-hast';
import { commandLines, lineState, namedFile, parseTree, remarkWorkbench } from '../src/lib/remark-workbench';

/** Markdown in, the hast the page would get. */
function render(markdown: string): HastRoot {
  const tree = fromMarkdown(markdown) as Root;
  remarkWorkbench()(tree);
  return toHast(tree) as HastRoot;
}

const elements = (node: HastRoot | Element): Element[] =>
  node.children.flatMap((child) => (child.type === 'element' ? [child, ...elements(child)] : []));
const byClass = (root: HastRoot, name: string) =>
  elements(root).filter((el) => ([] as unknown[]).concat(el.properties.className ?? []).includes(name));
const text = (node: Element): string =>
  node.children.map((child) => (child.type === 'text' ? child.value : child.type === 'element' ? text(child) : '')).join('');

const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```\n';

describe('trees', () => {
  const drawn = [
    'my-app/',
    '├── happyview.toml         settings, interpreters and libraries',
    '├── .env.example',
    '└── src/',
    '    └── lexicons/',
    '        └── com/',
    '            └── example/',
    '                ├── hello.json',
    '                └── hello.lua',
  ].join('\n');

  test('reads names, notes and nesting', () => {
    const [root] = parseTree(drawn);
    expect(root!.name).toBe('my-app/');
    expect(root!.children.map((c) => c.name)).toEqual(['happyview.toml', '.env.example', 'src/']);
    expect(root!.children[0]!.note).toBe('settings, interpreters and libraries');
    expect(root!.children[2]!.children[0]!.children[0]!.children[0]!.children.map((c) => c.name)).toEqual([
      'hello.json',
      'hello.lua',
    ]);
  });

  test('renders an hp-tree, folding a chain of single folders into one row', () => {
    const page = render(fence('text', drawn));
    expect(byClass(page, 'hp-tree')).toHaveLength(1);
    const fold = byClass(page, 'hp-tree-fold');
    expect(fold.map(text)).toEqual(['/lexicons/com/example/']);
    const rows = byClass(page, 'hp-tree-row');
    expect(rows.find((r) => text(r).startsWith('hello.lua'))?.properties.dataType).toBe('script');
    expect(rows.find((r) => text(r).startsWith('happyview.toml'))?.properties.dataType).toBe('config');
    expect(byClass(page, 'hp-tree-note').map(text)).toEqual(['settings, interpreters and libraries']);
    expect(byClass(page, 'hp-tree-dim').map(text)).toEqual(['.env.example']);
  });

  test('leaves a text fence that draws no tree alone', () => {
    const page = render(fence('text', 'hpy happyview dev [--locked]'));
    expect(byClass(page, 'hp-tree')).toHaveLength(0);
    expect(byClass(page, 'hp-term')).toHaveLength(0);
  });
});

describe('terminals', () => {
  test('copies the commands, without comments, keeping continued lines', () => {
    const { copy, lines } = commandLines('# Start it\ncd my-app\ncurl -X POST "http://x" \\\n  -H "$AUTH"');
    expect(copy).toBe('cd my-app\ncurl -X POST "http://x" \\\n  -H "$AUTH"');
    const kinds = lines.map((l) => ([] as unknown[]).concat(l.properties.className));
    expect(kinds).toEqual([
      ['hp-term-line', 'hp-term-comment'],
      ['hp-term-line', 'hp-term-cmd'],
      ['hp-term-line', 'hp-term-cmd'],
      ['hp-term-line'],
    ]);
  });

  test('marks the program, flags and strings', () => {
    const [line] = commandLines(`PORT=4000 hpy happyview dev --locked 'a b'`).lines;
    const classed = (name: string) => elements({ type: 'root', children: [line!] }).filter((e) =>
      ([] as unknown[]).concat(e.properties.className ?? []).includes(name),
    );
    expect(classed('hp-term-program').map(text)).toEqual(['hpy']);
    expect(classed('hp-term-flag').map(text)).toEqual(['--locked']);
    expect(classed('hp-term-string').map(text)).toEqual(["'a b'"]);
  });

  test('a fence right after a command is its result', () => {
    const page = render(fence('sh', "curl 'http://127.0.0.1:3000/xrpc/com.example.hello?name=Ada'") + '\n' + fence('text', '{"message":"Hello, Ada!"}'));
    expect(byClass(page, 'hp-term')).toHaveLength(1);
    expect(byClass(page, 'hp-term-result').map(text).join('')).toContain('Hello, Ada!');
  });

  test('a fence one sentence after a command is its output, in a terminal of its own', () => {
    const page = render(fence('sh', 'hpy happyview dev') + '\nWhen it is ready, it prints:\n\n' + fence('text', 'dashboard: http://127.0.0.1:3000/dashboard/'));
    const terms = byClass(page, 'hp-term');
    expect(terms).toHaveLength(2);
    expect(text(byClass(page, 'hp-term-title')[1]!)).toBe('Output');
    expect(byClass(page, 'hp-term-copy')).toHaveLength(1);
  });

  test('names the states hpy prints', () => {
    expect(lineState('built in 12 ms: src/x.lua')).toBe('done');
    expect(lineState('build failed; still serving the previous build')).toBe('failed');
    expect(lineState('happyview.toml: restart required to apply')).toBe('warning');
    expect(lineState('dashboard: http://127.0.0.1:3000/dashboard/')).toBeUndefined();
  });
});

describe('editors', () => {
  test('a fence whose first line names its file opens in an editor, without that line', () => {
    const page = render(fence('lua', '-- src/lexicons/com/example/hello.lua\nfunction handle(input, ctx)\nend'));
    expect(byClass(page, 'hp-editor')).toHaveLength(1);
    expect(text(byClass(page, 'hp-editor-tab')[0]!)).toBe('hello.lua');
    expect(byClass(page, 'hp-editor-tab')[0]!.properties.dataType).toBe('script');
    const code = elements(page).find((e) => e.tagName === 'code')!;
    expect(text(code)).toBe('function handle(input, ctx)\nend\n');
  });

  test('only a comment that is a path names a file', () => {
    expect(namedFile({ type: 'code', lang: 'ts', value: '// Read a record\nconst x = 1' })).toBeUndefined();
    expect(namedFile({ type: 'code', lang: 'js', value: '// src/jobs/export.js\nexport default {}' })).toBe('src/jobs/export.js');
    expect(namedFile({ type: 'code', lang: 'sh', value: '# src/run.lua' })).toBeUndefined();
  });
});
