import fs from "node:fs";
import path from "node:path";
import { writeJsonFile } from "../persistence/file/store-utils.js";
import { createServerLogger } from "../logging/server-app-logger.js";
import type { IntegrationId } from "../secret-management/domain/secret-id.js";

const logger = createServerLogger("credential-proxy.connections");

/** One integration set up on this node (its token lives in the vault, never here). */
export type IntegrationConnectionRecord = Readonly<{
  login: string | null;
  connectedAt: string | null;
  agentDefinitionIds: readonly string[];
}>;

type ConnectionsFile = { integrations: Record<string, IntegrationConnectionRecord> };

const EMPTY_RECORD: IntegrationConnectionRecord = Object.freeze({ login: null, connectedAt: null, agentDefinitionIds: [] });

const asRecord = (value: unknown): IntegrationConnectionRecord | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const login = entry.login === null || typeof entry.login === "string" ? entry.login : undefined;
  const connectedAt = entry.connectedAt === null || typeof entry.connectedAt === "string" ? entry.connectedAt : undefined;
  const ids = entry.agentDefinitionIds;
  if (login === undefined || connectedAt === undefined || !Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return null;
  }
  return Object.freeze({ login, connectedAt, agentDefinitionIds: Object.freeze([...ids]) });
};

/**
 * `<appDataDir>/integrations/connections.json`: per integration, the GitHub login, when it was connected, and the
 * agents allowed to use it. Readers tolerate absence (not connected, no agents). A malformed file, or a malformed
 * entry, reads as not connected for that integration, with a warning naming the file and the reason; it is not
 * rewritten until the user saves on the card. Only `IntegrationConnectionService` writes.
 */
export class IntegrationConnectionStore {
  private readonly filePath: string;
  private writes: Promise<void> = Promise.resolve();

  constructor(integrationsDir: string) {
    this.filePath = path.join(integrationsDir, "connections.json");
  }

  read(integrationId: IntegrationId): IntegrationConnectionRecord {
    const raw = this.readFile().integrations[integrationId];
    if (raw === undefined) return EMPTY_RECORD;
    const record = asRecord(raw);
    if (!record) {
      logger.warn(`Integration '${integrationId}' in ${this.filePath} is malformed; it reads as not connected.`);
      return EMPTY_RECORD;
    }
    return record;
  }

  /** The integrations an agent may use (ticked on the card), whether or not they are connected. */
  allowedIntegrations(agentDefinitionId: string): IntegrationId[] {
    const integrations = this.readFile().integrations;
    return (Object.keys(integrations) as IntegrationId[])
      .filter((integrationId) => asRecord(integrations[integrationId])?.agentDefinitionIds.includes(agentDefinitionId));
  }

  isAllowed(agentDefinitionId: string, integrationId: IntegrationId): boolean {
    return this.read(integrationId).agentDefinitionIds.includes(agentDefinitionId);
  }

  /** Changes one integration's record; writes run one at a time and replace the file atomically. */
  update(
    integrationId: IntegrationId,
    change: (record: IntegrationConnectionRecord) => IntegrationConnectionRecord,
  ): Promise<IntegrationConnectionRecord> {
    const run = this.writes.then(async () => {
      const file = this.readFile();
      const next = Object.freeze({ ...change(this.read(integrationId)) });
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
      return { integrations: integrations as Record<string, IntegrationConnectionRecord> };
    } catch (error) {
      logger.warn(`${this.filePath} is malformed (${error instanceof Error ? error.message : "parse error"}); integrations read as not connected.`);
      return { integrations: {} };
    }
  }
}
