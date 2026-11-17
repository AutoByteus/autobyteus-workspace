import type { LLMProvider } from '../../llm/providers.js';
import type { BaseTool } from '../../tools/base-tool.js';
import { defaultToolRegistry } from '../../tools/registry/tool-registry.js';
import type { ToolDefinition } from '../../tools/registry/tool-definition.js';
import { ToolSchemaProvider } from '../../tools/usage/providers/tool-schema-provider.js';
import { buildCallToolDefinition, CALL_TOOL_NAME, CallTool } from './call-tool.js';
import { buildSearchToolsDefinition, SEARCH_TOOLS_NAME, SearchToolsTool } from './search-tools-tool.js';

const MAX_SEARCH_RESULTS = 5;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'of', 'for', 'in', 'on', 'at', 'by', 'with', 'from',
  'is', 'it', 'its', 'my', 'me', 'i', 'this', 'that', 'tool', 'tools',
]);
/** Name hits weigh most, then argument names, then the description. */
const NAME_WEIGHT = 3;
const ARGUMENT_WEIGHT = 2;
const DESCRIPTION_WEIGHT = 1;

const words = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** `term` from a query matches `word` of a tool exactly, or as a prefix of 4+ letters ("task" ~ "tasks"). */
const termMatches = (term: string, word: string): boolean =>
  term === word ||
  (term.length >= 4 && word.startsWith(term)) ||
  (word.length >= 4 && term.startsWith(word));

/**
 * One agent's tool search (native runtime). It owns which tools are **listed** (their definitions
 * are in every request) and which are **searchable** (found with `search_tools`, called with
 * `call_tool`), the agent's two runtime tools, and the request's tool set.
 *
 * `listedToolNames: null` lists every tool: requests carry every definition and there is no
 * search. Otherwise, when the agent starts with at least one searchable tool, requests carry the
 * listed tools it has, then `search_tools` and `call_tool`; they stay the same however the
 * agent's other tools change, so the provider's cached prefix stays valid.
 */
export class AgentToolSearch {
  private readonly listedToolNames: readonly string[] | null;
  private readonly runtimeTools = new Map<string, BaseTool>();
  private readonly runtimeToolDefinitions: ToolDefinition[] = [];

  constructor(listedToolNames: readonly string[] | null, initialToolNames: readonly string[]) {
    this.listedToolNames = listedToolNames === null ? null : [...listedToolNames];
    const searchable = this.searchableToolNames(initialToolNames);
    if (!searchable.length) return;
    const searchTool = new SearchToolsTool(this);
    const callTool = new CallTool();
    this.runtimeTools.set(SEARCH_TOOLS_NAME, searchTool);
    this.runtimeTools.set(CALL_TOOL_NAME, callTool);
    this.runtimeToolDefinitions.push(buildSearchToolsDefinition(searchable, searchTool), buildCallToolDefinition());
  }

  /** `search_tools` and `call_tool` are in this agent's requests, so a `call_tool` call is converted. */
  get enabled(): boolean {
    return this.runtimeTools.size > 0;
  }

  /** The request's tool definitions, given the tools the agent has now. */
  requestToolSchemas(toolNames: readonly string[], provider: LLMProvider | null): Array<Record<string, unknown>> {
    const schemaProvider = new ToolSchemaProvider();
    if (this.listedToolNames === null) return schemaProvider.buildSchema(toolNames, provider);
    const present = new Set(toolNames);
    return [
      ...schemaProvider.buildSchema(this.listedToolNames.filter((name) => present.has(name)), provider),
      ...schemaProvider.formatDefinitions(this.runtimeToolDefinitions, provider),
    ];
  }

  /** The agent's own `search_tools` or `call_tool`, when it has them. */
  getRuntimeTool(toolName: string): BaseTool | undefined {
    return this.runtimeTools.get(toolName);
  }

  /**
   * Searches the agent's searchable tools (`toolNames`, the tools it has now, minus the listed
   * ones). Exact names in the query return those tools; otherwise words are matched against
   * names, argument names and descriptions. At most 5 results, each with its full definition.
   */
  search(query: string, toolNames: readonly string[]): string {
    const definitions = this.searchableToolNames(toolNames)
      .map((name) => defaultToolRegistry.getToolDefinition(name))
      .filter((definition): definition is ToolDefinition => Boolean(definition));
    const found = findExactNames(query, definitions) ?? rankByWords(query, definitions);
    if (!found.length) {
      const names = definitions.map((definition) => definition.name);
      return names.length
        ? `No searchable tool matches "${query}". Searchable tools: ${names.join(', ')}.`
        : 'There are no searchable tools.';
    }
    const functions = new ToolSchemaProvider()
      .formatDefinitions(found, null)
      .map((schema) => JSON.stringify(schema.function));
    return [
      `Found ${found.length} tool${found.length === 1 ? '' : 's'}. Call one with call_tool: ` +
        '{"name": "<tool name>", "arguments": {<its arguments>}}.',
      ...functions,
    ].join('\n');
  }

  private searchableToolNames(toolNames: readonly string[]): string[] {
    if (this.listedToolNames === null) return [];
    const listed = new Set(this.listedToolNames);
    return toolNames.filter((name) => !listed.has(name) && name !== SEARCH_TOOLS_NAME && name !== CALL_TOOL_NAME);
  }
}

/** The tools named exactly in the query, or `null` when it names none. */
const findExactNames = (query: string, definitions: readonly ToolDefinition[]): ToolDefinition[] | null => {
  const named = new Set(query.toLowerCase().split(/[\s,;"'`()[\]]+/).filter(Boolean));
  const exact = definitions.filter((definition) => named.has(definition.name.toLowerCase()));
  return exact.length ? exact.slice(0, MAX_SEARCH_RESULTS) : null;
};

const rankByWords = (query: string, definitions: readonly ToolDefinition[]): ToolDefinition[] => {
  const terms = [...new Set(words(query))].filter((term) => !STOP_WORDS.has(term));
  return definitions
    .map((definition) => ({ definition, score: scoreDefinition(terms, definition) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.definition.name.localeCompare(right.definition.name))
    .slice(0, MAX_SEARCH_RESULTS)
    .map(({ definition }) => definition);
};

const scoreDefinition = (terms: readonly string[], definition: ToolDefinition): number => {
  const nameWords = words(definition.name);
  const argumentWords = (definition.argumentSchema?.parameters ?? []).flatMap((parameter) => words(parameter.name));
  const descriptionWords = words(definition.description);
  const weightOf = (term: string): number => {
    if (nameWords.some((word) => termMatches(term, word))) return NAME_WEIGHT;
    if (argumentWords.some((word) => termMatches(term, word))) return ARGUMENT_WEIGHT;
    return descriptionWords.some((word) => termMatches(term, word)) ? DESCRIPTION_WEIGHT : 0;
  };
  return terms.reduce((score, term) => score + weightOf(term), 0);
};
