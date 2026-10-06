export type PlayLineItem = {
  productId?: string;
  expiryTime?: string;
  autoRenewingPlan?: {
    autoRenewEnabled?: boolean;
  } | null;
  offerDetails?: {
    basePlanId?: string;
    offerId?: string;
  } | null;
};

export type PlaySubscriptionPurchaseV2 = {
  kind?: string;
  startTime?: string;
  subscriptionState?: string;
  latestOrderId?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  regionCode?: string;
  externalAccountIdentifiers?: {
    obfuscatedExternalAccountId?: string;
    obfuscatedExternalProfileId?: string;
  };
  lineItems?: PlayLineItem[];
};

export class PlayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PlayApiError';
  }
}

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function readJsonSecret(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new PlayApiError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email or private_key.', 503);
  }
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, '\n'),
    token_uri: parsed.token_uri,
  };
}

function base64Url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeDerLength(length: number): number[] {
  if (length < 128) return [length];
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

function concatBytes(parts: Array<number[] | Uint8Array>): Uint8Array {
  const arrays = parts.map((part) => (part instanceof Uint8Array ? part : new Uint8Array(part)));
  const total = arrays.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of arrays) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function wrapPkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = [0x02, 0x01, 0x00];
  const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = concatBytes([[0x04], encodeDerLength(pkcs1.length), pkcs1]);
  const inner = concatBytes([version, algId, octet]);
  return concatBytes([[0x30], encodeDerLength(inner.length), inner]);
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const isPkcs8 = /BEGIN PRIVATE KEY/.test(pem);
  const raw = isPkcs8 ? pemToBytes(pem) : wrapPkcs1ToPkcs8(pemToBytes(pem));
  const keyData = new ArrayBuffer(raw.byteLength);
  new Uint8Array(keyData).set(raw);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signJwt(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: account.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(signature)}`;
}

export function playPackageName() {
  return Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME')?.trim() || 'com.prabhjotkaur.studyflow';
}

export function playServiceAccountConfigured() {
  return Boolean(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')?.trim());
}

async function getAccessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')?.trim();
  if (!raw) {
    throw new PlayApiError(
      'Google Play verification is not configured. Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON on the Edge Function.',
      503,
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const account = readJsonSecret(raw);
  const assertion = await signJwt(account);
  const tokenUri = account.token_uri || 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !body.access_token) {
    throw new PlayApiError(body.error || 'Unable to authenticate to the Google Play Developer API.', 503);
  }
  cachedToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + Math.max(60, Number(body.expires_in || 3600) - 60) * 1000,
  };
  return body.access_token;
}

export async function getSubscriptionPurchase(purchaseToken: string): Promise<PlaySubscriptionPurchaseV2> {
  const token = await getAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(playPackageName())}` +
    `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as PlaySubscriptionPurchaseV2 & { error?: { message?: string } };
  if (!response.ok) {
    throw new PlayApiError(body.error?.message || 'Google Play could not verify this purchase token.', response.status === 404 ? 400 : 502);
  }
  return body;
}

export async function acknowledgeSubscription(productId: string, purchaseToken: string) {
  const token = await getAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(playPackageName())}` +
    `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (response.ok || response.status === 400) return;
  throw new PlayApiError('Google Play could not acknowledge this purchase.', 502);
}
