import type { AiArtifact } from '@/lib/ai-types';

function isSafeUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^data:(image\/|application\/pdf)/i.test(value);
}

export function sanitizeArtifacts(input: unknown): AiArtifact[] {
  if (!Array.isArray(input)) return [];
  const artifacts: AiArtifact[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const type = record.type === 'pdf' ? 'pdf' : record.type === 'image' ? 'image' : null;
    if (!type) continue;
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : type === 'pdf' ? 'notes.pdf' : 'diagram.png';
    const mime =
      typeof record.mime === 'string' && record.mime.trim()
        ? record.mime.trim()
        : type === 'pdf'
          ? 'application/pdf'
          : 'image/png';
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    const dataUrl = typeof record.dataUrl === 'string' ? record.dataUrl.trim() : '';
    if (url && !isSafeUrl(url)) continue;
    if (dataUrl && !isSafeUrl(dataUrl)) continue;
    if (!url && !dataUrl) continue;
    artifacts.push({
      type,
      name,
      mime,
      ...(url ? { url } : {}),
      ...(dataUrl ? { dataUrl } : {}),
    });
  }
  return artifacts.slice(0, 4);
}

export function artifactHref(artifact: AiArtifact) {
  return artifact.url || artifact.dataUrl || '';
}
