import path from "node:path";
import { appendJsonlFile } from "../../persistence/file/store-utils.js";
import { createServerLogger } from "../../logging/server-app-logger.js";

const logger = createServerLogger("credential-proxy.provider-relay-activity");

/**
 * C5: one relayed call (or refusal) as the relay node records it. Never a header value, a body, a key, a token or a
 * pass; the path has no query.
 */
export type ProviderRelayActivityRecord = Readonly<{
  at: string;
  peerNodeId: string;
  relayId: string;
  relayCredentialKind: string;
  method: string;
  path: string;
  durationMs: number;
}> & (Readonly<{ status: number }> | Readonly<{ error: string }>);

/** `<appDataDir>/provider-relays/activity.jsonl`: one line per relayed call. */
export class ProviderRelayActivityLog {
  private readonly filePath: string;

  constructor(appDataDir: string) {
    this.filePath = path.join(appDataDir, "provider-relays", "activity.jsonl");
  }

  /** Appends one record; a failed write is logged (with the code only) and never fails the call. */
  async append(record: ProviderRelayActivityRecord): Promise<void> {
    try {
      await appendJsonlFile(this.filePath, record);
    } catch (error) {
      logger.warn(`Provider relay activity record not written (${(error as NodeJS.ErrnoException).code ?? "error"}).`);
    }
  }
}
