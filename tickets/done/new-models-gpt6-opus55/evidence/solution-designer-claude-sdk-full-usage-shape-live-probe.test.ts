import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ClaudeSdkClient } from '../../../../../src/runtime-management/claude/client/claude-sdk-client.js';

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const n = (v: unknown): number | null =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
const s = (v: unknown): string | null => typeof v === 'string' ? v : null;
const usage = (value: unknown) => {
  const u = obj(value);
  const split = obj(u?.cache_creation);
  return {
    input: n(u?.input_tokens), output: n(u?.output_tokens),
    cacheRead: n(u?.cache_read_input_tokens), cacheCreate: n(u?.cache_creation_input_tokens),
    splitPresent: split !== null,
    cache5m: n(split?.ephemeral_5m_input_tokens),
    cache1h: n(split?.ephemeral_1h_input_tokens),
  };
};
const modelUsage = (value: unknown) => Object.entries(obj(value) ?? {}).map(([raw, rawRow]) => {
  const row = obj(rawRow);
  return {
    raw, canonical: s(row?.canonicalModel), provider: s(row?.provider),
    input: n(row?.inputTokens), output: n(row?.outputTokens),
    cacheRead: n(row?.cacheReadInputTokens), cacheCreate: n(row?.cacheCreationInputTokens),
    hasDurationSplit: Boolean(row && ('cache_creation' in row || 'cacheCreation' in row ||
      'cacheCreation5mInputTokens' in row || 'cacheCreation1hInputTokens' in row)),
  };
});

describe('temporary Solution Designer Claude SDK full usage shape probe', () => {
  it('records only numeric/model metadata across two selected Opus turns and all event shapes', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-usage-shape-probe-'));
    const sessionId = randomUUID();
    const client = new ClaudeSdkClient();
    const turns: Array<Record<string, unknown>> = [];
    try {
      for (const [index, kind] of ['create', 'resume'].entries()) {
        const query = await client.startQueryTurn({
          prompt: index === 0 ? 'Reply exactly ONE.' : 'Reply exactly TWO.',
          systemPrompt: '', sessionBinding: { kind: kind as 'create' | 'resume', sessionId },
          model: 'opus[1m]', workingDirectory: workspace,
          permissionMode: 'plan', autoExecuteTools: false,
        });
        try {
          const typeCounts: Record<string, number> = {};
          const assistants: Array<Record<string, unknown>> = [];
          const seenMessageIds = new Set<string>();
          let result: Record<string, unknown> | null = null;
          for await (const chunk of query) {
            const row = obj(chunk);
            if (!row) continue;
            const type = s(row.type) ?? 'unknown';
            typeCounts[type] = (typeCounts[type] ?? 0) + 1;
            if (type === 'assistant') {
              const message = obj(row.message);
              const id = s(message?.id);
              assistants.push({
                model: s(message?.model),
                sameMessageIdSeenEarlier: id === null ? null : seenMessageIds.has(id),
                stopReasonPresent: message?.stop_reason !== null && message?.stop_reason !== undefined,
                parentToolUsePresent: row.parent_tool_use_id !== null && row.parent_tool_use_id !== undefined,
                usage: usage(message?.usage),
              });
              if (id) seenMessageIds.add(id);
            }
            if (type === 'result') { result = row; break; }
          }
          expect(result).not.toBeNull();
          expect(result?.is_error).not.toBe(true);
          turns.push({
            turn: index + 1, kind, typeCounts, assistants,
            result: { usage: usage(result?.usage), models: modelUsage(result?.modelUsage) },
          });
        } finally { query.close(); }
      }
      console.log(JSON.stringify({ selected: 'opus[1m]', turns }));
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }, 180_000);
});
