import { describe, expect, it, vi } from 'vitest';
import { BaseSystemPromptProcessor } from '../../../../src/agent/system-prompt-processor/base-processor.js';
import { SystemPromptProcessingStep } from '../../../../src/agent/bootstrap-steps/system-prompt-processing-step.js';

class PlaceholderAppendingProcessor extends BaseSystemPromptProcessor {
  static getName(): string {
    return 'PlaceholderAppendingProcessor';
  }

  process(systemPrompt: string): string {
    return `${systemPrompt}\n\n{{skill_token}}`;
  }
}

describe('SystemPromptProcessingStep', () => {
  it('rejects unresolved placeholders after terminal processing without mutating state or configuring the LLM', async () => {
    const configureSystemPrompt = vi.fn();
    const postLifecycleEvent = vi.fn(async () => undefined);
    const context = {
      agentId: 'agent-1',
      config: {
        systemPrompt: 'Base prompt',
        systemPromptProcessors: [new PlaceholderAppendingProcessor()],
      },
      state: {
        processedSystemPrompt: null,
        toolInstances: {},
        agentEventInbox: { postLifecycleEvent },
      },
      llmInstance: {
        config: { systemMessage: 'Fallback prompt' },
        configureSystemPrompt,
      },
      toolInstances: {},
    } as any;

    await expect(new SystemPromptProcessingStep().execute(context)).resolves.toBe(false);
    expect(context.state.processedSystemPrompt).toBeNull();
    expect(configureSystemPrompt).not.toHaveBeenCalled();
    expect(postLifecycleEvent).toHaveBeenCalledOnce();
  });
});
