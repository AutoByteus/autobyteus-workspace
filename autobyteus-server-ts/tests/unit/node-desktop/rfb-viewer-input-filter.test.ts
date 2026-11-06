import { describe, expect, it } from "vitest";
import {
  MAX_CLIENT_CUT_TEXT_BYTES,
  RfbViewerInputFilter,
  type NodeDesktopMode,
} from "../../../src/node-desktop/rfb-viewer-input-filter.js";

const VERSION = Buffer.from("RFB 003.008\n", "latin1");
const HANDSHAKE = Buffer.concat([VERSION, Buffer.from([1]), Buffer.from([0])]);
const FORWARDED_HANDSHAKE = Buffer.concat([VERSION, Buffer.from([1]), Buffer.from([1])]);

const bytes = (...values: number[]): Buffer => Buffer.from(values);
const u16 = (value: number): number[] => [(value >> 8) & 255, value & 255];
const s32 = (value: number): number[] => {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value);
  return [...buffer];
};

const message = {
  setPixelFormat: () => bytes(0, 0, 0, 0, 32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 0, 8, 16, 0, 0, 0),
  setEncodings: (...encodings: number[]) => bytes(2, 0, ...u16(encodings.length), ...encodings.flatMap(s32)),
  framebufferUpdateRequest: () => bytes(3, 1, 0, 0, 0, 0, ...u16(1920), ...u16(1080)),
  keyEvent: () => bytes(4, 1, 0, 0, 0, 0, 0, 0x61),
  pointerEvent: () => bytes(5, 1, ...u16(10), ...u16(20)),
  clientCutText: (text: string) => Buffer.concat([bytes(6, 0, 0, 0, ...s32(text.length)), Buffer.from(text, "latin1")]),
  extendedClientCutText: (payload: Buffer) => Buffer.concat([bytes(6, 0, 0, 0, ...s32(-payload.length)), payload]),
  enableContinuousUpdates: () => bytes(150, 1, 0, 0, 0, 0, ...u16(1920), ...u16(1080)),
  clientFence: (payload: Buffer) => Buffer.concat([bytes(248, 0, 0, 0, 0, 0, 0, 3, payload.length), payload]),
  xvp: () => bytes(250, 0, 1, 2),
  setDesktopSize: (screens = 1) => Buffer.concat([
    bytes(251, 0, ...u16(800), ...u16(600), screens, 0),
    Buffer.alloc(16 * screens),
  ]),
  qemuExtendedKey: () => bytes(255, 0, 0, 1, 0, 0, 0, 0x61, 0, 0, 0, 30),
};

const afterHandshake = (mode: NodeDesktopMode): RfbViewerInputFilter => {
  const filter = new RfbViewerInputFilter(mode);
  expect(filter.accept(HANDSHAKE)).toEqual({ forward: FORWARDED_HANDSHAKE });
  return filter;
};

const forwarded = (filter: RfbViewerInputFilter, chunk: Buffer): Buffer => {
  const result = filter.accept(chunk);
  if ("reject" in result) throw new Error(`unexpected reject: ${result.reject}`);
  return result.forward;
};

describe("RfbViewerInputFilter", () => {
  describe("handshake", () => {
    it("forwards RFB 3.7 and 3.8, security None, and forces ClientInit to shared", () => {
      for (const version of ["RFB 003.007\n", "RFB 003.008\n"]) {
        const filter = new RfbViewerInputFilter("view");
        const result = forwarded(filter, Buffer.concat([Buffer.from(version, "latin1"), bytes(1, 0)]));
        expect(result).toEqual(Buffer.concat([Buffer.from(version, "latin1"), bytes(1, 1)]));
      }
    });

    it("rejects another RFB version and another security type", () => {
      expect(new RfbViewerInputFilter("control").accept(Buffer.from("RFB 003.003\n", "latin1")))
        .toEqual({ reject: "unsupported RFB version" });
      expect(new RfbViewerInputFilter("control").accept(Buffer.concat([VERSION, bytes(2)])))
        .toEqual({ reject: "unsupported security type" });
    });

    it("accepts the handshake split into single bytes", () => {
      const filter = new RfbViewerInputFilter("view");
      const out = [...HANDSHAKE].map((byte) => forwarded(filter, bytes(byte)));
      expect(Buffer.concat(out)).toEqual(FORWARDED_HANDSHAKE);
    });
  });

  describe("message table", () => {
    const rows: Array<[string, () => Buffer, "forward" | "drop", "forward" | "drop"]> = [
      ["SetPixelFormat (0)", message.setPixelFormat, "forward", "forward"],
      ["SetEncodings (2)", () => message.setEncodings(7, 1, 0, -223), "forward", "forward"],
      ["FramebufferUpdateRequest (3)", message.framebufferUpdateRequest, "forward", "forward"],
      ["KeyEvent (4)", message.keyEvent, "drop", "forward"],
      ["PointerEvent (5)", message.pointerEvent, "drop", "forward"],
      ["ClientCutText (6)", () => message.clientCutText("secret"), "drop", "forward"],
      ["extended ClientCutText (6, negative length)", () => message.extendedClientCutText(bytes(1, 0, 0, 1)), "drop", "forward"],
      ["EnableContinuousUpdates (150)", message.enableContinuousUpdates, "forward", "forward"],
      ["ClientFence (248)", () => message.clientFence(bytes(9, 9)), "forward", "forward"],
      ["xvp (250)", message.xvp, "drop", "drop"],
      ["SetDesktopSize (251)", () => message.setDesktopSize(2), "drop", "drop"],
      ["QEMU extended key (255/0)", message.qemuExtendedKey, "drop", "forward"],
    ];

    for (const [name, build, view, control] of rows) {
      it(`${name}: view ${view}, control ${control}`, () => {
        for (const [mode, action] of [["view", view], ["control", control]] as const) {
          const filter = afterHandshake(mode);
          const input = build();
          expect(forwarded(filter, input)).toEqual(action === "forward" ? input : Buffer.alloc(0));
          // The filter stays framed after the message: the next request still passes.
          expect(forwarded(filter, message.framebufferUpdateRequest())).toEqual(message.framebufferUpdateRequest());
        }
      });
    }

    it("removes the ExtendedMouseButtons pseudo-encoding (-316) and fixes the count, in both modes", () => {
      for (const mode of ["view", "control"] as const) {
        const filter = afterHandshake(mode);
        expect(forwarded(filter, message.setEncodings(7, -316, 0, -223, -316)))
          .toEqual(message.setEncodings(7, 0, -223));
      }
    });

    it("rejects an unknown message type and a QEMU subtype other than 0", () => {
      expect(afterHandshake("control").accept(bytes(7, 0, 0, 0))).toEqual({ reject: "unsupported message type 7" });
      expect(afterHandshake("control").accept(bytes(255, 1, 0, 0)))
        .toEqual({ reject: "unsupported QEMU message subtype 1" });
    });

    it("rejects cut text over 1 MiB and a fence payload over 64 bytes before buffering them", () => {
      const overCap = afterHandshake("control").accept(bytes(6, 0, 0, 0, ...s32(MAX_CLIENT_CUT_TEXT_BYTES + 1)));
      expect(overCap).toEqual({ reject: "client cut text over 1 MiB" });
      const atCap = afterHandshake("control");
      const text = Buffer.alloc(MAX_CLIENT_CUT_TEXT_BYTES, 0x41);
      expect(forwarded(atCap, Buffer.concat([bytes(6, 0, 0, 0, ...s32(text.length)), text])).length)
        .toBe(8 + MAX_CLIENT_CUT_TEXT_BYTES);
      expect(afterHandshake("control").accept(bytes(248, 0, 0, 0, 0, 0, 0, 0, 65)))
        .toEqual({ reject: "client fence payload over 64 bytes" });
    });

    it("stays rejected after a rejection", () => {
      const filter = afterHandshake("control");
      filter.accept(bytes(9));
      expect(filter.accept(message.framebufferUpdateRequest())).toEqual({ reject: "unsupported message type 9" });
    });
  });

  describe("framing across chunks", () => {
    it("frames messages split at every byte and several messages in one chunk", () => {
      const stream = Buffer.concat([
        message.pointerEvent(),
        message.setEncodings(1, -316),
        message.keyEvent(),
        message.clientCutText("abc"),
        message.setDesktopSize(1),
        message.qemuExtendedKey(),
        message.framebufferUpdateRequest(),
      ]);
      const expectedControl = Buffer.concat([
        message.pointerEvent(),
        message.setEncodings(1),
        message.keyEvent(),
        message.clientCutText("abc"),
        message.qemuExtendedKey(),
        message.framebufferUpdateRequest(),
      ]);
      const expectedView = Buffer.concat([message.setEncodings(1), message.framebufferUpdateRequest()]);

      for (const [mode, expected] of [["control", expectedControl], ["view", expectedView]] as const) {
        const whole = afterHandshake(mode);
        expect(forwarded(whole, stream)).toEqual(expected);
        const split = afterHandshake(mode);
        expect(Buffer.concat([...stream].map((byte) => forwarded(split, bytes(byte))))).toEqual(expected);
      }
    });

    it("forwards no View only input byte however the input is split", () => {
      const input = Buffer.concat([message.keyEvent(), message.pointerEvent(), message.clientCutText("x"), message.qemuExtendedKey()]);
      const filter = afterHandshake("view");
      for (let offset = 0; offset < input.length; offset += 3) {
        expect(forwarded(filter, input.subarray(offset, offset + 3))).toEqual(Buffer.alloc(0));
      }
    });
  });
});
