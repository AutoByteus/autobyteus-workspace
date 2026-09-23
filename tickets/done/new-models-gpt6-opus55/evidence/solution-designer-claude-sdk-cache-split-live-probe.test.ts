import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ClaudeSdkClient } from '../../../../../src/runtime-management/claude/client/claude-sdk-client.js';

const safeCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

describe('temporary Solution Designer Claude SDK cache split probe', () => {
  it('inspects only numeric cache fields in one selected Opus result', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-cache-split-probe-'));
    const client = new ClaudeSdkClient();
    let query: Awaited<ReturnType<ClaudeSdkClient['startQueryTurn']>> | null = null;
    try {
      query = await client.startQueryTurn({
        prompt: 'Reply exactly OK.', systemPrompt: '',
        sessionBinding: { kind: 'create', sessionId: randomUUID() },
        model: 'opus[1m]', workingDirectory: workspace,
        permissionMode: 'plan', autoExecuteTools: false,
      });
      let result: Record<string, unknown> | null = null;
      for await (const chunk of query) {
        if (chunk && typeof chunk === 'object' && !Array.isArray(chunk) &&
            (chunk as Record<string, unknown>).type === 'result') {
          result = chunk as Record<string, unknown>;
          break;
        }
      }
      expect(result).not.toBeNull();
      const usage = result?.usage as Record<string, unknown> | undefined;
      const split = usage?.cache_creation as Record<string, unknown> | null | undefined;
      const models = result?.modelUsage as Record<string, Record<string, unknown>> | undefined;
      console.log(JSON.stringify({
        selected: 'opus[1m]',
        topLevel: {
          input: safeCount(usage?.input_tokens), output: safeCount(usage?.output_tokens),
          cacheRead: safeCount(usage?.cache_read_input_tokens),
          cacheCreate: safeCount(usage?.cache_creation_input_tokens),
          splitPresent: split !== null && typeof split === 'object',
          cacheCreate5m: safeCount(split?.ephemeral_5m_input_tokens),
          cacheCreate1h: safeCount(split?.ephemeral_1h_input_tokens),
        },
        perModel: Object.entries(models ?? {}).map(([raw, row]) => ({
          raw, canonical: typeof row.canonicalModel === 'string' ? row.canonicalModel : null,
          input: safeCount(row.inputTokens), output: safeCount(row.outputTokens),
          cacheRead: safeCount(row.cacheReadInputTokens),
          cacheCreate: safeCount(row.cacheCreationInputTokens),
          hasSplit: 'cacheCreation' in row || 'cache_creation' in row ||
            'cacheCreation5mInputTokens' in row || 'cacheCreation1hInputTokens' in row,
        })),
      }));
      expect(result?.is_error).not.toBe(true);
    } finally {
      query?.close();
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }, 180_000);
});
