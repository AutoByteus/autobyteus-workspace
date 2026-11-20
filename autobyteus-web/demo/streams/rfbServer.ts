/**
 * `/ws/node-desktop?mode=view|control` (autobyteus-279, VIS-022), the demo's node desktop: a minimal VNC (RFB 3.8) server,
 * only enough for the viewer to show a picture. No authentication (the socket's token is checked by the demo node), one
 * raw frame of an invented desktop (a wallpaper, a window with a title bar, a taskbar), then nothing more (the picture
 * never changes, so a later update request waits, as a VNC server's may); input
 * (keys, pointer, clipboard) is read and ignored, in View only and in Control alike. Ported from the approved design
 * reference (`autobyteus-web-design` 78b51f73: `prototype/source-observation/fake-rfb.mjs`), so the viewer shows the
 * reference's picture.
 */
import type { DemoStreamSession } from '../demoTransport';
import type { DemoStreamContext } from './index';

const W = 1024;
const H = 640;

/** The sample desktop, 32 bits per pixel (red, green, blue, unused), as the viewer's pixel format reads it. */
const frame = (): Uint8Array => {
  const out = new Uint8Array(W * H * 4);
  const put = (x: number, y: number, r: number, g: number, b: number) => { const i = (y * W + x) * 4; out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 0; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, 40 + (x >> 5), 70 + (y >> 4), 120 + ((x + y) >> 6));
  const rect = (x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, r, g, b);
  };
  rect(140, 90, 640, 400, 245, 247, 250); rect(140, 90, 640, 34, 51, 65, 85);
  rect(160, 100, 12, 12, 239, 68, 68); rect(180, 100, 12, 12, 234, 179, 8); rect(200, 100, 12, 12, 34, 197, 94);
  for (let line = 0; line < 9; line++) rect(170, 150 + line * 34, 300 + ((line * 53) % 220), 12, 203, 213, 225);
  rect(0, H - 36, W, 36, 15, 23, 42); rect(12, H - 28, 90, 20, 59, 130, 246);
  return out;
};

const u16 = (n: number) => [(n >> 8) & 255, n & 255];
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** The length of the client message at `i` (RFB 3.8 client-to-server types), or null for a type it does not know. */
const messageLength = (bytes: Uint8Array, i: number): number | null => {
  switch (bytes[i]) {
    case 0: return 20; // SetPixelFormat
    case 2: return 4 + 4 * ((bytes[i + 2]! << 8) | bytes[i + 3]!); // SetEncodings
    case 3: return 10; // FramebufferUpdateRequest
    case 4: return 8; // KeyEvent
    case 5: return 6; // PointerEvent
    case 6: return 8 + (((bytes[i + 4]! << 24) | (bytes[i + 5]! << 16) | (bytes[i + 6]! << 8) | bytes[i + 7]!) >>> 0); // ClientCutText
    default: return null;
  }
};

export const openNodeDesktopStream = (context: DemoStreamContext): DemoStreamSession => {
  let step: 'version' | 'security' | 'result' | 'ready' | 'drawn' = 'version';
  let pixels: Uint8Array | null = null;
  const sendBytes = (bytes: number[]) => context.send(Uint8Array.from(bytes));

  return {
    opened: () => { setTimeout(() => sendBytes([...new TextEncoder().encode('RFB 003.008\n')]), 20); },
    received: (data) => {
      if (data instanceof Blob) { console.error('[demo] the node desktop got a Blob; the viewer sends bytes'); return; }
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data)
        : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new TextEncoder().encode(String(data));
      if (step === 'version') { step = 'security'; sendBytes([1, 1]); return; } // one security type: None
      if (step === 'security') { step = 'result'; sendBytes(u32(0)); return; } // SecurityResult: OK
      if (step === 'result') { // ClientInit, then ServerInit
        step = 'ready';
        const name = new TextEncoder().encode('Node desktop');
        sendBytes([...u16(W), ...u16(H), 32, 24, 0, 1, ...u16(255), ...u16(255), ...u16(255), 16, 8, 0, 0, 0, 0, ...u32(name.length), ...name]);
        return;
      }
      for (let i = 0; i < bytes.length;) {
        const length = messageLength(bytes, i);
        if (length === null) { console.error(`[demo] the node desktop got an unknown message type ${bytes[i]}`); return; }
        if (bytes[i] === 3) {
          // The whole picture once (one raw rectangle); later requests wait, the picture never changes.
          if (step === 'ready') {
            step = 'drawn';
            pixels ??= frame();
            const head = [0, 0, ...u16(1), ...u16(0), ...u16(0), ...u16(W), ...u16(H), ...u32(0)];
            const all = new Uint8Array(head.length + pixels.length);
            all.set(head);
            all.set(pixels, head.length);
            context.send(all);
          }
        }
        i += length;
      }
    },
  };
};
