import { describe, expect, it } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { AgentCompactionSummarizer } from '../../../src/memory/compaction/agent-compaction-summarizer.js';
import { CompactionAgentRunnerError } from '../../../src/memory/compaction/compaction-agent-runner.js';
import type { CompactionAgentRunner, CompactionAgentTask } from '../../../src/memory/compaction/compaction-agent-runner.js';
import type { WorkingContextMessageUnit } from '../../../src/memory/compaction/working-context-message-unit.js';

const makeUnit = (content: string): WorkingContextMessageUnit => ({
  id: 'message_0001',
  kind: 'message',
  startIndex: 0,
  endIndex: 0,
  messages: [new Message(MessageRole.USER, { content })],
  rawTraceIds: ['rt-1'],
});

class FakeRunner implements CompactionAgentRunner {
  calls: CompactionAgentTask[] = [];
  outputText = [
    '```json',
    '{"episodic_summary":"Durable summary","critical_issues":[{"fact":"Keep this"}],"unresolved_work":[],"durable_facts":[],"user_preferences":[],"important_artifacts":[]}',
    '```',
  ].join('\n');

  async runCompactionTask(task: CompactionAgentTask) {
    this.calls.push(task);
    return {
      outputText: this.outputText,
      metadata: {
        compactionAgentDefinitionId: 'memory-compactor',
        compactionAgentName: 'Memory Compactor',
        runtimeKind: 'codex_app_server',
        modelIdentifier: 'gpt-5.4-codex',
        compactionRunId: 'compaction-run-1',
      },
    };
  }
}

describe('AgentCompactionSummarizer', () => {
  it('builds an agent compaction task, parses fenced JSON, and records runner metadata', async () => {
    const runner = new FakeRunner();
    const summarizer = new AgentCompactionSummarizer({
      runner,
      parentAgentId: 'parent-agent',
      maxItemChars: 32,
      taskIdFactory: () => 'task-1',
    });

    const result = await summarizer.summarizeMessageUnits([makeUnit('a very long trace that should appear in the prompt')]);

    expect(result.episodicSummary).toBe('Durable summary');
    expect(result.criticalIssues).toEqual([
      { fact: 'Keep this' },
    ]);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]).toMatchObject({
      taskId: 'task-1',
      parentAgentId: 'parent-agent',
      parentTurnId: null,
      blockCount: 1,
      traceCount: 1,
    });
    expect(runner.calls[0]?.prompt).toContain('[CONVERSATION_HISTORY_TO_SUMMARIZE]');
    expect(runner.calls[0]?.prompt).toContain('Your final answer must be one JSON object with this shape');
    expect(summarizer.getLastCompactionExecutionMetadata()).toEqual({
      compactionAgentDefinitionId: 'memory-compactor',
      compactionAgentName: 'Memory Compactor',
      runtimeKind: 'codex_app_server',
      modelIdentifier: 'gpt-5.4-codex',
      compactionRunId: 'compaction-run-1',
      taskId: 'task-1',
    });
  });

  it('raises when the compaction agent response is invalid', async () => {
    const runner = new FakeRunner();
    runner.outputText = 'not valid json';
    const summarizer = new AgentCompactionSummarizer({ runner });

    await expect(summarizer.summarizeMessageUnits([makeUnit('trace')])).rejects.toThrow(
      'Could not parse a valid JSON object'
    );
  });
  it('preserves runner failure metadata for parent compaction status', async () => {
    class FailingRunner implements CompactionAgentRunner {
      async runCompactionTask(task: CompactionAgentTask): Promise<never> {
        throw new CompactionAgentRunnerError('tool approval requested', {
          compactionAgentDefinitionId: 'memory-compactor',
          compactionAgentName: 'Memory Compactor',
          runtimeKind: 'codex_app_server',
          modelIdentifier: 'gpt-5.4-codex',
          compactionRunId: 'compaction-run-1',
          taskId: task.taskId,
        });
      }
    }

    const summarizer = new AgentCompactionSummarizer({
      runner: new FailingRunner(),
      taskIdFactory: () => 'task-1',
    });

    await expect(summarizer.summarizeMessageUnits([makeUnit('trace')])).rejects.toThrow('tool approval requested');
    expect(summarizer.getLastCompactionExecutionMetadata()).toEqual({
      compactionAgentDefinitionId: 'memory-compactor',
      compactionAgentName: 'Memory Compactor',
      runtimeKind: 'codex_app_server',
      modelIdentifier: 'gpt-5.4-codex',
      compactionRunId: 'compaction-run-1',
      taskId: 'task-1',
    });
  });

});
