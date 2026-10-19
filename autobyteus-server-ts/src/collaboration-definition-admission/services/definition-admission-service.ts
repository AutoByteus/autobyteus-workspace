import fs from "node:fs/promises";
import path from "node:path";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type { AgentOrgDefinitionService } from "../../agent-org-definition/services/agent-org-definition-service.js";
import { AgentOrgDefinitionResolver } from "../../agent-org-definition/services/agent-org-definition-resolver.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { assertValidFlatTeamDefinition } from "../../agent-team-definition/services/flat-team-definition-validator.js";
import type { DefinitionLoadIssue } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import type { DefinitionSourceClass } from "../domain/definition-source-descriptor.js";
import type {
  AvailableDefinitionAdmissionResult,
  DefinitionAdmissionDiagnosticCode,
  DefinitionAdmissionResult,
  RootSubjectKind,
  UnavailableDefinitionAdmissionResult,
} from "../domain/definition-admission-result.js";
import type { DefinitionSourceRegistry, RegisteredDefinitionSource } from "../providers/definition-source-registry.js";

/** One admission subject: its location and its current definition (last good) or why it has none. */
type AdmissionSource = Readonly<{
  subjectKind: RootSubjectKind;
  definitionId: string;
  definitionPath: string;
  packageRoot: string;
  sourceClass: DefinitionSourceClass;
  definition: AgentTeamDefinition | AgentOrgDefinition | null;
  failure: Readonly<{ code: DefinitionAdmissionDiagnosticCode; reason: string }> | null;
}>;

type PreliminaryResult = AvailableDefinitionAdmissionResult | UnavailableDefinitionAdmissionResult;

const failureOf = (issue: DefinitionLoadIssue | null): AdmissionSource["failure"] =>
  issue ? { code: issue.code, reason: issue.reason } : { code: "DEFINITION_CONTRACT_INVALID", reason: "The definition could not be loaded." };

/**
 * Exact target-only admission and dependency availability owner for new-work surfaces. Teams and
 * Orgs from registered agent packages are listed through the definition services (the agent
 * package definitions, last good honored); application-owned Teams come from the source registry.
 */
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
    teams: Pick<AgentTeamDefinitionService, "getDefinitionById" | "listAdmissionEntries">;
    orgs: Pick<AgentOrgDefinitionService, "listAdmissionEntries">;
    agents: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  }>) {}

  async scan(): Promise<readonly DefinitionAdmissionResult[]> {
    const sources = await this.listSources();
    const preliminary = new Map<string, PreliminaryResult>();
    for (const source of sources) {
      preliminary.set(key(source.subjectKind, source.definitionId), source.definition
        ? Object.freeze({ status: "available", subjectKind: source.subjectKind, definitionId: source.definitionId, definition: source.definition })
        : this.unavailable(source, source.failure!.code, source.failure!.reason));
    }
    const output: DefinitionAdmissionResult[] = [];
    for (const source of sources) {
      const result = preliminary.get(key(source.subjectKind, source.definitionId))!;
      if (result.status === "unavailable") { output.push(result); continue; }
      try {
        if (result.subjectKind === "agent_team") {
          await assertValidFlatTeamDefinition({
            rootDefinition: result.definition as AgentTeamDefinition,
            lookup: { getAgentById: (id) => this.dependencies.agents.getAgentDefinitionById(id) },
          });
        } else {
          const topology = await new AgentOrgDefinitionResolver().resolve({
            definition: result.definition as AgentOrgDefinition,
            lookup: {
              getAgentById: (id) => this.dependencies.agents.getAgentDefinitionById(id),
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
            ? [`agent_org:${source.definitionId}@${source.definitionPath}`, dependentUnavailable]
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

  /**
   * Shared Teams, org-owned Teams (their owning Orgs resolve them through these results),
   * application-owned Teams and AgentOrgs, in a stable order.
   */
  private async listSources(): Promise<AdmissionSource[]> {
    const sources: AdmissionSource[] = [];
    for (const entry of await this.dependencies.teams.listAdmissionEntries()) {
      sources.push({ subjectKind: "agent_team", ...entry, failure: entry.definition ? null : failureOf(entry.issue) });
    }
    for (const registered of await this.dependencies.registry.scan()) {
      sources.push(await this.decodeApplicationOwnedTeam(registered));
    }
    for (const entry of await this.dependencies.orgs.listAdmissionEntries()) {
      sources.push({ subjectKind: "agent_org", ...entry, failure: entry.definition ? null : failureOf(entry.issue) });
    }
    return sources.sort((left, right) =>
      left.subjectKind.localeCompare(right.subjectKind)
      || left.definitionId.localeCompare(right.definitionId)
      || left.definitionPath.localeCompare(right.definitionPath));
  }

  private async decodeApplicationOwnedTeam(source: RegisteredDefinitionSource): Promise<AdmissionSource> {
    const base = {
      subjectKind: "agent_team" as const,
      definitionId: source.definitionId,
      definitionPath: source.descriptor.definitionPath,
      packageRoot: source.descriptor.packageRoot,
      sourceClass: source.descriptor.sourceClass,
    };
    try {
      const definition = await this.dependencies.teams.getDefinitionById(source.definitionId);
      if (definition) return { ...base, definition, failure: null };
      const familyMismatch = await fs.access(path.join(source.descriptor.definitionPath, "org-config.json"))
        .then(() => true).catch(() => false);
      return {
        ...base,
        definition: null,
        failure: familyMismatch
          ? { code: "DEFINITION_FAMILY_MISMATCH", reason: "The Team folder holds an AgentOrg definition." }
          : { code: "DEFINITION_CONTRACT_INVALID", reason: "The exact target package could not be loaded after decoding." },
      };
    } catch (error) {
      return { ...base, definition: null, failure: { code: "DEFINITION_CONTRACT_INVALID", reason: message(error) } };
    }
  }

  private unavailableDependency(
    org: AgentOrgDefinition,
    results: ReadonlyMap<string, PreliminaryResult>,
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
    source: AdmissionSource,
    code: UnavailableDefinitionAdmissionResult["code"],
    reason: string,
    dependencyChain: readonly string[] = [],
  ): UnavailableDefinitionAdmissionResult {
    return Object.freeze({
      status: "unavailable",
      sourceClass: source.sourceClass,
      packageRoot: source.packageRoot,
      definitionPath: source.definitionPath,
      definitionId: source.definitionId,
      subjectKind: source.subjectKind,
      expectedFamily: source.subjectKind === "agent_team" ? "agent_team" : "agent_org",
      code,
      reason,
      dependencyChain: Object.freeze([...dependencyChain]),
      ownerAction: source.sourceClass === "registered_package"
        ? "Update this registered package (its folder or source repository) to the current definition format."
        : "Correct the owned package to the current definition format.",
    });
  }
}

const key = (kind: RootSubjectKind, id: string): string => `${kind}:${id}`;
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);
const coded = (code: string, text: string): Error => Object.assign(new Error(text), { code });
