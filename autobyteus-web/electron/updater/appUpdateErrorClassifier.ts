import type { AppUpdateErrorKind, AppUpdateOperation } from '../../shared/appUpdateTypes';

export type AppUpdateErrorClassificationContext = {
  operation: AppUpdateOperation;
  fallbackMessage: string;
};

export type AppUpdateErrorClassification = {
  kind: AppUpdateErrorKind;
  operation: AppUpdateOperation;
  message: string;
  diagnostic: string;
  code: string | null;
};

const SAFE_MESSAGES: Record<AppUpdateErrorKind, string> = {
  network: 'Could not reach the update server. AutoByteus is still usable; try again later.',
  'release-preparing': 'The latest update is still being prepared on GitHub. Try again in a few minutes.',
  metadata: 'Update information is incomplete right now. Try again in a few minutes.',
  download: 'The update download was interrupted. Check your connection and try again.',
  install: 'The update was downloaded, but AutoByteus could not restart to install it. Try again.',
  unavailable: 'Updates are only available in packaged desktop builds.',
  unknown: 'AutoByteus could not complete the update check. Try again later.',
};

function readErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' && code.trim() ? code : null;
  }
  return null;
}

function normalizeDiagnostic(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join('\n');
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return fallbackMessage;
  }
}

function includesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

const NETWORK_PATTERNS = [
  /\bnet::ERR_[A-Z0-9_]+\b/i,
  /\bE(?:CONNRESET|CONNREFUSED|HOSTUNREACH|PIPE|AI_AGAIN|NOTFOUND|TIMEDOUT)\b/i,
  /socket hang up/i,
  /connection (?:closed|reset|refused|timed out)/i,
  /network.*(?:offline|unavailable|failed|error)/i,
  /internet.*(?:offline|unavailable)/i,
  /request timed out/i,
];

const RELEASE_PREPARING_PATTERNS = [
  /ERR_UPDATER_CHANNEL_FILE_NOT_FOUND/i,
  /latest-(?:mac|linux)\.ya?ml/i,
  /\blatest\.ya?ml\b/i,
  /channel file/i,
  /cannot find.*latest/i,
  /missing.*latest/i,
  /release asset.*(?:not found|missing)/i,
  /asset.*(?:not found|missing)/i,
  /404.*(?:latest|\.ya?ml|asset|release)/i,
];

const METADATA_PATTERNS = [
  /ERR_UPDATER_ZIP_FILE_NOT_FOUND/i,
  /zip file not provided/i,
  /zip.*(?:not found|missing|not provided)/i,
  /invalid.*update.*info/i,
  /update info.*(?:invalid|missing|incomplete)/i,
  /sha512|checksum/i,
  /no files/i,
  /files.*(?:not found|missing)/i,
  /cannot find.*\.zip/i,
];

function inferOperationFallback(operation: AppUpdateOperation): AppUpdateErrorKind {
  if (operation === 'download') {
    return 'download';
  }
  if (operation === 'install') {
    return 'install';
  }
  return 'unknown';
}

export function classifyAppUpdateError(
  error: unknown,
  context: AppUpdateErrorClassificationContext,
): AppUpdateErrorClassification {
  const diagnostic = normalizeDiagnostic(error, context.fallbackMessage);
  const code = readErrorCode(error);
  const searchable = [code, diagnostic, context.fallbackMessage].filter(Boolean).join('\n');

  let kind: AppUpdateErrorKind;
  if (includesAny(searchable, NETWORK_PATTERNS)) {
    kind = 'network';
  } else if (includesAny(searchable, RELEASE_PREPARING_PATTERNS)) {
    kind = 'release-preparing';
  } else if (includesAny(searchable, METADATA_PATTERNS)) {
    kind = 'metadata';
  } else if (/packaged builds|updater-not-available-in-dev|not available/i.test(searchable)) {
    kind = 'unavailable';
  } else {
    kind = inferOperationFallback(context.operation);
  }

  return {
    kind,
    operation: context.operation,
    message: SAFE_MESSAGES[kind],
    diagnostic,
    code,
  };
}
