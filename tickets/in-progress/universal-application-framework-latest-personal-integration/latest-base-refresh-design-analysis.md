# Latest-Personal Refresh Design Analysis — SR-004

> Historical authority: SR-004 was implemented and verified at checkpoint `a23849f...`. The current five-commit refresh is governed by `latest-base-refresh-round-2-design-analysis.md`; this document remains authoritative only for the already-integrated provider/model/error decisions.

## Decision

The newest `origin/personal@7edfb162559ec5a6eb4c00c23a929920eabe3dc1` must be merged into the protected, previously verified ticket checkpoint `663f44d31deb05bf47f0eda780de4d754187a51b`. This is a **bounded semantic refresh**, not a replay or replacement of the Universal Application Framework architecture. Delivery measured the production conflict delta at its parent `1629441a3...`; the one newer commit changes only two unrelated completed-ticket delivery documents, and a fresh non-mutating preview confirms the conflict set is unchanged.

The approved resolution is:

1. keep the ticket's explicit Studio/standalone builders, four outward application-platform contracts, one launch-configuration owner/store, v6 exact run identity, scoped application Agent Tools/publication, and current application package/devkit behavior;
2. accept latest Personal as authority for the new provider catalog, current-model membership, pricing, provider-error extraction/redaction, native error metadata, and all non-overlapping provider/runtime changes;
3. relocate the new application current-model checks into the ticket's retained owners instead of restoring Personal's retired execution-resource configuration service/normalizer;
4. combine the safe original provider message with the ticket's closed, message-only application-agent ERROR projection and exact v6 producer/target identity;
5. keep application SDK generated `dist` declarations and all retired configuration owners deleted, then build outputs from canonical source for verification.

No physical data migration, package rewrite, compatibility alias, global fallback, or application public-contract version change is required.

## Refresh Evidence

| Item | Evidence |
| --- | --- |
| Protected ticket checkpoint | `663f44d31deb05bf47f0eda780de4d754187a51b` |
| Previously integrated Personal base | `d7d4eace46dc6534d50e9150c3e84d4bd41fedfb` |
| Delivery-measured Personal base | `1629441a30dfce91d75b9bf7dcdd508b0f371bc5` |
| Current Personal base | `7edfb162559ec5a6eb4c00c23a929920eabe3dc1` |
| Advance | 32 commits; ticket branch 140 ahead / 32 behind before refresh |
| Newest one-commit delta | `chore(delivery): record release workflow verification`; modifies only two unrelated completed-ticket delivery documents |
| Preview method | fresh non-mutating `git merge-tree --write-tree HEAD origin/personal`; no merge or unmerged index left behind |
| Conflict count | 11 paths: 6 content, 5 modify/delete |
| Changed-both count for this refresh | 13 paths; two marker-free overlaps are SDK README and run-binding launch service |
| Delivery blocker | `latest-base-refresh-conflict-report.md` |
| Raw evidence | `evidence/delivery/dr-004-base-refresh-and-integration.log` |

## Product-Reachability And Material-Premise Matrix

| Premise | Independent trigger / governing contract | Forward production trace | Reachability | Consequence |
| --- | --- | --- | --- | --- |
| A removed AutoByteus catalog ID can remain in a saved application override or direct launch request | Latest Personal REQ-012; ordinary Studio saved override; application SDK direct start | stored/package/direct pair -> launch evaluation or run binding -> model owner | Reachable | Without relocation, the integrated branch either restores a retired owner or silently loses `CURRENT_MODEL_SELECTION_REQUIRED`. |
| Codex and Claude model identifiers are not owned by the AutoByteus catalog | Current runtime dispatch and latest Personal runtime-scoped model ownership | effective pair -> external backend factory -> provider session/thread | Reachable | A catalog-wide guard would incorrectly block the maintained Codex/Luna packages. |
| A provider failure reaches an application agent/team stream | Latest Personal provider-error contract; ordinary application run | provider extractor/redactor -> AgentRun/team event -> application projector -> SDK consumer | Reachable | Wholesale selection can either reintroduce the generic message or expose native/provider metadata across the closed application boundary. |
| Application SDK generated declarations are absent from the verified ticket source tree | Current tracked tree and prior clean-source decision | source contract -> build-generated local output | Reachable during merge/build | Accepting the modify side resurrects a second maintained source truth. |
| Latest Personal changed the marker-free run-binding file by importing a helper that the ticket deleted | three-way merge-file proof | merge -> import resolution -> server compile/start | Reachable | Git auto-merge succeeds but the candidate cannot compile and would revive the old launch-profile owner. |

Every material premise is product- or mandatory-lifecycle-reachable. No design decision below rests only on aesthetic preference.

## Semantic Authority Matrix

| Concern | Authoritative side / owner | Integrated decision |
| --- | --- | --- |
| Studio/standalone host boundary | Verified ticket | Preserve distinct `buildStudioServer` and `buildStandaloneApplicationServer`; no mode switch. |
| Application launch baseline, sparse overlay, readiness, persistence | Verified ticket | Preserve `ApplicationLaunchConfigurationService` plus `ApplicationLaunchOverrideStore` as the only semantic/physical owners. |
| Current AutoByteus model membership and error/message | Latest Personal | Reuse `LLMFactory.requireCurrentModelIdentifier` and `CurrentModelSelectionRequiredError` through one explicit application policy. |
| Claude/Codex model ownership | Both agree | Bypass the AutoByteus guard; retain current backend-factory and host-catalog validation. |
| Direct run command defense | Latest Personal behavior on current ticket owner | Validate all effective agent/team pairs before run/team allocation or creation in `ApplicationRunBindingLaunchService`. |
| Provider error extraction/redaction and native metadata | Latest Personal | Accept the complete latest Personal producer/native transport path. |
| Focused application-agent ERROR contract | Both, with ticket v6 identity authority | Preserve only `{ type: "ERROR", message }`; use the original safe nonblank message and reject extra metadata. |
| Exact application target/producer identity | Verified ticket | Preserve `agentRunId`, `teamRunId`, rooted `memberAddress`, exact URL codec, and root-event ordering. |
| Legacy execution-resource configuration service/normalizer | Retired by verified ticket | Keep deleted; port only the new behavior/tests to current owners. |
| Application SDK `dist` | Verified ticket clean-source policy | Keep untracked/deleted; regenerate for package tests only. |

## Current-Model Selection Boundary

### Owner

Add one small stateless `ApplicationCurrentModelSelectionPolicy` under `application-platform/launch-configuration`. It owns exactly:

- normalization of an absent/blank runtime to `RuntimeKind.AUTOBYTEUS` using the current runtime parser;
- delegation of only AutoByteus `(runtimeKind, llmModelIdentifier)` pairs to `LLMFactory.requireCurrentModelIdentifier`;
- returning the normalized runtime to callers;
- leaving Claude Agent SDK and Codex App Server selections untouched.

Its constructor requires the AutoByteus membership function explicitly. It has no store, cache, lifecycle, fallback, registry, or provider discovery of its own. `create-application-orchestration-services.ts` constructs one instance and passes that exact instance to the readiness, save, and direct-run boundaries. This is a concrete shared policy, not a service locator or pass-through facade.

### Read / Save / Run Spine

```text
package baseline or saved sparse override
  -> ApplicationLaunchConfigurationService builds effective leaf profiles
  -> ApplicationLaunchHostCapabilityValidator checks runtime availability
  -> ApplicationCurrentModelSelectionPolicy
       AutoByteus -> LLMFactory exact current membership
       Codex/Claude -> no AutoByteus check
  -> current model/catalog/credential checks
  -> RUNNABLE or HOST_REQUIREMENT_MISSING
```

- A stale AutoByteus package default or already-saved override remains visible with its exact stored identifier and provenance. The slot retains its structurally valid baseline/effective projection, but readiness is `HOST_REQUIREMENT_MISSING` with issue code `CURRENT_MODEL_SELECTION_REQUIRED` and the latest Personal message. No package default fallback, alias, remap, or write occurs.
- Explicit Save computes the candidate effective configuration and applies the same policy before `ApplicationLaunchOverrideStore.upsertOverride`. A stale AutoByteus selection returns an `ApplicationLaunchConfigurationError` carrying the same blocking issue; no row is written.
- Direct agent/team start applies the same policy to every normalized effective config before agent creation, team-run ID allocation, or team creation. This is defense at the command boundary, not a second readiness authority.
- `ApplicationRunBindingLaunchService` must not import the deleted `application-execution-resource-configuration-launch-profile.ts`; it receives the policy explicitly.

### Status And Issue Contract

Add `CURRENT_MODEL_SELECTION_REQUIRED` to the current `ApplicationLaunchIssueCode` union. Do not restore the retired `ApplicationExecutionResourceConfigurationIssueCode` or its old view/status union.

| Situation | Saved state | Readiness / command result | Mutation |
| --- | --- | --- | --- |
| Current AutoByteus model | unchanged | normal host checks continue | only explicit Save writes |
| Removed AutoByteus model already saved | preserved and visible | `HOST_REQUIREMENT_MISSING` + `CURRENT_MODEL_SELECTION_REQUIRED` | none |
| Removed AutoByteus model submitted on Save | prior row preserved | 409-style launch configuration error with the same issue | none |
| Removed AutoByteus model submitted directly to run | input rejected before allocation/creation | `CurrentModelSelectionRequiredError` | none |
| Codex/Claude provider-owned model | unchanged | evaluated by its existing runtime/catalog/factory owners | no AutoByteus call |

## Provider-Error And Application-Stream Boundary

The latest Personal native path is retained:

```text
provider/transport failure
  -> provider extractor and secret redactor
  -> LlmPhase / AgentErrorNotification
  -> canonical native ERROR(code + safe message + optional safe metadata)
  -> native single/team web transports
```

The application branch remains deliberately narrower:

```text
canonical AgentRun or TeamAgent ERROR
  -> ApplicationAgentStreamEventProjector
  -> diagnostic errors filtered
  -> require a nonblank already-safe message
  -> { type: "ERROR", message }
  -> current v6 envelope with exact producer agentRunId
  -> application frontend SDK exact-key parser
```

The application projector must never copy native `code`, provider status/code/request ID, details, raw error objects, stacks/causes, headers, credentials, provider session/thread/item IDs, or runtime configuration. The frontend SDK must reject an ERROR object containing any of those extra keys. The original safe message replaces the old local `The agent response failed.` fallback; no semantic provider classification is added.

## Conflict Resolution Map

| # | Path | Resolution |
| ---: | --- | --- |
| 1 | `autobyteus-application-frontend-sdk/tests/application-connections.test.mjs` | Keep current v6 target/producer shapes and slash-safe exact `agentRunId` URL; add original-safe-message acceptance and provider-metadata extra-key rejection. |
| 2 | `autobyteus-application-sdk-contracts/src/execution-resources.ts` | Keep the current launch baseline/override/readiness model; add `CURRENT_MODEL_SELECTION_REQUIRED` to `ApplicationLaunchIssueCode`. Do not restore retired configuration types. |
| 3 | `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs` | Keep current unversioned factories/constants and exact `agentRunId` URL round-trip, including slash encoding; do not restore v4-suffixed code symbols. |
| 4 | `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts` | Keep current graph-local service construction, rooted identity, direct registrar contract, and sequencing; add agent/team safe error-message projection assertions and metadata/secret exclusion. |
| 5 | `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts` | Keep nested current producer attribution and non-agent filtering; align fixture with current root-event listener shape and retain strict secret-field exclusion. |
| 6 | `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | Keep exact ticket run/team identities and construction; add stale AutoByteus pre-side-effect and external-runtime bypass cases. |
| 7–8 | `autobyteus-application-sdk-contracts/dist/execution-resources.d.ts{,.map}` | Resolve as deletion. Build locally from source for tests/package output; do not recommit. |
| 9 | `.../application-execution-resource-configuration-launch-profile.ts` | Keep deleted. Its new runtime/model expansion behavior moves to the current policy and effective leaf/config traversal. |
| 10 | `.../application-execution-resource-configuration-service.ts` | Keep deleted. Readiness and Save behavior move to `ApplicationLaunchConfigurationService`. |
| 11 | `.../application-execution-resource-configuration-service.test.ts` | Keep deleted. Port relevant current-model read/Save assertions to current launch-configuration tests. |

## Marker-Free Overlap Decisions

| Path | Git risk | Required integrated result |
| --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Auto-merge imports the deleted legacy launch-profile helper and therefore compiles incorrectly. | Use the explicit current-model policy, preserve exact ticket identities/services, validate all team configs before allocation, and remove the retired import. |
| `autobyteus-application-sdk-contracts/README.md` | Auto-merge is semantically compatible but unreviewed. | Retain the current SDK documentation and add the latest Personal statement that ERROR preserves the original redacted-safe message while remaining metadata-free. |

All other 31-commit non-overlapping provider/catalog/pricing/native-error paths are accepted from latest Personal, then exercised by its retained regression suites and the application-specific delta below. The 32nd commit's two unrelated delivery-document edits are accepted without application-platform changes.

## Exact Add / Modify / Remove Inventory

### Add

- `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-policy.ts`
- `autobyteus-server-ts/tests/unit/application-platform/application-current-model-selection-policy.test.ts`

### Modify / semantically resolve

- `autobyteus-application-sdk-contracts/src/execution-resources.ts`
- `autobyteus-application-sdk-contracts/README.md`
- `autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs`
- `autobyteus-application-frontend-sdk/tests/application-connections.test.mjs`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-configuration-service.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-host-capability-validator.ts`
- `autobyteus-server-ts/src/application-platform/runtime/create-application-orchestration-services.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`
- `autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-event-projector.ts` (accept latest Personal clean application projection on the current path)
- `autobyteus-server-ts/tests/unit/application-platform/application-launch-configuration-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-stream-event-projector.test.ts`
- `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts`
- `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`

### Keep removed / resolve as deletion

- `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-launch-profile.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-configuration-service.test.ts`
- `autobyteus-application-sdk-contracts/dist/execution-resources.d.ts`
- `autobyteus-application-sdk-contracts/dist/execution-resources.d.ts.map`

No file is renamed or moved. No compatibility wrapper or old symbol is retained.

## Implementation Sequence

1. Re-fetch and confirm `origin/personal` is still `7edfb1625...`; if it moved, stop and reclassify the new delta before merging.
2. Merge the latest Personal ref once into the protected ticket branch, preserving both histories.
3. Accept non-overlapping latest Personal provider/catalog/pricing/native-error changes; keep delivery-owned DR-004 artifacts/evidence untouched.
4. Resolve modify/delete paths as the approved deletions.
5. Add the application current-model policy and wire the same explicit instance into launch view/Save validation, host readiness, and direct run binding.
6. Resolve SDK/test conflicts using the exact map above; remove every import/reference to retired configuration owners.
7. Run focused source/contract tests before broad builds; regenerate only build outputs, not source-controlled application SDK `dist`.
8. Execute source review, coverage investigation, current Personal provider suites, real Studio/standalone journeys, package parity, cleanup/recovery, and Electron rebuild/smoke before delivery resumes.

## Verification Delta

### Focused durable proof

1. Policy unit tests:
   - absent runtime normalizes to AutoByteus;
   - current AutoByteus identifier passes;
   - removed AutoByteus identifier throws exact code/message;
   - Codex and Claude identifiers never invoke the AutoByteus guard.
2. Launch configuration tests:
   - stale saved AutoByteus value remains visible and unchanged;
   - readiness is `HOST_REQUIREMENT_MISSING` with `CURRENT_MODEL_SELECTION_REQUIRED`;
   - Save rejects before store upsert;
   - Reset remains the only delete path;
   - current package defaults and external-runtime overrides remain runnable under their existing validators.
3. Run-binding tests:
   - single-agent stale AutoByteus input creates no run;
   - all team leaves validate before team-run ID allocation or creation;
   - mixed/external-runtime members bypass only the AutoByteus membership guard;
   - exact `agentRunId`, `teamRunId`, and rooted `memberAddress` remain unchanged.
4. Application stream tests:
   - safe provider messages reach single and team application ERROR events;
   - diagnostic errors remain filtered;
   - blank/malformed messages fail projection;
   - provider metadata, raw errors, secrets, and extra keys never cross the SDK parser.
5. Merge/cleanup proof:
   - no retired configuration imports/symbols;
   - no tracked application SDK `dist` resurrection;
   - no conflict markers or unresolved entries;
   - latest Personal is an ancestor of the integrated ticket HEAD.

### Broader retained proof

- latest Personal catalog, pricing, missing-key, provider-error, native team/web, and redaction suites;
- affected application SDK/frontend SDK builds and contract tests;
- server TypeScript/build plus focused application platform/orchestration/streaming suites;
- current architecture-boundary/omission tests;
- real Brief and Socratic Studio/standalone Codex/Luna launch, message handoff, Agent Tools publication/projection, restart/recovery, cleanup, and package byte parity;
- Personal provider/runtime regression matrix identified by the 31-commit production path list, plus integrity confirmation for the 32nd delivery-document-only commit;
- new Electron build and smoke/extended verification on the final integrated commit.

## Preserved Behavior Matrix

| Behavior | Studio | Standalone |
| --- | --- | --- |
| Package defaults | immutable baseline | immutable baseline |
| Sparse override | editable/resettable, no package mutation | optional host overlay only; not required for valid package |
| Current-model policy | same shared policy | same shared policy before listen/readiness and direct run |
| Codex/Luna maintained packages | unchanged | unchanged |
| Application provider error | original safe message only | original safe message only |
| Native provider metadata | available only on existing native transports | available only on existing native transports |
| Agent Tools route/session/publication | scoped internal route plus Studio-only external gateway separation | scoped internal route; no external Studio gateway |
| Run/team identity, recovery, cleanup | exact current owners | exact current owners |

## Design-Principles Self-Validation

| Principle / check | Validation result | Evidence in this package |
| --- | --- | --- |
| Approved behavior and production reality | Pass. The refresh preserves the already-passed dual-host behavior and adopts only the newest Personal provider/model/error behavior that intersects it. | `requirements.md` BEH-001–BEH-007; semantic authority matrix above |
| Product-reachability gate | Pass. Every material premise has an independent supported trigger or mandatory merge/build lifecycle and a complete forward consequence. | Product-reachability matrix above |
| Spine span sufficiency | Pass. The refresh, launch read/Save/direct-run, and provider-error paths begin at their supported entrypoints and end at merge proof, runnable/blocking outcome, pre-side-effect rejection, or SDK consumer. | Read/Save/Run spine, provider-error spine, DS-010–DS-012 in `design-spec.md` |
| Authoritative boundary | Pass. `ApplicationLaunchConfigurationService` remains the launch semantic owner, `ApplicationLaunchOverrideStore` remains the only row owner, latest native error owners remain native, and the application projector remains the closed application boundary. | Semantic authority matrix; ownership map in `design-spec.md` |
| Shared-policy proportionality | Pass. The new policy owns one repeated AutoByteus membership rule used by three real boundaries. It owns policy and normalization rather than forwarding arbitrary services, and it does not become a service locator or runtime framework. | Current-model owner and rejected alternatives above |
| Dependency direction | Pass. Assembly constructs the policy explicitly; launch/readiness/direct-run owners may depend on it; the policy may depend only on the injected AutoByteus membership function and runtime-kind parser. It may not depend on stores, host builders, registries, provider discovery, credentials, or global defaults. | Owner section and exact file inventory above |
| Clean-cut replacement | Pass. The three retired configuration paths, two generated declaration paths, and marker-free retired import remain absent. No alias, wrapper, parallel reader, or fallback is introduced. | Conflict map and Keep Removed inventory above |
| Persisted-data transition | Pass: `Directly Usable — No Migration`. Existing rows retain exact JSON and meaning; stale model identifiers become explicit blocking state without read-time mutation. | Status table above; `requirements.md` Persisted Data Outcome |
| Host parity | Pass. Studio and standalone share the same package/default, current-model, direct-run, application-error, scoped Agent Tools, publication, and cleanup behavior; only host assembly/ingress remains different. | Preserved behavior matrix above |
| Return-contract encapsulation | Pass. Native transports retain their approved safe metadata, while the application SDK receives only the safe nonblank message and rejects extra keys. | Provider-error boundary and AC-013 |
| Construction side effects | Pass. Direct agent validation occurs before run creation; every team leaf is validated before team-run ID allocation or creation; Save validation occurs before store upsert. | Verification Delta items 1–3 |
| Naming and file placement | Pass. `ApplicationCurrentModelSelectionPolicy` names its concrete rule and resides with launch configuration. No vague `Graph`, `Authority`, `Port`, compatibility, or version-suffixed symbol is added. | Exact Add inventory and owner definition above |
| Verification proportionality | Pass. Focused tests prove the new seams; the complete retained source/API-E2E/provider/package/Electron matrix proves that the refreshed combination did not regress the earlier behavior. | Verification Delta above |

### Reachable Scenario Closure

1. **Current package/default:** a maintained Codex/Luna application resolves through its provider-owned runtime and remains runnable in Studio and standalone.
2. **Stale saved AutoByteus override:** the exact row remains visible and `VALID` as a structural override, while readiness reports `HOST_REQUIREMENT_MISSING` with `CURRENT_MODEL_SELECTION_REQUIRED`; Reset remains explicit.
3. **Stale Save candidate:** validation returns the same issue before `ApplicationLaunchOverrideStore.upsertOverride`; the prior row is unchanged.
4. **Direct single-agent request:** the policy rejects a stale AutoByteus model before `createAgentRun`.
5. **Direct team request:** all effective leaf configurations are resolved and validated before `allocateTeamRunId` or `createTeamRun`.
6. **External runtime request:** Codex and Claude bypass only the AutoByteus membership guard and continue through their existing availability/factory/credential owners.
7. **Provider failure:** native consumers retain approved safe metadata; application agent/team consumers receive exactly `{ type: "ERROR", message }` with current v6 identity.
8. **Mandatory merge/build:** all 11 conflicts and both marker-free overlaps are resolved by the owner map, retired/generated paths remain absent, and the refreshed branch proves latest-Personal ancestry.

No unresolved design premise remains. Implementation stays blocked only on architecture approval and the final integrated execution evidence.

## Rejected Alternatives

- Restore Personal's deleted execution-resource configuration service/normalizer: rejected because it recreates a competing launch authority.
- Keep the auto-merged legacy helper import: rejected because the helper is deleted and would violate the clean-cut owner decision.
- Validate every runtime model through `LLMFactory`: rejected because Claude/Codex own their model namespaces.
- Silently replace an old model with a new one: rejected because it changes user intent and persisted meaning.
- Add provider metadata to the application SDK ERROR shape: rejected because the closed provider-neutral boundary is intentional.
- Keep the generic application error message: rejected because it discards latest Personal's approved safe provider message.
- Recommit generated SDK declarations or add compatibility aliases: rejected because they create duplicate source truth.
- Rebuild Electron before an integrated reviewed candidate exists: rejected as non-authoritative evidence.
