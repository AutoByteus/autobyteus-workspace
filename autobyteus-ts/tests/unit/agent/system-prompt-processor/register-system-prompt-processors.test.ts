import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerSystemPromptProcessors } from '../../../../src/agent/system-prompt-processor/register-system-prompt-processors.js';
import { defaultSystemPromptProcessorRegistry } from '../../../../src/agent/system-prompt-processor/processor-registry.js';

const snapshotDefinitions = () => defaultSystemPromptProcessorRegistry.getAllDefinitions();

describe('registerSystemPromptProcessors', () => {
  let originalDefinitions: Record<string, any> = {};

  beforeEach(() => {
    originalDefinitions = snapshotDefinitions();
    defaultSystemPromptProcessorRegistry.clear();
  });

  afterEach(() => {
    defaultSystemPromptProcessorRegistry.clear();
    for (const definition of Object.values(originalDefinitions)) {
      defaultSystemPromptProcessorRegistry.registerProcessor(definition);
    }
  });

  it('registers default system prompt processors', () => {
    registerSystemPromptProcessors();

    const names = defaultSystemPromptProcessorRegistry.listProcessorNames();
    expect(names).toContain('ToolManifestInjector');
    expect(names).toContain('AvailableSkillsProcessor');
  });
});
