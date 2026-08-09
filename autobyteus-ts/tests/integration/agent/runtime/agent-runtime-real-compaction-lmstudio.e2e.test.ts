import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { resolveTokenBudget } from '../../../../src/agent/token-budget.js';
import { EventType } from '../../../../src/events/event-types.js';
import type { BaseLLM } from '../../../../src/llm/base.js';
import { LLMExtension } from '../../../../src/llm/extensions/base-extension.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import type { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { MessageRole, type Message } from '../../../../src/llm/utils/messages.js';
import type {
  CompactionAgentRunner,
  CompactionAgentTask,
} from '../../../../src/memory/compaction/compaction-agent-runner.js';
import { CompactionAgentRunnerError } from '../../../../src/memory/compaction/compaction-agent-runner.js';
import { AUTOBYTEUS_COMPACTION_STRATEGY } from '../../../../src/memory/compaction/working-context-compaction-strategy-setting.js';
import { MemoryType } from '../../../../src/memory/models/memory-types.js';
import { FileCompactionLineageStore } from '../../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import {
  getWorkingContextMessageProvenance,
  type WorkingContextMessageProvenance,
} from '../../../../src/memory/working-context-provenance.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { createLmstudioLLM } from '../../helpers/lmstudio-llm-helper.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime-test-harness.js';

const RUN_REAL_E2E = process.env.RUN_REAL_LMSTUDIO_COMPACTION_E2E === '1';
const runRealE2E = RUN_REAL_E2E ? describe : describe.skip;
const EXPECTED_MODEL = process.env.LMSTUDIO_COMPACTION_MODEL ?? 'qwen/qwen3.6-35b-a3b';
const FLOW_TIMEOUT_MS = Number(process.env.LMSTUDIO_COMPACTION_E2E_TIMEOUT_MS ?? 1_200_000);
const COMPACTION_RATIO = 0.05;
const COMPACTION_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'memory_compaction_result',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        episodes: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: { summary: { type: 'string' } },
            required: ['summary'],
          },
        },
        critical_issues: { type: 'array', items: factSchema() },
        unresolved_work: { type: 'array', items: factSchema() },
        durable_facts: { type: 'array', items: factSchema() },
        user_preferences: { type: 'array', items: factSchema() },
        important_artifacts: { type: 'array', items: factSchema() },
      },
      required: [
        'episodes',
        'critical_issues',
        'unresolved_work',
        'durable_facts',
        'user_preferences',
        'important_artifacts',
      ],
    },
  },
};

function factSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: { fact: { type: 'string' } },
    required: ['fact'],
  };
}

type CompactionStatus = {
  phase?: string;
  compaction_operation_id?: string | null;
  selected_block_count?: number | null;
  compacted_block_count?: number | null;
  raw_trace_count?: number | null;
  semantic_fact_count?: number | null;
  compaction_runtime_kind?: string | null;
  compaction_model_identifier?: string | null;
  error_message?: string | null;
};

type TokenUsageStatus = {
  latest_prompt_tokens?: number | null;
  effective_context_window_tokens?: number | null;
};

type ToolStatus = {
  tool_name?: string;
  invocation_id?: string;
  result?: unknown;
};

type InvocationMessageSnapshot = {
  role: MessageRole;
  content: string | null;
  toolPayload: unknown;
  provenance: WorkingContextMessageProvenance | null;
};

type InvocationSnapshot = {
  messages: InvocationMessageSnapshot[];
};

class InvocationCaptureExtension extends LLMExtension {
  readonly invocations: InvocationSnapshot[] = [];
  readonly responses: Array<string | null> = [];

  async beforeInvoke(messages: Message[]): Promise<void> {
    this.invocations.push({
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        toolPayload: message.tool_payload,
        provenance: getWorkingContextMessageProvenance(message),
      })),
    });
  }

  async afterInvoke(
    _messages: Message[],
    response: CompleteResponse | null,
  ): Promise<void> {
    this.responses.push(response?.content ?? null);
  }
}

const extractConstituent = (
  invocation: InvocationSnapshot,
  kind: 'compacted_memory' | 'current_user',
  expectedValue?: string,
): string | null => {
  let first: string | null = null;
  for (const message of invocation.messages) {
    if (message.role !== MessageRole.USER || !message.content) continue;
    if (message.provenance?.kind !== 'composed_user') continue;
    for (const constituent of message.provenance.constituents) {
      if (constituent.kind !== kind || !constituent.textRange) continue;
      const value = message.content.slice(constituent.textRange.start, constituent.textRange.end);
      if (expectedValue === undefined) first ??= value;
      if (value === expectedValue) return value;
    }
  }
  return expectedValue === undefined ? first : null;
};

const ORIGINAL_ENV = {
  strategy: process.env[AUTOBYTEUS_COMPACTION_STRATEGY],
  detailedLogs: process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS,
  targetModel: process.env.LMSTUDIO_TARGET_TEXT_MODEL,
};

const restoreEnv = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

const buildEvidence = (
  group: 'A' | 'B',
  anchors: Record<string, string>,
  recordCount = 40,
): string => {
  const anchorRecord = JSON.stringify({
    record_type: 'incident_anchors',
    evidence_group: group,
    ...anchors,
  });
  const records = Array.from({ length: recordCount }, (_, index) => {
    const sequence = String(index + 1).padStart(3, '0');
    return JSON.stringify({
      record_type: 'operational_observation',
      evidence_group: group,
      record_id: `${group}-${sequence}`,
      service: index % 2 === 0 ? 'payments-api' : 'ledger-writer',
      shard: `checkout-${String((index % 7) + 1).padStart(2, '0')}`,
      latency_ms: 117 + index,
      retry_queue_depth: index % 5,
      observation:
        `Chronology record ${group}-${sequence} confirms the sampled batch checksum, retry state, and service health. ` +
        'It supplies realistic incident context but does not supersede the incident anchor record.',
    });
  });
  return [anchorRecord, ...records].join('\n');
};

class RealLmstudioCompactionRunner implements CompactionAgentRunner {
  readonly tasks: CompactionAgentTask[] = [];
  readonly outputs: string[] = [];

  constructor(private readonly llm: BaseLLM) {}

  async runCompactionTask(task: CompactionAgentTask) {
    this.tasks.push(task);
    const metadata = {
      compactionAgentDefinitionId: 'lmstudio-real-memory-compactor',
      compactionAgentName: 'LM Studio Real Memory Compactor',
      runtimeKind: 'lmstudio',
      modelIdentifier: this.llm.model.modelIdentifier,
      provider: String(this.llm.model.provider),
      compactionRunId: `lmstudio_compaction_${randomUUID().replace(/-/g, '')}`,
      taskId: task.taskId,
    };

    try {
      const response = await this.llm.sendUserMessage(
        new LLMUserMessage({ content: task.prompt }),
        {
          reasoning_effort: 'none',
          response_format: COMPACTION_RESPONSE_FORMAT,
        },
      );
      const outputText = response.content?.trim() ?? '';
      this.outputs.push(outputText);
      return { outputText, metadata };
    } catch (error) {
      throw new CompactionAgentRunnerError(
        `LM Studio compaction call failed: ${error instanceof Error ? error.message : String(error)}`,
        metadata,
        error,
      );
    }
  }
}

runRealE2E('Agent runtime real compaction (LM Studio)', () => {
  let registrySnapshot: Map<string, any>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    SkillRegistry.getInstance().clear();
    resetAgentFactory();
    process.env.AUTOBYTEUS_COMPACTION_DEBUG_LOGS = 'true';
    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = 'structured-json';
    process.env.LMSTUDIO_TARGET_TEXT_MODEL = EXPECTED_MODEL;
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
    SkillRegistry.getInstance().clear();
    resetAgentFactory();
    restoreEnv(AUTOBYTEUS_COMPACTION_STRATEGY, ORIGINAL_ENV.strategy);
    restoreEnv('AUTOBYTEUS_COMPACTION_DEBUG_LOGS', ORIGINAL_ENV.detailedLogs);
    restoreEnv('LMSTUDIO_TARGET_TEXT_MODEL', ORIGINAL_ENV.targetModel);
  });

  it('compacts a meaningful tool task at five percent and continues from projected retained facts', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-real-lmstudio-compaction-'));
    const workspace = path.join(tempDir, 'workspace');
    const memoryDir = path.join(tempDir, 'memory');
    fs.mkdirSync(workspace, { recursive: true });
    fs.mkdirSync(memoryDir, { recursive: true });

    const evidenceAPath = path.join(workspace, 'incident-evidence-a.jsonl');
    const evidenceBPath = path.join(workspace, 'incident-evidence-b.jsonl');
    const followupPath = path.join(workspace, 'followup-constraint.json');

    const partA = {
      customer: 'Northwind Helios',
      rollback_action: 'restore the last stable payments build',
      safety_rule: 'the ledger delta must remain zero',
      verification: 'reconcile both ledgers before reopening retries',
    };
    const partB = {
      owner: 'Mira Chen',
      mitigation: 'freeze payment retries',
      rejection_condition: 'any duplicate ledger entry',
      communication_channel: 'payments incident bridge',
    };
    const newConstraint = 'preserve auditable rollback proof';

    fs.writeFileSync(evidenceAPath, buildEvidence('A', partA), 'utf8');
    fs.writeFileSync(evidenceBPath, buildEvidence('B', partB, 100), 'utf8');
    fs.writeFileSync(followupPath, JSON.stringify({ new_constraint: newConstraint }), 'utf8');

    let mainLLM: BaseLLM | null = null;
    let compactorLLM: BaseLLM | null = null;
    let agent: ReturnType<AgentFactory['createAgent']> | null = null;
    const compactionStatuses: CompactionStatus[] = [];
    const tokenStatuses: TokenUsageStatus[] = [];
    const toolSucceeded: ToolStatus[] = [];
    const toolFailed: unknown[] = [];
    const runtimeErrors: unknown[] = [];
    let completedTurns = 0;

    try {
      mainLLM = await createLmstudioLLM({ temperature: 0, forceFactoryDiscovery: true });
      expect(mainLLM, `LM Studio did not expose '${EXPECTED_MODEL}'.`).not.toBeNull();
      compactorLLM = await createLmstudioLLM({ temperature: 0 });
      expect(compactorLLM, `LM Studio did not expose a compactor '${EXPECTED_MODEL}'.`).not.toBeNull();
      if (!mainLLM || !compactorLLM) {
        throw new Error(`LM Studio model '${EXPECTED_MODEL}' is required for this explicitly selected E2E.`);
      }

      expect(mainLLM.model.runtime).toBe('lmstudio');
      expect(mainLLM.model.modelIdentifier).toContain(EXPECTED_MODEL);
      expect(mainLLM.model.maxContextTokens).toBeGreaterThan(0);
      mainLLM.config.maxTokens = 1_024;
      mainLLM.config.compactionRatio = COMPACTION_RATIO;
      mainLLM.config.safetyMarginTokens = 256;
      mainLLM.config.temperature = 0;
      mainLLM.config.extraParams = { reasoning_effort: 'none' };
      const invocationCapture = new InvocationCaptureExtension(mainLLM);
      mainLLM.registerExtension(invocationCapture);
      compactorLLM.config.maxTokens = 2_048;
      compactorLLM.config.temperature = 0;
      compactorLLM.config.extraParams = { reasoning_effort: 'none' };
      compactorLLM.configureSystemPrompt(
        'You are a memory compactor. Preserve exact task-critical literal values and return only the requested JSON object.',
      );

      const runner = new RealLmstudioCompactionRunner(compactorLLM);
      const readFileTool = registerReadFileTool();
      const writeFileTool = registerWriteFileTool();
      const config = new AgentConfig(
        'RealLmstudioCompactionAgent',
        'Incident response analyst',
        'Exercises real local-model tool work, compaction, retained-memory quality, and continuation.',
        mainLLM,
        [
          'You are an incident response analyst.',
          'Follow the requested file-tool sequence exactly and use provider-native tool calls.',
          'Never invent incident values. Preserve exact literal values from tool evidence.',
          'For write_file, preserve the exact path and base_dir values supplied by the user.',
          'When asked to write a report, use write_file and only finish after the tool succeeds.',
        ].join(' '),
        [readFileTool, writeFileTool],
        true,
        null,
        null,
        null,
        null,
        null,
        workspace,
        null,
        null,
        null,
        memoryDir,
        null,
        runner,
      );
      agent = new AgentFactory().createAgent(config);

      const notifier = agent.context.statusManager?.notifier ?? null;
      const onCompaction = (payload?: unknown) => {
        if (payload && typeof payload === 'object') {
          compactionStatuses.push(payload as CompactionStatus);
        }
      };
      const onTokenUsage = (payload?: unknown) => {
        if (payload && typeof payload === 'object') {
          tokenStatuses.push(payload as TokenUsageStatus);
        }
      };
      const onToolSucceeded = (payload?: unknown) => {
        if (payload && typeof payload === 'object') {
          toolSucceeded.push(payload as ToolStatus);
        }
      };
      const onToolFailed = (payload?: unknown) => {
        toolFailed.push(payload ?? null);
      };
      const onRuntimeError = (payload?: unknown) => {
        runtimeErrors.push(payload ?? null);
      };
      const onTurnCompleted = () => {
        completedTurns += 1;
      };

      notifier?.subscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompaction);
      notifier?.subscribe(EventType.AGENT_TOKEN_USAGE_UPDATED, onTokenUsage);
      notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
      notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
      notifier?.subscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onRuntimeError);
      notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);

      const waitForTurn = async (expectedCount: number): Promise<void> => {
        const settled = await waitForCondition(
          () => completedTurns >= expectedCount
            || agent?.currentStatus === AgentStatus.ERROR
            || toolFailed.length > 0
            || runtimeErrors.length > 0,
          FLOW_TIMEOUT_MS,
          250,
        );
        expect(settled).toBe(true);
        expect(toolFailed, 'The local model emitted a failing tool call.').toHaveLength(0);
        expect(runtimeErrors, 'The local model emitted a runtime output error.').toHaveLength(0);
        expect(agent?.currentStatus).toBe(AgentStatus.IDLE);
        expect(agent?.context.state.activeTurn).toBeNull();
      };

      try {
        agent.start();
        expect(await waitForStatus(
          agent.context,
          (status) => status === AgentStatus.IDLE || status === AgentStatus.ERROR,
          FLOW_TIMEOUT_MS,
          250,
        )).toBe(true);
        expect(agent.currentStatus).toBe(AgentStatus.IDLE);

        const memoryManager = agent.context.state.memoryManager;
        expect(memoryManager).not.toBeNull();
        if (!memoryManager) {
          throw new Error('Agent memory manager was not initialized.');
        }
        const budget = resolveTokenBudget(mainLLM.model, mainLLM.config, memoryManager.compactionPolicy);
        expect(budget).not.toBeNull();
        expect(budget?.compactionRatio).toBe(COMPACTION_RATIO);
        expect(budget?.triggerThresholdTokens).toBeGreaterThan(5_000);

        await agent.postUserMessage(new AgentInputUserMessage(
          `Call read_file exactly once for "${evidenceAPath}" with include_line_numbers=false. ` +
          'Do not call write_file. Learn the anchor record. After the tool succeeds, respond concisely with ' +
          'PART_A_INGESTED and repeat these exact fields: customer, rollback_action, safety_rule, verification.',
        ));
        await waitForTurn(1);
        expect(compactionStatuses).toHaveLength(0);

        await agent.postUserMessage(new AgentInputUserMessage(
          `Call read_file exactly once for "${evidenceBPath}" with include_line_numbers=false. ` +
          'Do not call write_file. Learn the anchor record. After the tool succeeds, respond concisely with ' +
          'PART_B_INGESTED and repeat these exact fields: owner, mitigation, rejection_condition, ' +
          'communication_channel.',
        ));
        await waitForTurn(2);

        const completedCompactions = compactionStatuses.filter(({ phase }) => phase === 'completed');
        expect(compactionStatuses.map(({ phase }) => phase)).toEqual(['requested', 'started', 'completed']);
        expect(completedCompactions).toHaveLength(1);
        expect(completedCompactions[0]).toMatchObject({
          selected_block_count: expect.any(Number),
          compacted_block_count: expect.any(Number),
          raw_trace_count: expect.any(Number),
          compaction_runtime_kind: 'lmstudio',
        });
        expect(completedCompactions[0]?.selected_block_count).toBeGreaterThan(0);
        expect(completedCompactions[0]?.compacted_block_count).toBeGreaterThan(0);
        expect(completedCompactions[0]?.raw_trace_count).toBeGreaterThan(0);
        expect(completedCompactions[0]?.compaction_model_identifier).toContain(EXPECTED_MODEL);
        expect(compactionStatuses.some(({ phase }) => phase === 'failed')).toBe(false);
        expect(memoryManager.compactionRequired).toBe(false);

        const observedPromptTokens = tokenStatuses
          .map(({ latest_prompt_tokens }) => latest_prompt_tokens)
          .filter((value): value is number => typeof value === 'number');
        expect(observedPromptTokens.some((tokens) => tokens < (budget?.triggerThresholdTokens ?? 0))).toBe(true);
        expect(observedPromptTokens.some((tokens) => tokens >= (budget?.triggerThresholdTokens ?? Infinity))).toBe(true);
        expect(tokenStatuses.some(({ effective_context_window_tokens }) =>
          effective_context_window_tokens === budget?.effectiveContextCapacity)).toBe(true);

        expect(runner.tasks).toHaveLength(1);
        expect(runner.outputs).toHaveLength(1);
        for (const value of Object.values(partA)) {
          expect(runner.tasks[0]?.prompt).toContain(value);
          expect(runner.outputs[0]).toContain(value);
        }
        expect(runner.tasks[0]?.prompt).not.toContain(partB.owner);

        const store = memoryManager.store as FileMemoryStore;
        expect(store.readArchiveRawTraces().length).toBeGreaterThan(0);
        expect(store.list(MemoryType.EPISODIC).length).toBeGreaterThan(0);
        const lineageStore = new FileCompactionLineageStore(store.agentDir, {
          targetKind: 'agent_run',
          runId: agent.agentId,
          memberId: null,
        });
        expect(lineageStore.list()).toHaveLength(1);

        fs.rmSync(evidenceAPath, { force: true });
        expect(fs.existsSync(evidenceAPath)).toBe(false);

        await agent.postUserMessage(new AgentInputUserMessage(
          `Call read_file exactly once for "${followupPath}" with include_line_numbers=false. ` +
          'Do not call write_file. Learn the new_constraint and respond concisely with CONSTRAINT_INGESTED.',
        ));
        await waitForTurn(3);

        fs.rmSync(evidenceBPath, { force: true });
        fs.rmSync(followupPath, { force: true });
        expect(fs.existsSync(evidenceBPath)).toBe(false);
        expect(fs.existsSync(followupPath)).toBe(false);

        const finalInstruction =
          'Without rereading deleted evidence, respond with one valid JSON object with exactly these keys: customer, ' +
          'rollback_action, safety_rule, verification, owner, mitigation, rejection_condition, ' +
          'communication_channel, new_constraint. Use the exact retained values and do not write Markdown.';
        await agent.postUserMessage(new AgentInputUserMessage(finalInstruction));
        await waitForTurn(4);

        const finalInvocation = [...invocationCapture.invocations].reverse().find(({ messages }) =>
          messages.some(({ role, content }) =>
            role === MessageRole.USER && content?.includes(finalInstruction)));
        const projectedMemoryUserRegion = finalInvocation
          ? extractConstituent(finalInvocation, 'compacted_memory')
          : null;
        const projectedCurrentUserRegion = finalInvocation
          ? extractConstituent(finalInvocation, 'current_user', finalInstruction)
          : null;
        const finalResponseText = invocationCapture.responses.at(-1)?.trim() ?? '';
        let finalReport: Record<string, unknown> | null = null;
        try {
          finalReport = JSON.parse(finalResponseText) as Record<string, unknown>;
        } catch {
          finalReport = null;
        }
        process.stdout.write(`${JSON.stringify({
          event: 'lmstudio_compaction_quality_probe',
          modelIdentifier: mainLLM.model.modelIdentifier,
          compactionRatio: COMPACTION_RATIO,
          completedCompactionCount: compactionStatuses.filter(({ phase }) => phase === 'completed').length,
          compactionOutputs: runner.outputs.map((output) => JSON.parse(output)),
          projectedCompactedMemoryUserRegion: projectedMemoryUserRegion,
          nextCurrentUserRegion: projectedCurrentUserRegion,
          projectedInvocationAnchorPresence: Object.fromEntries(
            [...Object.values(partA), ...Object.values(partB)].map((anchor) => [
              anchor,
              JSON.stringify(finalInvocation).includes(anchor),
            ]),
          ),
          lastAssistantResponse: finalResponseText,
          exactContinuationResponse: finalReport,
        })}\n`);

        expect(finalReport).toEqual({
          ...partA,
          ...partB,
          new_constraint: newConstraint,
        });

        const succeededToolNames = toolSucceeded.map(({ tool_name }) => tool_name);
        expect(succeededToolNames.filter((name) => name === 'read_file')).toHaveLength(3);
        expect(succeededToolNames.filter((name) => name === 'write_file')).toHaveLength(0);
        expect(toolFailed).toHaveLength(0);
        expect(runtimeErrors).toHaveLength(0);
        expect(compactionStatuses.some(({ error_message }) => Boolean(error_message))).toBe(false);

        const finalCompletedCompactions = compactionStatuses.filter(({ phase }) => phase === 'completed');
        expect(finalCompletedCompactions).toHaveLength(1);
        expect(runner.tasks).toHaveLength(finalCompletedCompactions.length);
        expect(runner.outputs).toHaveLength(finalCompletedCompactions.length);
        expect(lineageStore.list()).toHaveLength(finalCompletedCompactions.length);
        const expectedAnchorValues = [
          ...Object.values(partA),
          ...Object.values(partB),
          newConstraint,
        ];
        for (let index = 0; index < runner.tasks.length; index += 1) {
          const prompt = runner.tasks[index]?.prompt ?? '';
          const output = runner.outputs[index] ?? '';
          for (const anchor of expectedAnchorValues) {
            if (prompt.includes(anchor)) {
              expect(output).toContain(anchor);
            }
          }
        }
        expect(new Set(finalCompletedCompactions.map(({ compaction_operation_id }) =>
          compaction_operation_id)).size).toBe(finalCompletedCompactions.length);
        expect(finalCompletedCompactions.every(({ compaction_runtime_kind, compaction_model_identifier }) =>
          compaction_runtime_kind === 'lmstudio'
          && compaction_model_identifier?.includes(EXPECTED_MODEL))).toBe(true);

        expect(finalInvocation).toBeDefined();
        if (!finalInvocation) {
          throw new Error('Final LLM invocation was not captured.');
        }
        expect(projectedMemoryUserRegion).toContain(
          'You are continuing an ongoing task. Here is a concise summary of earlier work',
        );
        expect(projectedCurrentUserRegion).toBe(finalInstruction);
        expect(projectedMemoryUserRegion).not.toContain('record_type');
        const latestCompactedInput = runner.tasks.at(-1)?.prompt ?? '';
        for (const anchor of [...Object.values(partA), ...Object.values(partB)]
          .filter((value) => latestCompactedInput.includes(value))) {
          expect(projectedMemoryUserRegion).toContain(anchor);
        }
        for (const anchor of [...Object.values(partA), ...Object.values(partB)]) {
          expect(JSON.stringify(finalInvocation)).toContain(anchor);
        }

        process.stdout.write(`${JSON.stringify({
          event: 'lmstudio_compaction_quality_evidence',
          modelIdentifier: mainLLM.model.modelIdentifier,
          compactionRatio: COMPACTION_RATIO,
          completedCompactionCount: finalCompletedCompactions.length,
          compactionOutputs: runner.outputs.map((output) => JSON.parse(output)),
          projectedCompactedMemoryUserRegion: projectedMemoryUserRegion,
          nextCurrentUserRegion: projectedCurrentUserRegion,
          exactContinuationResponse: finalReport,
        })}\n`);
      } finally {
        notifier?.unsubscribe(EventType.AGENT_COMPACTION_STATUS_UPDATED, onCompaction);
        notifier?.unsubscribe(EventType.AGENT_TOKEN_USAGE_UPDATED, onTokenUsage);
        notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
        notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
        notifier?.unsubscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onRuntimeError);
        notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);
      }
    } finally {
      if (agent?.isRunning) {
        await agent.stop(30);
      }
      await mainLLM?.cleanup();
      await compactorLLM?.cleanup();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, FLOW_TIMEOUT_MS);
});
