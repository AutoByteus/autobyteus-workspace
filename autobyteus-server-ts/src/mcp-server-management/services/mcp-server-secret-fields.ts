import { randomUUID } from "node:crypto";
import { SecretValue } from "autobyteus-ts/secrets/secret-value.js";
import { secretId, type SecretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import { SecretVaultError } from "autobyteus-ts/secrets/vault/secret-vault-types.js";
import {
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  isMcpSecretReference,
  type BaseMcpConfig,
  type McpConfigValue,
  type McpSecretField,
  type McpSecretReference,
} from "autobyteus-ts/tools/mcp/types.js";
import { getSecretVaultRuntime } from "../../secret-management/secret-vault-runtime.js";
import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import type { DraftEntry, DraftValue, McpServerDraft } from "../domain/mcp-server-draft.js";
import { fieldValueOf, fieldValuesOf } from "../domain/mcp-config-fields.js";
import type { McpSecretMoveCandidate, McpSecretState } from "../domain/mcp-server-view.js";
import { McpSecretSuggestionRule } from "./mcp-secret-suggestion-rule.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

/** The config a draft stores, the vault entries saved for it, and the saved entries it no longer references. */
export type StoredMcpServerDraft = Readonly<{
  config: BaseMcpConfig;
  created: SecretId[];
  obsolete: SecretId[];
}>;

type ValueFor = (field: McpSecretField, value: DraftValue) => Promise<McpConfigValue>;

const referencesOf = (config: BaseMcpConfig): SecretId[] =>
  fieldValuesOf(config).flatMap(({ value }) => (isMcpSecretReference(value) ? [value.vaultSecretId] : []));

/**
 * The only MCP code that writes MCP secrets to the vault or reads their status (consumer kind `mcpServer`).
 *
 * - `store`: a draft becomes the config to save; new secret values are saved under new `mcp.<uuid>` IDs.
 * - `toPreviewConfig`: a draft becomes a memory-only config; nothing is stored.
 * - `statesOf`: the secret state of every value; a vault that is not READY gives `VAULT_UNAVAILABLE`.
 * - `moveCandidates` / `storePlainAsSecret`: the plain values offered for the move, and saving one of them.
 * - `remove`: removes entries no file references any more.
 *
 * Errors name the server and field only, never a value.
 */
export class McpServerSecretFields {
  constructor(
    private readonly management: () => SecretManagementService = () => getSecretVaultRuntime().requireService(),
  ) {}

  /**
   * The config to save for `draft`, given the `saved` config (if any). `newSecret` values are saved in the vault
   * first; if anything fails, the entries saved here are removed again. `obsolete` lists the saved entries the new
   * config no longer references (replaced, unlocked or removed fields); the caller removes them after the file write.
   */
  async store(draft: McpServerDraft, saved: BaseMcpConfig | null): Promise<StoredMcpServerDraft> {
    const created: SecretId[] = [];
    try {
      const config = await this.buildConfig(draft, async (field, value) => {
        if (value.kind !== "newSecret") return this.storedOrPlain(draft.serverId, field, value, saved);
        const reference = await this.save(value.value);
        created.push(reference.vaultSecretId);
        return reference;
      });
      const kept = new Set(referencesOf(config));
      const obsolete = saved ? referencesOf(saved).filter((id) => !kept.has(id)) : [];
      return { config, created, obsolete };
    } catch (error) {
      await this.remove(created);
      throw error;
    }
  }

  /**
   * A memory-only config for previewing `draft`: new and plain values as strings, kept values as saved (a kept
   * secret stays a reference and is resolved at connect). Nothing is stored.
   */
  async toPreviewConfig(draft: McpServerDraft, saved: BaseMcpConfig | null): Promise<BaseMcpConfig> {
    return this.buildConfig(draft, async (field, value) =>
      value.kind === "newSecret"
        ? value.value.revealToTrustedConsumer()
        : this.storedOrPlain(draft.serverId, field, value, saved));
  }

  /** The secret state of every value of every config, by server ID. Never throws for vault state. */
  async statesOf(configs: readonly BaseMcpConfig[]): Promise<Map<string, Map<McpSecretField, McpSecretState>>> {
    const states = new Map<string, Map<McpSecretField, McpSecretState>>();
    for (const config of configs) {
      const serverStates = new Map<McpSecretField, McpSecretState>();
      for (const { field, value } of fieldValuesOf(config)) {
        serverStates.set(field, typeof value === "string" ? "PLAIN" : await this.referenceState(value));
      }
      states.set(config.server_id, serverStates);
    }
    return states;
  }

  /** Plain, non-blank values that are always secret or that the suggestion rule matches. */
  moveCandidates(configs: readonly BaseMcpConfig[]): McpSecretMoveCandidate[] {
    return configs.flatMap((config) =>
      fieldValuesOf(config).flatMap(({ field, value }) => {
        if (typeof value !== "string" || !value.trim()) return [];
        const matchedBy = McpSecretSuggestionRule.match(field, value);
        return matchedBy ? [{ serverId: config.server_id, field, matchedBy }] : [];
      }));
  }

  /** Saves the plain value of `field` as a new MCP secret; `null` when the field is gone, blank or already a reference. */
  async storePlainAsSecret(config: BaseMcpConfig, field: McpSecretField): Promise<McpSecretReference | null> {
    const value = fieldValueOf(config, field);
    if (typeof value !== "string" || !value.trim()) return null;
    return this.save(SecretValue.fromString(value));
  }

  /** Every vault entry `config` references. */
  referencesOf(config: BaseMcpConfig): SecretId[] {
    return referencesOf(config);
  }

  /**
   * Removes vault entries, one by one. A failure is logged (ID and error code only) and the rest are still removed;
   * an entry left behind is an orphan, which is harmless.
   */
  async remove(ids: readonly SecretId[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.management().removeForConsumer({ kind: "mcpServer", vaultSecretId: id });
      } catch (error) {
        const reason = error instanceof SecretVaultError ? error.code : error instanceof Error ? error.name : "error";
        logger.warn(`Could not remove MCP secret ${id} from the vault (${reason}); it is left as an orphan entry.`);
      }
    }
  }

  private async save(value: SecretValue): Promise<McpSecretReference> {
    const id = secretId(`mcp.${randomUUID()}`);
    await this.management().saveForConsumer({ consumer: { kind: "mcpServer", vaultSecretId: id }, value });
    return { vaultSecretId: id };
  }

  private async referenceState(reference: McpSecretReference): Promise<McpSecretState> {
    try {
      return await this.management().getStatusForConsumer({ kind: "mcpServer", vaultSecretId: reference.vaultSecretId });
    } catch (error) {
      if (!(error instanceof SecretVaultError)) throw error;
      // The catalog refuses an ID that is not `mcp.<uuid>`: no entry can exist for it.
      return error.code === "ACCESS_DENIED" ? "MISSING" : "VAULT_UNAVAILABLE";
    }
  }

  /** A `plain` or `keep` value. A kept value must exist; an always-secret field cannot be newly stored plain. */
  private storedOrPlain(
    serverId: string,
    field: McpSecretField,
    value: Exclude<DraftValue, { kind: "newSecret" }>,
    saved: BaseMcpConfig | null,
  ): McpConfigValue {
    if (value.kind === "plain") {
      if (McpSecretSuggestionRule.isAlwaysSecret(field)) {
        throw new Error(`MCP server '${serverId}' ${field} is always secret; it cannot be stored as plain text.`);
      }
      return value.value;
    }
    const stored = saved ? fieldValueOf(saved, field) : undefined;
    if (stored === undefined) {
      throw new Error(`MCP server '${serverId}' has no stored value for ${field} to keep.`);
    }
    return stored;
  }

  /** The one draft → core config mapping, with `valueFor` deciding what each value becomes. */
  private async buildConfig(draft: McpServerDraft, valueFor: ValueFor): Promise<BaseMcpConfig> {
    const common = { server_id: draft.serverId, enabled: draft.enabled, tool_name_prefix: draft.toolNamePrefix };
    if (draft.transportType === McpTransportType.STDIO) {
      return new StdioMcpServerConfig({
        ...common,
        command: draft.command,
        args: draft.args,
        cwd: draft.cwd,
        env: await this.valuesOf(draft.serverId, draft.env, "env", valueFor),
      });
    }
    return new StreamableHttpMcpServerConfig({
      ...common,
      url: draft.url,
      headers: await this.valuesOf(draft.serverId, draft.headers, "header", valueFor),
      token: draft.token === null ? null : await valueFor("token", draft.token),
    });
  }

  private async valuesOf(
    serverId: string,
    entries: readonly DraftEntry[],
    kind: "env" | "header",
    valueFor: ValueFor,
  ): Promise<Record<string, McpConfigValue>> {
    const values: Record<string, McpConfigValue> = {};
    for (const { name, value } of entries) {
      const field: McpSecretField = `${kind}:${name}`;
      if (Object.prototype.hasOwnProperty.call(values, name)) {
        throw new Error(`MCP server '${serverId}' lists ${field} more than once.`);
      }
      values[name] = await valueFor(field, value);
    }
    return values;
  }
}
