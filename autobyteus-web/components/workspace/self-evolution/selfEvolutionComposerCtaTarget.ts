export type SelfEvolutionComposerCtaTarget =
  | { kind: 'agent'; runId: string; isHelperRun?: boolean }
  | { kind: 'team-member'; teamRunId: string; memberRunId: string; isHelperRun?: boolean };
