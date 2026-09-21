import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type { DefinitionSourceClass } from "./definition-source-descriptor.js";

export type RootSubjectKind = "agent_team" | "agent_org";
export type DefinitionExpectedFamily = "agent_team" | "agent_org";
export type DefinitionAdmissionDiagnosticCode =
  | "DEFINITION_FAMILY_MISMATCH"
  | "DEFINITION_CONTRACT_INVALID"
  | "DEFINITION_REFERENCE_UNRESOLVED"
  | "DEFINITION_DEPENDENCY_UNAVAILABLE";

export type AvailableDefinitionAdmissionResult = Readonly<{
  status: "available";
  subjectKind: RootSubjectKind;
  definitionId: string;
  definition: AgentTeamDefinition | AgentOrgDefinition;
}>;

export type UnavailableDefinitionAdmissionResult = Readonly<{
  status: "unavailable";
  subjectKind: RootSubjectKind;
  sourceClass: DefinitionSourceClass;
  packageRoot: string;
  definitionPath: string;
  definitionId?: string;
  expectedFamily: DefinitionExpectedFamily;
  code: DefinitionAdmissionDiagnosticCode;
  reason: string;
  dependencyChain: readonly string[];
  ownerAction: string;
}>;

export type DefinitionAdmissionResult =
  | AvailableDefinitionAdmissionResult
  | UnavailableDefinitionAdmissionResult;
