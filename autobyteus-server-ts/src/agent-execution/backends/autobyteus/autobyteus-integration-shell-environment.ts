import type { IntegrationRunAccess } from "../../../credential-proxy/integration-run-access.js";

/**
 * The initial custom data that gives a native run's shell commands its integration variables (DS-002): core's
 * `terminalChildEnvironment` seam, which replaces `process.env` for the run's child processes. A run without
 * integration access, or a host without a credential proxy, gets nothing.
 */
export const integrationShellCustomData = (
  access: IntegrationRunAccess | null | undefined,
  run: Readonly<{ runId: string; agentDefinitionId: string }>,
): Record<string, unknown> => {
  const variables = access?.environmentForRun(run, process.env) ?? {};
  return Object.keys(variables).length === 0
    ? {}
    : { terminalChildEnvironment: (): NodeJS.ProcessEnv => ({ ...process.env, ...variables }) };
};
