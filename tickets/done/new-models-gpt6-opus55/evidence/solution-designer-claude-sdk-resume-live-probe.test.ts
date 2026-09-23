import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ClaudeSdkClient } from '../../../../../src/runtime-management/claude/client/claude-sdk-client.js';
import { buildClaudeTokenUsageEvent } from '../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

const n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const s = (v: unknown) => typeof v === 'string' ? v : null;

describe('temporary Solution Designer Claude SDK resume usage probe', () => {
  it('observes exactly two small subscription-backed turns in one SDK session', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-sdk-resume-solution-'));
    const sessionId = randomUUID();
    const client = new ClaudeSdkClient();
    const observations: Array<Record<string, unknown>> = [];
    try {
      for (const [index, kind] of ['create', 'resume'].entries()) {
        const query = await client.startQueryTurn({
          prompt: index === 0 ? 'Reply exactly ONE.' : 'Reply exactly TWO.',
          systemPrompt: '',
          sessionBinding: {kind: kind as 'create' | 'resume', sessionId},
          model: 'opus[1m]', workingDirectory: workspace, permissionMode: 'plan', autoExecuteTools: false,
        });
        try {
          let result: Record<string, unknown> | null = null;
          for await (const chunk of query) {
            if (chunk && typeof chunk === 'object' && !Array.isArray(chunk) && (chunk as Record<string, unknown>).type === 'result') {
              result = chunk as Record<string, unknown>; break;
            }
          }
          expect(result).not.toBeNull();
          expect(result?.is_error).not.toBe(true);
          const usage = result?.usage as Record<string, unknown> | undefined;
          const modelUsage = result?.modelUsage as Record<string, Record<string, unknown>> | undefined;
          const event = buildClaudeTokenUsageEvent({ chunk: result, runId:'probe', turnId:`turn-${index+1}`, sessionId, model:'opus[1m]' });
          observations.push({
            turn:index+1, binding:kind, result_model:s(result?.model), result_session_id_present:Boolean(s(result?.session_id)),
            top_level_usage:{input:n(usage?.input_tokens), output:n(usage?.output_tokens), cache_read:n(usage?.cache_read_input_tokens), cache_write:n(usage?.cache_creation_input_tokens)},
            per_model:Object.entries(modelUsage ?? {}).map(([raw, m]) => ({raw,canonical:s(m.canonicalModel),basis:s(m.costBasis),input:n(m.inputTokens),output:n(m.outputTokens),cache_read:n(m.cacheReadInputTokens),cache_write:n(m.cacheCreationInputTokens),cost_usd:n(m.costUSD)})),
            sdk_total_cost_usd:n(result?.total_cost_usd), current_event_model:(event as any)?.params?.model_identifier ?? null,
          });
        } finally { query.close(); }
      }
      console.log(JSON.stringify({selected:'opus[1m]',observations}));
    } finally { await fs.rm(workspace,{recursive:true,force:true}); }
  }, 180_000);
});
