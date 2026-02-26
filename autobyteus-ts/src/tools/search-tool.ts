import { BaseTool } from './base-tool.js';
import { ToolConfig } from './tool-config.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../utils/parameter-schema.js';
import { ToolCategory } from './tool-category.js';
import { SearchClientFactory } from './search/factory.js';
import { SearchClient } from './search/client.js';

export class Search extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.WEB;
  private searchClient: SearchClient;

  constructor(config?: ToolConfig) {
    super(config);
    try {
      const factory = new SearchClientFactory();
      this.searchClient = factory.createSearchClient();
    } catch (error) {
      console.error('Failed to initialize search_web tool:', error);
      throw new Error(
        'Could not initialize Search tool. Please check your search provider configuration. ' +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  static getName(): string {
    return 'search_web';
  }

  static getDescription(): string {
    return (
      'Searches the web for a given query using the configured search provider. ' +
      'Returns a concise, structured summary of search results, including direct answers (if available) and top organic links.'
    );
  }

  static getArgumentSchema(): ParameterSchema | null {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'query',
      type: ParameterType.STRING,
      description: 'The search query string.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'num_results',
      type: ParameterType.INTEGER,
      description: 'The number of organic search results to return.',
      required: false,
      defaultValue: 5,
      minValue: 1,
      maxValue: 10
    }));
    return schema;
  }

  static getConfigSchema(): ParameterSchema | null {
    return null;
  }

  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    const query = String(args['query'] ?? '').trim();
    const rawNumResults = args['num_results'];
    const numResults = Number.isFinite(rawNumResults as number) ? Number(rawNumResults) : 5;
    if (!query) {
      throw new Error("Parameter 'query' is required for search_web.");
    }
    return this.searchClient.search(query, numResults);
  }
}
