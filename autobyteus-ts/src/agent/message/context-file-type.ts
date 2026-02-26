import path from 'node:path';
import { URL } from 'node:url';

export enum ContextFileType {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  DOCX = 'docx',
  PPTX = 'pptx',
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  AUDIO = 'audio',
  VIDEO = 'video',
  IMAGE = 'image',
  UNKNOWN = 'unknown'
}

function extractPath(uri: string): string {
  try {
    const parsed = new URL(uri);
    return parsed.pathname;
  } catch {
    return uri;
  }
}

export namespace ContextFileType {
  export function fromPath(uri: string): ContextFileType {
    if (!uri || typeof uri !== 'string') {
      return ContextFileType.UNKNOWN;
    }

    let extension = '';
    try {
      const parsedPath = extractPath(uri).toLowerCase();
      extension = path.extname(parsedPath);
    } catch {
      extension = path.extname(uri.toLowerCase());
    }

    switch (extension) {
      case '.txt':
        return ContextFileType.TEXT;
      case '.md':
        return ContextFileType.MARKDOWN;
      case '.pdf':
        return ContextFileType.PDF;
      case '.docx':
        return ContextFileType.DOCX;
      case '.pptx':
        return ContextFileType.PPTX;
      case '.xlsx':
        return ContextFileType.XLSX;
      case '.csv':
        return ContextFileType.CSV;
      case '.json':
        return ContextFileType.JSON;
      case '.xml':
        return ContextFileType.XML;
      case '.html':
      case '.htm':
        return ContextFileType.HTML;
      case '.py':
        return ContextFileType.PYTHON;
      case '.js':
        return ContextFileType.JAVASCRIPT;
      case '.mp3':
      case '.wav':
      case '.m4a':
      case '.flac':
      case '.ogg':
      case '.aac':
        return ContextFileType.AUDIO;
      case '.mp4':
      case '.mov':
      case '.avi':
      case '.mkv':
      case '.webm':
        return ContextFileType.VIDEO;
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.webp':
        return ContextFileType.IMAGE;
      default:
        return ContextFileType.UNKNOWN;
    }
  }

  export function getReadableTextTypes(): ContextFileType[] {
    return [
      ContextFileType.TEXT,
      ContextFileType.MARKDOWN,
      ContextFileType.JSON,
      ContextFileType.XML,
      ContextFileType.HTML,
      ContextFileType.PYTHON,
      ContextFileType.JAVASCRIPT,
      ContextFileType.CSV
    ];
  }
}
