import { coerceArguments, type ToolCallData, type JsonToolParsingStrategy } from './base.js';

export class OpenAiJsonToolParsingStrategy implements JsonToolParsingStrategy {
  parse(rawJson: string): ToolCallData[] {
    let data: any;
    try {
      data = JSON.parse(rawJson);
    } catch {
      return [];
    }

    const toolCalls = this.extractToolCalls(data);
    const parsed: ToolCallData[] = [];

    for (const call of toolCalls) {
      if (!call || typeof call !== 'object') {
        continue;
      }

      let workingCall: any = call;
      if (workingCall.tool && typeof workingCall.tool === 'object') {
        workingCall = workingCall.tool;
      }

      let functionData: any = {};
      const functionValue = workingCall.function;
      if (functionValue && typeof functionValue === 'object') {
        functionData = functionValue;
      } else if (typeof functionValue === 'string') {
        functionData = workingCall;
      } else if ('name' in workingCall || 'arguments' in workingCall || 'parameters' in workingCall) {
        functionData = workingCall;
      }

      const name = functionData.name ?? functionData.function;
      if (!name || typeof name !== 'string') {
        continue;
      }

      let args = functionData.arguments;
      if (args === undefined) {
        args = functionData.parameters;
      }
      const argumentsValue = coerceArguments(args);

      parsed.push({ name, arguments: argumentsValue });
    }

    return parsed;
  }

  private extractToolCalls(data: any): any[] {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.tool_calls)) {
        return data.tool_calls;
      }
      if (Array.isArray(data.tools)) {
        return data.tools;
      }
      if (data.tool && typeof data.tool === 'object') {
        return [data.tool];
      }
      return [data];
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }
}
