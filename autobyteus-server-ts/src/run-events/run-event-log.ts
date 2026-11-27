import path from "node:path";
import { SealedJsonlLog } from "../utils/sealed-jsonl-log.js";
import { parseRunEventOfKind, type RunEvent, type RunEventKind } from "./run-event-types.js";

/**
 * The run event log (C-1): `<appData>/run-events/events_active.jsonl`, one envelope per line, sealed as
 * `events_NNNNNN.jsonl` at 4 MB. A line that can't be read is skipped and logged (DESIGN rule 7); a line of another or
 * unknown kind is kept and ignored by every reader.
 */
export class RunEventLog {
  private readonly log: SealedJsonlLog;

  constructor(options: Readonly<{ appDataDir: string; rotationLimitBytes?: number }>) {
    this.log = new SealedJsonlLog({ dir: path.join(options.appDataDir, "run-events"), baseName: "events",
      ...(options.rotationLimitBytes ? { rotationLimitBytes: options.rotationLimitBytes } : {}) });
  }

  append(event: RunEvent): Promise<void> {
    return this.log.append([event]);
  }

  /**
   * The events of `kind`, newest file first and oldest first within a file; reading stops at the first file whose last
   * readable line is older than `since` (that file and the older ones hold nothing newer).
   */
  async readSince<K extends RunEventKind>(kind: K, since: Date): Promise<readonly RunEvent<K>[]> {
    const names = [...await this.log.fileNames()].reverse();
    const events: RunEvent<K>[] = [];
    for (const name of names) {
      const lines = await this.log.completeLines(name);
      let newest: number | null = null;
      lines.forEach((line, index) => {
        let raw: unknown;
        try { raw = JSON.parse(line); } catch {
          console.warn(`Run events: ${name} line ${index + 1} is skipped (not valid JSON).`);
          return;
        }
        const at = Date.parse(String((raw as { at?: unknown } | null)?.at ?? ""));
        if (Number.isFinite(at)) newest = Math.max(newest ?? at, at);
        const parsed = parseRunEventOfKind(raw, kind);
        if (typeof parsed === "string") console.warn(`Run events: ${name} line ${index + 1} is skipped (${parsed}).`);
        else if (parsed && Date.parse(parsed.at) >= since.getTime()) events.push(parsed);
      });
      if (newest !== null && newest < since.getTime()) break;
    }
    return Object.freeze(events);
  }
}
