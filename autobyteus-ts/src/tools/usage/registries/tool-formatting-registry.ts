import { LLMProvider } from '../../../llm/providers.js';
import { Singleton } from '../../../utils/singleton.js';
import { resolveToolCallFormat } from '../../../utils/tool-call-format.js';
import { ToolFormatterPair } from './tool-formatter-pair.js';
import {
  BaseSchemaFormatter,
  BaseExampleFormatter
} from '../formatters/base-formatter.js';
import { DefaultJsonSchemaFormatter } from '../formatters/default-json-schema-formatter.js';
import { DefaultJsonExampleFormatter } from '../formatters/default-json-example-formatter.js';
import { DefaultXmlSchemaFormatter } from '../formatters/default-xml-schema-formatter.js';
import { DefaultXmlExampleFormatter } from '../formatters/default-xml-example-formatter.js';
import { OpenAiJsonSchemaFormatter } from '../formatters/openai-json-schema-formatter.js';
import { OpenAiJsonExampleFormatter } from '../formatters/openai-json-example-formatter.js';
import { GeminiJsonSchemaFormatter } from '../formatters/gemini-json-schema-formatter.js';
import { GeminiJsonExampleFormatter } from '../formatters/gemini-json-example-formatter.js';
import { WriteFileXmlSchemaFormatter } from '../formatters/write-file-xml-schema-formatter.js';
import { WriteFileXmlExampleFormatter } from '../formatters/write-file-xml-example-formatter.js';
import { EditFileXmlSchemaFormatter } from '../formatters/edit-file-xml-schema-formatter.js';
import { EditFileXmlExampleFormatter } from '../formatters/edit-file-xml-example-formatter.js';

export class ToolFormattingRegistry extends Singleton {
  protected static instance?: ToolFormattingRegistry;

  private readonly pairs!: Map<LLMProvider, ToolFormatterPair>;
  private readonly defaultPair!: ToolFormatterPair;
  private readonly xmlOverridePair!: ToolFormatterPair;
  private readonly toolPairs!: Map<string, ToolFormatterPair>;

  constructor() {
    super();
    if (ToolFormattingRegistry.instance) {
      return ToolFormattingRegistry.instance;
    }

    this.pairs = new Map<LLMProvider, ToolFormatterPair>([
      [LLMProvider.OPENAI, new ToolFormatterPair(new OpenAiJsonSchemaFormatter(), new OpenAiJsonExampleFormatter())],
      [LLMProvider.MISTRAL, new ToolFormatterPair(new OpenAiJsonSchemaFormatter(), new OpenAiJsonExampleFormatter())],
      [LLMProvider.DEEPSEEK, new ToolFormatterPair(new OpenAiJsonSchemaFormatter(), new OpenAiJsonExampleFormatter())],
      [LLMProvider.GROK, new ToolFormatterPair(new OpenAiJsonSchemaFormatter(), new OpenAiJsonExampleFormatter())],
      [LLMProvider.GEMINI, new ToolFormatterPair(new GeminiJsonSchemaFormatter(), new GeminiJsonExampleFormatter())],
      [LLMProvider.ANTHROPIC, new ToolFormatterPair(new DefaultXmlSchemaFormatter(), new DefaultXmlExampleFormatter())]
    ]);

    this.defaultPair = new ToolFormatterPair(
      new DefaultJsonSchemaFormatter(),
      new DefaultJsonExampleFormatter()
    );
    this.xmlOverridePair = new ToolFormatterPair(
      new DefaultXmlSchemaFormatter(),
      new DefaultXmlExampleFormatter()
    );
    this.toolPairs = new Map();

    this.toolPairs.set(
      'write_file',
      new ToolFormatterPair(new WriteFileXmlSchemaFormatter(), new WriteFileXmlExampleFormatter())
    );
    this.toolPairs.set(
      'edit_file',
      new ToolFormatterPair(new EditFileXmlSchemaFormatter(), new EditFileXmlExampleFormatter())
    );

    ToolFormattingRegistry.instance = this;
  }

  public registerToolFormatter(toolName: string, formatterPair: ToolFormatterPair): void {
    this.toolPairs.set(toolName, formatterPair);
  }

  public getFormatterPairForTool(toolName: string, provider?: LLMProvider | null): ToolFormatterPair {
    if (this.toolPairs.has(toolName)) {
      return this.toolPairs.get(toolName)!;
    }
    return this.getFormatterPair(provider ?? null);
  }

  public getFormatterPair(provider?: LLMProvider | null): ToolFormatterPair {
    const overrideEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    const formatOverride = overrideEnv ? resolveToolCallFormat() : null;

    if (formatOverride === 'xml') {
      return this.xmlOverridePair;
    }
    if (formatOverride === 'json') {
      return this.defaultPair;
    }
    if (formatOverride === 'sentinel' || formatOverride === 'api_tool_call') {
      return this.defaultPair;
    }

    if (provider && this.pairs.has(provider)) {
      return this.pairs.get(provider)!;
    }

    return this.defaultPair;
  }
}

export function registerToolFormatter(
  toolName: string,
  schemaFormatter: BaseSchemaFormatter,
  exampleFormatter: BaseExampleFormatter
): void {
  const registry = ToolFormattingRegistry.getInstance() as ToolFormattingRegistry;
  const pair = new ToolFormatterPair(schemaFormatter, exampleFormatter);
  registry.registerToolFormatter(toolName, pair);
}
