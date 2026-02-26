import { throwParseError } from './errors.js';

export enum ExternalChannelTransport {
  BUSINESS_API = 'BUSINESS_API',
  PERSONAL_SESSION = 'PERSONAL_SESSION'
}

export function parseExternalChannelTransport(input: unknown): ExternalChannelTransport {
  if (typeof input !== 'string') {
    throwParseError('INVALID_TRANSPORT', "External channel transport must be a string.", 'transport');
  }

  const normalized = input.trim().toUpperCase();
  if (normalized === ExternalChannelTransport.BUSINESS_API) {
    return ExternalChannelTransport.BUSINESS_API;
  }
  if (normalized === ExternalChannelTransport.PERSONAL_SESSION) {
    return ExternalChannelTransport.PERSONAL_SESSION;
  }

  throwParseError('INVALID_TRANSPORT', `Unsupported external channel transport: ${input}`, 'transport');
}

