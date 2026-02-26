import { defaultSystemPromptProcessorRegistry } from './processor-registry.js';
import { SystemPromptProcessorDefinition } from './processor-definition.js';
import { ToolManifestInjectorProcessor } from './tool-manifest-injector-processor.js';
import { AvailableSkillsProcessor } from './available-skills-processor.js';

export function registerSystemPromptProcessors(): void {
  const definitions = [
    new SystemPromptProcessorDefinition(ToolManifestInjectorProcessor.getName(), ToolManifestInjectorProcessor),
    new SystemPromptProcessorDefinition(AvailableSkillsProcessor.getName(), AvailableSkillsProcessor)
  ];

  for (const definition of definitions) {
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);
  }
}
