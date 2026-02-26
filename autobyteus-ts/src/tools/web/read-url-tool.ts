import axios, { AxiosError } from 'axios';
import { BaseTool } from '../base-tool.js';
import { ToolCategory } from '../tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../utils/parameter-schema.js';
import { clean, CleaningMode } from '../../utils/html-cleaner.js';

export class ReadUrl extends BaseTool<unknown, Record<string, unknown>, string> {
  static CATEGORY = ToolCategory.WEB;

  static getName(): string {
    return 'read_url';
  }

  static getDescription(): string {
    return (
      'Reads the content of a specific URL using a lightweight HTTP client. ' +
      'Faster and more efficient than using a browser tool for static pages. ' +
      'Returns cleaned text content optimized for reading.'
    );
  }

  static getArgumentSchema(): ParameterSchema | null {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'url',
      type: ParameterType.STRING,
      description: 'The URL of the webpage to read.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'output_format',
      type: ParameterType.STRING,
      description: "The desired output format: 'text' (default) or 'html'. 'text' returns cleaned text content, 'html' returns cleaned HTML.",
      required: false,
      defaultValue: 'text',
      enumValues: ['text', 'html']
    }));
    return schema;
  }

  protected async _execute(_context: unknown, args: Record<string, unknown> = {}): Promise<string> {
    const url = String(args['url'] ?? '').trim();
    const outputFormat = String(args['output_format'] ?? 'text');
    if (!url) {
      throw new Error("Parameter 'url' is required for read_url.");
    }
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        responseType: 'text',
        validateStatus: () => true
      });

      if (response.status !== 200) {
        return `Failed to fetch content from ${url}. Status code: ${response.status}`;
      }

      const htmlContent = typeof response.data === 'string' ? response.data : String(response.data ?? '');
      const mode = outputFormat === 'text'
        ? CleaningMode.TEXT_CONTENT_FOCUSED
        : CleaningMode.THOROUGH;
      const cleaned = clean(htmlContent, mode);

      if (!cleaned.trim()) {
        return `Successfully fetched content from ${url}, but the cleaned result was empty.`;
      }

      return cleaned;
    } catch (error) {
      if (error instanceof Error && (error as AxiosError).isAxiosError) {
        return `Error reading URL '${url}': Network error (${error.message})`;
      }
      return `Error reading URL '${url}': ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
