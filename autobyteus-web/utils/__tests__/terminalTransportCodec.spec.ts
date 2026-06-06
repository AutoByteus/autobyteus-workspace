import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  createTerminalOutputDecoder,
  decodeTerminalOutputChunk,
  encodeTerminalInput,
} from "../terminalTransportCodec";

const utf8Bytes = (text: string): Uint8Array => new TextEncoder().encode(text);
const utf8Text = (bytes: Uint8Array): string => new TextDecoder("utf-8").decode(bytes);

const bytesToBase64ForTest = (bytes: Uint8Array): string => bytesToBase64(bytes);

const splitBytes = (bytes: Uint8Array, at: number): [Uint8Array, Uint8Array] => [
  bytes.subarray(0, at),
  bytes.subarray(at),
];

describe("terminalTransportCodec", () => {
  it("decodes base64 terminal bytes as Unicode output text", () => {
    const decoder = createTerminalOutputDecoder();
    const output = "┌─┐\n│✓│\n└─┘\n";
    const encoded = bytesToBase64ForTest(utf8Bytes(output));

    expect(decodeTerminalOutputChunk(decoder, encoded)).toBe(output);
  });

  it("preserves ANSI escape sequences while decoding Unicode output", () => {
    const decoder = createTerminalOutputDecoder();
    const output = "\u001b[32m┌─┐ ✓\u001b[0m\r\n";
    const encoded = bytesToBase64ForTest(utf8Bytes(output));

    expect(decodeTerminalOutputChunk(decoder, encoded)).toBe(output);
  });

  it("streams split multibyte UTF-8 output without replacement characters", () => {
    const decoder = createTerminalOutputDecoder();
    const [firstChunk, secondChunk] = splitBytes(utf8Bytes("┌"), 1);

    const firstDecoded = decodeTerminalOutputChunk(
      decoder,
      bytesToBase64ForTest(firstChunk),
    );
    const secondDecoded = decodeTerminalOutputChunk(
      decoder,
      bytesToBase64ForTest(secondChunk),
    );

    expect(firstDecoded).toBe("");
    expect(secondDecoded).toBe("┌");
    expect(`${firstDecoded}${secondDecoded}`).not.toContain("�");
  });

  it("encodes non-ASCII terminal input as UTF-8 bytes in base64", () => {
    const input = "✓你好";
    const encoded = encodeTerminalInput(input);

    expect(utf8Text(base64ToBytes(encoded))).toBe(input);
  });

  it("round-trips arbitrary byte arrays through base64", () => {
    const bytes = new Uint8Array([0, 1, 2, 0x1b, 0x7f, 0x80, 0xff]);

    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});
