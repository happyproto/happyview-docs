import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import { redirectsFile } from './src/integrations/redirects-file.ts';
import { rehypeCallouts } from './src/lib/rehype-callouts.ts';
import { rehypeTables } from './src/lib/rehype-tables.ts';
import { remarkMermaid } from './src/lib/remark-mermaid.ts';
import { remarkWorkbench } from './src/lib/remark-workbench.ts';
import { v3Sidebar } from './src/sidebar.ts';
import v2Sidebar from './src/v2-sidebar.json' with { type: 'json' };

export default defineConfig({
  site: 'https://happyview.dev',
  markdown: { processor: unified({ remarkPlugins: [remarkMermaid, remarkWorkbench], rehypePlugins: [rehypeTables, rehypeCallouts] }) },
  vite: { plugins: [tailwindcss()] },
  integrations: [
    starlight({
      title: 'HappyView',
      description: 'An open-source AppView for atproto.',
      logo: {
        light: './src/assets/logo.light.webp',
        dark: './src/assets/logo.dark.webp',
        replacesTitle: true,
      },
      favicon: '/img/favicon.png',
      // Code sits on the surface with no frame of its own; shell sessions,
      // trees and named files are the design system's pieces instead (see
      // remark-workbench).
      expressiveCode: {
        styleOverrides: {
          borderWidth: '0px',
          borderRadius: 'var(--hp-radius-lg)',
          codeBackground: 'var(--hp-color-surface)',
          frames: {
            frameBoxShadowCssValue: 'none',
            editorTabBarBackground: 'var(--hp-color-surface-raised)',
            editorActiveTabBackground: 'var(--hp-color-surface)',
            editorTabBarBorderBottomColor: 'transparent',
          },
        },
      },
      editLink: {
        baseUrl: 'https://github.com/happyproto/happyview-docs/edit/main/',
      },
      lastUpdated: true,
      customCss: [
        '@happyview/design-system/tokens.css',
        '@happyview/design-system/components.css',
        './src/styles/focus.css',
        './src/styles/docs.css',
      ],
      components: {
        Footer: './src/components/overrides/Footer.astro',
        Header: './src/components/overrides/Header.astro',
        MobileMenuFooter: './src/components/overrides/MobileMenuFooter.astro',
        PageTitle: './src/components/overrides/PageTitle.astro',
      },
      plugins: [
        starlightSidebarTopics(
          [
            {
              id: 'v3',
              label: 'v3',
              link: '/docs/',
              icon: 'rocket',
              badge: { text: 'Alpha', variant: 'tip' },
              items: v3Sidebar,
            },
            {
              id: 'v2',
              label: 'v2',
              link: '/docs/v2/',
              icon: 'document',
              badge: { text: 'Archived', variant: 'default' },
              items: v2Sidebar,
            },
          ],
          {
            // Pages reachable only by link: the generated SDK changelogs
            // (linked from each SDK's page) and v2's orphans.
            topics: { v3: ['/docs/reference/sdk/*/changelog'], v2: ['/docs/v2/**'] },
          },
        ),
        starlightLinksValidator({
          // Pages that aren't Starlight's: the landing page and the blog.
          exclude: ['/', '/blog', '/blog/**'],
        }),
        starlightLlmsTxt({
          projectName: 'HappyView',
          description:
            'HappyView is an open-source AppView for atproto: each lexicon becomes an XRPC endpoint, and scripts in Lua, JavaScript or TypeScript decide what it answers.',
          exclude: ['docs/v2/**'],
        }),
      ],
    }),
    // The OAuth callback is a redirect step, not a page to find.
    sitemap({ filter: (page) => !page.endsWith('/oauth/callback/') }),
    react(),
    redirectsFile(),
  ],
});
