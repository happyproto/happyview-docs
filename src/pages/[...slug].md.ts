// Each v3 docs page as Markdown at its URL plus `.md`, for the "Copy as
// Markdown" button and for anyone who wants the text.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { mdxToMarkdown } from '../lib/mdx-to-markdown';

export const getStaticPaths = (async () => {
  const docs = await getCollection('docs');
  return docs.map((entry) => ({
    params: { slug: entry.id.replace(/\/index$/, '') },
    props: { title: entry.data.title, body: entry.body ?? '' },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(`# ${props.title}\n\n${mdxToMarkdown(props.body.replace(/^---\n[\s\S]*?\n---\n/, ''))}`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
