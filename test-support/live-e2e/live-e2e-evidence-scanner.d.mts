export const LIVE_E2E_RUNNER_CANARIES: readonly string[];

export class LiveE2eEvidenceScanner {
  constructor(syntheticCanaries: string[] | readonly string[]);
  assertClean(value: unknown): void;
  assertStructurallyValueFree(value: unknown): void;
  assertEvidenceClean(value: unknown): void;
}

export type CapturedLiveE2eProcessResult = {
  status: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

export const runCapturedLiveE2eProcess: (input: {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  evidencePaths?: string[] | readonly string[];
  syntheticCanaries?: string[] | readonly string[];
}) => Promise<CapturedLiveE2eProcessResult>;
