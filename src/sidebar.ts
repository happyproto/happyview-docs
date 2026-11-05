// The v3 sidebar. Getting started and the tutorial are in learning order;
// every other group is ordered for scanning. A page that isn't listed here
// builds, but is reachable only by link, so add new pages here.
import type { StarlightUserConfig } from '@astrojs/starlight/types';

type Sidebar = NonNullable<StarlightUserConfig['sidebar']>;

const d = (slug: string) => (slug ? `docs/${slug}` : 'docs');

export const v3Sidebar: Sidebar = [
  {
    label: 'Getting started',
    items: [
      { label: 'Overview', slug: d('') },
      d('getting-started/installation'),
      d('getting-started/quickstart'),
      { label: 'Run your own instance', slug: d('guides/self-hosting/docker') },
    ],
  },
  {
    label: 'Tutorial: build an app',
    items: [
      d('getting-started/running-locally'),
      d('getting-started/project-structure'),
      d('getting-started/lexicons'),
      d('getting-started/queries-and-procedures'),
      d('getting-started/scripts'),
      d('getting-started/reacting-to-records'),
      d('getting-started/background-jobs'),
      d('getting-started/plugins-and-libraries'),
      d('getting-started/authentication'),
      d('getting-started/testing'),
      d('getting-started/deploying'),
    ],
  },
  {
    label: 'Guides',
    items: [
      { label: 'Overview', slug: d('guides') },
      {
        label: 'Build an app',
        collapsed: true,
        items: [
          d('guides/backfill'),
          d('guides/labelers'),
          d('guides/publishing-lexicons'),
          d('guides/linked-repos'),
          d('guides/attestation-signing'),
          d('guides/type-generation'),
        ],
      },
      {
        label: 'Use atproto spaces',
        badge: { text: 'Experimental', variant: 'caution' },
        collapsed: true,
        items: [
          d('guides/spaces'),
          d('guides/spaces/managing-spaces'),
          d('guides/spaces/members'),
          d('guides/spaces/invites'),
          d('guides/spaces/records'),
          d('guides/spaces/credentials'),
          d('guides/spaces/notifications'),
          d('guides/spaces/changelog'),
        ],
      },
      {
        label: 'Client apps',
        collapsed: true,
        items: [d('guides/api-clients')],
      },
      {
        label: 'Run an instance',
        collapsed: true,
        items: [
          {
            label: 'Self-hosting',
            collapsed: true,
            items: [
              d('guides/self-hosting/docker'),
              d('guides/self-hosting/binary'),
              d('guides/self-hosting/from-source'),
              d('guides/self-hosting/production'),
            ],
          },
          d('guides/configuration'),
          d('guides/dashboard'),
          {
            label: 'Database',
            collapsed: true,
            items: [
              d('guides/database/database-setup'),
              d('guides/database/sqlite-to-postgres-migration'),
              d('guides/database/postgres-to-sqlite-migration'),
            ],
          },
          d('guides/permissions'),
          d('guides/api-keys'),
          d('guides/service-identity'),
          d('guides/hardening'),
          d('guides/instance-limits'),
          d('guides/event-logs'),
          d('guides/telemetry'),
          d('guides/record-providers'),
        ],
      },
      {
        label: 'Write plugins',
        collapsed: true,
        items: [d('guides/plugins'), d('guides/developing-plugins')],
      },
    ],
  },
  {
    label: 'Concepts',
    collapsed: true,
    items: [d('getting-started/how-happyview-fits-atproto'), d('architecture/glossary')],
  },
  {
    label: 'Reference',
    collapsed: true,
    items: [
      { label: 'Overview', slug: d('reference') },
      d('reference/cli'),
      d('reference/configuration'),
      {
        label: 'Script API',
        collapsed: true,
        items: [
          d('reference/scripts/contract'),
          d('reference/scripts/types-and-triggers'),
          d('reference/scripts/languages'),
          d('reference/scripts/limits'),
          d('reference/scripts/idempotency'),
          d('reference/scripts/built-in-modules'),
          d('reference/scripts/libraries'),
          d('reference/scripts/standard-libraries'),
          d('reference/scripts/json'),
        ],
      },
      d('reference/lexicons'),
      d('reference/xrpc'),
      d('reference/authentication'),
      {
        label: 'Admin API',
        collapsed: true,
        items: [{ autogenerate: { directory: 'docs/reference/admin' } }],
      },
      d('reference/oauth'),
      d('reference/plugin-sdk'),
      {
        label: 'JavaScript SDKs',
        collapsed: true,
        items: [
          d('reference/sdk'),
          d('reference/sdk/lex-agent'),
          d('reference/sdk/oauth-client'),
          d('reference/sdk/oauth-client-browser'),
          d('reference/sdk/oauth-client-node'),
        ],
      },
    ],
  },
  {
    label: 'Examples',
    collapsed: true,
    items: [
      d('guides/recipes/get-record'),
      d('guides/recipes/paginated-list'),
      d('guides/recipes/list-or-fetch'),
      d('guides/recipes/expanded-query'),
      d('guides/recipes/create-record'),
      d('guides/recipes/upsert-record'),
      d('guides/recipes/update-or-delete'),
      d('guides/recipes/batch-save'),
      d('guides/recipes/complex-mutations'),
      d('guides/recipes/cascading-delete'),
      d('guides/recipes/sidecar-records'),
      d('guides/recipes/signed-record'),
      d('guides/recipes/signed-record-verify'),
      d('guides/recipes/record-webhook'),
      d('guides/recipes/job'),
      d('guides/recipes/algolia-sync'),
      d('guides/recipes/meilisearch-sync'),
    ],
  },
  d('ecosystem'),
  d('guides/troubleshooting'),
  d('faq'),
  {
    label: 'Migration',
    collapsed: true,
    items: [d('guides/upgrading-to-v3'), d('guides/migrating-scripts')],
  },
  d('changelog'),
  d('roadmap'),
  {
    label: 'Contributing',
    collapsed: true,
    items: [
      d('contributing/develop'),
      d('contributing/test'),
      d('contributing/release'),
      { label: 'Architecture', slug: d('architecture') },
      d('contributing/community'),
      d('contributing/security'),
      d('contributing/license'),
    ],
  },
];
