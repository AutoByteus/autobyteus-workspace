/**
 * Ring buffer for capturing terminal output.
 *
 * Stores output lines up to a maximum byte size and discards
 * oldest lines when the limit is exceeded.
 */
export class OutputBuffer {
  private maxBytes: number;
  private buffer: string[];
  private totalBytes: number;

  constructor(maxBytes: number = 1_000_000) {
    this.maxBytes = maxBytes;
    this.buffer = [];
    this.totalBytes = 0;
  }

  append(data: Buffer | string): void {
    if (data === null || data === undefined) {
      return;
    }

    const text = typeof data === 'string' ? data : data.toString('utf8');
    if (text.length === 0) {
      return;
    }

    const lines = splitLinesKeepEnds(text);
    for (const line of lines) {
      const lineBytes = Buffer.byteLength(line, 'utf8');
      this.buffer.push(line);
      this.totalBytes += lineBytes;
    }

    while (this.totalBytes > this.maxBytes && this.buffer.length > 0) {
      const removed = this.buffer.shift() ?? '';
      this.totalBytes -= Buffer.byteLength(removed, 'utf8');
    }
  }

  getLines(n: number = 100): string {
    if (n >= this.buffer.length) {
      return this.buffer.join('');
    }
    return this.buffer.slice(-n).join('');
  }

  getAll(): string {
    return this.buffer.join('');
  }

  clear(): void {
    this.buffer = [];
    this.totalBytes = 0;
  }

  get size(): number {
    return this.totalBytes;
  }

  get lineCount(): number {
    return this.buffer.length;
  }
}

function splitLinesKeepEnds(text: string): string[] {
  const lines: string[] = [];
  let start = 0;
  let index = 0;

  while (index < text.length) {
    const ch = text[index];
    if (ch === '\n') {
      lines.push(text.slice(start, index + 1));
      index += 1;
      start = index;
      continue;
    }

    if (ch === '\r') {
      if (index + 1 < text.length && text[index + 1] === '\n') {
        lines.push(text.slice(start, index + 2));
        index += 2;
        start = index;
        continue;
      }
      lines.push(text.slice(start, index + 1));
      index += 1;
      start = index;
      continue;
    }

    index += 1;
  }

  if (start < text.length) {
    lines.push(text.slice(start));
  }

  return lines;
}
