export class StreamScanner {
  private buffer: string;
  private pos: number;

  constructor(initialBuffer = '') {
    this.buffer = initialBuffer;
    this.pos = 0;
  }

  append(text: string): void {
    this.buffer += text;
  }

  peek(): string | undefined {
    if (this.pos < this.buffer.length) {
      return this.buffer[this.pos];
    }
    return undefined;
  }

  advance(): void {
    if (this.hasMoreChars()) {
      this.pos += 1;
    }
  }

  advanceBy(count: number): void {
    this.pos = Math.min(this.buffer.length, this.pos + count);
  }

  hasMoreChars(): boolean {
    return this.pos < this.buffer.length;
  }

  substring(start: number, end?: number): string {
    if (end === undefined) {
      return this.buffer.substring(start);
    }
    return this.buffer.substring(start, end);
  }

  find(sub: string, start?: number): number {
    const searchStart = start === undefined ? this.pos : start;
    return this.buffer.indexOf(sub, searchStart);
  }

  consume(count: number): string {
    if (count <= 0) {
      return '';
    }
    const end = Math.min(this.buffer.length, this.pos + count);
    const result = this.buffer.slice(this.pos, end);
    this.pos = end;
    return result;
  }

  consumeRemaining(): string {
    if (this.pos >= this.buffer.length) {
      return '';
    }
    const result = this.buffer.slice(this.pos);
    this.pos = this.buffer.length;
    return result;
  }

  getPosition(): number {
    return this.pos;
  }

  getBufferLength(): number {
    return this.buffer.length;
  }

  setPosition(position: number): void {
    const clamped = Math.max(0, Math.min(this.buffer.length, position));
    this.pos = clamped;
  }

  compact(minPrefix = 65536): void {
    if (this.pos === 0) {
      return;
    }
    if (this.pos >= this.buffer.length) {
      this.buffer = '';
      this.pos = 0;
      return;
    }
    if (this.pos >= minPrefix) {
      this.buffer = this.buffer.slice(this.pos);
      this.pos = 0;
    }
  }
}
