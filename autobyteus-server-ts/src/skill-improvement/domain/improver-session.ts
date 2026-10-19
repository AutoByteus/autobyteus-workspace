import type { SkillImprovementNotificationSummary, SkillImprovementSkillTarget, SkillImprovementTargetRef } from "./models.js";
import type { WorkJournalPackage } from "../../agent-work-journal/domain/work-journal-models.js";

export type SkillImprovementImproverSessionStateStatus = "active" | "replaced" | "unavailable";

export type SkillImprovementImproverSessionState = {
  target: SkillImprovementTargetRef;
  status: SkillImprovementImproverSessionStateStatus;
  currentImproverRunId: string | null;
  priorImproverRunIds: string[];
  improverAgentDefinitionId: string | null;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  workspaceRootPath: string | null;
  memoryRootPath: string | null;
  workJournal: {
    rootPath: string | null;
    manifestPath: string | null;
    lastEvidenceHash: string | null;
  };
  lastRequest: {
    improvementRunId: string;
    requestedAt: string;
    postedAt?: string | null;
    workJournalEvidenceHash?: string | null;
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
  workJournalPackage: WorkJournalPackage;
  editableSkillTargets: SkillImprovementSkillTarget[];
};

export type SkillImprovementImproverRequestResult = {
  status: "completed" | "timed_out";
  outputText: string | null;
  notificationSummary: SkillImprovementNotificationSummary | null;
};
