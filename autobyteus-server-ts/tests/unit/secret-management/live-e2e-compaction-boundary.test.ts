import fs from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from 'autobyteus-ts/llm/utils/messages.js';
import { LLMConfig } from 'autobyteus-ts/llm/utils/llm-config.js';
import { LLMModel } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { COMPACTION_SUMMARY_PROMPT } from 'autobyteus-ts/memory/compaction/compaction-summary-prompt.js';
import { WorkingContextCompactionPromptBuilder } from 'autobyteus-ts/memory/compaction/working-context-compaction-prompt-builder.js';
import { AutoByteusAgentRunBackendFactory } from '../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.js';
import * as availableLlm from '../../../src/agent-execution/backends/autobyteus/available-llm-construction.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { inspectDirectSummaryRequest, LiveE2eScenarioExecution } from '../../../../test-support/live-e2e/live-e2e-harness.js';
import { liveE2eScenarios } from '../../../../test-support/live-e2e/live-e2e-scenarios.mjs';

const fixtureUrl = new URL('../../../../autobyteus-ts/tests/fixtures/memory/compaction-unicode-shield-tool-trace.json', import.meta.url);
afterEach(() => vi.restoreAllMocks());

describe('shared live compaction setup boundary (no provider calls)', () => {
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
          await this.compactionLlmFactory({ parentModelIdentifier: config.llmModelIdentifier });
          throw reached; // Stop at setup; no parent or summarizer generation/network.
        });
      await expect(scenario.executeCompactionAgentFlow()).rejects.toBe(reached);
      expect(backend).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      expect(registerExtension).toHaveBeenCalledTimes(1);
    },
  );

  it('checks the current direct request framing and Unicode tool fixture without mutating the source', async () => {
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
    const history = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([{
      id: 'fixture', kind: 'tool_protocol_group', startIndex: 0, endIndex: 1,
      rawTraceIds: ['call', 'result'], toolCallIds: [fixture.tool_call_id],
      matchedToolCallIds: [fixture.tool_call_id], isComplete: true, messages,
    }], { maxItemChars: 2_000 });
    const invocation = { messages: [
      { role: MessageRole.SYSTEM, content: COMPACTION_SUMMARY_PROMPT, toolPayload: null, provenance: null },
      { role: MessageRole.USER, content: `Summary budget: 2000 tokens.\n\n${history}`, toolPayload: null, provenance: null },
    ] };
    expect(inspectDirectSummaryRequest(invocation)).toEqual({
      sourceToolTailVerified: true, shieldOmissionPressureVerified: true,
    });
    expect(history).toContain(fixture.tool_call_id);
    expect(await fs.readFile(fixtureUrl, 'utf8')).toBe(before);
    expect(() => inspectDirectSummaryRequest({ messages: [invocation.messages[1]!] }))
      .toThrow('LIVE_E2E_DIRECT_SUMMARY_REQUEST_INVALID');
  });
});
