/**
 * What the phone does to runs in the demo (autobyteus-279), answered as the node answers it: New run (`createWorkspace`
 * for the demo folder, `prepareAgentRun` for a new agent run), terminate (a run and the runs it delegated), and the
 * Settings Save of a stopped run (kept in memory). A live run's Settings are locked, as on the node (UI spec UXJ-005).
 */
import type {
  AgentOrgRunSelectionPatchInput,
  TeamRunSelectionPatchInput,
  UpdateStoppedAgentRunSelectionMutation,
} from '~/generated/graphql';
import { demoModel } from '../world/content/models';
import type { DemoLaunch, DemoRun, DemoWorld } from '../world/DemoWorld';
import { DEMO_WORKSPACE_ROOT } from '../world/DemoWorld';
import { addressOf, isLive, orgExecutionTree, teamExecutionTree } from '../world/projections';
import { DEMO_WORKSPACE_ID, demoWorkspace } from './definitions';
import type { DemoGraphqlHandlers } from './operations';
import { editability } from './runs';

type FieldError = { __typename: 'RunModelConfigFieldErrorObject'; path: string; message: string };
type Selection = { runtimeKind: string; llmModelIdentifier: string; llmConfig?: unknown };
type ScopedSelection = Selection & { scopeAddress: string };

const runOf = (world: DemoWorld, runId: string, kind: DemoRun['kind']): DemoRun | null => {
  const run = world.run(runId);
  return run && run.kind === kind ? run : null;
};

/** A selection's errors: the demo has only its sample models. */
const selectionErrors = (selection: Selection, prefix = ''): FieldError[] => (demoModel(selection.runtimeKind, selection.llmModelIdentifier)
  ? [] : [{ __typename: 'RunModelConfigFieldErrorObject', path: `${prefix}llmModelIdentifier`, message: 'Choose one of the sample models.' }]);

const same = (launch: DemoLaunch, selection: Selection): boolean => launch.runtimeKind === selection.runtimeKind
  && launch.llmModelIdentifier === selection.llmModelIdentifier && JSON.stringify(launch.llmConfig ?? null) === JSON.stringify(selection.llmConfig ?? null);

const apply = (launch: DemoLaunch, selection: Selection): void => {
  launch.runtimeKind = selection.runtimeKind;
  launch.llmModelIdentifier = selection.llmModelIdentifier;
  launch.llmConfig = (selection.llmConfig ?? null) as DemoLaunch['llmConfig'];
};

/** A Team's or Org's scopes by address: `/` its own default launch, a member's address its launch. */
const scopeLaunch = (run: DemoRun, address: string): DemoLaunch | null =>
  address === '/' ? run.defaultLaunch : run.agents.find((agent) => addressOf(agent) === address)?.launch ?? null;

type ScopedSave = { outcome: 'UPDATED' | 'UNCHANGED' | 'RUN_ACTIVE' | 'VALIDATION_FAILED'; fieldErrors: FieldError[] };

/** Validate every patch first, then change all of them or none (the node's one write). */
const saveScopes = (world: DemoWorld, run: DemoRun, patches: readonly ScopedSelection[]): ScopedSave => {
  if (isLive(world, run)) return { outcome: 'RUN_ACTIVE', fieldErrors: [] };
  const fieldErrors = patches.flatMap((patch) => (scopeLaunch(run, patch.scopeAddress)
    ? selectionErrors(patch, `selectionPatches[${patch.scopeAddress}].`)
    : [{ __typename: 'RunModelConfigFieldErrorObject' as const, path: `selectionPatches[${patch.scopeAddress}]`, message: 'This run has no such scope.' }]));
  if (fieldErrors.length) return { outcome: 'VALIDATION_FAILED', fieldErrors };
  const changed = patches.filter((patch) => !same(scopeLaunch(run, patch.scopeAddress)!, patch));
  for (const patch of changed) apply(scopeLaunch(run, patch.scopeAddress)!, patch);
  return { outcome: changed.length ? 'UPDATED' : 'UNCHANGED', fieldErrors: [] };
};

const scoped = (patches: ReadonlyArray<TeamRunSelectionPatchInput | AgentOrgRunSelectionPatchInput>): ScopedSelection[] =>
  patches.map(({ scopeAddress, runtimeKind, llmModelIdentifier, llmConfig }) => ({ scopeAddress, runtimeKind, llmModelIdentifier, llmConfig }));

type AgentSave = UpdateStoppedAgentRunSelectionMutation['updateStoppedAgentRunSelection'];

const agentSave = (world: DemoWorld, run: DemoRun | null, selection: Selection): AgentSave => {
  const result = (outcome: string, message: string, fieldErrors: FieldError[] = []): AgentSave => ({
    __typename: 'UpdateStoppedAgentRunSelectionResult', success: outcome === 'UPDATED' || outcome === 'UNCHANGED', outcome, message,
    isActive: run ? isLive(world, run) : false,
    editability: run ? editability(world, run) : { __typename: 'RunModelConfigEditabilityObject', editable: false, reason: 'NOT_FOUND' },
    canonicalSelection: run ? { __typename: 'RunModelSelectionObject', runtimeKind: run.coordinator.launch.runtimeKind,
      llmModelIdentifier: run.coordinator.launch.llmModelIdentifier, llmConfig: run.coordinator.launch.llmConfig } : null,
    fieldErrors,
  });
  if (!run) return result('NOT_FOUND', 'Run was not found.');
  if (isLive(world, run)) return result('RUN_ACTIVE', 'This run became active through another connected workflow. Stop it, reopen Settings, and try again.');
  const errors = selectionErrors(selection);
  if (errors.length) return result('VALIDATION_FAILED', 'Model settings are invalid.', errors);
  const launch = run.coordinator.launch;
  if (same(launch, selection)) return result('UNCHANGED', 'Model settings are already up to date.');
  const runtimeChanged = launch.runtimeKind !== selection.runtimeKind;
  apply(launch, selection);
  return result('UPDATED', runtimeChanged
    ? 'Agent runtime and model saved. The agent runtime changes when you send your next message.'
    : 'Model settings updated. They will be used when this run resumes.');
};

const SAVE_MESSAGES = {
  team: { UPDATED: 'Team model settings updated. They will be used when this team resumes.', UNCHANGED: 'Team model settings are already up to date.',
    RUN_ACTIVE: 'This team became active through another connected workflow. Stop it, reopen Settings, and try again.', VALIDATION_FAILED: 'One or more team model settings are invalid.' },
  org: { UPDATED: 'AgentOrg settings saved.', UNCHANGED: 'AgentOrg settings are already up to date.',
    RUN_ACTIVE: 'The enclosing AgentOrg is managed or active.', VALIDATION_FAILED: 'One or more AgentOrg settings are invalid.' },
} as const;

export const runControlHandlers = {
  CreateWorkspace: ({ input }) => {
    // The demo has one folder; New run's folder is it (VIS-023).
    if (input.rootPath.replace(/\/+$/, '') !== DEMO_WORKSPACE_ROOT) throw new Error(`The demo has one folder: ${DEMO_WORKSPACE_ROOT}.`);
    return { __typename: 'Mutation', createWorkspace: demoWorkspace() };
  },
  PrepareAgentRun: ({ input }, world) => {
    const result = (success: boolean, message: string, runId: string | null = null) => ({
      __typename: 'Mutation' as const,
      prepareAgentRun: { __typename: 'PrepareAgentRunResult' as const, success, message, runId, activationState: runId ? 'PREPARED' : null,
        preparedExpiresAt: runId ? new Date(Date.now() + 10 * 60_000).toISOString() : null },
    });
    const definition = world.definition(input.agentDefinitionId);
    if (!definition || definition.kind !== 'agent') return result(false, `Error: Agent definition '${input.agentDefinitionId}' was not found.`);
    if (input.workspaceId && input.workspaceId !== DEMO_WORKSPACE_ID) return result(false, `Error: Workspace '${input.workspaceId}' was not found.`);
    const selection = { runtimeKind: input.runtimeKind, llmModelIdentifier: input.llmModelIdentifier, llmConfig: input.llmConfig };
    if (selectionErrors(selection).length) return result(false, `Error: Model '${input.llmModelIdentifier}' is not one of the demo's sample models.`);
    const run = world.startAgentRun(definition, {
      runtimeKind: input.runtimeKind, llmModelIdentifier: input.llmModelIdentifier, llmConfig: (input.llmConfig ?? null) as DemoLaunch['llmConfig'],
      autoExecuteTools: input.autoExecuteTools, workspaceRootPath: DEMO_WORKSPACE_ROOT,
    }, input.initialSummary ?? '');
    return result(true, 'Agent run prepared successfully.', run.runId);
  },

  TerminateAgentRun: ({ agentRunId }, world) => {
    const run = runOf(world, agentRunId, 'agent');
    if (!run || !isLive(world, run)) return { __typename: 'Mutation', terminateAgentRun: { __typename: 'TerminateAgentRunResult', success: false, message: 'Agent run not found.' } };
    world.runtime.terminate(run);
    return { __typename: 'Mutation', terminateAgentRun: { __typename: 'TerminateAgentRunResult', success: true, message: 'Agent run terminated successfully.' } };
  },
  TerminateAgentTeamRun: ({ teamRunId }, world) => {
    const run = runOf(world, teamRunId, 'team');
    const live = Boolean(run && isLive(world, run));
    if (run && live) world.runtime.terminate(run);
    return { __typename: 'Mutation', terminateAgentTeamRun: { __typename: 'TerminateAgentTeamRunResult', success: live, message: live ? 'Agent team run terminated successfully.' : 'Agent team run not found.' } };
  },
  TerminateAgentOrgRun: ({ agentOrgRunId }, world) => {
    const run = runOf(world, agentOrgRunId, 'org');
    const live = Boolean(run && isLive(world, run));
    if (run && live) world.runtime.terminate(run);
    return { __typename: 'Mutation', terminateAgentOrgRun: { __typename: 'AgentOrgRunMutationResult', success: live,
      message: live ? 'Agent organization run terminated successfully.' : 'Agent organization run not found.', agentOrgRunId: live ? agentOrgRunId : null } };
  },

  UpdateStoppedAgentRunSelection: ({ input }, world) => ({
    __typename: 'Mutation', updateStoppedAgentRunSelection: agentSave(world, runOf(world, input.agentRunId, 'agent'), input),
  }),
  UpdateStoppedTeamRunSelections: ({ input }, world) => {
    const run = runOf(world, input.teamRunId, 'team');
    if (!run) throw new Error(`Team run '${input.teamRunId}' was not found.`);
    const save = saveScopes(world, run, scoped(input.selectionPatches));
    return { __typename: 'Mutation', updateStoppedTeamRunSelections: {
      __typename: 'UpdateStoppedTeamRunSelectionsResult', success: save.outcome === 'UPDATED' || save.outcome === 'UNCHANGED', outcome: save.outcome,
      message: SAVE_MESSAGES.team[save.outcome], isActive: isLive(world, run), canonicalExecutionTree: teamExecutionTree(run),
      editability: editability(world, run), fieldErrors: save.fieldErrors,
    } };
  },
  UpdateStoppedAgentOrgRunConfig: ({ input }, world) => {
    const run = runOf(world, input.orgRunId, 'org');
    if (!run) throw new Error(`AgentOrg '${input.orgRunId}' was not found.`);
    // The demo's Org has agents only, so it has no Team workspaces to change.
    if (input.teamWorkspacePatches.length) throw new Error('The demo Org has no Teams.');
    const save = saveScopes(world, run, scoped(input.selectionPatches));
    return { __typename: 'Mutation', updateStoppedAgentOrgRunConfig: {
      __typename: 'AgentOrgRunConfigUpdateResult', success: save.outcome === 'UPDATED' || save.outcome === 'UNCHANGED', outcome: save.outcome,
      message: SAVE_MESSAGES.org[save.outcome], isActive: isLive(world, run), canonical: orgExecutionTree(run),
      editability: editability(world, run), fieldErrors: save.fieldErrors,
    } };
  },
} satisfies Partial<DemoGraphqlHandlers>;
