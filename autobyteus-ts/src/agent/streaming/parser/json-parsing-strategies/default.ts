import { coerceArguments, type ToolCallData, type JsonToolParsingStrategy } from './base.js';

export class DefaultJsonToolParsingStrategy implements JsonToolParsingStrategy {
  parse(rawJson: string): ToolCallData[] {
    let data: any;
    try {
      data = JSON.parse(rawJson);
    } catch {
      return [];
    }

    let tool: any = null;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      tool = data.tool;
    }

    if (!tool || typeof tool !== 'object') {
      return [];
    }

    let name = tool.function;
    if (name && typeof name === 'object') {
      name = name.name;
    }

    if (!name || typeof name !== 'string') {
      return [];
    }

    let args = tool.parameters;
    if (args === undefined) {
      args = tool.arguments;
    }
    const argumentsValue = coerceArguments(args);

    return [{ name, arguments: argumentsValue }];
  }
}
