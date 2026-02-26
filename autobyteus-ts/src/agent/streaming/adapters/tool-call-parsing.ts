export type JsonToolParsingStrategy = {
  parse: (jsonStr: string) => Array<{ name?: string; arguments?: any }>;
};

const ARGS_OPEN = '<arguments>';
const ARGS_CLOSE = '</arguments>';

export const parseXmlArguments = (content: string): Record<string, any> => {
  const match = new RegExp(`${ARGS_OPEN}([\\s\\S]*?)${ARGS_CLOSE}`, 'i').exec(content);
  const argsContent = match ? match[1] : content.trim();

  if (!argsContent) {
    return {};
  }

  const parsed = parseXmlFragment(argsContent);
  if (Object.keys(parsed).length > 0) {
    return parsed;
  }

  return parseLegacyArguments(argsContent);
};

export const parseJsonToolCall = (
  jsonStr: string,
  parser?: JsonToolParsingStrategy | null
): { name?: string; arguments?: any } | null => {
  if (parser) {
    const parsedCalls = parser.parse(jsonStr);
    return parsedCalls.length ? parsedCalls[0] : null;
  }

  try {
    let data: any = JSON.parse(jsonStr);
    if (Array.isArray(data) && data.length) {
      data = data[0];
    }

    if (data && typeof data === 'object') {
      const name =
        data.name ||
        data.tool ||
        (data.function ? data.function.name : undefined) ||
        'unknown';
      let argumentsValue =
        data.arguments ||
        data.parameters ||
        (data.function ? data.function.arguments : undefined) ||
        {};

      if (typeof argumentsValue === 'string') {
        try {
          argumentsValue = JSON.parse(argumentsValue);
        } catch {
          // leave as string
        }
      }
      return { name, arguments: argumentsValue };
    }
  } catch {
    return null;
  }

  return null;
};

const parseXmlFragment = (fragment: string): Record<string, any> => {
  const argumentsMap: Record<string, any> = {};
  const tagPattern = /<([A-Za-z0-9_]+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(fragment)) !== null) {
    const tagName = match[1];
    const attrText = match[2] || '';
    const inner = match[3] ?? '';

    let name = tagName;
    if (tagName === 'arg') {
      const nameMatch = /name=["']([^"']+)["']/.exec(attrText);
      if (nameMatch) {
        name = nameMatch[1];
      }
    }
    if (!name) {
      continue;
    }

    const trimmedInner = inner.trim();
    if (/<[A-Za-z0-9_]+/.test(trimmedInner)) {
      argumentsMap[name] = parseXmlFragment(trimmedInner);
    } else {
      argumentsMap[name] = trimmedInner;
    }
  }
  return argumentsMap;
};

const parseLegacyArguments = (argsContent: string): Record<string, any> => {
  const argumentsMap: Record<string, any> = {};
  const argPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = argPattern.exec(argsContent)) !== null) {
    const argName = match[1];
    const argValue = (match[2] ?? '').trim();
    argumentsMap[argName] = argValue;
  }
  return argumentsMap;
};
