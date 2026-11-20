/**
 * The demo's runtimes and models (autobyteus-279), as the node's model answers give them: each run's options per scope
 * (`run-model-selection-service.ts`: the current model, and the runtime's other models as replacements), the runtime
 * catalogs (one ready, static catalog per runtime), and every runtime the demo offers enabled.
 */
import type { GetProviderModelCatalogSnapshotsQuery } from '~/generated/graphql';
import { DEMO_PROVIDER, DEMO_RUNTIME_KINDS, demoModel, demoModelsOf, type DemoModel } from '../world/content/models';
import { runLaunchOf, type DemoLaunch, type DemoRun, type DemoWorld } from '../world/DemoWorld';
import { addressOf } from '../world/projections';
import type { DemoGraphqlHandlers } from './operations';

type Snapshot = GetProviderModelCatalogSnapshotsQuery['providerModelCatalogSnapshots'][number];

const providerTypeOf = (runtimeKind: string): string => (runtimeKind === 'claude_agent_sdk' ? 'ANTHROPIC' : 'OPENAI');

const choice = (model: DemoModel) => ({
  __typename: 'RunModelOptionObject' as const, llmModelIdentifier: model.identifier, providerName: DEMO_PROVIDER.name,
  displayName: model.name, canonicalName: model.identifier, description: model.description, configSchema: model.configSchema,
  recommended: model.recommended,
});

/** One scope's options: its current model and the runtime's other sample models. */
const optionsOf = (launch: DemoLaunch) => {
  const current = demoModel(launch.runtimeKind, launch.llmModelIdentifier);
  return {
    currentModelIdentifier: launch.llmModelIdentifier, modelListReadable: true, unavailableReason: null,
    currentModel: current ? choice(current) : null,
    replacements: demoModelsOf(launch.runtimeKind).filter((model) => model.identifier !== launch.llmModelIdentifier).map(choice),
  };
};

const runOf = (world: DemoWorld, runId: string, kind: DemoRun['kind']): DemoRun => {
  const run = world.run(runId);
  if (!run || run.kind !== kind) throw new Error(`Run '${runId}' was not found.`);
  return run;
};

const detail = (model: DemoModel) => ({
  __typename: 'ModelDetail' as const, modelIdentifier: model.identifier, name: model.name, description: model.description, value: model.identifier,
  canonicalName: model.identifier, providerId: DEMO_PROVIDER.id, providerName: DEMO_PROVIDER.name, providerType: providerTypeOf(model.runtimeKind),
  runtime: model.runtimeKind, hostUrl: null, configSchema: model.configSchema, maxContextTokens: 128_000, activeContextTokens: 128_000,
  maxInputTokens: 128_000, maxOutputTokens: 16_000, metadataProvenance: null,
  selectionPresentation: { __typename: 'ModelSelectionPresentation' as const, recommended: model.recommended },
});

/** A runtime's catalog: the demo's one provider, static and read, with its sample models. */
const snapshotOf = (runtimeKind: string): Snapshot => {
  const models = demoModelsOf(runtimeKind);
  return {
    __typename: 'ProviderModelCatalogSnapshotObject', runtimeKind,
    ownerProvider: { __typename: 'CatalogProviderObject', id: DEMO_PROVIDER.id, name: DEMO_PROVIDER.name, providerType: providerTypeOf(runtimeKind), isCustom: false, baseUrl: null, catalogMode: 'STATIC' },
    sources: [{ __typename: 'ModelSourceStatusObject', state: 'READY', modelCount: models.length, successfulUnitCount: 1, failedUnitCount: 0, safeMessage: null }],
    llmModels: models.map(detail), audioModels: [], imageModels: [], videoModels: [],
  };
};

const isDemoRuntime = (runtimeKind: string): boolean => (DEMO_RUNTIME_KINDS as readonly string[]).includes(runtimeKind);

export const modelHandlers = {
  AgentRunModelOptions: ({ agentRunId }, world) => ({
    __typename: 'Query', agentRunModelOptions: { __typename: 'RunModelOptionsObject', ...optionsOf(runOf(world, agentRunId, 'agent').coordinator.launch) },
  }),
  TeamRunModelOptions: ({ teamRunId }, world) => {
    const run = runOf(world, teamRunId, 'team');
    return {
      __typename: 'Query',
      teamRunModelOptions: [
        { __typename: 'TeamScopeModelOptionsObject', scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', ...optionsOf(runLaunchOf(run)) },
        ...run.agents.map((agent) => ({ __typename: 'TeamScopeModelOptionsObject' as const, scopeKind: 'CONFIGURED_AGENT', scopeAddress: addressOf(agent), ...optionsOf(agent.launch) })),
      ],
    };
  },
  AgentOrgRunModelOptions: ({ orgRunId }, world) => {
    const run = runOf(world, orgRunId, 'org');
    return {
      __typename: 'Query',
      agentOrgRunModelOptions: [
        { __typename: 'AgentOrgRunModelOptionObject', scopeKind: 'CONFIGURED_ORG', scopeAddress: '/', ...optionsOf(runLaunchOf(run)) },
        ...run.agents.map((agent) => ({ __typename: 'AgentOrgRunModelOptionObject' as const, scopeKind: 'CONFIGURED_AGENT', scopeAddress: addressOf(agent), ...optionsOf(agent.launch) })),
      ],
    };
  },

  GetProviderModelCatalogSnapshots: ({ runtimeKind }) => ({
    __typename: 'Query',
    providerModelCatalogSnapshots: (runtimeKind ? [runtimeKind] : [...DEMO_RUNTIME_KINDS]).filter(isDemoRuntime).map(snapshotOf),
  }),
  EnsureProviderModelCatalog: ({ providerId, runtimeKind }) => {
    const runtime = runtimeKind ?? 'autobyteus';
    if (providerId !== DEMO_PROVIDER.id || !isDemoRuntime(runtime)) throw new Error(`Provider '${providerId}' was not found.`);
    return { __typename: 'Mutation', ensureProviderModelCatalog: snapshotOf(runtime) };
  },
  RuntimeCurrentModelDescriptors: ({ runtimeKind, identifiers }) => {
    if (!isDemoRuntime(runtimeKind)) throw new Error(`Unsupported runtime: ${runtimeKind}`);
    const ids = [...new Set(Array.isArray(identifiers) ? identifiers : [identifiers])];
    return {
      __typename: 'Query',
      runtimeCurrentModelDescriptors: ids.map((identifier) => {
        const model = demoModel(runtimeKind, identifier);
        return {
          __typename: 'RuntimeCurrentModelDescriptorObject' as const, identifier,
          model: model ? { __typename: 'ModelDetail' as const, modelIdentifier: model.identifier, name: model.name, canonicalName: model.identifier,
            providerName: DEMO_PROVIDER.name, providerType: providerTypeOf(model.runtimeKind), description: model.description, configSchema: model.configSchema } : null,
        };
      }),
    };
  },
  GetRuntimeAvailabilityKinds: () => ({ __typename: 'Query', runtimeAvailabilityKinds: [...DEMO_RUNTIME_KINDS] }),
  GetRuntimeAvailability: ({ runtimeKind }) => ({
    __typename: 'Query',
    runtimeAvailability: { __typename: 'RuntimeAvailabilityObject', runtimeKind, enabled: isDemoRuntime(runtimeKind), reason: isDemoRuntime(runtimeKind) ? null : `Runtime '${runtimeKind}' is not part of the demo.` },
  }),
} satisfies Partial<DemoGraphqlHandlers>;
