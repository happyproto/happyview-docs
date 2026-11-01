import { expect, test } from 'bun:test';
import { mdxToMarkdown } from '../src/lib/mdx-to-markdown';

test('drops component syntax and keeps the content', () => {
  const source = [
    "import { Tabs, TabItem } from '@astrojs/starlight/components';",
    '',
    '<Tabs syncKey="lang">',
    '  <TabItem label="cURL">',
    '```sh',
    'curl https://example.test',
    '```',
    '  </TabItem>',
    '</Tabs>',
    '',
    '<CardGrid>',
    '  <LinkCard title="Build" href="/docs/" description="Start here." />',
    '</CardGrid>',
  ].join('\n');
  expect(mdxToMarkdown(source)).toBe(
    ['', '**cURL**', '', '```sh', 'curl https://example.test', '```', '', '- [Build](/docs/): Start here.'].join('\n'),
  );
});

test('leaves fenced samples of the same syntax alone', () => {
  const source = '```mdx\n<Tabs>\nimport x from "y"\n</Tabs>\n```';
  expect(mdxToMarkdown(source)).toBe(source);
});
