export type SseEvent = {
  event: string;
  data: Record<string, unknown>;
};

export function parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: SseEvent[] = [];

  for (const part of parts) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    const raw = dataLines.join('\n');
    if (!raw || raw === '[DONE]') continue;
    try {
      const data = JSON.parse(raw) as unknown;
      if (data && typeof data === 'object') {
        events.push({ event, data: data as Record<string, unknown> });
      }
    } catch {
      events.push({ event, data: { text: raw } });
    }
  }

  return { events, rest };
}

export function sseDeltaText(data: Record<string, unknown>) {
  return typeof data.text === 'string' ? data.text : typeof data.delta === 'string' ? data.delta : '';
}
