import * as fs from 'fs/promises';
import { lookup as lookupMimeType } from 'mime-types';
import { validateReadableRegularFile } from '../localFileValidation';
import {
  createFileByteStream,
  type FileByteWindow,
} from './file-byte-stream';

const LOCAL_FILE_PROTOCOL = 'local-file:';
const CACHE_CONTROL_VALUE = 'no-store';

type FullResponsePlan = {
  kind: 'full';
  window: FileByteWindow;
};

type PartialResponsePlan = {
  kind: 'partial';
  window: FileByteWindow;
  end: number;
};

type UnsatisfiableResponsePlan = {
  kind: 'unsatisfiable';
};

type ResponsePlan = FullResponsePlan | PartialResponsePlan | UnsatisfiableResponsePlan;

const emptyResponse = (status: number, headers?: HeadersInit): Response => (
  new Response(null, { status, headers })
);

export function decodeLocalFilePath(requestUrl: string): string | null {
  try {
    const parsedUrl = new URL(requestUrl);
    if (parsedUrl.protocol !== LOCAL_FILE_PROTOCOL) {
      return null;
    }

    let filePath = decodeURIComponent(parsedUrl.pathname);
    if (parsedUrl.hostname) {
      if (!/^[A-Za-z]$/.test(parsedUrl.hostname)) {
        return null;
      }
      filePath = `${parsedUrl.hostname}:${filePath}`;
    }
    if (process.platform === 'win32' && /^\/[A-Za-z]:[\\/]/.test(filePath)) {
      filePath = filePath.slice(1);
    }
    return filePath;
  } catch {
    return null;
  }
}

function parseNonNegativeSafeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function planResponse(rangeHeader: string | null, fileSize: number): ResponsePlan {
  if (!rangeHeader) {
    return {
      kind: 'full',
      window: { start: 0, length: fileSize },
    };
  }

  if (fileSize === 0 || rangeHeader.includes(',')) {
    return { kind: 'unsatisfiable' };
  }

  const rangeMatch = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!rangeMatch) {
    return { kind: 'unsatisfiable' };
  }

  const [, startValue, endValue] = rangeMatch;
  if (!startValue && !endValue) {
    return { kind: 'unsatisfiable' };
  }

  let start: number;
  let end: number;

  if (!startValue) {
    const suffixLength = parseNonNegativeSafeInteger(endValue);
    if (suffixLength === null || suffixLength === 0) {
      return { kind: 'unsatisfiable' };
    }
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    const requestedStart = parseNonNegativeSafeInteger(startValue);
    const requestedEnd = endValue ? parseNonNegativeSafeInteger(endValue) : fileSize - 1;
    if (
      requestedStart === null
      || requestedEnd === null
      || requestedStart >= fileSize
      || requestedEnd < requestedStart
    ) {
      return { kind: 'unsatisfiable' };
    }
    start = requestedStart;
    end = Math.min(requestedEnd, fileSize - 1);
  }

  return {
    kind: 'partial',
    window: { start, length: end - start + 1 },
    end,
  };
}

function createContentHeaders(filePath: string): Headers {
  const headers = new Headers();
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', CACHE_CONTROL_VALUE);
  headers.set('Content-Type', lookupMimeType(filePath) || 'application/octet-stream');
  return headers;
}

export async function createLocalFileResponse(request: Request): Promise<Response> {
  const filePath = decodeLocalFilePath(request.url);
  if (!filePath) {
    return emptyResponse(404, { 'Cache-Control': CACHE_CONTROL_VALUE });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return emptyResponse(405, {
      Allow: 'GET, HEAD',
      'Cache-Control': CACHE_CONTROL_VALUE,
    });
  }

  const validation = await validateReadableRegularFile(filePath);
  if (!validation.ok) {
    return emptyResponse(404, { 'Cache-Control': CACHE_CONTROL_VALUE });
  }

  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(validation.filePath, 'r');
    const stats = await handle.stat();
    const responsePlan = planResponse(request.headers.get('range'), stats.size);
    const headers = createContentHeaders(validation.filePath);

    if (responsePlan.kind === 'unsatisfiable') {
      headers.set('Content-Range', `bytes */${stats.size}`);
      await handle.close();
      handle = null;
      return emptyResponse(416, headers);
    }

    headers.set('Content-Length', responsePlan.window.length.toString());
    const status = responsePlan.kind === 'partial' ? 206 : 200;
    if (responsePlan.kind === 'partial') {
      headers.set(
        'Content-Range',
        `bytes ${responsePlan.window.start}-${responsePlan.end}/${stats.size}`,
      );
    }

    if (request.method === 'HEAD' || responsePlan.window.length === 0) {
      await handle.close();
      handle = null;
      return emptyResponse(status, headers);
    }

    const body = createFileByteStream(handle, responsePlan.window);
    const response = new Response(body, { status, headers });
    handle = null;
    return response;
  } catch {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // The response remains a deterministic no-byte failure if cleanup also fails.
      }
    }
    return emptyResponse(404, { 'Cache-Control': CACHE_CONTROL_VALUE });
  }
}
