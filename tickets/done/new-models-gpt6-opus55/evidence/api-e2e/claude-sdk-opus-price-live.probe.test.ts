import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ClaudeSdkClient } from '../../../../../src/runtime-management/claude/client/claude-sdk-client.js';
import { buildClaudeTokenUsageEvent } from '../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';

describe('temporary subscription Claude SDK Opus identifier investigation', () => {
  it('lists actual locally available model identifiers without a billed turn', async () => {
    const models = await new ClaudeSdkClient().listModels();
    expect(models.length).toBeGreaterThan(0);
    console.log(JSON.stringify({sdk_listed_model_identifiers: models.map(x => x.model_identifier)}));
  }, 180_000);

  it('captures a single tiny real Opus result model identity without content or secrets', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-sdk-opus-price-'));
    const client = new ClaudeSdkClient();
    let query: Awaited<ReturnType<ClaudeSdkClient['startQueryTurn']>> | null = null;
    try {
      query = await client.startQueryTurn({ prompt: 'Reply exactly OK.', systemPrompt: '', sessionBinding: {kind: 'create', sessionId: randomUUID()}, model: 'opus[1m]', workingDirectory: workspace, permissionMode: 'plan', autoExecuteTools: false });
      let result: Record<string, unknown> | null = null;
      for await (const chunk of query) {
        if (chunk && typeof chunk === 'object' && !Array.isArray(chunk) && (chunk as Record<string, unknown>).type === 'result') { result = chunk as Record<string, unknown>; break; }
      }
      expect(result).not.toBeNull();
      const usage = result?.usage as Record<string, unknown> | undefined;
      const modelUsage = result?.modelUsage as Record<string, unknown> | undefined;
      const event = buildClaudeTokenUsageEvent({chunk: result, runId:'probe', turnId:'probe', sessionId:'probe', model:'opus[1m]'});
      console.log(JSON.stringify({requested_model: 'opus[1m]', result_model: result?.model ?? null, usage_model: usage?.model ?? null, model_usage_keys: modelUsage ? Object.keys(modelUsage) : [], emitted_model_identifier: (event as any)?.params?.model_identifier ?? null, result_is_error: result?.is_error ?? null}));
      expect(result?.is_error).not.toBe(true);
      expect(event).not.toBeNull();
    } finally { query?.close(); await fs.rm(workspace,{recursive:true,force:true}); }
  }, 180_000);
});
