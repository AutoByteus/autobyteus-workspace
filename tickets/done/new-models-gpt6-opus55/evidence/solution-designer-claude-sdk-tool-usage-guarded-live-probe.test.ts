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
const safeUsage = (raw: unknown) => {
  const u = obj(raw);
  const split = obj(u?.cache_creation);
  return { input: n(u?.input_tokens), output: n(u?.output_tokens),
    read: n(u?.cache_read_input_tokens), write: n(u?.cache_creation_input_tokens),
    write5m: n(split?.ephemeral_5m_input_tokens), write1h: n(split?.ephemeral_1h_input_tokens) };
};

describe('temporary Solution Designer Claude SDK guarded tool-turn usage shape probe', () => {
  it('records safe numeric/model data from a callback-guarded pwd tool turn', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-tool-usage-probe-'));
    const client = new ClaudeSdkClient();
    let query: Awaited<ReturnType<ClaudeSdkClient['startQueryTurn']>> | null = null;
    let approvedPwdCalls = 0;
    let deniedToolCalls = 0;
    try {
      query = await client.startQueryTurn({
        prompt: 'Use the Bash tool to run exactly pwd, then reply DONE.', systemPrompt: '',
        sessionBinding: { kind: 'create', sessionId: randomUUID() },
        model: 'opus[1m]', workingDirectory: workspace,
        permissionMode: 'default', autoExecuteTools: false,
        canUseTool: async (name, input, options) => {
          if (name !== 'Bash' || input.command !== 'pwd') {
            deniedToolCalls += 1;
            return { behavior: 'deny', message: 'Only pwd permitted for probe.' };
          }
          approvedPwdCalls += 1;
          return { behavior: 'allow', updatedInput: input, ...(options.toolUseID ? { toolUseID: options.toolUseID } : {}) };
        },
      });
      const counts: Record<string, number> = {};
      const assistants: Array<Record<string, unknown>> = [];
      const seenIds = new Set<string>();
      let result: Record<string, unknown> | null = null;
      for await (const chunk of query) {
        const row = obj(chunk);
        if (!row) continue;
        const type = s(row.type) ?? 'unknown';
        counts[type] = (counts[type] ?? 0) + 1;
        if (type === 'assistant') {
          const message = obj(row.message);
          const id = s(message?.id);
          const content = Array.isArray(message?.content) ? message.content : [];
          assistants.push({ model: s(message?.model), sameIdSeenEarlier: id === null ? null : seenIds.has(id),
            contentTypes: content.map((block) => s(obj(block)?.type)),
            parentToolUsePresent: row.parent_tool_use_id !== null && row.parent_tool_use_id !== undefined,
            usage: safeUsage(message?.usage) });
          if (id) seenIds.add(id);
        }
        if (type === 'result') { result = row; break; }
      }
      expect(result).not.toBeNull();
      expect(result?.is_error).not.toBe(true);
      expect(approvedPwdCalls).toBeGreaterThan(0);
      const models = obj(result?.modelUsage);
      console.log(JSON.stringify({ selected: 'opus[1m]', approvedPwdCalls, deniedToolCalls, counts, assistants,
        result: { usage: safeUsage(result?.usage),
          models: Object.entries(models ?? {}).map(([raw, rawRow]) => {
            const m = obj(rawRow);
            return { raw, canonical: s(m?.canonicalModel), input: n(m?.inputTokens),
              output: n(m?.outputTokens), read: n(m?.cacheReadInputTokens),
              write: n(m?.cacheCreationInputTokens) };
          }) },
      }));
    } finally {
      query?.close();
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }, 180_000);
});
