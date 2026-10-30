// The OAuth client readers sign in with to like and comment on blog posts.
//
// The client metadata is a static file (public/oauth-client-metadata.json)
// that names https://happyview.dev, so sign-in works there and on a loopback
// dev server, which atproto lets use a client_id built from its redirect URI.
// On any other origin, such as a preview deploy, there is no metadata naming
// it, so sign-in is refused up front rather than failing at the PDS.
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const PRODUCTION_ORIGIN = 'https://happyview.dev';
const SCOPE = 'atproto repo:site.standard.graph.recommend repo:site.standard.graph.subscription';

let clientPromise: Promise<BrowserOAuthClient> | null = null;

export function signInAvailable(): boolean {
  const { origin } = window.location;
  return origin === PRODUCTION_ORIGIN || isLoopback(origin);
}

function isLoopback(origin: string) {
  return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
}

export function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (!clientPromise) {
    const { origin, port } = window.location;
    if (isLoopback(origin)) {
      const redirectUri = `http://127.0.0.1:${port}/oauth/callback/`;
      const clientId = `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPE)}`;
      clientPromise = BrowserOAuthClient.load({ clientId, handleResolver: 'https://bsky.social' });
    } else if (origin === PRODUCTION_ORIGIN) {
      clientPromise = BrowserOAuthClient.load({
        clientId: `${PRODUCTION_ORIGIN}/oauth-client-metadata.json`,
        handleResolver: 'https://bsky.social',
      });
    } else {
      clientPromise = Promise.reject(new Error(`Sign-in works on ${PRODUCTION_ORIGIN}, not on ${origin}.`));
    }
  }
  return clientPromise;
}
