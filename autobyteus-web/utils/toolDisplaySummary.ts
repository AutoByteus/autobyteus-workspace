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

// Antigravity's own tools name their arguments in PascalCase and the node passes them through as they are
// (`agy-stream-event-converter.ts`; the tools and arguments the node reads: `antigravity-translation.ts`), autobyteus-590:
// `run_command` CommandLine; `read_file` Path; `view_file` AbsolutePath; `write_to_file` and `replace_file_content`
// TargetFile; `list_dir` DirectoryPath; `grep_search` Query; `find_by_name` Pattern. A search's folder (SearchPath,
// SearchDirectory) is not a summary key: a file key would win over the query, and what it looks for says more.
const FILE_ARG_KEYS = ['path', 'file_path', 'filepath', 'filename', 'target_path', 'Path', 'AbsolutePath', 'TargetFile', 'DirectoryPath'];
const COMMAND_ARG_KEYS = ['command', 'cmd', 'script', 'CommandLine'];
// The platform's agent tools (autobyteus-590 DEC-006): whom a message or a delegation addresses, and which Task a Task tool
// reads or changes. After the command and file keys, before the generic text keys.
const RECIPIENT_ARG_KEYS = ['recipient_address'];
const TASK_ARG_KEYS = ['task_id'];
const TEXT_ARG_KEYS = ['query', 'Query', 'Pattern', 'prompt', 'url', 'message', 'text', 'title', 'name', 'raw'];

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

/** One leading `cd <folder> &&` or `cd <folder>;` (DEC-007): the folder every command of a run repeats. */
const LEADING_CD = /^cd\s+(?:"[^"]*"|'[^']*'|[^\s;&]+)\s*(?:&&|;)\s*/;

/** A command without its leading `cd`, unless nothing would be left. */
const withoutLeadingCd = (command: string): string => {
  const rest = command.replace(LEADING_CD, '');
  return rest.trim() ? rest : command;
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
      text: withoutLeadingCd(sanitized),
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

  const recipient = pickFirstString(args, RECIPIENT_ARG_KEYS);
  if (recipient) {
    const text = `→ ${recipient}`;
    return { kind: 'text', text, title: text };
  }

  const taskKey = pickFirstString(args, TASK_ARG_KEYS);
  if (taskKey) {
    return { kind: 'text', text: taskKey, title: taskKey };
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
