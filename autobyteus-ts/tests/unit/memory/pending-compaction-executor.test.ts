import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { CompactionRuntimeSettingsResolver } from '../../../src/memory/compaction/compaction-runtime-settings.js';
import { PendingCompactionExecutor } from '../../../src/memory/compaction/pending-compaction-executor.js';
import { AUTOBYTEUS_COMPACTION_STRATEGY } from '../../../src/memory/compaction/working-context-compaction-strategy-setting.js';
import { WorkingContextCompactionStrategyRegistry } from '../../../src/memory/compaction/working-context-compaction-strategy-registry.js';
import { WorkingContextCompactionStrategyResolver } from '../../../src/memory/compaction/working-context-compaction-strategy-resolver.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
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

class TestRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<Array<Record<string, unknown>>> {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}

const makeManager = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pending-compaction-executor-'));
  tempDirs.push(dir);
  const manager = new MemoryManager({ store: new FileMemoryStore(dir, 'agent-1') });
  manager.replaceWorkingContext(new WorkingContext([
    new Message(MessageRole.SYSTEM, { content: 'System' }),
    new Message(MessageRole.USER, { content: 'old' }),
  ]));
  manager.requestCompaction('turn-requested');
  return manager;
};

const resolverFor = (
  create: () => { id: string; name: string; compact(context: WorkingContext): Promise<WorkingContext> },
) => {
  const registry = new WorkingContextCompactionStrategyRegistry();
  registry.register({ id: 'test-strategy', name: 'Test Strategy', create });
  return new WorkingContextCompactionStrategyResolver({
    registry,
    settingsResolver: { resolve: () => ({ strategyId: 'test-strategy' }) } as CompactionRuntimeSettingsResolver,
    constructionContext: {
      agentId: 'agent-1',
      memoryStore: {} as any,
      compactionAgentRunner: null,
      inputBudgetTokens: 100,
      maxItemChars: 200,
      diagnostics: null,
    },
  });
};

describe('PendingCompactionExecutor', () => {
  it('uses a registered second strategy without executor branches and preserves success ordering', async () => {
    const manager = makeManager();
    const compact = vi.fn(async (input: WorkingContext) => new WorkingContext([
      input.buildMessages()[0]!,
      new Message(MessageRole.USER, { content: 'custom compacted memory' }),
    ]));
    const resolver = resolverFor(() => ({ id: 'test-strategy', name: 'Test Strategy', compact }));
    const replace = vi.spyOn(manager, 'replaceWorkingContext');
    const clear = vi.spyOn(manager, 'clearCompactionRequest');
    replace.mockClear();
    const reporter = { emitStatus: vi.fn() };

    await expect(new PendingCompactionExecutor(manager, {
      strategyResolver: resolver,
      reporter: reporter as any,
    }).executeIfRequired({ turnId: 'turn-execution' })).resolves.toBe(true);

    expect(compact).toHaveBeenCalledTimes(1);
    const strategyInput = compact.mock.calls[0]![0];
    expect(strategyInput).not.toBe(manager.getWorkingContext());
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(clear.mock.invocationCallOrder[0]);
    expect(manager.getWorkingContextMessages().at(-1)?.content).toBe('custom compacted memory');
    expect(manager.getPendingCompactionRequest()).toBeNull();
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase)).toEqual(['started', 'completed']);
    expect(reporter.emitStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: 'completed',
      compaction_strategy_id: 'test-strategy',
      compaction_strategy_name: 'Test Strategy',
    }));
  });

  it('re-reads the process-global selection for each pending operation and renders the selected replacement', async () => {
    const manager = makeManager();
    const registry = new WorkingContextCompactionStrategyRegistry();
    const registerReplacement = (id: string, name: string, content: string) => {
      registry.register({
        id,
        name,
        create: () => ({
          id,
          name,
          compact: async (input) => new WorkingContext([
            input.buildMessages()[0]!,
            new Message(MessageRole.USER, { content }),
          ]),
        }),
      });
    };
    registerReplacement('first-test', 'First Test', 'first selected replacement');
    registerReplacement('second-test', 'Second Test', 'second selected replacement');

    const resolver = new WorkingContextCompactionStrategyResolver({
      registry,
      settingsResolver: new CompactionRuntimeSettingsResolver(),
      constructionContext: {
        agentId: 'agent-1',
        memoryStore: manager.store,
        compactionAgentRunner: null,
        inputBudgetTokens: 100,
        maxItemChars: 200,
        diagnostics: null,
      },
    });
    const executor = new PendingCompactionExecutor(manager, { strategyResolver: resolver });
    const assembler = new LLMRequestAssembler(manager, new TestRenderer(), executor);

    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = 'second-test';
    const secondRequest = await assembler.prepareRequest('after second', 'turn-second', 'System');
    expect(secondRequest.canonicalMessages.map((message) => message.content)).toEqual([
      'System',
      'second selected replacement',
      'after second',
    ]);
    expect(secondRequest.renderedPayload).toEqual([
      { role: MessageRole.SYSTEM, content: 'System' },
      { role: MessageRole.USER, content: 'second selected replacement' },
      { role: MessageRole.USER, content: 'after second' },
    ]);

    manager.requestCompaction('turn-requested-again');
    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = 'first-test';
    const firstRequest = await assembler.prepareRequest('after first', 'turn-first', 'System');
    expect(firstRequest.canonicalMessages.map((message) => message.content)).toEqual([
      'System',
      'first selected replacement',
      'after first',
    ]);
  });

  it('retains live context and pending request when output validation fails', async () => {
    const manager = makeManager();
    const before = manager.getWorkingContextMessages().map((message) => message.toDict());
    const resolver = resolverFor(() => ({
      id: 'test-strategy',
      name: 'Test Strategy',
      compact: async (input) => {
        input.replaceMessage(0, new Message(MessageRole.SYSTEM, { content: 'mutated' }));
        return input.copy();
      },
    }));
    const replace = vi.spyOn(manager, 'replaceWorkingContext');
    replace.mockClear();
    const reporter = { emitStatus: vi.fn() };

    await expect(new PendingCompactionExecutor(manager, {
      strategyResolver: resolver,
      reporter: reporter as any,
    }).executeIfRequired({ turnId: 'turn-execution' })).rejects.toThrow('[changed-required-head]');

    expect(replace).not.toHaveBeenCalled();
    expect(manager.getWorkingContextMessages().map((message) => message.toDict())).toEqual(before);
    expect(manager.getPendingCompactionRequest()).not.toBeNull();
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase)).toEqual(['started', 'failed']);
  });

  it('reports malformed leading output with a stable invariant and no success mutation', async () => {
    const manager = makeManager();
    const before = manager.getWorkingContextMessages().map((message) => message.toDict());
    const resolver = resolverFor(() => ({
      id: 'test-strategy',
      name: 'Test Strategy',
      compact: async () => new WorkingContext([
        { role: MessageRole.SYSTEM, content: 'System' } as Message,
      ]),
    }));
    const replace = vi.spyOn(manager, 'replaceWorkingContext');
    replace.mockClear();
    const clear = vi.spyOn(manager, 'clearCompactionRequest');
    const reporter = { emitStatus: vi.fn() };

    await expect(new PendingCompactionExecutor(manager, {
      strategyResolver: resolver,
      reporter: reporter as any,
    }).executeIfRequired()).rejects.toThrow('[invalid-message-shape]');

    expect(replace).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(manager.getWorkingContextMessages().map((message) => message.toDict())).toEqual(before);
    expect(manager.getPendingCompactionRequest()).not.toBeNull();
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase)).toEqual(['started', 'failed']);
    expect(reporter.emitStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      phase: 'failed',
      error_message: expect.stringContaining('[invalid-message-shape]'),
    }));
  });

  it('rejects an aliased return without replace, clear, or completed', async () => {
    const manager = makeManager();
    const resolver = resolverFor(() => ({
      id: 'test-strategy',
      name: 'Test Strategy',
      compact: async (input) => input,
    }));
    const replace = vi.spyOn(manager, 'replaceWorkingContext');
    replace.mockClear();
    const clear = vi.spyOn(manager, 'clearCompactionRequest');
    const reporter = { emitStatus: vi.fn() };

    await expect(new PendingCompactionExecutor(manager, {
      strategyResolver: resolver,
      reporter: reporter as any,
    }).executeIfRequired()).rejects.toThrow('[aliased-context]');
    expect(replace).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase)).toEqual(['started', 'failed']);
  });

  it('fails an unknown explicit global strategy without replacement, clear, or fallback', async () => {
    const manager = makeManager();
    const before = manager.getWorkingContextMessages().map((message) => message.toDict());
    process.env[AUTOBYTEUS_COMPACTION_STRATEGY] = 'unknown-test-strategy';
    const resolver = new WorkingContextCompactionStrategyResolver({
      registry: new WorkingContextCompactionStrategyRegistry(),
      settingsResolver: new CompactionRuntimeSettingsResolver(),
      constructionContext: {
        agentId: 'agent-1',
        memoryStore: manager.store,
        compactionAgentRunner: null,
        inputBudgetTokens: 100,
        maxItemChars: 200,
        diagnostics: null,
      },
    });
    const replace = vi.spyOn(manager, 'replaceWorkingContext');
    replace.mockClear();
    const clear = vi.spyOn(manager, 'clearCompactionRequest');
    const reporter = { emitStatus: vi.fn() };

    await expect(new PendingCompactionExecutor(manager, {
      strategyResolver: resolver,
      reporter: reporter as any,
    }).executeIfRequired()).rejects.toThrow("unknown-test-strategy");

    expect(replace).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(manager.getWorkingContextMessages().map((message) => message.toDict())).toEqual(before);
    expect(manager.getPendingCompactionRequest()).not.toBeNull();
    expect(reporter.emitStatus.mock.calls.map(([payload]) => payload.phase)).toEqual(['failed']);
  });

  it('resolves only when compaction is pending', async () => {
    const manager = makeManager();
    manager.clearCompactionRequest();
    const resolve = vi.fn();
    const executor = new PendingCompactionExecutor(manager, {
      strategyResolver: { resolve } as any,
    });
    await expect(executor.executeIfRequired()).resolves.toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });
});
