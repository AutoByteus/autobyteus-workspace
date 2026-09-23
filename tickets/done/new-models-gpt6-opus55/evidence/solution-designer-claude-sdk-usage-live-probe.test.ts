import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ClaudeSdkClient } from '../../../../../src/runtime-management/claude/client/claude-sdk-client.js';
import { buildClaudeTokenUsageEvent } from '../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

const numberOrNull = (x: unknown) => typeof x === 'number' && Number.isFinite(x) ? x : null;
const stringOrNull = (x: unknown) => typeof x === 'string' ? x : null;

describe('temporary Solution Designer real SDK shape probe', () => {
  it('observes one explicitly selected Opus turn and only numeric/model metadata', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-sdk-solution-probe-'));
    const client = new ClaudeSdkClient();
    let query: Awaited<ReturnType<ClaudeSdkClient['startQueryTurn']>> | null = null;
    try {
      query = await client.startQueryTurn({ prompt: 'Reply exactly OK.', systemPrompt: '', sessionBinding: {kind: 'create', sessionId: randomUUID()}, model: 'opus[1m]', workingDirectory: workspace, permissionMode: 'plan', autoExecuteTools: false });
      let result: Record<string, unknown> | null = null;
      for await (const chunk of query) {
        if (chunk && typeof chunk === 'object' && !Array.isArray(chunk) && (chunk as Record<string, unknown>).type === 'result') {
          result = chunk as Record<string, unknown>; break;
        }
      }
      expect(result).not.toBeNull();
      const usage = result?.usage as Record<string, unknown> | undefined;
      const modelUsage = result?.modelUsage as Record<string, Record<string, unknown>> | undefined;
      const perModel = Object.entries(modelUsage ?? {}).map(([id, value]) => ({
        id,
        canonical_model: stringOrNull(value.canonicalModel),
        provider: stringOrNull(value.provider),
        cost_basis: stringOrNull(value.costBasis),
        input_tokens: numberOrNull(value.inputTokens),
        output_tokens: numberOrNull(value.outputTokens),
        cache_read_tokens: numberOrNull(value.cacheReadInputTokens),
        cache_write_tokens: numberOrNull(value.cacheCreationInputTokens),
        cost_usd: numberOrNull(value.costUSD),
      }));
      const event = buildClaudeTokenUsageEvent({chunk: result, runId:'probe', turnId:'probe', sessionId:'probe', model:'opus[1m]'});
      console.log(JSON.stringify({selected:'opus[1m]', result_model:stringOrNull(result?.model), result_is_error:result?.is_error ?? null, top_level_usage:{input_tokens:numberOrNull(usage?.input_tokens),output_tokens:numberOrNull(usage?.output_tokens),cache_read_tokens:numberOrNull(usage?.cache_read_input_tokens),cache_write_tokens:numberOrNull(usage?.cache_creation_input_tokens)}, per_model:perModel, sdk_total_cost_usd:numberOrNull(result?.total_cost_usd), emitted_model_identifier:(event as any)?.params?.model_identifier ?? null, emitted_quality_flags:(event as any)?.params?.quality_flags ?? []}));
      expect(result?.is_error).not.toBe(true);
      expect(event).not.toBeNull();
    } finally { query?.close(); await fs.rm(workspace,{recursive:true,force:true}); }
  }, 180_000);
});
