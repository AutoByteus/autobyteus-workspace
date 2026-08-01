import type { NativeSnapshotConversionOmissions } from './native-working-context-snapshot-v5-conversion.js';

const MAX_REASON_CODES = 16;

export class NativeSnapshotOmissionTracker {
  droppedFieldCount = 0;
  droppedMessageCount = 0;
  droppedToolGroupCount = 0;
  private readonly reasons = new Set<string>();

  field(code = 'optional_field_omitted', count = 1): void {
    this.droppedFieldCount += count;
    this.add(code);
  }

  message(code: string): void {
    this.droppedMessageCount += 1;
    this.add(code);
  }

  toolGroup(code: string): void {
    this.droppedToolGroupCount += 1;
    this.add(code);
  }

  add(code: string): void {
    if (this.reasons.size < MAX_REASON_CODES) this.reasons.add(code);
  }

  get hasOmissions(): boolean {
    return Boolean(
      this.droppedFieldCount
      || this.droppedMessageCount
      || this.droppedToolGroupCount
      || this.reasons.size,
    );
  }

  snapshot(): NativeSnapshotConversionOmissions {
    return {
      droppedFieldCount: this.droppedFieldCount,
      droppedMessageCount: this.droppedMessageCount,
      droppedToolGroupCount: this.droppedToolGroupCount,
      reasonCodes: [...this.reasons],
    };
  }
}
