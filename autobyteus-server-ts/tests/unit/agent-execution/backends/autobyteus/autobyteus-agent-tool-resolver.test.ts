import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTools } from 'autobyteus-ts/tools/register-tools.js';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
import type { ToolDefinition } from 'autobyteus-ts/tools/registry/tool-definition.js';
import { AgentDefinition } from '../../../../../src/agent-definition/domain/models.js';
import { resolveAutoByteusAgentTools } from '../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js';
import { resolveRuntimeAgentToolExposure } from '../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js';

const removedToolName = ['replace', 'in', 'file'].join('_');

describe('resolveAutoByteusAgentTools', () => {
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
    registerTools();
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
  });

  it('skips a stale removed name without changing the configured names or blocking a retained tool', () => {
    const requestedToolNames = [removedToolName, 'read_file'];
    const agentDefinition = new AgentDefinition({
      name: 'Persisted agent',
      description: 'Exercises tolerant configured-name resolution.',
      instructions: 'Read files when asked.',
      toolNames: requestedToolNames,
    });
    const logger = { warn: vi.fn(), error: vi.fn() };

    const resolution = resolveAutoByteusAgentTools({
      agentDefinition,
      runtimeToolExposure: resolveRuntimeAgentToolExposure(agentDefinition),
      logger,
    });

    expect(resolution.actualToolNames).toEqual(['read_file']);
    expect(resolution.tools).toHaveLength(1);
    expect(resolution.tools[0].definition?.name).toBe('read_file');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found in registry'));
    expect(logger.error).not.toHaveBeenCalled();
    expect(agentDefinition.toolNames).toBe(requestedToolNames);
    expect(agentDefinition.toolNames).toEqual([removedToolName, 'read_file']);
  });
});
