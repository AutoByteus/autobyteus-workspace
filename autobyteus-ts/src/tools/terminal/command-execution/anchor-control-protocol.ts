import { MAX_CONTROL_FRAME_BODY_BYTES } from './command-wrapper.js';

export type AnchorFrame =
  | { kind: 'READY' | 'STARTED'; pid: number }
  | { kind: 'RESULT'; code: number | null; signal: string | null }
  | { kind: 'SPAWN_FAILED'; message: string };
/** Frames of the command wrapper (`command-wrapper.ts`), for host and WSL commands alike. */
export type WrapperFrame =
  | { kind: 'END' }
  | { kind: 'FOREGROUND_DONE'; exitCode: number; jobPids: number[] }
  | { kind: 'JOB_ENDED'; pid: number; status: number };
export type ControlFrame = AnchorFrame | WrapperFrame;
export function parseAnchorFrame(value: unknown): AnchorFrame | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if ((v.kind === 'READY' || v.kind === 'STARTED') && Number.isSafeInteger(v.pid) && Number(v.pid) > 0)
    return { kind: v.kind, pid: Number(v.pid) };
  if (v.kind === 'RESULT' && (v.code === null || Number.isInteger(v.code)) &&
      (v.signal === null || typeof v.signal === 'string'))
    return { kind: 'RESULT', code: v.code as number | null, signal: v.signal as string | null };
  if (v.kind === 'SPAWN_FAILED' && typeof v.message === 'string')
    return { kind: 'SPAWN_FAILED', message: v.message.slice(0, 512) };
  return null;
}
const pidOf = (text: string): number | null => {
  const pid = Number(text);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : null;
};
const statusOf = (text: string): number | null => {
  const status = Number(text);
  return status <= 255 ? status : null;
};
/** Frame bodies are the kind, digits and spaces: anything else is user output. */
export function parseControlFrameBody(body: string): ControlFrame | null {
  let m = /^(READY|STARTED|RESULT):(\d+)$/.exec(body);
  if (m) return parseAnchorFrame(m[1] === 'RESULT'
    ? { kind: 'RESULT', code: Number(m[2]), signal: null } : { kind: m[1], pid: Number(m[2]) });
  if (body === 'END') return { kind: 'END' };
  m = /^FOREGROUND_DONE:(\d{1,3}):([\d ]*)$/.exec(body);
  if (m) {
    const exitCode = statusOf(m[1]);
    const jobPids = m[2].split(' ').filter(Boolean).map(pidOf);
    if (exitCode === null || jobPids.some(pid => pid === null)) return null;
    return { kind: 'FOREGROUND_DONE', exitCode, jobPids: jobPids as number[] };
  }
  m = /^JOB_ENDED:(\d+):(\d{1,3})$/.exec(body);
  if (m) {
    const pid = pidOf(m[1]), status = statusOf(m[2]);
    return pid === null || status === null ? null : { kind: 'JOB_ENDED', pid, status };
  }
  return null;
}
/** Strip only complete valid nonce frames; all other bytes remain user output. */
export class AnchorControlDecoder {
  private pending = Buffer.alloc(0);
  private readonly prefix: Buffer;
  /**
   * `frame` receives each frame with the user bytes that preceded it in this push (and are not returned),
   * so a caller can cut its stream exactly at a frame.
   */
  constructor(nonce: string, private readonly frame: (frame: ControlFrame, before: Buffer) => void) {
    this.prefix = Buffer.from(`\x1e${nonce}:`);
  }
  push(chunk: Buffer): Buffer {
    this.pending = Buffer.concat([this.pending, chunk]);
    const output: Buffer[] = [];
    while (this.pending.length) {
      const index = this.pending.indexOf(this.prefix);
      if (index < 0) {
        let keep = Math.min(this.pending.length, this.prefix.length - 1);
        while (keep && !this.pending.subarray(-keep).equals(this.prefix.subarray(0, keep))) keep--;
        output.push(this.pending.subarray(0, this.pending.length - keep));
        this.pending = this.pending.subarray(this.pending.length - keep);
        break;
      }
      output.push(this.pending.subarray(0, index));
      this.pending = this.pending.subarray(index);
      const end = this.pending.indexOf(31, this.prefix.length);
      if (end < 0 && this.pending.length <= this.prefix.length + MAX_CONTROL_FRAME_BODY_BYTES) break;
      const value = end >= 0 ? parseControlFrameBody(this.pending.subarray(this.prefix.length, end).toString('ascii')) : null;
      if (value) {
        this.pending = this.pending.subarray(end + 1);
        const before = Buffer.concat(output);
        output.length = 0;
        this.frame(value, before);
      } else {
        output.push(this.pending.subarray(0, 1));
        this.pending = this.pending.subarray(1);
      }
    }
    return Buffer.concat(output);
  }
  flush(): Buffer { const bytes = this.pending; this.pending = Buffer.alloc(0); return bytes; }
}
