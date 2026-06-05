export type SelfEvolutionTriggerStrategyName = "manual_only" | "scheduled" | "signal_based";
export type SelfEvolutionEvolverStrategyName = "single_agent" | "agent_team";
export type SelfEvolutionStrategyStatus = "implemented" | "not_implemented";

export type SelfEvolutionConfigSource =
  | "default"
  | "agent_run_launch"
  | "team_run_launch"
  | "team_member_run_launch";

export type SelfEvolutionConfigOverride = {
  enabled?: boolean;
  triggerStrategy?: SelfEvolutionTriggerStrategyName;
  evolverStrategy?: SelfEvolutionEvolverStrategyName;
  evolverAgentDefinitionId?: string | null;
};

export type SelfEvolutionEffectiveConfig = {
  enabled: boolean;
  triggerStrategy: SelfEvolutionTriggerStrategyName;
  evolverStrategy: SelfEvolutionEvolverStrategyName;
  evolverAgentDefinitionId: string | null;
  resolvedAt: string;
  sourceTrace: Array<{
    source: SelfEvolutionConfigSource;
    fields: Array<keyof SelfEvolutionConfigOverride>;
  }>;
};

export type SelfEvolutionTargetRef =
  | { kind: "agent_run"; runId: string }
  | { kind: "team_member_run"; teamRunId: string; memberRunId: string };

export type ManualSelfEvolutionRequestedFrom = "run_detail" | "team_run_detail" | "api";

export type ManualSelfEvolutionTriggerInput = {
  target: SelfEvolutionTargetRef;
  requestedByUserId?: string | null;
  requestedFrom: ManualSelfEvolutionRequestedFrom;
};

export type SelfEvolutionRequest = {
  evolutionRunId: string;
  triggerStrategy: "manual_only";
  target: SelfEvolutionTargetRef;
  effectiveConfig: SelfEvolutionEffectiveConfig;
  requestedAt: string;
  requestedByUserId?: string | null;
  requestedFrom: ManualSelfEvolutionRequestedFrom;
};

export type SelfEvolutionStrategyDescriptor = {
  name: SelfEvolutionTriggerStrategyName | SelfEvolutionEvolverStrategyName;
  label: string;
  status: SelfEvolutionStrategyStatus;
  description: string;
};

export type SelfEvolutionStrategyCatalog = {
  triggerStrategies: SelfEvolutionStrategyDescriptor[];
  evolverStrategies: SelfEvolutionStrategyDescriptor[];
  defaultTriggerStrategy: SelfEvolutionTriggerStrategyName;
  defaultEvolverStrategy: SelfEvolutionEvolverStrategyName;
};

export type SelfEvolutionSkillTarget = {
  skillName: string;
  skillRootPath: string;
  skillMdPath: string;
  sourceLabel?: string | null;
  isWritable: boolean;
};

export type SelfEvolutionEvidencePackage = {
  target: SelfEvolutionTargetRef;
  sourceRunIds: string[];
  anonymizedWorkHistory: string;
  feedbackSignals: string[];
  privacyWarnings: string[];
};

export type SelfEvolutionRunStatus =
  | "requested"
  | "resolving_target"
  | "launching_evolver"
  | "running_evolver"
  | "notifying_target"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export type SelfEvolutionNotificationSummary = {
  status: "sent_active_idle" | "skipped_busy" | "next_run_only" | "not_applicable" | "failed";
  message?: string | null;
  error?: string | null;
};

export type SelfEvolutionRunRecord = {
  evolutionRunId: string;
  status: SelfEvolutionRunStatus;
  requestedAt: string;
  completedAt?: string | null;
  triggerStrategy: SelfEvolutionTriggerStrategyName;
  evolverStrategy: SelfEvolutionEvolverStrategyName;
  target: SelfEvolutionTargetRef;
  effectiveConfig: SelfEvolutionEffectiveConfig;
  sourceRunIds: string[];
  evolverAgentDefinitionId: string;
  evolverRunId?: string | null;
  runtimeKind?: string | null;
  llmModelIdentifier?: string | null;
  workspaceRootPath?: string | null;
  skillTargets: SelfEvolutionSkillTarget[];
  evidenceSummaryHash?: string | null;
  notificationSummary?: SelfEvolutionNotificationSummary | null;
  errors: string[];
};

export type SelfEvolutionEligibility = {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  skillTargets: SelfEvolutionSkillTarget[];
  effectiveConfig: SelfEvolutionEffectiveConfig | null;
};

export type SelfEvolutionStartResult = {
  evolutionRunId: string;
  evolverRunId?: string | null;
  record: SelfEvolutionRunRecord;
};
