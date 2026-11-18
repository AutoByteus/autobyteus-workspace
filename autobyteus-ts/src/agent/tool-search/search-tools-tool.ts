import { BaseTool } from '../../tools/base-tool.js';
import { ToolDefinition } from '../../tools/registry/tool-definition.js';
import { ToolOrigin } from '../../tools/tool-origin.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../utils/parameter-schema.js';
import { TOOL_SEARCH_CATEGORY } from './call-tool.js';
import type { AgentToolSearch } from './agent-tool-search.js';

export const SEARCH_TOOLS_NAME = 'search_tools';

/** What the tool reads of the agent it runs in: the tools the agent has now. */
type SearchToolsContext = { toolInstances: Record<string, unknown> };
type SearchToolsArgs = { query: string };

const searchToolsArgumentSchema = (): ParameterSchema => new ParameterSchema([
  new ParameterDefinition({
    name: 'query',
    type: ParameterType.STRING,
    description: 'A few words, or exact tool names.',
    required: true,
  }),
]);

/**
 * The description names the searchable tools as they were when the agent was created. It is
 * fixed for the agent's life: a changed description would change every later request's prefix.
 */
const searchToolsDescription = (searchableToolNames: readonly string[]): string =>
  'Find tools that are not listed here and get their full definitions. ' +
  `Searchable tools: ${searchableToolNames.join(', ')}. Tools announced later are searchable too. ` +
  'Give a few words or exact tool names; the result lists each matching tool with its description and argument schema. ' +
  'Then call a found tool with call_tool.';

/** The `search_tools` tool: searches the agent's searchable tools as they are when it runs. */
export class SearchToolsTool extends BaseTool<SearchToolsContext, SearchToolsArgs, string> {
  constructor(private readonly toolSearch: Pick<AgentToolSearch, 'search'>) {
    super();
  }

  static getName(): string {
    return SEARCH_TOOLS_NAME;
  }

  static getArgumentSchema(): ParameterSchema {
    return searchToolsArgumentSchema();
  }

  protected async _execute(context: SearchToolsContext, args?: SearchToolsArgs): Promise<string> {
    return this.toolSearch.search(args?.query ?? '', Object.keys(context.toolInstances));
  }
}

export const buildSearchToolsDefinition = (
  searchableToolNames: readonly string[],
  tool: SearchToolsTool,
): ToolDefinition => new ToolDefinition(
  SEARCH_TOOLS_NAME,
  searchToolsDescription(searchableToolNames),
  ToolOrigin.LOCAL,
  TOOL_SEARCH_CATEGORY,
  searchToolsArgumentSchema,
  () => null,
  { customFactory: () => tool },
);
