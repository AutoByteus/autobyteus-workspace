import type { WorkingContext } from '../working-context.js';

/**
 * Released migration wire boundary, pinned to origin/personal
 * 8caa610ff438c288d9aca9f2efe2c33924fbf517. Never import runtime codecs,
 * finalizers or validators here: upgrading those must not change this target.
 * Exact source SHA-256s and released classifier fixtures are pinned in
 * tests/fixtures/memory/released-native-snapshot-shapes.json.
 * Successor recognition is preservation only, not permission to dispatch.
 */
type RecordValue = Record<string, any>;
const PROVENANCE = 'autobyteus_memory_provenance';
const isRecord = (v: unknown): v is RecordValue => !!v && typeof v === 'object' && !Array.isArray(v);
const requireValue = (condition: unknown): void => { if (!condition) throw new Error('Invalid frozen snapshot shape.'); };
const nonempty = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const safeJsonValue = (v: unknown): unknown => {
  try { JSON.stringify(v); return v; } catch { return String(v); }
};
const range = (v: unknown): { start: number; end: number } => {
  requireValue(isRecord(v) && Number.isInteger(v.start) && Number.isInteger(v.end));
  const r = v as { start: number; end: number };
  requireValue(r.start >= 0 && r.end >= r.start);
  return { start: r.start, end: r.end };
};
const ids = (v: unknown): string[] => {
  requireValue(Array.isArray(v));
  const result = (v as unknown[]).map((id) => { requireValue(nonempty(id)); return (id as string).trim(); });
  requireValue(new Set(result).size === result.length);
  return result;
};
const turn = (v: unknown): string | null => {
  if (v === null) return null;
  requireValue(nonempty(v));
  return (v as string).trim();
};
const provenance = (v: unknown): RecordValue => {
  requireValue(isRecord(v));
  const p = v as RecordValue;
  if (p.kind === 'single') return { kind: 'single', rawTraceIds: ids(p.rawTraceIds), turnId: turn(p.turnId) };
  requireValue(p.kind === 'composed_user' && Array.isArray(p.constituents) && p.constituents.length);
  return { kind: 'composed_user', constituents: p.constituents.map((item: unknown) => {
    requireValue(isRecord(item));
    const c = item as RecordValue;
    if (c.kind === 'compacted_memory') return { kind: c.kind, textRange: range(c.textRange) };
    requireValue(c.kind === 'retained_user' || c.kind === 'current_user');
    return { kind: c.kind, textRange: c.textRange === null ? null : range(c.textRange),
      rawTraceIds: ids(c.rawTraceIds), turnId: turn(c.turnId), imageRange: range(c.imageRange),
      audioRange: range(c.audioRange), videoRange: range(c.videoRange) };
  }) };
};
const nativeContextValid = (v: unknown): boolean => {
  if (v === undefined) return true;
  if (!isRecord(v)) return false;
  const fields: Record<string, string[]> = { gemini: ['modelContent', 'functionCallPart'],
    anthropic: ['toolUseBlock'], mistral: ['toolCall'], ollama: ['toolCall'],
    openai_responses: ['functionCallItem'] };
  if (typeof v.provider !== 'string' || !Object.hasOwn(fields, v.provider)) return false;
  return fields[v.provider]!.every((key) => v[key] === undefined || isRecord(v[key]))
    && (v.provider !== 'openai_responses' || v.responseOutputItems === undefined
      || Array.isArray(v.responseOutputItems) && v.responseOutputItems.every(isRecord));
};

// Released decoder defaults/coercions are deliberately private to strict v5.
const decodeReleasedMessage = (m: RecordValue): RecordValue => {
  const t = m.tool_payload;
  let payload: RecordValue | null = null;
  if (t && Array.isArray(t.tool_calls)) payload = { tool_calls: t.tool_calls.map((c: RecordValue) => ({
    id: String(c.id ?? ''), name: String(c.name ?? ''), arguments: c.arguments ?? {},
    nativeToolCallContext: c.nativeToolCallContext,
  })) };
  else if (t && t.tool_call_id !== undefined) payload = { tool_call_id: String(t.tool_call_id ?? ''),
    tool_name: String(t.tool_name ?? ''), tool_result: t.tool_result, tool_error: t.tool_error ?? null };
  return { role: m.role, content: m.content ?? null, reasoning_content: m.reasoning_content ?? null,
    image_urls: m.image_urls ?? [], audio_urls: m.audio_urls ?? [], video_urls: m.video_urls ?? [],
    tool_payload: payload, metadata: isRecord(m.metadata) ? m.metadata : null };
};

const checkMessage = (m: RecordValue, canonicalProvenance: boolean): number => {
  requireValue(['system', 'user', 'assistant', 'tool'].includes(m.role));
  requireValue(m.content === null || typeof m.content === 'string');
  requireValue(m.reasoning_content === null || typeof m.reasoning_content === 'string');
  for (const key of ['image_urls', 'audio_urls', 'video_urls']) {
    requireValue(Array.isArray(m[key]) && m[key].every((v: unknown) => typeof v === 'string'));
  }
  requireValue(m.metadata === null || isRecord(m.metadata));
  const t = m.tool_payload;
  if (m.role === 'system' || m.role === 'user') requireValue(t === null);
  else if (m.role === 'tool') {
    requireValue(isRecord(t) && !Array.isArray(t.tool_calls) && nonempty(t.tool_call_id) && nonempty(t.tool_name));
    requireValue(t.tool_error === null || typeof t.tool_error === 'string');
  } else if (t !== null) {
    requireValue(isRecord(t) && Array.isArray(t.tool_calls) && t.tool_calls.length > 0);
    const callIds = new Set<string>();
    for (const c of t.tool_calls) {
      requireValue(isRecord(c) && nonempty(c.id) && nonempty(c.name) && isRecord(c.arguments));
      requireValue(!callIds.has(c.id) && nativeContextValid(c.nativeToolCallContext));
      callIds.add(c.id);
    }
  }
  const p = provenance(m.metadata?.[PROVENANCE]);
  if (canonicalProvenance) requireValue(JSON.stringify(p) === JSON.stringify(m.metadata?.[PROVENANCE]));
  if (m.role !== 'user') { requireValue(p.kind === 'single'); return 0; }
  requireValue(p.kind === 'composed_user');
  const prior: Record<string, number> = { text: 0, image: 0, audio: 0, video: 0 };
  let summaries = 0;
  for (const c of p.constituents) {
    const checkRange = (r: { start: number; end: number }, key: string, bound: number): void => {
      requireValue(r.start >= prior[key]! && r.end <= bound);
      prior[key] = r.end;
    };
    if (c.textRange) checkRange(c.textRange, 'text', m.content?.length ?? 0);
    if (c.kind === 'compacted_memory') { summaries++; continue; }
    for (const key of ['image', 'audio', 'video']) checkRange(c[key + 'Range'], key, m[key + '_urls'].length);
  }
  return summaries;
};

const completeProtocol = (messages: RecordValue[]): void => {
  let open: Map<string, string> | null = null;
  for (const m of messages) {
    const t = m.tool_payload;
    if (open) {
      requireValue(m.role === 'tool' && t && open.get(t.tool_call_id) === t.tool_name);
      open.delete(t.tool_call_id);
      if (!open.size) open = null;
    } else {
      requireValue(m.role !== 'tool');
      if (m.role === 'assistant' && t) open = new Map(t.tool_calls.map((c: RecordValue) => [c.id, c.name]));
    }
  }
  requireValue(open === null);
};

export class ReleasedNativeSnapshotV5Codec {
  static serialize(context: WorkingContext, metadata: { agent_id?: string }): Record<string, unknown> {
    return { schema_version: 5, agent_id: metadata.agent_id, messages: context.buildMessages().map((m) => {
      const t = m.tool_payload;
      const toolPayload = t === null ? null : 'toolCalls' in t ? {
        tool_calls: t.toolCalls.map((c) => ({ id: c.id, name: c.name, arguments: safeJsonValue(c.arguments),
          nativeToolCallContext: safeJsonValue(c.nativeToolCallContext) })),
      } : { tool_call_id: t.toolCallId, tool_name: t.toolName, tool_result: safeJsonValue(t.toolResult),
        tool_error: t.toolError ?? null };
      return { role: m.role, content: m.content, reasoning_content: m.reasoning_content,
        image_urls: m.image_urls, audio_urls: m.audio_urls, video_urls: m.video_urls,
        tool_payload: toolPayload, metadata: safeJsonValue(m.metadata) };
    }) };
  }

  static validate(payload: unknown): boolean {
    try {
      requireValue(isRecord(payload));
      const p = payload as RecordValue;
      requireValue(p.schema_version === 5 && nonempty(p.agent_id) && Array.isArray(p.messages));
      requireValue(Object.keys(p).every((k) => ['schema_version', 'agent_id', 'messages'].includes(k)));
      const messages = p.messages.map((m: unknown) => {
        requireValue(isRecord(m) && typeof m.role === 'string');
        return decodeReleasedMessage(m as RecordValue);
      });
      let summaries = 0;
      messages.forEach((m: RecordValue, i: number) => {
        summaries += checkMessage(m, true);
        // Released finalization merges adjacent users; such input is not already finalized.
        requireValue(!(m.role === 'user' && messages[i - 1]?.role === 'user'));
      });
      requireValue(summaries <= 1);
      completeProtocol(messages);
      return true;
    } catch { return false; }
  }
}

export const recognizeVersionlessSnapshotForPreservation = (payload: unknown, expectedAgentId: string): boolean => {
  try {
    requireValue(isRecord(payload));
    const p = payload as RecordValue;
    requireValue(Object.keys(p).length === 2 && Object.hasOwn(p, 'agent_id') && Object.hasOwn(p, 'messages'));
    requireValue(nonempty(p.agent_id) && p.agent_id === expectedAgentId && Array.isArray(p.messages));
    for (const m of p.messages) {
      requireValue(isRecord(m));
      // Known optional/null message fields retain their released defaults. Invalid
      // present values and required tool facts are never coerced into a match.
      const t = m.tool_payload;
      if (t !== null && t !== undefined) {
        requireValue(isRecord(t));
        if (Object.hasOwn(t, 'tool_calls')) {
          requireValue(Array.isArray(t.tool_calls));
          for (const c of t.tool_calls) requireValue(isRecord(c) && nonempty(c.id) && nonempty(c.name) && isRecord(c.arguments));
        } else requireValue(nonempty(t.tool_call_id) && nonempty(t.tool_name));
      }
      if (m.metadata !== null && m.metadata !== undefined) requireValue(isRecord(m.metadata));
      checkMessage(decodeReleasedMessage(m), false);
    }
    // No full pairing, finalization, raw reads or repair: a writer cut owns this
    // format even when results are missing, partial, or already ahead in raw.
    return true;
  } catch { return false; }
};
