/** The demo node's WebSocket streams (autobyteus-279), one session class per route. */
import type { DemoStreamSession } from '../demoTransport';
import type { DemoWorld } from '../world/DemoWorld';

export const openDemoStream = (
  url: URL,
  world: DemoWorld,
  send: (data: string | Uint8Array) => void,
  close: (code: number, reason: string) => void,
): DemoStreamSession | null => {
  void url; void world; void send; void close;
  return null;
};
