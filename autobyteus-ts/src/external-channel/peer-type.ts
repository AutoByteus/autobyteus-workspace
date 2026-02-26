import { throwParseError } from './errors.js';

export enum ExternalPeerType {
  USER = 'USER',
  GROUP = 'GROUP',
  CHANNEL = 'CHANNEL'
}

export function parseExternalPeerType(input: unknown): ExternalPeerType {
  if (typeof input !== 'string') {
    throwParseError('INVALID_PEER_TYPE', "External peer type must be a string.", 'peerType');
  }

  const normalized = input.trim().toUpperCase();
  if (normalized === ExternalPeerType.USER) {
    return ExternalPeerType.USER;
  }
  if (normalized === ExternalPeerType.GROUP) {
    return ExternalPeerType.GROUP;
  }
  if (normalized === ExternalPeerType.CHANNEL) {
    return ExternalPeerType.CHANNEL;
  }

  throwParseError('INVALID_PEER_TYPE', `Unsupported external peer type: ${input}`, 'peerType');
}

