/**
 * Contract between noVNC (the viewer) and the node's RFB input filter (the View only boundary,
 * autobyteus-server-ts/src/node-desktop/rfb-viewer-input-filter.ts): every message noVNC's
 * `RFB.messages` can encode is framed by the filter, forwarded or dropped per mode, and leaves the
 * filter framed for the next message. Fails when a noVNC upgrade adds an encoder.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import RFB from '@novnc/novnc';
import { RfbViewerInputFilter, type NodeDesktopMode } from '../../../autobyteus-server-ts/src/node-desktop/rfb-viewer-input-filter';

type Encoder = (sock: FakeSock) => void;
type FakeSock = ReturnType<typeof createSock>;

const createSock = () => {
  const bytes: number[] = [];
  return {
    bytes,
    sQpush8: (value: number) => { bytes.push(value & 0xff); },
    sQpush16: (value: number) => { bytes.push((value >> 8) & 0xff, value & 0xff); },
    sQpush32: (value: number) => {
      bytes.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
    },
    sQpushBytes: (data: Uint8Array) => { bytes.push(...data); },
    sQpushString: (text: string) => { for (const char of text) bytes.push(char.charCodeAt(0) & 0xff); },
    flush: () => undefined,
  };
};

const messages = (RFB as unknown as { messages: Record<string, (...args: any[]) => void> }).messages;
const encode = (encoder: Encoder): Buffer => {
  const sock = createSock();
  encoder(sock);
  return Buffer.from(sock.bytes);
};

const HANDSHAKE = Buffer.from([...Buffer.from('RFB 003.008\n', 'latin1'), 1, 1]);
const filterFor = (mode: NodeDesktopMode) => {
  const filter = new RfbViewerInputFilter(mode);
  filter.accept(HANDSHAKE);
  return filter;
};
const forwarded = (filter: RfbViewerInputFilter, chunk: Buffer): Buffer => {
  const result = filter.accept(chunk);
  if ('reject' in result) throw new Error(`filter rejected: ${result.reject}`);
  return result.forward;
};

const TEXT_FORMAT = 1;
const cases: Array<[name: string, view: 'forward' | 'drop', control: 'forward' | 'drop', encoder: Encoder]> = [
  ['pixelFormat', 'forward', 'forward', (sock) => messages.pixelFormat(sock, 24, true)],
  ['clientEncodings', 'forward', 'forward', (sock) => messages.clientEncodings(sock, [7, 1, 0, -223])],
  ['fbUpdateRequest', 'forward', 'forward', (sock) => messages.fbUpdateRequest(sock, true, 0, 0, 1920, 1080)],
  ['keyEvent', 'drop', 'forward', (sock) => messages.keyEvent(sock, 0x61, 1)],
  ['QEMUExtendedKeyEvent', 'drop', 'forward', (sock) => messages.QEMUExtendedKeyEvent(sock, 0x61, 1, 0x1e)],
  ['pointerEvent', 'drop', 'forward', (sock) => messages.pointerEvent(sock, 10, 20, 1)],
  ['clientCutText', 'drop', 'forward', (sock) => messages.clientCutText(sock, new TextEncoder().encode('copied text'))],
  ['extendedClipboardNotify', 'drop', 'forward', (sock) => messages.extendedClipboardNotify(sock, [TEXT_FORMAT])],
  ['extendedClipboardRequest', 'drop', 'forward', (sock) => messages.extendedClipboardRequest(sock, [TEXT_FORMAT])],
  ['extendedClipboardCaps', 'drop', 'forward', (sock) => messages.extendedClipboardCaps(sock, [1, 2, 4, 8, 16], { 0: 1024 })],
  ['extendedClipboardProvide', 'drop', 'forward', (sock) => messages.extendedClipboardProvide(sock, [TEXT_FORMAT], ['copied text'])],
  ['enableContinuousUpdates', 'forward', 'forward', (sock) => messages.enableContinuousUpdates(sock, true, 0, 0, 1920, 1080)],
  ['clientFence', 'forward', 'forward', (sock) => messages.clientFence(sock, 3, 'abc')],
  ['xvpOp', 'drop', 'drop', (sock) => messages.xvpOp(sock, 1, 2)],
  ['setDesktopSize', 'drop', 'drop', (sock) => messages.setDesktopSize(sock, 800, 600, 0, 0)],
];

describe('noVNC 1.7.0 messages through the node desktop input filter', () => {
  it.each(cases)('%s: view %s, control %s', (_name, view, control, encoder) => {
    const message = encode(encoder);
    const next = encode((sock) => messages.fbUpdateRequest(sock, true, 0, 0, 1920, 1080));
    for (const [mode, action] of [['view', view], ['control', control]] as const) {
      const filter = filterFor(mode);
      expect(forwarded(filter, Buffer.concat([message, next])))
        .toEqual(action === 'forward' ? Buffer.concat([message, next]) : next);
    }
  });

  it('covers every encoder noVNC has (extendedPointerEvent is never enabled: -316 is removed)', () => {
    const covered = new Set([...cases.map(([name]) => name), 'extendedPointerEvent', '_buildExtendedClipboardFlags']);
    expect(Object.keys(messages).filter((name) => !covered.has(name))).toEqual([]);
  });

  it('strips noVNC\'s ExtendedMouseButtons pseudo-encoding from the encodings it advertises', () => {
    const require = createRequire(import.meta.url);
    const core = path.dirname(require.resolve('@novnc/novnc'));
    const encodingsSource = readFileSync(path.join(core, 'encodings.js'), 'utf8');
    const rfbSource = readFileSync(path.join(core, 'rfb.js'), 'utf8');
    const value = Number(/pseudoEncodingExtendedMouseButtons:\s*(-?\d+)/.exec(encodingsSource)?.[1]);
    expect(value).toBe(-316);
    expect(rfbSource).toContain('encs.push(encodings.pseudoEncodingExtendedMouseButtons)');

    const advertised = encode((sock) => messages.clientEncodings(sock, [7, 1, -223, value, -312]));
    for (const mode of ['view', 'control'] as const) {
      expect(forwarded(filterFor(mode), advertised))
        .toEqual(encode((sock) => messages.clientEncodings(sock, [7, 1, -223, -312])));
    }
  });
});
