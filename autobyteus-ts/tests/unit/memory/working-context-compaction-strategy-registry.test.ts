import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import type { CompactionAgentRunner, CompactionAgentTask } from '../../../src/memory/compaction/compaction-agent-runner.js';
import { CompactionRuntimeSettingsResolver } from '../../../src/memory/compaction/compaction-runtime-settings.js';
import { defaultWorkingContextCompactionStrategyRegistry } from '../../../src/memory/compaction/default-working-context-compaction-strategy-registry.js';
import { AUTOBYTEUS_COMPACTION_STRATEGY } from '../../../src/memory/compaction/working-context-compaction-strategy-setting.js';
import { WorkingContextCompactionStrategyRegistry } from '../../../src/memory/compaction/working-context-compaction-strategy-registry.js';
import { WorkingContextCompactionStrategyResolver } from '../../../src/memory/compaction/working-context-compaction-strategy-resolver.js';
import type { WorkingContextCompactionStrategyConstructionContext } from '../../../src/memory/compaction/working-context-compaction-strategy.js';
import { CompactedMemoryContextProjector } from '../../../src/memory/projection/compacted-memory-context-projector.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContext } from '../../../src/memory/working-context.js';

const tempDirs: string[] = [];
const originalStrategyId = process.env[AUTOBYTEUS_COMPACTION_STRATEGY];

afterEach(() => {
  tempDirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
  if (originalStrategyId === undefined) {
    delete process.env[AUTOBYTEUS_COMPACTION_STRATEGY];
  } else {
    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = originalStrategyId;
  }
  vi.restoreAllMocks();
});

const constructionContext = (): WorkingContextCompactionStrategyConstructionContext => ({
  agentId: 'agent-1',
  memoryStore: {} as any,
  compactionAgentRunner: null,
  inputBudgetTokens: 1234,
  maxItemChars: 567,
  diagnostics: null,
});

describe('WorkingContextCompactionStrategyRegistry', () => {
  it('lists the one production strategy with stable identity', () => {
    expect(defaultWorkingContextCompactionStrategyRegistry.list()).toEqual([
      { id: 'structured-json', name: 'Structured JSON' },
    ]);
    expect(defaultWorkingContextCompactionStrategyRegistry.get('structured-json')).toMatchObject({
      id: 'structured-json',
      name: 'Structured JSON',
    });
    expect(defaultWorkingContextCompactionStrategyRegistry.get('Structured JSON')).toBeUndefined();
  });

  it('keeps the missing current compaction runner as a truthful construction failure', () => {
    const registration = defaultWorkingContextCompactionStrategyRegistry.get('structured-json')!;
    expect(() => registration.create(constructionContext())).toThrow(
      'Structured JSON compaction requires a compaction agent runner',
    );
  });

  it('rejects blank identity fields and duplicate exact IDs deterministically', () => {
    const registry = new WorkingContextCompactionStrategyRegistry();
    const create = () => ({ id: 'one', name: 'One', compact: async (context: WorkingContext) => context.copy() });
    expect(() => registry.register({ id: ' ', name: 'One', create })).toThrow('strategy id');
    expect(() => registry.register({ id: 'one', name: ' ', create })).toThrow('strategy name');
    registry.register({ id: 'one', name: 'One', create });
    expect(() => registry.register({ id: 'one', name: 'Other', create })).toThrow('already registered');
    expect(registry.list()).toEqual([{ id: 'one', name: 'One' }]);
  });
});

describe('WorkingContextCompactionStrategyResolver', () => {
  it('passes the exact six-field construction object and constructs once per resolve', () => {
    const registry = new WorkingContextCompactionStrategyRegistry();
    const create = vi.fn((context: WorkingContextCompactionStrategyConstructionContext) => ({
      id: 'test-strategy',
      name: 'Test Strategy',
      compact: async (workingContext: WorkingContext) => workingContext.copy(),
    }));
    registry.register({ id: 'test-strategy', name: 'Test Strategy', create });
    const context = constructionContext();
    const settingsResolver = {
      resolve: vi.fn(() => ({ strategyId: 'test-strategy' })),
    } as unknown as CompactionRuntimeSettingsResolver;
    const resolver = new WorkingContextCompactionStrategyResolver({
      registry,
      settingsResolver,
      constructionContext: context,
    });

    expect(resolver.resolve()).toMatchObject({ id: 'test-strategy', name: 'Test Strategy' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(context);
    expect(Object.keys(create.mock.calls[0]![0])).toEqual([
      'agentId',
      'memoryStore',
      'compactionAgentRunner',
      'inputBudgetTokens',
      'maxItemChars',
      'diagnostics',
    ]);
  });

  it('identifies an unknown explicit ID and rejects a factory identity mismatch', () => {
    const registry = new WorkingContextCompactionStrategyRegistry();
    const settingsResolver = { resolve: () => ({ strategyId: 'missing' }) } as CompactionRuntimeSettingsResolver;
    expect(() => new WorkingContextCompactionStrategyResolver({
      registry,
      settingsResolver,
      constructionContext: constructionContext(),
    }).resolve()).toThrow("Unknown working-context compaction strategy 'missing'");

    registry.register({
      id: 'expected',
      name: 'Expected',
      create: () => ({ id: 'wrong', name: 'Expected', compact: async (context) => context.copy() }),
    });
    expect(() => new WorkingContextCompactionStrategyResolver({
      registry,
      settingsResolver: { resolve: () => ({ strategyId: 'expected' }) } as CompactionRuntimeSettingsResolver,
      constructionContext: constructionContext(),
    }).resolve()).toThrow('invalid identity');
  });

  it('maps the exact default construction context to every structured-strategy consumer', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'default-structured-registration-'));
    tempDirs.push(tempDir);
    const store = new FileMemoryStore(tempDir, 'mapped-agent');
    class RecordingRunner implements CompactionAgentRunner {
      tasks: CompactionAgentTask[] = [];

      async runCompactionTask(task: CompactionAgentTask) {
        this.tasks.push(task);
        return {
          outputText: JSON.stringify({
            episodic_summary: 'mapped summary',
            critical_issues: [],
            unresolved_work: [],
            durable_facts: [{ fact: 'mapped fact' }],
            user_preferences: [],
            important_artifacts: [],
          }),
        };
      }
    }
    const runner = new RecordingRunner();
    const diagnostics = {
      reportPlan: vi.fn(),
      reportResult: vi.fn(),
    };
    const storeAdd = vi.spyOn(store, 'add');
    const project = vi.spyOn(CompactedMemoryContextProjector.prototype, 'project');
    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = '   ';
    const resolver = new WorkingContextCompactionStrategyResolver({
      registry: defaultWorkingContextCompactionStrategyRegistry,
      settingsResolver: new CompactionRuntimeSettingsResolver(),
      constructionContext: {
        agentId: 'mapped-agent',
        memoryStore: store,
        compactionAgentRunner: runner,
        inputBudgetTokens: 100,
        maxItemChars: 32,
        diagnostics,
      },
    });
    const longContent = `budget-sensitive-${'x'.repeat(400)}`;
    const context = new WorkingContext([
      new Message(MessageRole.SYSTEM, { content: 'System' }),
      ...Array.from({ length: 8 }, (_, index) => new Message(
        index % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        { content: `${longContent}-${index + 1}` },
      )),
    ]);

    const strategy = resolver.resolve();
    const result = await strategy.compact(context);

    expect(strategy).toMatchObject({ id: 'structured-json', name: 'Structured JSON' });
    expect(runner.tasks).toHaveLength(1);
    expect(runner.tasks[0]).toMatchObject({ parentAgentId: 'mapped-agent' });
    expect(runner.tasks[0]?.prompt).toContain('…[truncated]');
    expect(runner.tasks[0]?.prompt).not.toContain(longContent);
    expect(diagnostics.reportPlan).toHaveBeenCalledWith(expect.objectContaining({
      selectedUnitCount: 6,
      retainedUnitCount: 2,
    }));
    expect(diagnostics.reportResult).toHaveBeenCalledTimes(1);
    expect(storeAdd).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledWith(expect.objectContaining({
      maxEpisodic: 3,
      maxSemantic: 20,
    }));
    expect(result).toBeInstanceOf(WorkingContext);
  });
});
