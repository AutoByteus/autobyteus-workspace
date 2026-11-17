import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentToolSearch } from '../../../../src/agent/tool-search/agent-tool-search.js';
import { CALL_TOOL_NAME, CallTool } from '../../../../src/agent/tool-search/call-tool.js';
import { SEARCH_TOOLS_NAME, SearchToolsTool } from '../../../../src/agent/tool-search/search-tools-tool.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import type { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { BASE_TOOL_NAMES, PM_TOOLS, registerTestTool } from '../../../helpers/tool-search-test-tools.js';

const PM_NAMES = PM_TOOLS.map((tool) => tool.name);
const namesOf = (schemas: Array<Record<string, unknown>>) =>
  schemas.map((schema) => (schema.function as { name: string } | undefined)?.name ?? schema.name);
const searchDescription = (schemas: Array<Record<string, unknown>>) =>
  (schemas.find((schema) => (schema.function as { name: string }).name === SEARCH_TOOLS_NAME)!.function as { description: string }).description;

let registrySnapshot: Map<string, ToolDefinition>;

beforeEach(() => {
  registrySnapshot = defaultToolRegistry.snapshot();
  PM_TOOLS.forEach(registerTestTool);
});

afterEach(() => {
  defaultToolRegistry.restore(registrySnapshot);
});

describe('AgentToolSearch: the request tool set (DS-001)', () => {
  it('lists every tool when listedToolNames is null, and has no runtime tools', () => {
    const toolSearch = new AgentToolSearch(null, PM_NAMES);
    expect(toolSearch.enabled).toBe(false);
    expect(namesOf(toolSearch.requestToolSchemas(PM_NAMES, LLMProvider.DEEPSEEK))).toEqual(PM_NAMES);
    expect(toolSearch.getRuntimeTool(SEARCH_TOOLS_NAME)).toBeUndefined();
  });

  it('sends the listed tools in listedToolNames order, then search_tools and call_tool (AC-001)', () => {
    const shuffled = ['update_task', 'write_file', 'search_memory', 'run_bash', 'list_projects', 'edit_file', 'create_task', 'read_file'];
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, shuffled);

    expect(toolSearch.enabled).toBe(true);
    expect(namesOf(toolSearch.requestToolSchemas(shuffled, LLMProvider.DEEPSEEK)))
      .toEqual([...BASE_TOOL_NAMES, SEARCH_TOOLS_NAME, CALL_TOOL_NAME]);
    expect(searchDescription(toolSearch.requestToolSchemas(shuffled, LLMProvider.DEEPSEEK))).toBe(
      'Find tools that are not listed here and get their full definitions. ' +
      'Searchable tools: update_task, search_memory, list_projects, create_task. Tools announced later are searchable too. ' +
      'Give a few words or exact tool names; the result lists each matching tool with its description and argument schema. ' +
      'Then call a found tool with call_tool.',
    );
    expect(toolSearch.getRuntimeTool(SEARCH_TOOLS_NAME)).toBeInstanceOf(SearchToolsTool);
    expect(toolSearch.getRuntimeTool(CALL_TOOL_NAME)).toBeInstanceOf(CallTool);
  });

  it('formats the runtime tools with the provider\'s own formatter', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    const anthropic = toolSearch.requestToolSchemas(PM_NAMES, LLMProvider.ANTHROPIC);
    expect(anthropic.map((schema) => schema.name)).toEqual([...BASE_TOOL_NAMES, SEARCH_TOOLS_NAME, CALL_TOOL_NAME]);
    expect(anthropic.at(-1)).toHaveProperty('input_schema');
    const gemini = toolSearch.requestToolSchemas(PM_NAMES, LLMProvider.GEMINI);
    expect(gemini.at(-2)).toMatchObject({ name: SEARCH_TOOLS_NAME, parameters: { required: ['query'] } });
  });

  it('gives an agent with no searchable tool neither search_tools nor call_tool (AC-001 alternate)', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, BASE_TOOL_NAMES);
    expect(toolSearch.enabled).toBe(false);
    expect(namesOf(toolSearch.requestToolSchemas(BASE_TOOL_NAMES, LLMProvider.DEEPSEEK))).toEqual(BASE_TOOL_NAMES);
  });

  it('keeps the request bytes identical when searchable tools are added or removed (AC-005, QR-002)', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    const before = JSON.stringify(toolSearch.requestToolSchemas(PM_NAMES, LLMProvider.DEEPSEEK));
    registerTestTool({ name: 'get_project_task', description: 'Read one Task.', parameters: ['task_id'] });

    const added = [...PM_NAMES, 'get_project_task'];
    const removed = PM_NAMES.filter((name) => name !== 'update_task');
    expect(JSON.stringify(toolSearch.requestToolSchemas(added, LLMProvider.DEEPSEEK))).toBe(before);
    expect(JSON.stringify(toolSearch.requestToolSchemas(removed, LLMProvider.DEEPSEEK))).toBe(before);
  });

  it('drops a listed tool the agent no longer has', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    const withoutBash = PM_NAMES.filter((name) => name !== 'run_bash');
    expect(namesOf(toolSearch.requestToolSchemas(withoutBash, LLMProvider.DEEPSEEK)))
      .toEqual(['read_file', 'edit_file', 'write_file', SEARCH_TOOLS_NAME, CALL_TOOL_NAME]);
  });
});

describe('AgentToolSearch: search (DS-004, AC-002)', () => {
  const definitionLines = (result: string) => result.split('\n').slice(1).map((line) => JSON.parse(line));

  it('returns an exactly named tool with its full definition', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    const result = toolSearch.search('update_task', PM_NAMES);

    expect(result.split('\n')[0]).toBe('Found 1 tool. Call one with call_tool: {"name": "<tool name>", "arguments": {<its arguments>}}.');
    expect(definitionLines(result)).toEqual([{
      name: 'update_task',
      description: 'Change a Task: its status (e.g. DONE), title or a comment.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The task_id.' },
          status: { type: 'string', description: 'The status.' },
          comment: { type: 'string', description: 'The comment.' },
        },
        required: ['task_id', 'status', 'comment'],
        additionalProperties: false,
      },
    }]);
  });

  it('returns every tool the query names exactly', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    expect(definitionLines(toolSearch.search('create_task, update_task', PM_NAMES)).map((d) => d.name))
      .toEqual(['update_task', 'create_task']);
  });

  it('matches words in names, argument names and descriptions, best first', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    expect(definitionLines(toolSearch.search('close a task as done', PM_NAMES)).map((d) => d.name))
      .toEqual(['update_task', 'create_task']);
    expect(definitionLines(toolSearch.search('projects', PM_NAMES)).map((d) => d.name))
      .toEqual(['list_projects', 'create_task']);
  });

  it('says when nothing matches and lists the searchable names', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    expect(toolSearch.search('send an email', PM_NAMES)).toBe(
      'No searchable tool matches "send an email". Searchable tools: list_projects, update_task, create_task, search_memory.',
    );
  });

  it('never returns a listed tool, and finds a tool added after the agent started', () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    expect(toolSearch.search('read_file', PM_NAMES)).toMatch(/^No searchable tool matches "read_file"/);

    registerTestTool({ name: 'get_project_task', description: 'Read one Task.', parameters: ['task_id'] });
    const result = toolSearch.search('get_project_task', [...PM_NAMES, 'get_project_task']);
    expect(definitionLines(result).map((d) => d.name)).toEqual(['get_project_task']);
    const afterRemoval = toolSearch.search('update_task', PM_NAMES.filter((name) => name !== 'update_task'));
    expect(definitionLines(afterRemoval).map((d) => d.name)).toEqual(['create_task']);
  });

  it('returns at most 5 tools', () => {
    const many = Array.from({ length: 7 }, (_, index) => `report_tool_${index}`);
    many.forEach((name) => registerTestTool({ name, description: 'Make a report.' }));
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, [...BASE_TOOL_NAMES, ...many]);
    expect(definitionLines(toolSearch.search('report', [...BASE_TOOL_NAMES, ...many]))).toHaveLength(5);
  });

  it('runs as the search_tools tool over the tools the agent has when it runs', async () => {
    const toolSearch = new AgentToolSearch(BASE_TOOL_NAMES, PM_NAMES);
    const tool = toolSearch.getRuntimeTool(SEARCH_TOOLS_NAME)!;
    const toolInstances = Object.fromEntries(PM_NAMES.map((name) => [name, {}]));
    await expect(tool.execute({ toolInstances }, { query: 'search_memory' })).resolves.toMatch(/^Found 1 tool\./);
    await expect(tool.execute({ toolInstances }, {})).rejects.toThrow(/Required parameter 'query' is missing/);
  });
});
