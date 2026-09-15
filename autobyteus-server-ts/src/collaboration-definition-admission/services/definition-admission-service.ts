import fs from "node:fs/promises";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import { readAgentOrgDefinitionConfig } from "../../agent-org-definition/providers/agent-org-definition-config.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import { AgentOrgDefinitionResolver } from "../../agent-org-definition/services/agent-org-definition-resolver.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import { readAgentTeamDefinitionConfig } from "../../agent-team-definition/providers/agent-team-definition-config.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { assertValidFlatTeamDefinition } from "../../agent-team-definition/services/flat-team-definition-validator.js";
import type { AvailableDefinitionAdmissionResult, DefinitionAdmissionResult, RootSubjectKind, UnavailableDefinitionAdmissionResult } from "../domain/definition-admission-result.js";
import type { RegisteredDefinitionSource } from "../providers/definition-source-registry.js";
import { DefinitionSourceRegistry } from "../providers/definition-source-registry.js";

/** Exact target-only admission and dependency availability owner for new-work surfaces. */
export class DefinitionAdmissionService {
  private static instance: DefinitionAdmissionService | null = null;
  static getInstance(): DefinitionAdmissionService {
    if (!this.instance) throw new Error("The process DefinitionAdmissionService is not initialized.");
    return this.instance;
  }
  static bindProcessInstance(instance: DefinitionAdmissionService): void {
    if (!instance || this.instance) throw new Error("The process DefinitionAdmissionService is already initialized or invalid.");
    this.instance = instance;
  }
  static releaseProcessInstance(instance: DefinitionAdmissionService): void {
    if (this.instance === instance) this.instance = null;
  }

  constructor(private readonly dependencies: Readonly<{
    registry: DefinitionSourceRegistry;
    teams: Pick<AgentTeamDefinitionService, "getFreshDefinitionById">;
    orgs: Pick<AgentOrgDefinitionService, "getDefinitionById">;
    agents: Pick<AgentDefinitionService, "getFreshAgentDefinitionById">;
  }>) {}

  async scan(): Promise<readonly DefinitionAdmissionResult[]> {
    const sources = await this.dependencies.registry.scan();
    const preliminary = new Map<string, AvailableDefinitionAdmissionResult | UnavailableDefinitionAdmissionResult>();
    const groups = new Map<string, RegisteredDefinitionSource[]>();
    for (const source of sources) {
      const sourceKey = key(source.subjectKind, source.definitionId);
      const group = groups.get(sourceKey) ?? [];
      group.push(source);
      groups.set(sourceKey, group);
    }
    for (const [sourceKey, group] of groups) {
      const source = group[0]!;
      preliminary.set(sourceKey, group.length === 1
        ? await this.decode(source)
        : this.unavailable(
            source,
            "DEFINITION_CONTRACT_INVALID",
            `Definition identity '${sourceKey}' is registered by multiple packages: ${group.map((item) => item.descriptor.definitionPath).join(", ")}.`,
          ));
    }
    const output: DefinitionAdmissionResult[] = [];
    for (const source of sources) {
      const group = groups.get(key(source.subjectKind, source.definitionId))!;
      if (group.length > 1) {
        output.push(this.unavailable(
          source,
          "DEFINITION_CONTRACT_INVALID",
          `Definition identity '${key(source.subjectKind, source.definitionId)}' is registered by multiple packages: ${group.map((item) => item.descriptor.definitionPath).join(", ")}.`,
        ));
        continue;
      }
      const result = preliminary.get(key(source.subjectKind, source.definitionId))!;
      if (result.status === "unavailable") { output.push(result); continue; }
      try {
        if (result.subjectKind === "agent_team") {
          await assertValidFlatTeamDefinition({
            rootDefinition: result.definition as AgentTeamDefinition,
            lookup: { getAgentById: (id) => this.dependencies.agents.getFreshAgentDefinitionById(id) },
          });
        } else {
          const topology = await new AgentOrgDefinitionResolver().resolve({
            definition: result.definition as AgentOrgDefinition,
            lookup: {
              getAgentById: (id) => this.dependencies.agents.getFreshAgentDefinitionById(id),
              getTeamById: async (id) => {
                const admitted = preliminary.get(key("agent_team", id));
                return admitted?.status === "available" ? admitted.definition as AgentTeamDefinition : null;
              },
            },
          });
          new CollaborationHandoffCompiler().compileOrg(topology);
        }
        output.push(result);
      } catch (error) {
        const dependentUnavailable = result.subjectKind === "agent_org"
          ? this.unavailableDependency(result.definition as AgentOrgDefinition, preliminary)
          : null;
        output.push(this.unavailable(
          source,
          dependentUnavailable ? "DEFINITION_DEPENDENCY_UNAVAILABLE" : "DEFINITION_REFERENCE_UNRESOLVED",
          message(error),
          dependentUnavailable
            ? [`agent_org:${source.definitionId}@${source.descriptor.definitionPath}`, dependentUnavailable]
            : [],
        ));
      }
    }
    return Object.freeze(output);
  }

  async requireAvailable(subjectKind: RootSubjectKind, definitionId: string): Promise<AvailableDefinitionAdmissionResult> {
    const normalized = definitionId?.trim();
    if (!normalized) throw new Error("definitionId is required.");
    const result = (await this.scan()).find((candidate) => candidate.subjectKind === subjectKind && candidate.definitionId === normalized);
    if (!result) throw coded("DEFINITION_REFERENCE_UNRESOLVED", `${subjectKind} definition '${normalized}' is not registered.`);
    if (result.status === "unavailable") throw coded(result.code, result.reason);
    return result;
  }

  private async decode(source: RegisteredDefinitionSource): Promise<AvailableDefinitionAdmissionResult | UnavailableDefinitionAdmissionResult> {
    try {
      const raw = JSON.parse(await fs.readFile(source.configPath, "utf8")) as unknown;
      if (source.subjectKind === "agent_team") readAgentTeamDefinitionConfig(raw);
      else readAgentOrgDefinitionConfig(raw);
      await fs.access(source.markdownPath);
      const definition = source.subjectKind === "agent_team"
        ? await this.dependencies.teams.getFreshDefinitionById(source.definitionId)
        : await this.dependencies.orgs.getDefinitionById(source.definitionId);
      if (!definition) return this.unavailable(source, "DEFINITION_CONTRACT_INVALID", "The exact target package could not be loaded after decoding.");
      return Object.freeze({ status: "available", subjectKind: source.subjectKind, definitionId: source.definitionId, definition });
    } catch (error) {
      const siblingFamilyFile = source.subjectKind === "agent_team"
        ? source.configPath.replace(/team-config\.json$/, "org-config.json")
        : source.configPath.replace(/org-config\.json$/, "team-config.json");
      const familyMismatch = (error as NodeJS.ErrnoException | null)?.code === "ENOENT"
        && await fs.access(siblingFamilyFile).then(() => true).catch(() => false);
      const code = familyMismatch ? "DEFINITION_FAMILY_MISMATCH" : "DEFINITION_CONTRACT_INVALID";
      return this.unavailable(source, code, message(error));
    }
  }

  private unavailableDependency(
    org: AgentOrgDefinition,
    results: ReadonlyMap<string, AvailableDefinitionAdmissionResult | UnavailableDefinitionAdmissionResult>,
  ): string | null {
    const member = org.members.find((candidate) => candidate.refType === "agent_team"
      && results.get(key("agent_team", candidate.ref))?.status === "unavailable");
    if (!member) return null;
    const dependency = results.get(key("agent_team", member.ref));
    return dependency?.status === "unavailable"
      ? `agent_team:${member.ref}@${dependency.definitionPath}`
      : `agent_team:${member.ref}`;
  }

  private unavailable(
    source: RegisteredDefinitionSource,
    code: UnavailableDefinitionAdmissionResult["code"],
    reason: string,
    dependencyChain: readonly string[] = [],
  ): UnavailableDefinitionAdmissionResult {
    return Object.freeze({
      status: "unavailable",
      sourceClass: source.descriptor.sourceClass,
      packageRoot: source.descriptor.packageRoot,
      definitionPath: source.descriptor.definitionPath,
      definitionId: source.definitionId,
      subjectKind: source.subjectKind,
      expectedFamily: source.subjectKind === "agent_team" ? "agent_team" : "agent_org",
      code,
      reason,
      dependencyChain: Object.freeze([...dependencyChain]),
      ownerAction: source.descriptor.sourceClass === "external_read_only"
        ? "Update this package in its owning external project to the current definition format."
        : "Correct the owned package to the current definition format and restart the server.",
    });
  }
}

const key = (kind: RootSubjectKind, id: string): string => `${kind}:${id}`;
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const coded = (code: string, text: string): Error => Object.assign(new Error(text), { code });
