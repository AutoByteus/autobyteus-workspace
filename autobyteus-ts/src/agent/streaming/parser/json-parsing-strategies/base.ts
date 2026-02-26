export type ToolCallData = {
  name: string;
  arguments: Record<string, any>;
};

export interface JsonToolParsingStrategy {
  parse(rawJson: string): ToolCallData[];
}

export const coerceArguments = (value: any): Record<string, any> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return {};
    }
  }
  return {};
};
