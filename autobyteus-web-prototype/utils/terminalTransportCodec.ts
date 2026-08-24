/**
 * Terminal transport codec utilities.
 *
 * The terminal WebSocket protocol carries base64-encoded terminal bytes.
 * Browser terminal input/output must cross that byte boundary explicitly:
 * - input JavaScript strings are encoded as UTF-8 bytes before base64 transport;
 * - output base64 bytes are decoded as one streaming UTF-8 byte stream before xterm writes.
 */

export type TerminalOutputDecoder = TextDecoder;

const BASE64_CHUNK_SIZE = 0x8000;

export function base64ToBytes(base64Data: string): Uint8Array {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binaryString = "";

  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK_SIZE);
    binaryString += String.fromCharCode(...chunk);
  }

  return btoa(binaryString);
}

export function encodeTerminalInput(data: string): string {
  return bytesToBase64(new TextEncoder().encode(data));
}

export function createTerminalOutputDecoder(): TerminalOutputDecoder {
  return new TextDecoder("utf-8");
}

export function decodeTerminalOutputChunk(
  decoder: TerminalOutputDecoder,
  base64Data: string,
): string {
  return decoder.decode(base64ToBytes(base64Data), { stream: true });
}

export function flushTerminalOutputDecoder(
  decoder: TerminalOutputDecoder,
): string {
  return decoder.decode();
}
