import { BaseTool } from '../../src/tools/base-tool.js';
import { defaultToolRegistry } from '../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../src/tools/tool-origin.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../src/utils/parameter-schema.js';

export type TestToolSpec = { name: string; description: string; parameters?: string[]; run?: (args: Record<string, unknown>) => unknown };

/** A registered tool class with string parameters (all required); its instance runs `spec.run`. */
export const registerTestTool = (spec: TestToolSpec): BaseTool => {
  const schema = () => new ParameterSchema((spec.parameters ?? []).map((name) => new ParameterDefinition({
    name, type: ParameterType.STRING, description: `The ${name}.`, required: true,
  })));
  class TestTool extends BaseTool {
    static getName(): string { return spec.name; }
    static getDescription(): string { return spec.description; }
    static getArgumentSchema(): ParameterSchema { return schema(); }
    protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<unknown> {
      return spec.run ? spec.run(args) : `${spec.name} ran`;
    }
  }
  defaultToolRegistry.registerTool(new ToolDefinition(
    spec.name, spec.description, ToolOrigin.LOCAL, 'test', schema, () => null, { toolClass: TestTool },
  ));
  return new TestTool();
};

/** A Project Task Manager-like tool set: four base tools and searchable Task/Project tools. */
export const PM_TOOLS: TestToolSpec[] = [
  { name: 'run_bash', description: 'Run a shell command.', parameters: ['command'] },
  { name: 'read_file', description: 'Read a file.', parameters: ['path'] },
  { name: 'edit_file', description: 'Edit a file.', parameters: ['path', 'patch'] },
  { name: 'write_file', description: 'Write a file.', parameters: ['path', 'content'] },
  { name: 'list_projects', description: 'List the Projects on this node.' },
  { name: 'update_task', description: 'Change a Task: its status (e.g. DONE), title or a comment.', parameters: ['task_id', 'status', 'comment'] },
  { name: 'create_task', description: 'Create a Task in a Project.', parameters: ['project_id', 'title'] },
  { name: 'search_memory', description: 'Search the memory of earlier agent runs.', parameters: ['query'] },
];

export const BASE_TOOL_NAMES = ['run_bash', 'read_file', 'edit_file', 'write_file'];
