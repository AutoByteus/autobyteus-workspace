/**
 * The View only and no-resize boundary of one node-desktop viewer: it frames the RFB 3.7/3.8
 * client→server byte stream and decides, per message and per mode, what reaches Xvnc.
 * Pure: no I/O, no logging. Unknown or malformed input fails closed (`reject`).
 *
 * | Type | Message                    | Length                    | view    | control |
 * | 0    | SetPixelFormat             | 20                        | forward | forward |
 * | 2    | SetEncodings               | 4 + 4·n (n = u16 at 2)    | forward without −316 (both modes) |
 * | 3    | FramebufferUpdateRequest   | 10                        | forward | forward |
 * | 4    | KeyEvent                   | 8                         | drop    | forward |
 * | 5    | PointerEvent               | 6                         | drop    | forward |
 * | 6    | ClientCutText              | 8 + abs(s32 at 4) ≤ 1 MiB | drop    | forward |
 * | 150  | EnableContinuousUpdates    | 10                        | forward | forward |
 * | 248  | ClientFence                | 9 + u8 at 8 (≤ 64)        | forward | forward |
 * | 250  | xvp (shutdown/reboot)      | 4                         | drop    | drop    |
 * | 251  | SetDesktopSize             | 8 + 16·n (n = u8 at 6)    | drop    | drop    |
 * | 255  | QEMU extended key (sub 0)  | 12                        | drop    | forward |
 *
 * The ExtendedMouseButtons pseudo-encoding (−316) is removed from SetEncodings so that Xvnc never
 * enables the 7-byte pointer event: every PointerEvent keeps its 6-byte form.
 */
export type NodeDesktopMode = "view" | "control";

export const isNodeDesktopMode = (value: string): value is NodeDesktopMode =>
  value === "view" || value === "control";

export type RfbViewerInputResult = Readonly<{ forward: Buffer }> | Readonly<{ reject: string }>;

export const MAX_CLIENT_CUT_TEXT_BYTES = 1024 * 1024;
const MAX_CLIENT_FENCE_PAYLOAD_BYTES = 64;
const EXTENDED_MOUSE_BUTTONS_PSEUDO_ENCODING = -316;
const SUPPORTED_VERSIONS = new Set(["RFB 003.007\n", "RFB 003.008\n"]);
const SECURITY_TYPE_NONE = 1;
const SHARED_CLIENT_INIT = Buffer.from([1]);
const EMPTY = Buffer.alloc(0);

type Action = "forward" | "drop" | "forward-without-extended-mouse-buttons";

type MessageRule = Readonly<{
  /** Bytes needed before the message length is known. */
  header: number;
  /** The whole message length, or why the message is refused. */
  length: (header: Buffer) => number | string;
  view: Action;
  control: Action;
}>;

const fixed = (length: number, view: Action, control: Action): MessageRule => ({
  header: 1,
  length: () => length,
  view,
  control,
});

const MESSAGE_RULES: ReadonlyMap<number, MessageRule> = new Map<number, MessageRule>([
  [0, fixed(20, "forward", "forward")],
  [2, {
    header: 4,
    length: (header) => 4 + 4 * header.readUInt16BE(2),
    view: "forward-without-extended-mouse-buttons",
    control: "forward-without-extended-mouse-buttons",
  }],
  [3, fixed(10, "forward", "forward")],
  [4, fixed(8, "drop", "forward")],
  [5, fixed(6, "drop", "forward")],
  [6, {
    header: 8,
    length: (header) => {
      const textLength = Math.abs(header.readInt32BE(4));
      return textLength > MAX_CLIENT_CUT_TEXT_BYTES ? "client cut text over 1 MiB" : 8 + textLength;
    },
    view: "drop",
    control: "forward",
  }],
  [150, fixed(10, "forward", "forward")],
  [248, {
    header: 9,
    length: (header) => {
      const payloadLength = header[8]!;
      return payloadLength > MAX_CLIENT_FENCE_PAYLOAD_BYTES ? "client fence payload over 64 bytes" : 9 + payloadLength;
    },
    view: "forward",
    control: "forward",
  }],
  [250, fixed(4, "drop", "drop")],
  [251, { header: 8, length: (header) => 8 + 16 * header[6]!, view: "drop", control: "drop" }],
  [255, {
    header: 2,
    length: (header) => (header[1] === 0 ? 12 : `unsupported QEMU message subtype ${header[1]}`),
    view: "drop",
    control: "forward",
  }],
]);

type Stage = "version" | "security" | "client-init" | "messages" | "rejected";

/** One framing step: `null` while more bytes are needed. */
type Step = { forward: Buffer | null } | { reject: string } | null;

const withoutExtendedMouseButtons = (message: Buffer): Buffer => {
  const count = message.readUInt16BE(2);
  const kept: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const encoding = message.readInt32BE(4 + 4 * index);
    if (encoding !== EXTENDED_MOUSE_BUTTONS_PSEUDO_ENCODING) kept.push(encoding);
  }
  if (kept.length === count) return message;
  const filtered = Buffer.alloc(4 + 4 * kept.length);
  filtered[0] = 2;
  filtered.writeUInt16BE(kept.length, 2);
  kept.forEach((encoding, index) => filtered.writeInt32BE(encoding, 4 + 4 * index));
  return filtered;
};

export class RfbViewerInputFilter {
  private stage: Stage = "version";
  private pending: Buffer = EMPTY;
  private rejection = "";

  constructor(private readonly mode: NodeDesktopMode) {}

  /** Takes the next viewer bytes; returns what may go to Xvnc now, or why the stream must end. */
  accept(chunk: Buffer): RfbViewerInputResult {
    if (this.stage === "rejected") return { reject: this.rejection };
    this.pending = this.pending.length === 0 ? chunk : Buffer.concat([this.pending, chunk]);
    const forwarded: Buffer[] = [];
    for (let step = this.next(); step !== null; step = this.next()) {
      if ("reject" in step) {
        this.stage = "rejected";
        this.rejection = step.reject;
        this.pending = EMPTY;
        return step;
      }
      if (step.forward) forwarded.push(step.forward);
    }
    return { forward: forwarded.length === 1 ? forwarded[0]! : Buffer.concat(forwarded) };
  }

  private next(): Step {
    switch (this.stage) {
      case "version": {
        const version = this.take(12);
        if (!version) return null;
        if (!SUPPORTED_VERSIONS.has(version.toString("latin1"))) return { reject: "unsupported RFB version" };
        this.stage = "security";
        return { forward: version };
      }
      case "security": {
        const security = this.take(1);
        if (!security) return null;
        if (security[0] !== SECURITY_TYPE_NONE) return { reject: "unsupported security type" };
        this.stage = "client-init";
        return { forward: security };
      }
      case "client-init": {
        if (!this.take(1)) return null;
        this.stage = "messages";
        return { forward: SHARED_CLIENT_INIT };
      }
      case "messages":
        return this.nextMessage();
      default:
        return { reject: this.rejection };
    }
  }

  private nextMessage(): Step {
    if (this.pending.length === 0) return null;
    const type = this.pending[0]!;
    const rule = MESSAGE_RULES.get(type);
    if (!rule) return { reject: `unsupported message type ${type}` };
    if (this.pending.length < rule.header) return null;
    const length = rule.length(this.pending);
    if (typeof length === "string") return { reject: length };
    const message = this.take(length);
    if (!message) return null;
    const action = rule[this.mode];
    if (action === "drop") return { forward: null };
    if (action === "forward-without-extended-mouse-buttons") return { forward: withoutExtendedMouseButtons(message) };
    return { forward: message };
  }

  private take(length: number): Buffer | null {
    if (this.pending.length < length) return null;
    const taken = this.pending.subarray(0, length);
    this.pending = this.pending.length === length ? EMPTY : this.pending.subarray(length);
    return taken;
  }
}
