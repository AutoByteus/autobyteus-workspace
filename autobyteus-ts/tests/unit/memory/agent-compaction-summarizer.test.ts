import { describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { AgentCompactionSummarizer } from '../../../src/memory/compaction/agent-compaction-summarizer.js';
import { CompactionAgentRunnerError } from '../../../src/memory/compaction/compaction-agent-runner.js';
import type { CompactionAgentRunner, CompactionAgentTask } from '../../../src/memory/compaction/compaction-agent-runner.js';
import type { InteractionBlock } from '../../../src/memory/compaction/interaction-block.js';

const makeTrace = (content: string) =>
  new RawTraceItem({
    id: `rt_${content}`,
    ts: Date.now() / 1000,
    turnId: 'turn-1',
    seq: 1,
    traceType: 'user',
    content,
    sourceEvent: 'test',
  });

const makeBlock = (trace: RawTraceItem): InteractionBlock => ({
  blockId: 'block_0001',
  turnId: trace.turnId,
  traceIds: [trace.id],
  traces: [trace],
  openingTraceId: trace.id,
  closingTraceId: trace.id,
  blockKind: 'user',
  hasAssistantTrace: false,
  toolCallIds: [],
  matchedToolCallIds: [],
  hasMalformedToolTrace: false,
  isStructurallyComplete: true,
  toolResultDigests: [],
});

class FakeRunner implements CompactionAgentRunner {
  calls: CompactionAgentTask[] = [];
  outputText = [
    '```json',
    '{"episodic_summary":"Durable summary","critical_issues":[{"fact":"Keep this","tags":["decision"]}],"unresolved_work":[],"durable_facts":[],"user_preferences":[],"important_artifacts":[]}',
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

    const result = await summarizer.summarize([makeBlock(makeTrace('a very long trace that should appear in the prompt'))]);

    expect(result.episodicSummary).toBe('Durable summary');
    expect(result.criticalIssues).toEqual([
      { fact: 'Keep this', reference: null, tags: ['decision'] },
    ]);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]).toMatchObject({
      taskId: 'task-1',
      parentAgentId: 'parent-agent',
      parentTurnId: 'turn-1',
      blockCount: 1,
      traceCount: 1,
    });
    expect(runner.calls[0]?.prompt).toContain('[SETTLED_BLOCKS]');
    expect(runner.calls[0]?.prompt).toContain('Return JSON only with this shape');
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

    await expect(summarizer.summarize([makeBlock(makeTrace('trace'))])).rejects.toThrow(
      'Could not parse a valid JSON object'
    );
  });
  it('preserves runner failure metadata for parent compaction status', async () => {
    class FailingRunner implements CompactionAgentRunner {
      async runCompactionTask(task: CompactionAgentTask) {
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

    await expect(summarizer.summarize([makeBlock(makeTrace('trace'))])).rejects.toThrow('tool approval requested');
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
