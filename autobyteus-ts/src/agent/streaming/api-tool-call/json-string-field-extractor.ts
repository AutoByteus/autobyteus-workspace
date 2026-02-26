export class FieldExtractionResult {
  deltas: Record<string, string>;
  completed: Record<string, string>;

  constructor(deltas: Record<string, string> = {}, completed: Record<string, string> = {}) {
    this.deltas = deltas;
    this.completed = completed;
  }
}

export class JsonStringFieldExtractor {
  private streamFields: Set<string>;
  private finalFields: Set<string>;
  private targets: Set<string>;
  private mode = 'scan';
  private escape = false;
  private unicodeEscape: string | null = null;
  private currentKey: string | null = null;
  private currentValueKey: string | null = null;
  private stringBuffer = '';
  private values: Record<string, string> = {};
  private pendingDelta: Record<string, string> = {};

  constructor(streamFields: Iterable<string>, finalFields?: Iterable<string>) {
    this.streamFields = new Set(streamFields);
    this.finalFields = finalFields ? new Set(finalFields) : new Set(this.streamFields);
    this.targets = new Set([...this.streamFields, ...this.finalFields]);
  }

  feed(chunk: string): FieldExtractionResult {
    if (!chunk) {
      return new FieldExtractionResult();
    }

    this.pendingDelta = {};
    const completed: Record<string, string> = {};

    for (const char of chunk) {
      this.step(char, completed);
    }

    return new FieldExtractionResult({ ...this.pendingDelta }, completed);
  }

  private step(char: string, completed: Record<string, string>): void {
    if (this.mode === 'scan') {
      if (char === '"') {
        this.stringBuffer = '';
        this.mode = 'key';
      }
      return;
    }

    if (this.mode === 'key') {
      if (this.escape) {
        this.stringBuffer += this.decodeEscape(char);
        return;
      }
      if (char === '\\') {
        this.escape = true;
        return;
      }
      if (char === '"') {
        this.currentKey = this.stringBuffer;
        this.stringBuffer = '';
        this.mode = 'post_key';
        return;
      }
      this.stringBuffer += char;
      return;
    }

    if (this.mode === 'post_key') {
      if (char.trim() === '') {
        return;
      }
      if (char === ':') {
        this.mode = 'post_colon';
        return;
      }
      this.resetStringState();
      this.mode = 'scan';
      return;
    }

    if (this.mode === 'post_colon') {
      if (char.trim() === '') {
        return;
      }
      if (char === '"') {
        this.mode = 'value';
        this.currentValueKey = this.currentKey;
        this.stringBuffer = '';
        return;
      }
      this.currentKey = null;
      this.mode = 'scan';
      return;
    }

    if (this.mode === 'value') {
      if (this.escape) {
        const decoded = this.decodeEscape(char);
        this.appendValue(decoded, completed);
        return;
      }
      if (char === '\\') {
        this.escape = true;
        return;
      }
      if (char === '"') {
        this.finalizeValue(completed);
        this.mode = 'scan';
        return;
      }
      this.appendValue(char, completed);
    }
  }

  private appendValue(decodedChar: string, _completed: Record<string, string>): void {
    const key = this.currentValueKey;
    if (!key) {
      return;
    }
    if (this.targets.has(key)) {
      if (this.streamFields.has(key)) {
        this.pendingDelta[key] = (this.pendingDelta[key] ?? '') + decodedChar;
      }
      this.values[key] = (this.values[key] ?? '') + decodedChar;
    }
  }

  private finalizeValue(completed: Record<string, string>): void {
    const key = this.currentValueKey;
    if (key && this.finalFields.has(key) && key in this.values) {
      completed[key] = this.values[key];
    }
    this.currentKey = null;
    this.currentValueKey = null;
    this.stringBuffer = '';
    this.escape = false;
    this.unicodeEscape = null;
  }

  private resetStringState(): void {
    this.currentKey = null;
    this.currentValueKey = null;
    this.stringBuffer = '';
    this.escape = false;
    this.unicodeEscape = null;
  }

  private decodeEscape(char: string): string {
    if (this.unicodeEscape !== null) {
      this.unicodeEscape += char;
      if (this.unicodeEscape.length === 4) {
        let decoded = '';
        try {
          decoded = String.fromCharCode(parseInt(this.unicodeEscape, 16));
        } catch {
          decoded = '';
        }
        this.unicodeEscape = null;
        this.escape = false;
        return decoded;
      }
      return '';
    }

    this.escape = false;

    if (char === 'n') {
      return '\n';
    }
    if (char === 't') {
      return '\t';
    }
    if (char === 'r') {
      return '\r';
    }
    if (char === '\\') {
      return '\\';
    }
    if (char === '"') {
      return '"';
    }
    if (char === 'u') {
      this.unicodeEscape = '';
      return '';
    }
    return char;
  }
}
