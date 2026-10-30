// Each v3 docs page's Markdown source at its URL plus `.md`, for the "Copy as
// Markdown" button and for anyone who wants the source. The archived v2 pages
// are left out.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const getStaticPaths = (async () => {
  const docs = await getCollection('docs', (entry) => !entry.id.startsWith('docs/v2'));
  return docs.map((entry) => ({
    params: { slug: entry.id.replace(/\/index$/, '') },
    props: { title: entry.data.title, body: entry.body ?? '' },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(`# ${props.title}\n\n${props.body.replace(/^---\n[\s\S]*?\n---\n/, '')}`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
