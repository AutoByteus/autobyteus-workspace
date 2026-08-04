export type SkillImprovementComposerCtaTarget =
  | { kind: 'agent'; runId: string; isHelperRun?: boolean }
  | { kind: 'team-member'; teamRunId: string; agentRunId: string; isHelperRun?: boolean };
