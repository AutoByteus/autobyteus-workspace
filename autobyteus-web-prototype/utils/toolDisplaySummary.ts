export type ToolDisplaySummaryKind = 'command' | 'file' | 'text';

export interface ToolDisplaySummary {
  kind: ToolDisplaySummaryKind;
  text: string;
  title: string;
}

interface ToolDisplaySummaryOptions {
  fallbackText?: string | null;
  preferCompactPath?: boolean;
}

const FILE_ARG_KEYS = ['path', 'file_path', 'filepath', 'filename', 'target_path'];
const COMMAND_ARG_KEYS = ['command', 'cmd', 'script'];
const TEXT_ARG_KEYS = ['query', 'prompt', 'url', 'message', 'text', 'title', 'name', 'raw'];

const normalizeToolName = (toolName: string): string => toolName.trim().toLowerCase();

const isFileToolName = (toolName: string): boolean => {
  const name = normalizeToolName(toolName);
  return (
    name.includes('write_file')
    || name.includes('edit_file')
    || name.includes('read_file')
    || name.includes('apply_patch')
  );
};

const isCommandToolName = (toolName: string): boolean => {
  const name = normalizeToolName(toolName);
  return (
    name.includes('bash')
    || name.includes('terminal')
    || name.includes('exec_command')
    || name.includes('run_command')
  );
};

const normalizeToolArguments = (
  rawArgs?: Record<string, any> | string,
): Record<string, any> | null => {
  if (rawArgs === undefined || rawArgs === null) {
    return null;
  }

  if (typeof rawArgs === 'string') {
    const trimmed = rawArgs.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return { raw: trimmed };
    }

    return { raw: trimmed };
  }

  return rawArgs;
};

const normalizeFallbackText = (fallbackText: string | null | undefined, toolName: string): string => {
  const trimmed = (fallbackText ?? '').trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.toLowerCase() === toolName.trim().toLowerCase()) {
    return '';
  }

  return trimmed;
};

const pickFirstString = (obj: Record<string, any> | null, keys: string[]): string => {
  if (!obj) {
    return '';
  }

  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return '';
};

const normalizePath = (path: string): string => path.replace(/\\/g, '/').trim();

const compactPath = (path: string): string => {
  const normalized = normalizePath(path);
  if (!normalized) {
    return '';
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 2) {
    return segments.join('/') || normalized;
  }

  return segments.slice(-2).join('/');
};

const redactSecrets = (text: string): string => {
  let sanitized = text;
  sanitized = sanitized.replace(/(api[_-]?key|token|password|passwd|secret)\s*=\s*([^\s]+)/gi, '$1=***');
  sanitized = sanitized.replace(/(--?(?:api-key|token|password|passwd|secret)\s+)([^\s]+)/gi, '$1***');
  return sanitized;
};

export const getToolDisplaySummary = (
  toolName: string,
  rawArgs?: Record<string, any> | string,
  options: ToolDisplaySummaryOptions = {},
): ToolDisplaySummary | null => {
  const args = normalizeToolArguments(rawArgs);
  const fallbackText = normalizeFallbackText(options.fallbackText, toolName);

  const commandText = pickFirstString(args, COMMAND_ARG_KEYS)
    || (isCommandToolName(toolName) ? fallbackText : '');
  if (commandText) {
    const sanitized = redactSecrets(commandText);
    return {
      kind: 'command',
      text: sanitized,
      title: sanitized,
    };
  }

  const pathText = pickFirstString(args, FILE_ARG_KEYS)
    || (isFileToolName(toolName) ? fallbackText : '');
  if (pathText) {
    const fullPath = normalizePath(pathText);
    return {
      kind: 'file',
      text: options.preferCompactPath ? compactPath(fullPath) : fullPath,
      title: fullPath,
    };
  }

  const genericText = pickFirstString(args, TEXT_ARG_KEYS) || fallbackText;
  if (genericText) {
    const sanitized = redactSecrets(genericText);
    return {
      kind: 'text',
      text: sanitized,
      title: sanitized,
    };
  }

  return null;
};
