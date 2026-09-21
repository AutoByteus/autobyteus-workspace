# CRR-003 focused failure-origin trace

## Supported scenario

- `B01 / AC-001 / SCN-001 / SCN-002` is a supported normal workflow: a user opens Settings from a configured direct or mounted-Team Agent in a stopped AgentOrg to edit the enclosing whole-Org configuration.
- Expected result: one bounded canonical read followed by the stable whole-Org form.
- Actual result: mounted entry remained loading and issued 1,366 successful identical reads in 44.497 seconds; direct entry remained loading and issued 284 reads in 8.900 seconds. Every response was HTTP 200 with the correct stopped/editable tree. The tree hash and provider request count did not change.

## Forward production cycle

1. `AgentOrgWorkspaceView.vue:45` renders `ExistingRunConfigEditor` with an inline object literal: `{ kind: 'agent_org', orgRunId: configurationTarget.root.orgRunId }`.
2. `ExistingRunConfigEditor.vue:126-132` projects that prop to another object-valued `selectedIdentity` computed, and lines 141-149 watch the object by reference and call `loadAgentOrgCanonical`.
3. `existingRunModelConfigStore.loadAgentOrgCanonical` calls `agentOrgContextsStore.readRunModelConfig`.
4. `agentOrgContextsStore.ts:277-285` performs the successful network read and publishes the canonical tree through `org.applyRunModelConfig`.
5. `AgentOrgExecutionContext.applyRunModelConfig` synchronously replaces its reactive `view` and `index` after validation.
6. `activeContextStore.activeWorkspaceTarget` calls `agentOrgContextsStore.activeTargetFor`; `activeTargetFor` and `selectedTarget` build fresh frozen projection objects from the updated context.
7. The parent rerenders, creates a semantically identical but referentially new `target` prop, the child object watcher fires, and the cycle repeats.

The actual transport trace in `validation/api-live/runtime-r3/b01-model-config-request-loop.jsonl` independently confirms this production cycle. Backend status, payload identity, storage, and provider behavior remained correct.

## Origin and disposition

- Origin: implementation defect in frontend reactive load identity.
- Classification: Local Fix.
- Owner: Implementation Engineer.
- Review gap: the source review accepted an explicit tagged target without verifying that its reactive identity remained scalar/stable across the canonical context publication that the same load triggers. The existing `AgentOrgWorkspaceView.spec.ts` stubs `ExistingRunConfigEditor`, while store/form tests exercise the other side independently, so no durable test crossed the real parent/child feedback boundary.

## Required correction boundary

- Key the editor load trigger to semantic scalar identity (`kind` plus run ID), or otherwise provide a stable equivalent target, so a same-subject context publication cannot reload the canonical configuration.
- Preserve legitimate reload when the actual subject changes.
- Add a durable production-boundary regression using the actual `AgentOrgWorkspaceView` and actual `ExistingRunConfigEditor` behavior for both direct and mounted entries. It must publish the canonical Org context as the read does, then prove one bounded read, rendered form, and no continued loading loop.
- Do not solve this by suppressing context publication, caching an unbounded loop downstream, weakening canonical reads, or changing the whole-Org design.
