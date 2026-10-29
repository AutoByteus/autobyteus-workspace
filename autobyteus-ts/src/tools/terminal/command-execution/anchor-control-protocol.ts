export type AnchorFrame =
  | { kind: 'READY' | 'STARTED'; pid: number }
  | { kind: 'RESULT'; code: number | null; signal: string | null }
  | { kind: 'SPAWN_FAILED'; message: string };
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
/** Strip only complete valid nonce frames; all other bytes remain user stderr. */
export class AnchorControlDecoder {
  private pending = Buffer.alloc(0);
  private readonly prefix: Buffer;
  constructor(nonce: string, private readonly frame: (frame: AnchorFrame) => void) {
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
      if (end < 0 && this.pending.length <= 128) break;
      const body = end >= 0 ? this.pending.subarray(this.prefix.length, end).toString('ascii') : '';
      const match = /^(READY|STARTED|RESULT):(\d+)$/.exec(body);
      const value = match && parseAnchorFrame(match[1] === 'RESULT'
        ? { kind: 'RESULT', code: Number(match[2]), signal: null }
        : { kind: match[1], pid: Number(match[2]) });
      if (value) {
        this.frame(value);
        this.pending = this.pending.subarray(end + 1);
      } else {
        output.push(this.pending.subarray(0, 1));
        this.pending = this.pending.subarray(1);
      }
    }
    return Buffer.concat(output);
  }
  flush(): Buffer { const bytes = this.pending; this.pending = Buffer.alloc(0); return bytes; }
}
