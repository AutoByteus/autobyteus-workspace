import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { BUILT_IN_AGENT_DEFINITIONS } from "../../built-in-agents/built-in-agent-registry.js";
import { CatalogAddressMap } from "../../agent-collaboration/collaborators/catalog-address-map.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { PublishedAgent, PublishedAgentLaunchSettings } from "../domain/published-agent.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import type { PublishedAgentStore } from "./published-agent-store.js";
import type { PublishedLaunchCheck } from "./published-launch-check.js";

/** A published Agent with what the owner and peers see of it: its definition's name and its published address. */
export type PublishedAgentView = Readonly<{
  agent: PublishedAgent;
  /** `null` when the definition is gone or no longer shared; such an entry starts nothing. */
  definitionName: string | null;
  address: AgentTeamAddress | null;
}>;

const BUILT_IN_IDS: ReadonlySet<string> = new Set(BUILT_IN_AGENT_DEFINITIONS.map((entry) => entry.id));
const isPublishable = (definition: AgentDefinition | null): definition is AgentDefinition & { id: string } =>
  Boolean(definition?.id) && definition!.ownershipScope === "shared" && !BUILT_IN_IDS.has(definition!.id!);

/**
 * What this node offers its peers (DEC-102, REQ-103): publish, update and unpublish shared Agent definitions
 * with the launch settings their remote runs start with here. Nothing is published by default; unpublishing
 * refuses new delegations and leaves started runs alone. A published Agent's address is derived from the
 * published set with the catalog's address rules, so a renamed definition never leaves a stale address. The
 * only reader and writer of `published-agents.json`; changes are serialized.
 */
export class PublishedAgentService {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dependencies: Readonly<{
    store: PublishedAgentStore;
    definitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    launchCheck: PublishedLaunchCheck;
    now?(): Date;
  }>) {}

  async list(): Promise<readonly PublishedAgentView[]> {
    const agents = await this.dependencies.store.read();
    const definitions = await Promise.all(agents.map((agent) =>
      this.dependencies.definitions.getAgentDefinitionById(agent.agentDefinitionId).catch(() => null)));
    const eligible = agents.flatMap((agent, index) => {
      const definition = definitions[index] ?? null;
      return isPublishable(definition) ? [{ kind: "agent" as const, definitionId: agent.agentDefinitionId, name: definition.name }] : [];
    });
    const addresses = new CatalogAddressMap({ eligible, inRunAddresses: new Map(), addressesInUse: [] });
    return Object.freeze(agents.map((agent, index) => {
      const definition = definitions[index] ?? null;
      return Object.freeze({
        agent,
        definitionName: isPublishable(definition) ? definition.name : null,
        address: isPublishable(definition) ? addresses.addressFor({ kind: "agent", definitionId: agent.agentDefinitionId }) : null,
      });
    }));
  }

  /** The published Agent at a published address; `null` when none is published there. */
  async findByAddress(address: string): Promise<PublishedAgentView | null> {
    return (await this.list()).find((view) => view.address === address) ?? null;
  }

  publish(agentDefinitionId: string, launch: PublishedAgentLaunchSettings): Promise<PublishedAgent> {
    return this.serialized(async () => {
      const id = await this.requirePublishableDefinition(agentDefinitionId);
      const agents = await this.dependencies.store.read();
      if (agents.some((agent) => agent.agentDefinitionId === id)) {
        throw new RemoteCollaborationSettingsError("AGENT_ALREADY_PUBLISHED", "This Agent is already published.");
      }
      const published = await this.checked(id, launch, (this.dependencies.now?.() ?? new Date()).toISOString());
      await this.dependencies.store.write([...agents, published]);
      return published;
    });
  }

  update(agentDefinitionId: string, launch: PublishedAgentLaunchSettings): Promise<PublishedAgent> {
    return this.serialized(async () => {
      const agents = await this.dependencies.store.read();
      const existing = this.requirePublished(agents, agentDefinitionId);
      const updated = await this.checked(existing.agentDefinitionId, launch, existing.publishedAt);
      await this.dependencies.store.write(agents.map((agent) => agent.agentDefinitionId === existing.agentDefinitionId ? updated : agent));
      return updated;
    });
  }

  unpublish(agentDefinitionId: string): Promise<void> {
    return this.serialized(async () => {
      const agents = await this.dependencies.store.read();
      const existing = this.requirePublished(agents, agentDefinitionId);
      await this.dependencies.store.write(agents.filter((agent) => agent !== existing));
    });
  }

  private async checked(agentDefinitionId: string, launch: PublishedAgentLaunchSettings, publishedAt: string): Promise<PublishedAgent> {
    const candidate: PublishedAgent = Object.freeze({
      agentDefinitionId,
      runtimeKind: launch.runtimeKind,
      llmModelIdentifier: String(launch.llmModelIdentifier ?? "").trim(),
      llmConfig: launch.llmConfig === null ? null : structuredClone(launch.llmConfig),
      workspaceRootPath: String(launch.workspaceRootPath ?? "").trim(),
      autoExecuteTools: launch.autoExecuteTools === true,
      publishedAt,
    });
    const reason = await this.dependencies.launchCheck.reasonItCannotRun(candidate);
    if (reason) throw new RemoteCollaborationSettingsError("LAUNCH_SETTINGS_INVALID", reason);
    return candidate;
  }

  private async requirePublishableDefinition(agentDefinitionId: string): Promise<string> {
    const id = String(agentDefinitionId ?? "").trim();
    const definition = id ? await this.dependencies.definitions.getAgentDefinitionById(id).catch(() => null) : null;
    if (!isPublishable(definition)) {
      throw new RemoteCollaborationSettingsError("AGENT_NOT_FOUND", `'${id}' is not a shared Agent definition on this node.`);
    }
    return definition.id;
  }

  private requirePublished(agents: readonly PublishedAgent[], agentDefinitionId: string): PublishedAgent {
    const existing = agents.find((agent) => agent.agentDefinitionId === agentDefinitionId.trim());
    if (!existing) throw new RemoteCollaborationSettingsError("AGENT_NOT_PUBLISHED", "This Agent is not published.");
    return existing;
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(operation, operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
}
