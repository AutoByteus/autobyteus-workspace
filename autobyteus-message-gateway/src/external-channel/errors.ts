export type ExternalChannelParseErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PROVIDER'
  | 'INVALID_TRANSPORT'
  | 'INVALID_PEER_TYPE'
  | 'INVALID_ATTACHMENT'
  | 'INVALID_METADATA'
  | 'INVALID_THREAD_ID'
  | 'INVALID_DISCORD_PEER_ID'
  | 'INVALID_DISCORD_THREAD_ID'
  | 'INVALID_DISCORD_ACCOUNT_ID'
  | 'INVALID_DISCORD_THREAD_TARGET_COMBINATION'
  | 'INVALID_RECEIVED_AT'
  | 'MISSING_TRANSPORT'
  | 'MISSING_CORRELATION_ID'
  | 'MISSING_CALLBACK_IDEMPOTENCY_KEY'
  | 'INCOMPATIBLE_TRANSPORT_PROVIDER'
  | 'UNSUPPORTED_SCHEMA_VERSION';

export class ExternalChannelParseError extends Error {
  readonly code: ExternalChannelParseErrorCode;
  readonly field?: string;

  constructor(code: ExternalChannelParseErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ExternalChannelParseError';
    this.code = code;
    this.field = field;
  }
}

export function throwParseError(
  code: ExternalChannelParseErrorCode,
  message: string,
  field?: string
): never {
  throw new ExternalChannelParseError(code, message, field);
}
