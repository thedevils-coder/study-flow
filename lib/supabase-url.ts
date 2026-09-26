export function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}
