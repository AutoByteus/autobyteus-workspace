import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTools } from 'autobyteus-ts/tools/register-tools.js';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
import type { ToolDefinition } from 'autobyteus-ts/tools/registry/tool-definition.js';
import { AgentDefinition } from '../../../../../src/agent-definition/domain/models.js';
import { resolveAutoByteusAgentTools } from '../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js';
import { resolveAutoByteusRuntimeAgentToolExposure } from '../../../../../src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.js';
import { resolveRuntimeAgentToolExposure } from '../../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js';
import { registerProjectTaskTools } from '../../../../../src/agent-tools/project-tasks/project-task-native-tools.js';

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

  it('materializes the native foundation baseline through the existing registry', () => {
    const agentDefinition = new AgentDefinition({
      name: 'Native agent',
      description: 'Exercises native default materialization.',
      toolNames: [],
    });

    const resolution = resolveAutoByteusAgentTools({
      agentDefinition,
      runtimeToolExposure: resolveAutoByteusRuntimeAgentToolExposure(agentDefinition),
    });

    expect(resolution.actualToolNames).toEqual(['run_bash', 'read_file', 'edit_file', 'write_file']);
    expect(resolution.tools.map((tool) => tool.definition?.name)).toEqual([
      'run_bash',
      'read_file',
      'edit_file',
      'write_file',
    ]);
    expect(agentDefinition.toolNames).toEqual([]);
  });

  it.each([
    ['a standalone Agent-root host', false],
    ['a Team member', true],
  ])('materializes create_or_update_task with delegate_task for %s that selected no tool (mention-delegation-dismissal AC-009)', (_label, teamScoped) => {
    registerProjectTaskTools(); // The required project_tasks startup unit, as at server start.
    const agentDefinition = new AgentDefinition({
      name: 'Delegating agent',
      description: 'Has no Project tool selected.',
      toolNames: [],
    });
    // Only the member context's shape is a fixture; exposure, filtering, the registry and the Project tool are production.
    const memberExecutionContext = {
      teamScoped,
      identity: { memberRunId: 'member-run', memberAddress: '/delegator' },
      tasks: {},
      collaboration: {},
    } as any;
    const logger = { warn: vi.fn(), error: vi.fn() };

    const runtimeToolExposure = resolveAutoByteusRuntimeAgentToolExposure(agentDefinition, memberExecutionContext);
    const resolution = resolveAutoByteusAgentTools({
      agentDefinition,
      runtimeToolExposure,
      senderRunId: 'member-run',
      memberExecutionContext,
      logger,
    });

    // delegate_task's own construction needs the real Task command port (not this test's subject).
    expect(runtimeToolExposure.requestedToolNames).toEqual(expect.arrayContaining(['delegate_task', 'create_or_update_task']));
    expect(resolution.actualToolNames).toContain('create_or_update_task');
    expect(resolution.tools.map((tool) => tool.definition?.name)).toContain('create_or_update_task');
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('create_or_update_task'));
    expect(agentDefinition.toolNames).toEqual([]);
  });
});
