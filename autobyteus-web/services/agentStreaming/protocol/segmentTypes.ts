/**
 * Segment type factories - Creates frontend segment objects from backend payloads.
 * 
 * Maps backend SegmentType to frontend AIResponseSegment types.
 */

import type { SegmentStartPayload, SegmentType } from './messageTypes';
import type { 
  AIResponseSegment,
  AIResponseTextSegment,
  WriteFileSegment,
  ThinkSegment,
  ToolCallSegment,
  TerminalCommandSegment,
  EditFileSegment,
  MediaSegment,
} from '~/types/segments';

/**
 * Create a new segment from a SEGMENT_START payload.
 * 
 * @param payload - The SEGMENT_START payload from backend
 * @returns A new segment object initialized with default values
 */
export function createSegmentFromPayload(payload: SegmentStartPayload): AIResponseSegment {
  const { id, segment_type, metadata } = payload;

  switch (segment_type) {
    case 'text':
      return createTextSegment();

    case 'tool_call':
      return createToolCallSegment(id, metadata);

    case 'write_file':
      return createWriteFileSegment(id, metadata);

    case 'run_bash':
      return createTerminalCommandSegment(id);

    case 'edit_file':
      return createEditFileSegment(id, metadata);

    case 'reasoning':
      return createThinkSegment();

    case 'media':
      return createMediaSegment(metadata);

    default:
      // Fallback to text for unknown types
      console.warn(`Unknown segment type: ${segment_type}, falling back to text`);
      return createTextSegment();
  }
}

function createTextSegment(): AIResponseTextSegment {
  return {
    type: 'text',
    content: '',
  };
}

function createToolCallSegment(
  invocationId: string, 
  metadata?: Record<string, any>
): ToolCallSegment {
  return {
    type: 'tool_call',
    invocationId,
    toolName: metadata?.tool_name || '',
    arguments: {},
    status: 'parsing',
    logs: [],
    result: null,
    error: null,
    rawContent: '',
  };
}

function createWriteFileSegment(invocationId: string, metadata?: Record<string, any>): WriteFileSegment {
  const path = metadata?.path || '';
  return {
    type: 'write_file',
    invocationId,
    toolName: 'write_file',
    arguments: {},
    status: 'parsing',
    logs: [],
    result: null,
    error: null,
    path,
    originalContent: '',
    language: detectLanguageFromPath(path),
  };
}

function createTerminalCommandSegment(invocationId: string): TerminalCommandSegment {
  return {
    type: 'terminal_command',
    invocationId,
    toolName: 'run_bash',
    arguments: {},
    status: 'parsing',
    logs: [],
    result: null,
    error: null,
    command: '',
    description: '',
  };
}

function createEditFileSegment(invocationId: string, metadata?: Record<string, any>): EditFileSegment {
  const path = metadata?.path || '';
  return {
    type: 'edit_file',
    invocationId,
    toolName: 'edit_file',
    arguments: {},
    status: 'parsing',
    logs: [],
    result: null,
    error: null,
    path,
    originalContent: '',
    language: 'diff',
  };
}

function createThinkSegment(): ThinkSegment {
  return {
    type: 'think',
    content: '',
  };
}

function createMediaSegment(metadata?: Record<string, any>): MediaSegment {
  const rawType = metadata?.media_type;
  const mediaType =
    rawType === 'audio' || rawType === 'video' || rawType === 'image' ? rawType : 'image';
  const urls = Array.isArray(metadata?.urls)
    ? metadata.urls.map((url: any) => String(url)).filter((url: string) => url.length > 0)
    : [];
  return {
    type: 'media',
    mediaType,
    urls,
  };
}

/**
 * Simple language detection from file path extension.
 */
function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    vue: 'vue',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
  };
  return languageMap[ext] || 'plaintext';
}
