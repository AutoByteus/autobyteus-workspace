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
  gitRootPath?: string | null;
  rollbackMode: "git" | "unversioned" | "none";
};

export type SelfEvolutionEvidencePackage = {
  target: SelfEvolutionTargetRef;
  sourceRunIds: string[];
  runMetadataPath?: string | null;
  rawTracePaths: string[];
  runHistorySummary: string;
  feedbackSignals: string[];
  privacyWarnings: string[];
};

export type SelfEvolutionRunStatus =
  | "requested"
  | "resolving_target"
  | "launching_evolver"
  | "running_evolver"
  | "recording_changes"
  | "notifying_target"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export type SelfEvolutionChangeSummary = {
  detectionMode: "git" | "file_hash" | "file_metadata_uncertain" | "none";
  changedSkillPaths: string[];
  offTargetChangePaths: string[];
  gitRoots: string[];
  diffStat?: string | null;
  warnings: string[];
  policyViolations: string[];
};

export type SelfEvolutionUpdateMetrics = {
  evolverRunCompleted: boolean;
  evolverRunStatus: SelfEvolutionRunStatus;
  noOp: boolean;
  changedSkillCount: number;
  changedSkillPaths: string[];
  offTargetChangeCount: number;
  offTargetChangePaths: string[];
  policyViolationCount: number;
  gitBackedTargetCount: number;
  unversionedTargetCount: number;
  warningCount: number;
  errorCount: number;
  notificationStatus?: string | null;
};

export type BenefitSignalAvailability = "observed" | "not_observed" | "not_collectible" | "not_enough_data";
export type BenefitAssessment =
  | "not_enough_data"
  | "positive_signal"
  | "negative_signal"
  | "mixed_signal"
  | "neutral_signal";

export type SelfEvolutionBenefitMetrics = {
  linkedPostEvolutionRunIds: string[];
  linkMethod: "target_identity_and_skill_overlap" | "manual_link" | "none";
  completedLinkedRuns: number;
  failedLinkedRuns: number;
  userPositiveFeedbackCount?: number | null;
  userNegativeFeedbackCount?: number | null;
  validationPassedCount?: number | null;
  validationFailedCount?: number | null;
  skillActivation: {
    status: BenefitSignalAvailability;
    loadSkillToolUseCount?: number | null;
    configuredSkillPreloaded?: boolean | null;
    directSkillReferenceCount?: number | null;
  };
  skillAdherence: {
    status: BenefitSignalAvailability;
    supportingTraceCount?: number | null;
    contradictoryTraceCount?: number | null;
  };
  assessment: BenefitAssessment;
  notes: string[];
};

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
  changeSummary?: SelfEvolutionChangeSummary | null;
  updateMetrics?: SelfEvolutionUpdateMetrics | null;
  benefitMetrics?: SelfEvolutionBenefitMetrics | null;
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
