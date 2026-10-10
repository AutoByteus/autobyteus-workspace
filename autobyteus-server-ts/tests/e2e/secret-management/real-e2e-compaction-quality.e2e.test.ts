import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LLMFactory, LLMRuntime } from 'autobyteus-ts';
import { LLMExtension } from 'autobyteus-ts/llm/extensions/base-extension.js';
import { Message, MessageRole } from 'autobyteus-ts/llm/utils/messages.js';
import type { CompleteResponse } from 'autobyteus-ts/llm/utils/response-types.js';
import { CompactionContentBuilder } from 'autobyteus-ts/memory/compaction/compaction-content-builder.js';
import type { CompactionExecutionMetadata } from 'autobyteus-ts/memory/compaction/compaction-execution.js';
import { CompactionSummarizer } from 'autobyteus-ts/memory/compaction/compaction-summarizer.js';
import { LlmPhaseSummaryPort } from 'autobyteus-ts/agent/loop/llm-phase-summary-port.js';
import { resolveLlmRequestCapacity } from 'autobyteus-ts/agent/token-budget.js';
import type { WorkingContextMessageUnit } from 'autobyteus-ts/memory/compaction/working-context-message-unit.js';
import { createCompactedMemoryUserMessage } from 'autobyteus-ts/memory/working-context-finalizer.js';
import { createAvailableLlm } from '../../../src/agent-execution/backends/autobyteus/available-llm-construction.js';
import { LiveE2eHarness, inspectSummaryRequest } from '../../../../test-support/live-e2e/live-e2e-harness.js';
import { liveE2eScenarios, selectedLiveE2eScenarioIds } from '../../../../test-support/live-e2e/live-e2e-scenarios.mjs';
import { assertNoInventedPlanChanges } from '../../../../test-support/live-e2e/compaction-quality-checks.js';
import { LiveE2eEvidenceScanner } from '../../../../test-support/live-e2e/live-e2e-evidence-scanner.js';

const enabled = process.env.RUN_REAL_E2E === '1' && process.env.AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY !== '1';
const selected = enabled ? selectedLiveE2eScenarioIds().filter(id => liveE2eScenarios[id]?.operation === 'compaction-agent-flow') : [];
const scanner = new LiveE2eEvidenceScanner(['synthetic-live-e2e-scan-canary']);
const report = (value: unknown) => { scanner.assertEvidenceClean(value); process.stdout.write(`${JSON.stringify(value)}\n`); };
const unit = (id: string, message: Message, kind: 'message' | 'compacted_memory' = 'message'): WorkingContextMessageUnit => ({
  id, kind, startIndex: 0, endIndex: 0, messages: [message], rawTraceIds: [],
});
const history = [
  unit('request', new Message(MessageRole.USER, { content:
    'Prepare an audit-only migration plan for incident INC-042. Constraints: no deployment, no push, and no customer-data export. Approval is for planning only, not implementation. Owner is Mira Chen. Retention is 7 days. Preserve /workspace/helios/plan.md and command pnpm verify:helios exactly. Work in two phases: inventory, then risk assessment. A cloud export was proposed but is not approved.' })),
  unit('inventory', new Message(MessageRole.ASSISTANT, { content:
    'Inventory phase completed: read /workspace/helios/inventory.json; found 12 tables. Risk assessment is active, not finished. Command pnpm verify:helios has NOT RUN. No code or database was changed. The permission decision for implementation remains pending.' })),
  unit('pending', new Message(MessageRole.USER, { content:
    'Keep all constraints. In the plan explain the duplicate-key risk. Ask me before any implementation. Do not execute the verification command yet.' })),
];
const correction = 'Correction: retention is now 30 days, replacing 7 days. Cancel the proposed cloud export entirely. Inventory remains completed. Keep risk assessment active. Add the owner-review checkpoint APPROVAL-73 to the plan; approval for implementation is still pending. The latest unresolved request is to compare rollback options, not to implement them. pnpm verify:helios is still unrun.';

const AGENT_SYSTEM_PROMPT = 'You are a careful planning agent working on incident INC-042.';

class Capture extends LLMExtension {
  requests: Array<{ messages: Array<{ role: MessageRole; content: string | null; toolPayload: unknown; provenance: null }> }> = [];
  responses: CompleteResponse[] = [];
  async beforeInvoke(messages: Message[]): Promise<void> {
    this.requests.push({ messages: messages.map(m => ({ role: m.role, content: m.content, toolPayload: m.tool_payload, provenance: null })) });
  }
  async afterInvoke(_messages: Message[], response: CompleteResponse | null): Promise<void> {
    if (response) this.responses.push(response);
  }
}

// Keyword checks are regression alarms, not a semantic completeness oracle.
// Review the retained input/output evidence separately for contradiction and omission.
const assertEssentialRetention = (summary: string) => {
  for (const heading of ['Goal and constraints', 'Decisions and findings', 'Completed work', 'Current state', 'Open work and next steps', 'Essential references']) expect(summary).toContain(`## ${heading}`);
  for (const exact of ['INC-042', 'Mira Chen', '/workspace/helios/plan.md', 'pnpm verify:helios', '/workspace/helios/inventory.json']) {
    expect(summary).toContain(exact);
  }
  expect(summary).toMatch(/12 tables/i);
  expect(summary).toMatch(/(?:no|not|without|prohibit|do not)[^\n.]{0,80}(?:deploy|push)/i);
  expect(summary).toMatch(/(?:planning(?:\/approval)?[ -]only|audit.only[^\n.]*plan)/i);
  expect(summary).toMatch(/(?:not run|unrun|not executed|unexecuted|has not been run|NOT RUN)/i);
  expect(summary).toMatch(/(?:implementation[^\n.]{0,60}pending|(?:approval|permission)[^\n.]{0,60}pending|approval before[^\n.]{0,60}implementation)/i);
  expect(summary).toMatch(/duplicate.key/i);
};

(enabled ? describe : describe.skip)('first and repeated live compaction semantic retention', () => {
  let harness: LiveE2eHarness;
  beforeAll(async () => { harness = await LiveE2eHarness.open(); });
  afterAll(async () => { await harness?.close(); });
  for (const scenarioId of selected) {
    it(`preserves first/repeated decisions for ${scenarioId}`, { timeout: 900_000 }, async ({ skip }) => {
      const preflight = await harness.preflight(scenarioId);
      report({ event: 'semantic_preflight', ...preflight });
      if (preflight.health !== 'READY' || preflight.missing.length) { skip(); return; }
      const scenario = liveE2eScenarios[scenarioId]!;
      let parentModelIdentifier = scenario.model!;
      if (scenario.providerId === 'LMSTUDIO') {
        const matches = (await LLMFactory.listModelsByRuntime(LLMRuntime.LMSTUDIO)).filter(m => m.value === scenario.model);
        expect(matches).toHaveLength(1);
        parentModelIdentifier = matches[0]!.model_identifier;
      }
      // Compaction always summarizes on the agent's own model: the cached summary request (the
      // conversation + instruction) first, the transcript request as fallback.
      const captures: Capture[] = [];
      const compress = async (units: WorkingContextMessageUnit[], phase: string) => {
        let execution: CompactionExecutionMetadata | undefined;
        const llm = await createAvailableLlm(parentModelIdentifier);
        const capture = new Capture(llm); captures.push(capture); llm.registerExtension(capture);
        try {
          const port = new LlmPhaseSummaryPort({ agentId: `quality-${scenarioId}`, llm, tools: [],
            requestCapacity: resolveLlmRequestCapacity(llm.model, llm.config), notifier: null });
          const summary = await new CompactionSummarizer(port).summarize({
            baselineMessages: [new Message(MessageRole.SYSTEM, { content: AGENT_SYSTEM_PROMPT }), ...units.flatMap(u => u.messages)],
            transcriptContent: new CompactionContentBuilder().build(units),
            operationId: `quality-${phase}`, executionTurnId: `quality-${phase}`,
            signal: AbortSignal.timeout(400_000),
            observe: event => { if (event.outcome === 'succeeded') execution = event.execution; },
          });
          if (!execution) throw new Error('Missing compaction summary success observation.');
          return { summary, execution };
        } finally {
          await llm.cleanup();
        }
      };
      const first = await compress(history, 'first');
      report({ event: 'semantic_first', scenarioId, source: history.flatMap(u => u.messages.map(m => m.content)), ...first });
      assertEssentialRetention(first.summary);
      expect(first.summary).toMatch(/7.day|7 days/i);
      const repeatedInput = [unit('prior-summary', createCompactedMemoryUserMessage(first.summary), 'compacted_memory'),
        unit('correction', new Message(MessageRole.USER, { content: correction }))];
      const repeated = await compress(repeatedInput, 'repeated');
      report({ event: 'semantic_repeated', scenarioId, correction, ...repeated });
      assertNoInventedPlanChanges(repeated.summary);
      assertEssentialRetention(repeated.summary);
      expect(repeated.summary).toMatch(/30.day|30 days/i);
      expect(repeated.summary).toContain('APPROVAL-73');
      expect(repeated.summary).toMatch(/(?:cancel[^\n.]*cloud|cloud[^\n.]*cancel)/i);
      expect(repeated.summary).toMatch(/rollback options/i);
      expect(repeated.execution.invocationId).not.toBe(first.execution.invocationId);
      expect(captures).toHaveLength(2);
      for (const capture of captures) {
        expect(capture.requests.length).toBeGreaterThanOrEqual(1);
        expect(capture.responses).toHaveLength(capture.requests.length);
        for (const request of capture.requests) inspectSummaryRequest(request);
      }
      // The repeated compaction's successful request carries the first summary (as conversation or transcript).
      expect(JSON.stringify(captures[1]!.requests.at(-1)!.messages)).toContain(JSON.stringify(first.summary).slice(1, 200));
      report({ event: 'semantic_two_compactions_verified', scenarioId,
        modes: [first.execution.mode, repeated.execution.mode],
        attempts: captures.map(capture => capture.requests.length) });
    });
  }
});
