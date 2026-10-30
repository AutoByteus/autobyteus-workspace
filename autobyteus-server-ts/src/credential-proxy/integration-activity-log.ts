import path from "node:path";
import { appendJsonlFile } from "../persistence/file/store-utils.js";
import { createServerLogger } from "../logging/server-app-logger.js";

const logger = createServerLogger("credential-proxy.activity");

/**
 * The record of one proxied call (or refusal). It never holds the token, a header, a body, the query string or the
 * run pass.
 */
export type IntegrationActivityRecord = Readonly<{
  at: string;
  runId: string | null;
  agentDefinitionId: string | null;
  integrationId: string;
  route: string;
  method: string;
  /** The upstream path, without its query string. */
  path: string;
  status: number;
  error?: string;
  durationMs: number;
}>;

/** `<appDataDir>/integrations/activity.jsonl`: one line per call. */
export class IntegrationActivityLog {
  private readonly filePath: string;

  constructor(integrationsDir: string) {
    this.filePath = path.join(integrationsDir, "activity.jsonl");
  }

  /** Appends one record; a failed write is logged (with the code only) and never fails the call. */
  async append(record: IntegrationActivityRecord): Promise<void> {
    try {
      await appendJsonlFile(this.filePath, record);
    } catch (error) {
      logger.warn(`Integration activity record not written (${(error as NodeJS.ErrnoException).code ?? "error"}).`);
    }
  }
}
