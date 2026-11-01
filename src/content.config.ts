import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Pages to read first, as paths such as /docs/getting-started/scripts.
        prerequisites: z.array(z.string()).optional(),
      }),
    }),
  }),
  blog: defineCollection({
    // The file name is the post's URL, dots included (/blog/happyview-2.10),
    // as it was on the old site; the default id would drop the dots.
    loader: glob({
      base: './src/content/blog',
      pattern: '*.md',
      generateId: ({ entry }) => entry.replace(/\.md$/, ''),
    }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      date: z.coerce.date(),
      author: z.object({ name: z.string(), avatar: z.string() }),
      tags: z.array(z.string()).default([]),
      atUri: z.string().optional(),
    }),
  }),
};
