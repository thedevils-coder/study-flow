export function extractAuthQuery(url: string): URLSearchParams {
  const trimmed = url.trim();
  if (!trimmed) return new URLSearchParams();

  const withoutHash = trimmed.split('#')[0] ?? trimmed;
  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(withoutHash.slice(queryIndex + 1));
}

export function extractAuthHash(url: string): URLSearchParams {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return new URLSearchParams();
  return new URLSearchParams(url.slice(hashIndex + 1));
}

export function extractAuthCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const code = extractAuthQuery(url).get('code')?.trim();
  return code || null;
}

export function extractAccessTokenFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const fromHash = extractAuthHash(url).get('access_token')?.trim();
  if (fromHash) return fromHash;
  return extractAuthQuery(url).get('access_token')?.trim() || null;
}

export function isAuthCallbackUrl(url: string | null | undefined): boolean {
  return Boolean(extractAuthCodeFromUrl(url) || extractAccessTokenFromUrl(url));
}
