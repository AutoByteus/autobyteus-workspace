import fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from 'autobyteus-ts/llm/utils/messages.js';
import { LLMConfig } from 'autobyteus-ts/llm/utils/llm-config.js';
import { LLMModel } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { COMPACTION_SUMMARY_PROMPT } from 'autobyteus-ts/memory/compaction/compaction-summary-prompt.js';
import { CompactionContentBuilder } from 'autobyteus-ts/memory/compaction/compaction-content-builder.js';
import { AutoByteusAgentRunBackendFactory } from '../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
import * as availableLlm from '../../../src/agent-execution/backends/autobyteus/available-llm-construction.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { inspectDirectSummaryRequest, LiveE2eScenarioExecution } from '../../../../test-support/live-e2e/live-e2e-harness.js';
import { assertNoInventedPlanChanges } from '../../../../test-support/live-e2e/compaction-quality-checks.js';
import { liveE2eScenarios } from '../../../../test-support/live-e2e/live-e2e-scenarios.mjs';

import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';

let toolSnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;
beforeEach(() => { toolSnapshot = defaultToolRegistry.snapshot(); defaultToolRegistry.clear(); });
afterEach(() => defaultToolRegistry.restore(toolSnapshot));

const fixtureUrl = new URL('../../../../autobyteus-ts/tests/fixtures/memory/compaction-unicode-shield-tool-trace.json', import.meta.url);
afterEach(() => vi.restoreAllMocks());

describe('shared live compaction setup boundary (no provider calls)', () => {
  // Reporting-contract guard only, not a live-flow or model-quality assertion.
  // F006 retired the omission predicate; neither producer/type nor consumer may
  // claim its verification. The executable Unicode/framing checks remain below.
  it.each([
    ['flow result type and producer', '../../../../test-support/live-e2e/live-e2e-harness.ts'],
    ['registered result consumer', '../../e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts'],
  ])('retires unsupported omission-pressure reporting from %s', async (_label, relativePath) => {
    const source = await fs.readFile(new URL(relativePath, import.meta.url), 'utf8');
    expect(source.includes('directSummaryShieldOmissionPressureVerified')).toBe(false);
    for (const retainedField of [
      'directSummaryTaskFramingVerified',
      'directSummarySourceToolTailVerified',
      'directSummaryProviderSafeUnicodeVerified',
      'unicodeShieldSourceImmutableVerified',
    ]) {
      expect(source.includes(retainedField)).toBe(true);
    }
  });

  it.each(['deepseek.compaction-agent-flow', 'lmstudio.qwen36.compaction-agent-flow'])(
    '%s reaches fresh direct-provider setup without retired assets or exports', async (scenarioId) => {
      const scenario = new LiveE2eScenarioExecution(scenarioId, liveE2eScenarios[scenarioId]!, {} as never, 'http://127.0.0.1:1');
      vi.spyOn(scenario as any, 'resolveScenarioModelIdentifier').mockResolvedValue('fixture-parent');
      vi.spyOn(appConfigProvider.config, 'get').mockReturnValue(undefined);
      const registerExtension = vi.fn();
      const create = vi.spyOn(availableLlm, 'createAvailableLlm').mockImplementation(async (id, configure) => {
        expect(id).toBe('fixture-parent');
        expect(typeof configure).toBe('function');
        const model = new LLMModel({ name: id, value: id, provider: LLMProvider.OPENAI });
        const config = (configure as Function)(model, new LLMConfig());
        expect(config.systemMessage).toBe(COMPACTION_SUMMARY_PROMPT);
        return { registerExtension } as never;
      });
      const reached = new Error('DIRECT_SETUP_REACHED_WITHOUT_GENERATION');
      const backend = vi.spyOn(AutoByteusAgentRunBackendFactory.prototype, 'createBackend')
        .mockImplementation(async function (this: any, config) {
          expect(config.llmModelIdentifier).toBe('fixture-parent');
          for (const name of ['read_file', 'write_file', 'edit_file', 'run_bash']) {
            expect(defaultToolRegistry.getToolDefinition(name)?.name).toBe(name);
          }
          await this.compactionLlmFactory({ parentModelIdentifier: config.llmModelIdentifier });
          throw reached; // Stop at setup; no parent or summarizer generation/network.
        });
      await expect(scenario.executeCompactionAgentFlow()).rejects.toBe(reached);
      expect(backend).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      expect(registerExtension).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    'Source received.',
    'Preserved emoji 🛡️ and other Unicode: Grüße 中文 ✅; the log literally contains �.',
  ])('accepts ordinary assistant text while checking request framing and source preservation: %s', async (assistantText) => {
    const before = await fs.readFile(fixtureUrl, 'utf8');
    const fixture = JSON.parse(before);
    const messages = [
      new Message(MessageRole.ASSISTANT, { tool_payload: new ToolCallPayload([
        { id: fixture.tool_call_id, name: 'read_file', arguments: { path: '/fixture/unicode-boundary-evidence.json' } },
      ]) }),
      new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload(
        fixture.tool_call_id, 'read_file', JSON.stringify(fixture.tool_result, null, 2),
      ) }),
    ];
    const history = new CompactionContentBuilder().build([{
      id: 'assistant', kind: 'message', startIndex: 0, endIndex: 0,
      rawTraceIds: ['assistant'], messages: [new Message(MessageRole.ASSISTANT, { content: assistantText })],
    }, {
      id: 'fixture', kind: 'tool_protocol_group', startIndex: 1, endIndex: 2,
      rawTraceIds: ['call', 'result'], toolCallIds: [fixture.tool_call_id],
      matchedToolCallIds: [fixture.tool_call_id], isComplete: true, messages,
    }], { maxItemChars: 2_000 });
    const invocation = { messages: [
      { role: MessageRole.SYSTEM, content: COMPACTION_SUMMARY_PROMPT, toolPayload: null, provenance: null },
      { role: MessageRole.USER, content: history, toolPayload: null, provenance: null },
    ] };
    expect(inspectDirectSummaryRequest(invocation)).toEqual({
      sourceToolTailVerified: true,
    });
    expect(history).toContain(assistantText);
    expect(history).toContain(fixture.tool_call_id);
    expect(await fs.readFile(fixtureUrl, 'utf8')).toBe(before);
    expect(() => inspectDirectSummaryRequest({ messages: [invocation.messages[1]!] }))
      .toThrow('LIVE_E2E_DIRECT_SUMMARY_REQUEST_INVALID');
    const malformed = structuredClone(invocation);
    malformed.messages[1]!.content = malformed.messages[1]!.content.replace(assistantText, '\uD83D');
    expect(() => inspectDirectSummaryRequest(malformed))
      .toThrow('LIVE_E2E_DIRECT_SUMMARY_UNICODE_UNSAFE');
  });
});


describe('controlled repeated-summary planned/completed quality alarm', () => {
  it('accepts inventory completion with the checkpoint still pending', () => {
    expect(() => assertNoInventedPlanChanges(
      '## Completed work\n- Inventory phase completed; 12 tables found.\n## Open work and next steps\n- Add checkpoint `APPROVAL-73` to the plan; implementation approval remains pending.',
    )).not.toThrow();
  });
  it('does not classify explicit non-completion as an update', () => {
    expect(() => assertNoInventedPlanChanges(
      '## Completed work\n- No plan was modified; checkpoint APPROVAL-73 has not been added.\n## Open work and next steps\n- Add the checkpoint after review.',
    )).not.toThrow();
  });
  it.each([
    '## Completed work\n- Updated plan with retention policy (30 days) and checkpoint `APPROVAL-73`.\n## Current state\n- Risk assessment active.',
    '## Decisions and findings\n- Checkpoint `APPROVAL-73` added to the plan to track owner review.\n## Completed work\n- Inventory phase completed.',
  ])('rejects invented plan completion: %s', (summary) => {
    expect(() => assertNoInventedPlanChanges(summary)).toThrow('LIVE_E2E_QUALITY_PLANNED_WORK_REPORTED_COMPLETE');
  });
});
