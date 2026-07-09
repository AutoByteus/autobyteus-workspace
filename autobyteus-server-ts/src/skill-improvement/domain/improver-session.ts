import type { SkillImprovementNotificationSummary, SkillImprovementSkillTarget, SkillImprovementTargetRef } from "./models.js";
import type { AgentWorkTracePackage } from "../../agent-work-traces/domain/work-traces.js";

export type SkillImprovementImproverSessionStateStatus = "active" | "replaced" | "unavailable";

export type SkillImprovementImproverSessionState = {
  schemaVersion: 1;
  target: SkillImprovementTargetRef;
  status: SkillImprovementImproverSessionStateStatus;
  currentImproverRunId: string | null;
  priorImproverRunIds: string[];
  improverAgentDefinitionId: string | null;
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
    improvementRunId: string;
    requestedAt: string;
    postedAt?: string | null;
    workTraceSummaryHash?: string | null;
  } | null;
  updatedAt: string;
};

export type SkillImprovementImproverSession = {
  target: SkillImprovementTargetRef;
  improverRunId: string;
  improverAgentDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  state: SkillImprovementImproverSessionState;
};

export type SkillImprovementImproverTriggerRequest = {
  improvementRunId: string;
  requestedAt: string;
  targetAgentRunId: string;
  workTracePackage: AgentWorkTracePackage;
  editableSkillTargets: SkillImprovementSkillTarget[];
};

export type SkillImprovementImproverRequestResult = {
  status: "completed" | "timed_out";
  outputText: string | null;
  notificationSummary: SkillImprovementNotificationSummary | null;
};
