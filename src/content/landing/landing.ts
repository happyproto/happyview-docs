// Copy for the happyview.dev landing page. Copy only: the page's layout and
// components are the docs site's `Landing.astro`. Every claim is sourced in
// CLAIMS.md beside this file; the sample files under sample/ are a project that
// ran on HappyView 3.0.0-alpha.42 and produced the response below.
import toml from './sample/happyview.toml?raw'
import lexicon from './sample/src/lexicons/com/example/hello.json?raw'
import script from './sample/src/lexicons/com/example/hello.lua?raw'
import test from './sample/src/lexicons/com/example/hello.test.lua?raw'

export type Link = { label: string; href: string }

export const hero = {
	// 7 words.
	title: 'Write the lexicon. HappyView serves the API.',
	// 25 words.
	subline:
		'An open-source AppView for atproto. Each query or procedure lexicon becomes an XRPC endpoint, a short Lua, JavaScript or TypeScript script answers it, and HappyView indexes your records.',
	ctas: {
		primary: { label: 'Get started', href: '/docs/getting-started/installation' },
		secondary: { label: 'View on GitHub', href: 'https://github.com/gamesgamesgamesgamesgames/happyview' },
	} satisfies Record<'primary' | 'secondary', Link>,
}

export type SampleTab = {
	label: string
	// The file's path in the project; absent on the request tab.
	path?: string
	lang: string
	code: string
}

const request = "curl 'http://127.0.0.1:3000/xrpc/com.example.hello?name=Ada'"
const response = '{"message":"Hello, Ada!"}'

export const sample = {
	title: 'Lexicons in, XRPC out',
	intro:
		'This is the heart of the project `hpy happyview create` gives you. The lexicon’s path is its route, and the script beside it answers it.',
	tabs: [
		{ label: 'Request', lang: 'shell', code: `$ hpy happyview dev\n\n$ ${request}\n${response}` },
		{ label: 'Lexicon', path: 'src/lexicons/com/example/hello.json', lang: 'json', code: lexicon },
		{ label: 'Script', path: 'src/lexicons/com/example/hello.lua', lang: 'lua', code: script },
		{ label: 'happyview.toml', path: 'happyview.toml', lang: 'toml', code: toml },
	] satisfies SampleTab[],
	after: 'Change the script, save it and call it again: the new version answers, with no restart.',
	// The sample runs `hpy`, which a visitor won't have yet.
	needs: { label: 'Needs hpy, HappyProto’s CLI (beta)', href: '/docs/getting-started/installation' } satisfies Link,
	// Not in the tabbed design. Here in case the page wants a fifth tab.
	test: {
		label: 'Test',
		path: 'src/lexicons/com/example/hello.test.lua',
		lang: 'lua',
		code: test,
		run: 'hpy happyview test',
		output: ' PASS  src/lexicons/com/example/hello.test.lua (1 tests) 124ms',
	},
}

export const close = {
	title: 'Start with one lexicon.',
	cta: hero.ctas.primary,
}

export type Tile = { title: string; blurb: string; href: string }

// Six tiles: titles of 4 words or fewer, blurbs of 120 characters or fewer.
// `alternates` holds two more, if the layout wants a swap.
export const capabilities: Tile[] = [
	{
		title: 'Lexicons are your API',
		blurb: 'Add a query or procedure lexicon and its NSID is a live XRPC route. There is no router to keep in sync.',
		href: '/docs/getting-started/queries-and-procedures',
	},
	{
		title: 'Lua, JavaScript or TypeScript',
		blurb: 'Each language is an interpreter plugin from the registry. Install the ones your scripts are written in.',
		href: '/docs/getting-started/scripts',
	},
	{
		title: 'React to the network',
		blurb: 'Run a script when a record is created, updated, deleted or labeled, and backfill what came before.',
		href: '/docs/getting-started/reacting-to-records',
	},
	{
		title: 'Jobs for slow work',
		blurb: 'Background jobs report progress, can be paused or cancelled, and aren’t bound by a request’s time limit.',
		href: '/docs/getting-started/background-jobs',
	},
	{
		title: 'Plugins declare their capabilities',
		blurb: 'HappyView checks what each WebAssembly plugin imports against what it declares. The dashboard shows it before install.',
		href: '/docs/getting-started/plugins-and-libraries',
	},
	{
		title: 'Tests run in process',
		blurb: '`hpy happyview test` fires queries, procedures, record events and jobs at a test PDS and its own database.',
		href: '/docs/getting-started/testing',
	},
]

export const alternates: Tile[] = [
	{
		title: 'Access you can delegate',
		blurb: 'Named permissions, four templates from Viewer to Full Access, and atproto OAuth sign-in for the dashboard.',
		href: '/docs/guides/permissions',
	},
	{
		title: 'SQLite or Postgres',
		blurb: 'Start on one SQLite file, or run Postgres when you need replicas. Migrations run on startup on either.',
		href: '/docs/guides/self-hosting/docker',
	},
]

export const hosting = {
	title: 'Run it yourself, or let HappyProto run it',
	intro: 'It’s the same HappyView and the same project either way.',
	selfHost: {
		title: 'Self-host',
		points: [
			'MIT licensed. The source, issues and releases are on GitHub.',
			'A single binary for macOS and Linux, or a Docker image.',
			'SQLite or Postgres.',
			'You run the server, TLS, upgrades and backups, and install the interpreters you need.',
		],
		cta: { label: 'Self-host HappyView', href: '/docs/guides/self-hosting/docker' } satisfies Link,
	},
	managed: {
		title: 'HappyProto',
		points: [
			'Your instance at your-app.hpy.at, with Lua already installed.',
			'Deploy a project from your terminal with `hpy happyview deploy` (hpy 1.0 beta).',
			'Three plan sizes, from 512 MB of memory and 5 GB of storage.',
			'In beta now, by invite.',
		],
		cta: { label: 'Join the HappyProto beta', href: 'https://happyproto.at' } satisfies Link,
	},
}
