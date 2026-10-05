import type { FlatTeamAgentExecutionHandle } from './flat-team-agent-execution-handle.js';
import type { AgentOperationResult } from '../../agent-execution/domain/agent-operation-result.js';

/** All handles were attached to the exact Team manager before the first member await. */
export async function prepareFlatTeamConfiguredActivation(input: {
  teamRunId: string; handles: readonly FlatTeamAgentExecutionHandle[];
  releasePrivate(): Promise<AgentOperationResult>;
}) {
  const prepared: Awaited<ReturnType<FlatTeamAgentExecutionHandle['prepareConfiguredActivation']>>[] = [];
  for (const handle of input.handles) prepared.push(await handle.prepareConfiguredActivation());
  let state: 'prepared' | 'committed' | 'aborted' = 'prepared';
  return Object.freeze({
    stagedPlatformBindings: Object.freeze(prepared.flatMap(activation => activation.stagedPlatformBindings)),
    stagedNoConversationBindingReplacements: Object.freeze(prepared.flatMap(activation => activation.stagedNoConversationBindingReplacements)),
    commitAfterDurability: () => {
      if (state !== 'prepared') throw new Error(`TeamRun '${input.teamRunId}' configured activation is not publishable.`);
      for (const activation of prepared) activation.commitAfterDurability();
      state = 'committed';
    },
    abort: async () => {
      if (state === 'aborted') return;
      const result = await input.releasePrivate();
      if (!result.accepted) throw new Error(result.message ?? 'Team private activation release remains pending.');
      state = 'aborted';
    },
  });
}
