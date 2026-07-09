export type SkillImprovementTriggerStrategyName = "manual_only" | "scheduled" | "signal_based";
export type SkillImprovementImproverStrategyName = "single_agent" | "agent_team";
export type SkillImprovementStrategyStatus = "implemented" | "not_implemented";

export type SkillImprovementConfigSource = "default";

export type SkillImprovementConfigField = "enabled" | "triggerStrategy" | "improverStrategy" | "improverAgentDefinitionId";

export type SkillImprovementEffectiveConfig = {
  enabled: boolean;
  triggerStrategy: SkillImprovementTriggerStrategyName;
  improverStrategy: SkillImprovementImproverStrategyName;
  improverAgentDefinitionId: string | null;
  resolvedAt: string;
  sourceTrace: Array<{
    source: SkillImprovementConfigSource;
    fields: SkillImprovementConfigField[];
  }>;
};

export type SkillImprovementTargetRef =
  | { kind: "agent_run"; runId: string }
  | { kind: "team_member_run"; teamRunId: string; memberRunId: string };

export type ManualSkillImprovementRequestedFrom = "run_detail" | "team_run_detail" | "api";

export type ManualSkillImprovementTriggerInput = {
  target: SkillImprovementTargetRef;
  requestedByUserId?: string | null;
  requestedFrom: ManualSkillImprovementRequestedFrom;
};

export type SkillImprovementRequest = {
  improvementRunId: string;
  triggerStrategy: "manual_only";
  target: SkillImprovementTargetRef;
  effectiveConfig: SkillImprovementEffectiveConfig;
  requestedAt: string;
  requestedByUserId?: string | null;
  requestedFrom: ManualSkillImprovementRequestedFrom;
};

export type SkillImprovementStrategyDescriptor = {
  name: SkillImprovementTriggerStrategyName | SkillImprovementImproverStrategyName;
  label: string;
  status: SkillImprovementStrategyStatus;
  description: string;
};

export type SkillImprovementStrategyCatalog = {
  triggerStrategies: SkillImprovementStrategyDescriptor[];
  improverStrategies: SkillImprovementStrategyDescriptor[];
  defaultTriggerStrategy: SkillImprovementTriggerStrategyName;
  defaultImproverStrategy: SkillImprovementImproverStrategyName;
};

export type SkillImprovementSkillTarget = {
  skillName: string;
  skillRootPath: string;
  skillMdPath: string;
  sourceLabel?: string | null;
  isWritable: boolean;
};

export type SkillImprovementRunStatus =
  | "requested"
  | "resolving_target"
  | "launching_improver"
  | "running_improver"
  | "notifying_target"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export type SkillImprovementNotificationSummary = {
  status:
    | "sent_active_idle"
    | "skipped_busy"
    | "next_run_only"
    | "not_applicable"
    | "failed"
    | "send_message_sent"
    | "send_message_rejected"
    | "send_message_target_inactive"
    | "send_message_not_attempted";
  message?: string | null;
  error?: string | null;
  targetAgentRunId?: string | null;
  improverRunId?: string | null;
};

export type SkillImprovementRunRecord = {
  improvementRunId: string;
  status: SkillImprovementRunStatus;
  requestedAt: string;
  completedAt?: string | null;
  triggerStrategy: SkillImprovementTriggerStrategyName;
  improverStrategy: SkillImprovementImproverStrategyName;
  target: SkillImprovementTargetRef;
  effectiveConfig: SkillImprovementEffectiveConfig;
  sourceRunIds: string[];
  improverAgentDefinitionId: string;
  improverRunId?: string | null;
  runtimeKind?: string | null;
  llmModelIdentifier?: string | null;
  workspaceRootPath?: string | null;
  skillTargets: SkillImprovementSkillTarget[];
  evidenceSummaryHash?: string | null;
  notificationSummary?: SkillImprovementNotificationSummary | null;
  errors: string[];
};

export type SkillImprovementEligibility = {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
  skillTargets: SkillImprovementSkillTarget[];
  effectiveConfig: SkillImprovementEffectiveConfig | null;
};

export type SkillImprovementStartResult = {
  improvementRunId: string;
  improverRunId?: string | null;
  record: SkillImprovementRunRecord;
};
