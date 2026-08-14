import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { AgentCompactionSummarizer } from '../../../src/memory/compaction/agent-compaction-summarizer.js';
import { CompactionAgentRunnerError } from '../../../src/memory/compaction/compaction-agent-runner.js';
import type {
  CompactionAgentRunner,
  CompactionAgentTask,
} from '../../../src/memory/compaction/compaction-agent-runner.js';
import type { WorkingContextMessageUnit } from '../../../src/memory/compaction/working-context-message-unit.js';

const makeUnit = (content: string): WorkingContextMessageUnit => ({
  id: 'message_0001',
  kind: 'message',
  startIndex: 0,
  endIndex: 0,
  messages: [new Message(MessageRole.USER, { content })],
  rawTraceIds: ['rt-1'],
});

const validResponse = JSON.stringify({
  episodes: [{ summary: 'Durable summary' }],
  critical_issues: [{ fact: 'Keep this' }],
  unresolved_work: [],
  durable_facts: [],
  user_preferences: [],
  important_artifacts: [],
});

type RunnerOutcome = string | ((task: CompactionAgentTask) => never);

class FakeRunner implements CompactionAgentRunner {
  readonly calls: CompactionAgentTask[] = [];

  constructor(private readonly outcomes: RunnerOutcome[] = [validResponse]) {}

  async runCompactionTask(task: CompactionAgentTask) {
    this.calls.push(task);
    const outcome = this.outcomes[this.calls.length - 1] ?? this.outcomes.at(-1)!;
    if (typeof outcome === 'function') {
      return outcome(task);
    }
    return {
      outputText: outcome,
      metadata: {
        compactionAgentDefinitionId: 'memory-compactor',
        compactionAgentName: 'Memory Compactor',
        runtimeKind: 'codex_app_server',
        provider: 'openai',
        modelIdentifier: 'gpt-5.4-codex',
        compactionRunId: `compaction-run-${this.calls.length}`,
        taskId: task.taskId,
      },
    };
  }
}

const taskIdFactory = (...ids: string[]): (() => string) => {
  let index = 0;
  return () => ids[index++] ?? `unexpected-task-${index}`;
};

describe('AgentCompactionSummarizer', () => {
  it('returns a valid first response after one child and records its actual prompt metadata', async () => {
    const runner = new FakeRunner();
    const summarizer = new AgentCompactionSummarizer({
      runner,
      parentAgentId: 'parent-agent',
      maxItemChars: 32,
      taskIdFactory: taskIdFactory('task-1'),
    });

    const result = await summarizer.summarizeMessageUnits([
      makeUnit('a very long trace that should appear in the prompt'),
    ]);

    expect(result.episodes).toEqual([{ summary: 'Durable summary' }]);
    expect(result.criticalIssues).toEqual([{ fact: 'Keep this' }]);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]).toMatchObject({
      taskId: 'task-1',
      parentAgentId: 'parent-agent',
      parentTurnId: null,
      blockCount: 1,
      traceCount: 1,
    });
    expect(runner.calls[0]?.prompt).toContain('<target_agent_conversation_history>');
    expect(runner.calls[0]?.prompt).toContain('User:');
    expect(runner.calls[0]?.prompt).not.toContain('single corrective attempt');
    expect(summarizer.getLastCompactionExecutionMetadata()).toMatchObject({
      compactionRunId: 'compaction-run-1',
      taskId: 'task-1',
      renderedInputSha256: createHash('sha256')
        .update(runner.calls[0]!.prompt, 'utf8')
        .digest('hex'),
    });
  });

  it('uses exactly one new correction child after a typed first-response validation failure', async () => {
    const runner = new FakeRunner(['source-task commentary only', validResponse]);
    const summarizer = new AgentCompactionSummarizer({
      runner,
      taskIdFactory: taskIdFactory('task-initial', 'task-correction'),
    });

    const result = await summarizer.summarizeMessageUnits([makeUnit('trace')]);

    expect(result.episodes).toEqual([{ summary: 'Durable summary' }]);
    expect(runner.calls.map(({ taskId }) => taskId)).toEqual([
      'task-initial',
      'task-correction',
    ]);
    const initialPrompt = runner.calls[0]!.prompt;
    const correctionPrompt = runner.calls[1]!.prompt;
    expect(correctionPrompt).toContain(
      'failed host validation at the `json_object_extraction` stage',
    );
    expect(correctionPrompt.endsWith(initialPrompt)).toBe(true);
    expect(correctionPrompt).not.toContain('source-task commentary only');
    expect(summarizer.getLastCompactionExecutionMetadata()).toMatchObject({
      compactionRunId: 'compaction-run-2',
      taskId: 'task-correction',
      renderedInputSha256: createHash('sha256')
        .update(correctionPrompt, 'utf8')
        .digest('hex'),
    });
  });

  it('reports both validation stages and both run IDs after exhausted correction', async () => {
    const invalidSchema = JSON.stringify({
      episodes: [],
      critical_issues: [],
      unresolved_work: [],
      durable_facts: [],
      user_preferences: [],
      important_artifacts: [],
    });
    const runner = new FakeRunner(['not valid json', invalidSchema]);
    const summarizer = new AgentCompactionSummarizer({
      runner,
      taskIdFactory: taskIdFactory('task-1', 'task-2'),
    });

    await expect(summarizer.summarizeMessageUnits([makeUnit('trace')])).rejects.toThrow(
      'attempt 1 stage=json_object_extraction, compactionRunId=compaction-run-1; '
      + 'attempt 2 stage=six_array_schema_validation, compactionRunId=compaction-run-2',
    );
    expect(runner.calls).toHaveLength(2);
    expect(summarizer.getLastCompactionExecutionMetadata()).toMatchObject({
      compactionRunId: 'compaction-run-2',
      taskId: 'task-2',
    });
  });

  it('wraps a correction runner failure without claiming a second parsed response', async () => {
    const runner = new FakeRunner([
      'not valid json',
      (task) => {
        throw new CompactionAgentRunnerError('timeout', 'correction provider timeout', {
          compactionAgentDefinitionId: 'memory-compactor',
          compactionRunId: 'compaction-run-2',
          taskId: task.taskId,
        });
      },
    ]);
    const summarizer = new AgentCompactionSummarizer({
      runner,
      taskIdFactory: taskIdFactory('task-1', 'task-2'),
    });

    await expect(summarizer.summarizeMessageUnits([makeUnit('trace')])).rejects.toThrow(
      'attempt 2 stage=runner_execution, compactionRunId=compaction-run-2',
    );
    expect(runner.calls).toHaveLength(2);
    expect(summarizer.getLastCompactionExecutionMetadata()).toMatchObject({
      compactionRunId: 'compaction-run-2',
      taskId: 'task-2',
    });
  });

  it('does not retry a first-attempt runner failure and preserves its metadata', async () => {
    const runner = new FakeRunner([
      (task) => {
        throw new CompactionAgentRunnerError('tool_approval', 'tool approval requested', {
          compactionAgentDefinitionId: 'memory-compactor',
          compactionAgentName: 'Memory Compactor',
          runtimeKind: 'codex_app_server',
          provider: 'openai',
          modelIdentifier: 'gpt-5.4-codex',
          compactionRunId: 'compaction-run-1',
          taskId: task.taskId,
        });
      },
    ]);
    const responseParser = { parse: vi.fn() };
    const summarizer = new AgentCompactionSummarizer({
      runner,
      responseParser: responseParser as any,
      taskIdFactory: taskIdFactory('task-1'),
    });

    await expect(summarizer.summarizeMessageUnits([makeUnit('trace')]))
      .rejects.toThrow('tool approval requested');
    expect(runner.calls).toHaveLength(1);
    expect(responseParser.parse).not.toHaveBeenCalled();
    expect(summarizer.getLastCompactionExecutionMetadata()).toMatchObject({
      compactionRunId: 'compaction-run-1',
      taskId: 'task-1',
    });
  });
});
