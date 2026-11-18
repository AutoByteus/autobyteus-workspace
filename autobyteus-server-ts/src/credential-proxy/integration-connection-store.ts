import fs from "node:fs";
import path from "node:path";
import { writeJsonFile } from "../persistence/file/store-utils.js";
import { createServerLogger } from "../logging/server-app-logger.js";

const logger = createServerLogger("credential-proxy.connections");

/** One integration connected on this node (its token lives in the vault, never here). */
export type IntegrationConnectionRecord = Readonly<{
  login: string | null;
  connectedAt: string | null;
}>;

type ConnectionsFile = { integrations: Record<string, unknown> };

const EMPTY_RECORD: IntegrationConnectionRecord = Object.freeze({ login: null, connectedAt: null });

/** The record's own fields; anything else in a stored entry (beta.4's `agentDefinitionIds`) is ignored. */
const asRecord = (value: unknown): IntegrationConnectionRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const login = entry.login === null || typeof entry.login === "string" ? entry.login : undefined;
  const connectedAt = entry.connectedAt === null || typeof entry.connectedAt === "string" ? entry.connectedAt : undefined;
  if (login === undefined || connectedAt === undefined) return null;
  return Object.freeze({ login, connectedAt });
};

/**
 * `<appDataDir>/integrations/connections.json`: per integration, the login its token belongs to and when it was
 * connected. Readers tolerate absence (not connected). A malformed file, or a malformed entry, reads as not connected
 * for that integration, with a warning naming the file and the reason; it is not rewritten until the next save. Only
 * `IntegrationConnectionService` writes; a write keeps only the record's own fields.
 */
export class IntegrationConnectionStore {
  private readonly filePath: string;
  private writes: Promise<void> = Promise.resolve();

  constructor(integrationsDir: string) {
    this.filePath = path.join(integrationsDir, "connections.json");
  }

  read(integrationId: string): IntegrationConnectionRecord {
    const raw = this.readFile().integrations[integrationId];
    if (raw === undefined) return EMPTY_RECORD;
    const record = asRecord(raw);
    if (!record) {
      logger.warn(`Integration '${integrationId}' in ${this.filePath} is malformed; it reads as not connected.`);
      return EMPTY_RECORD;
    }
    return record;
  }

  /** Changes one integration's record; writes run one at a time and replace the file atomically. */
  update(
    integrationId: string,
    change: (record: IntegrationConnectionRecord) => IntegrationConnectionRecord,
  ): Promise<IntegrationConnectionRecord> {
    const run = this.writes.then(async () => {
      const file = this.readFile();
      const changed = change(this.read(integrationId));
      const next = Object.freeze({ login: changed.login, connectedAt: changed.connectedAt });
      await writeJsonFile<ConnectionsFile>(this.filePath, {
        integrations: { ...this.validEntries(file), [integrationId]: next },
      });
      return next;
    });
    this.writes = run.then(() => undefined, () => undefined);
    return run;
  }

  private validEntries(file: ConnectionsFile): Record<string, IntegrationConnectionRecord> {
    return Object.fromEntries(Object.entries(file.integrations)
      .flatMap(([id, value]) => {
        const record = asRecord(value);
        return record ? [[id, record]] : [];
      }));
  }

  private readFile(): ConnectionsFile {
    let text: string;
    try {
      text = fs.readFileSync(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { integrations: {} };
      logger.warn(`Cannot read ${this.filePath} (${(error as NodeJS.ErrnoException).code ?? "error"}); integrations read as not connected.`);
      return { integrations: {} };
    }
    try {
      const parsed = JSON.parse(text) as unknown;
      const integrations = (parsed as { integrations?: unknown })?.integrations;
      if (!integrations || typeof integrations !== "object" || Array.isArray(integrations)) {
        throw new Error("no 'integrations' object");
      }
      return { integrations: integrations as Record<string, unknown> };
    } catch (error) {
      logger.warn(`${this.filePath} is malformed (${error instanceof Error ? error.message : "parse error"}); integrations read as not connected.`);
      return { integrations: {} };
    }
  }
}
