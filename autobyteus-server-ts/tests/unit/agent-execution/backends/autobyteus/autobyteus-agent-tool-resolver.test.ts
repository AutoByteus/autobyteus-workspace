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
    // delegate_task's own construction needs the real Task command port (not this test's subject).
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringMatching(/create_task|update_task|create_or_update_task/));
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

  const memberContext = (teamScoped: boolean) => ({
    teamScoped,
    identity: { memberRunId: 'member-run', memberAddress: '/delegator' },
    tasks: {},
    collaboration: {},
  }) as any;
  const resolveFor = (toolNames: string[], teamScoped: boolean) => {
    registerProjectTaskTools(); // The required project_tasks startup unit, as at server start.
    const agentDefinition = new AgentDefinition({ name: 'Delegating agent', description: 'Task tool selection.', toolNames });
    const memberExecutionContext = memberContext(teamScoped);
    const logger = { warn: vi.fn(), error: vi.fn() };
    // Only the member context's shape is a fixture; exposure, the registry and the Project tools are production.
    const runtimeToolExposure = resolveAutoByteusRuntimeAgentToolExposure(agentDefinition, memberExecutionContext);
    const resolution = resolveAutoByteusAgentTools({ agentDefinition, runtimeToolExposure, senderRunId: 'member-run', memberExecutionContext, logger });
    return { runtimeToolExposure, resolution, logger };
  };

  it.each([
    ['a standalone Agent-root host', false],
    ['a Team member', true],
  ])('gives %s that selected no task tool neither create_task nor update_task (AC-001)', (_label, teamScoped) => {
    const { runtimeToolExposure, resolution, logger } = resolveFor([], teamScoped);
    expect(runtimeToolExposure.requestedToolNames).toEqual(expect.arrayContaining(['delegate_task']));
    expect(runtimeToolExposure.requestedToolNames).not.toEqual(expect.arrayContaining(['create_task']));
    expect(resolution.actualToolNames).not.toContain('create_task');
    expect(resolution.actualToolNames).not.toContain('update_task');
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('task'));
  });

  it.each([
    ['a standalone Agent-root host', false],
    ['a Team member', true],
  ])('gives %s that selected create_task and update_task both native tools (ARCH-F-001)', (_label, teamScoped) => {
    const { resolution, logger } = resolveFor(['create_task', 'update_task'], teamScoped);
    expect(resolution.actualToolNames).toEqual(expect.arrayContaining(['create_task', 'update_task']));
    expect(resolution.tools.map((tool) => tool.definition?.name)).toEqual(expect.arrayContaining(['create_task', 'update_task']));
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("'create_task'"));
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining("'update_task'"));
  });

  it('launches an agent that still selects the removed create_or_update_task with no task tools and a warning (AC-007)', () => {
    const { resolution, logger } = resolveFor(['create_or_update_task', 'read_file'], true);
    expect(resolution.actualToolNames).toContain('read_file');
    expect(resolution.actualToolNames).not.toContain('create_or_update_task');
    expect(resolution.actualToolNames).not.toContain('create_task');
    expect(resolution.actualToolNames).not.toContain('update_task');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("'create_or_update_task'"));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found in registry'));
    // delegate_task's own construction needs the real Task command port (not this test's subject).
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringMatching(/create_task|update_task|create_or_update_task/));
  });

  it('launches an agent that still selects the removed create_or_update_project without it and with its other tools, with a warning (remove-create-or-update-project AC-002)', () => {
    const { resolution, logger } = resolveFor(['create_or_update_project', 'create_project', 'update_project', 'read_file'], true);
    expect(resolution.actualToolNames).toEqual(expect.arrayContaining(['create_project', 'update_project', 'read_file']));
    expect(resolution.actualToolNames).not.toContain('create_or_update_project');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("'create_or_update_project'"));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found in registry'));
    expect(logger.error).not.toHaveBeenCalledWith(expect.stringMatching(/project/));
  });
});
