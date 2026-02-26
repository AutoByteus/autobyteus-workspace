import { coerceArguments, type ToolCallData, type JsonToolParsingStrategy } from './base.js';

export class GeminiJsonToolParsingStrategy implements JsonToolParsingStrategy {
  parse(rawJson: string): ToolCallData[] {
    let data: any;
    try {
      data = JSON.parse(rawJson);
    } catch {
      return [];
    }

    const calls = Array.isArray(data) ? data : [data];
    const parsed: ToolCallData[] = [];

    for (const call of calls) {
      if (!call || typeof call !== 'object') {
        continue;
      }
      const name = call.name;
      if (!name || typeof name !== 'string') {
        continue;
      }
      const argumentsValue = coerceArguments(call.args);
      parsed.push({ name, arguments: argumentsValue });
    }
    return parsed;
  }
}
