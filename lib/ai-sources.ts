import type { AiSource } from '@/lib/ai-types';

export function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export function sanitizeSources(input: unknown): AiSource[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const sources: AiSource[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) continue;
    const normalized = url.replace(/\/$/, '');
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    const title =
      typeof record.title === 'string' && record.title.trim()
        ? record.title.trim()
        : domainFromUrl(url) || 'Source';
    sources.push({
      title,
      url,
      domain: typeof record.domain === 'string' ? record.domain : domainFromUrl(url),
    });
  }
  return sources.slice(0, 8);
}

export function sourcesFromGrounding(chunks: unknown): AiSource[] {
  if (!Array.isArray(chunks)) return [];
  return sanitizeSources(
    chunks.map((chunk) => {
      const web = chunk && typeof chunk === 'object' ? (chunk as { web?: { uri?: string; title?: string } }).web : null;
      return { url: web?.uri, title: web?.title };
    }),
  );
}
