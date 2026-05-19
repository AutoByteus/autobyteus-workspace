import { describe, expect, it } from 'vitest';
import {
  buildAuthenticatedWebSocketUrl,
  redactRemoteAccessWebSocketUrl,
} from '~/utils/remoteAccess/websocketAuth';

describe('remote access websocket auth helper', () => {
  it('adds access_token while preserving existing query params', () => {
    expect(buildAuthenticatedWebSocketUrl('ws://node/ws/agent/run-1?view=live', 'secret')).toBe(
      'ws://node/ws/agent/run-1?view=live&access_token=secret',
    );
  });

  it('redacts access_token in diagnostic URLs', () => {
    expect(redactRemoteAccessWebSocketUrl('ws://node/ws/agent/run-1?access_token=secret&view=live')).toBe(
      'ws://node/ws/agent/run-1?access_token=%5BREDACTED%5D&view=live',
    );
  });
});
