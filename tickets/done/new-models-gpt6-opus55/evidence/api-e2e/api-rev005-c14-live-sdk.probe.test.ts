import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import { ClaudeSdkClient } from '../../../../../src/runtime-management/claude/client/claude-sdk-client.js';
import { bindClaudeSelectedModelForTurn } from '../../../../../src/agent-execution/backends/claude/session/claude-selected-model-turn-binding.js';
import { buildClaudeTokenUsageEvent } from '../../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload } from '../../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { SqlTokenUsageRunRepository } from '../../../../../src/token-usage/repositories/sql/token-usage-run-repository.js';
import { TokenUsageRunAccumulator } from '../../../../../src/token-usage/services/token-usage-run-accumulator.js';

describe('temporary cost-bounded live selected Claude SDK accounting', () => {
  it('selects Opus on active query and prices its real terminal usage without response text', async () => {
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined(); // subscription path, no env-file import
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'claude-sdk-selected-accounting-'));
    const runId = `live-sdk-selected-${randomUUID()}`;
    const client = new ClaudeSdkClient();
    let query: Awaited<ReturnType<ClaudeSdkClient['startQueryTurn']>> | null = null;
    try {
      query = await client.startQueryTurn({ prompt: 'Reply exactly OK.', systemPrompt: '',
        sessionBinding: { kind: 'create', sessionId: randomUUID() }, model: 'opus[1m]',
        workingDirectory: workspace, permissionMode: 'plan', autoExecuteTools: false });
      const selected = await bindClaudeSelectedModelForTurn.resolve(client, query, 'opus[1m]');
      let result: Record<string, unknown> | null = null;
      for await (const chunk of query) {
        if (chunk && typeof chunk === 'object' && !Array.isArray(chunk) &&
          (chunk as Record<string, unknown>).type === 'result') { result = chunk as Record<string, unknown>; break; }
      }
      expect(result).not.toBeNull();
      expect(result?.is_error).not.toBe(true);
      const event = buildClaudeTokenUsageEvent({ chunk: result, runId, turnId: 'one', sessionId: 'live-session',
        model: 'opus[1m]', queryKind: 'create', selectedBinding: selected });
      expect(event).not.toBeNull();
      const payload = createTokenUsageUpdatedPayload({ runId, payload: event!.params });
      await shutdownPrisma();
      await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
      const accumulator = new TokenUsageRunAccumulator(new SqlTokenUsageRunRepository(rootPrismaClient));
      const priced = await accumulator.recordObservation(payload);
      const summary = priced.run_summary_after_event;
      console.log(JSON.stringify({ selected_raw: selected.selectedResolvedRawModelId,
        selection_resolution: selected.resolution, sdk_model_usage_ids: (event?.params.claude_sdk_model_usage ?? []).map(x => x.rawModelId),
        event_model: event?.params.model_identifier, result_error: result?.is_error ?? null,
        price_status: priced.api_cost_status, price_source: priced.pricing_source,
        estimated_total_present: typeof priced.estimated_api_total_cost === 'number',
        selected_only_summary_model: summary?.latest_model_identifier,
        assumed_1h: priced.quality_flags.includes('claude_sdk_cache_write_1h_assumed') }));
      expect(selected).toMatchObject({ resolution: 'resolved', selectedResolvedRawModelId: 'claude-opus-5-5[1m]' });
      expect(event?.params.selected_match_state).toBe('matched');
      expect(priced.api_cost_status).toBe('estimated');
      expect(summary?.latest_model_identifier).toBe('claude-opus-5-5');
    } finally {
      query?.close();
      await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId } }).catch(() => undefined);
      await shutdownPrisma();
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }, 180_000);
});
