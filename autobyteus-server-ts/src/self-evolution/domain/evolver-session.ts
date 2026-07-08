import type { SelfEvolutionNotificationSummary, SelfEvolutionSkillTarget, SelfEvolutionTargetRef } from "./models.js";
import type { AgentWorkTracePackage } from "../../agent-work-traces/domain/work-traces.js";

export type SelfEvolutionEvolverSessionStateStatus = "active" | "replaced" | "unavailable";

export type SelfEvolutionEvolverSessionState = {
  schemaVersion: 1;
  target: SelfEvolutionTargetRef;
  status: SelfEvolutionEvolverSessionStateStatus;
  currentEvolverRunId: string | null;
  priorEvolverRunIds: string[];
  evolverAgentDefinitionId: string | null;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  workspaceRootPath: string | null;
  memoryRootPath: string | null;
  workTraces: {
    rootPath: string | null;
    manifestPath: string | null;
    lastSummaryHash: string | null;
  };
  lastRequest: {
    evolutionRunId: string;
    requestedAt: string;
    postedAt?: string | null;
    workTraceSummaryHash?: string | null;
  } | null;
  updatedAt: string;
};

export type SelfEvolutionCompanionSession = {
  target: SelfEvolutionTargetRef;
  companionRunId: string;
  evolverAgentDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  state: SelfEvolutionEvolverSessionState;
};

export type SelfEvolutionCompanionTriggerRequest = {
  evolutionRunId: string;
  requestedAt: string;
  targetAgentRunId: string;
  workTracePackage: AgentWorkTracePackage;
  editableSkillTargets: SelfEvolutionSkillTarget[];
};

export type SelfEvolutionCompanionRequestResult = {
  status: "completed" | "timed_out";
  outputText: string | null;
  notificationSummary: SelfEvolutionNotificationSummary | null;
};
