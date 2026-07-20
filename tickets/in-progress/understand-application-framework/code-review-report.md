# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/requirements.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/application-context-api-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/framework-understanding.md`
- Current Review Round: `1`
- Trigger: Implementation handoff for commit `385ce93725846e1dab213c3ec8db31d71e0848f3` (`refactor(applications): split backend context capabilities`).
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/design-review-report.md` (authoritative round 4, Pass)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/understand-application-framework/tickets/in-progress/understand-application-framework/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: `N/A`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Initial implementation-source review of `385ce9372` | `N/A` | `CR-001` | `Fail` | Yes | One bounded runtime-contract guard and its focused coverage are missing. |

## Prior Findings Resolution Check (Mandatory On Round >1)

`N/A` — this is the first implementation-review round.

## Review Scope

- Changed implementation and behavior reviewed:
  - v3 public handler-context contract, backend SDK exports, manifest writer/parser/validator, template, and generated declarations;
  - worker context construction, reverse JSON-RPC protocol, host dispatch, and orchestration facade;
  - explicit agent/team launch paths, launch-request correlation, binding/event persistence, and fresh-only DDL;
  - both built-in application sources, baseline SQL, generated backends/importable packages, focused tests, and current docs;
  - removal of old names, v2 admission, stale binding cleanup, and prohibited migration/checkpoint work.
- Files / areas reviewed: the complete `8c7e2c2aa591b174a3d5c90eb0d05584538bbf12..385ce93725846e1dab213c3ec8db31d71e0848f3` implementation diff, with production-path tracing through contracts -> worker -> engine host -> orchestration -> launch/resource/artifact owners -> current stores and built-in correlation services.
- Explicit exclusions: API/E2E, fresh-storage matrix execution, live browser/system validation, deployment, and environment ownership remain downstream. Generated files were checked for consistency/inventory but not judged as hand-authored source structure.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — one v3-only capability contract and one forward current schema, with no migration, compatibility, streaming, or frontend transport work.
- Design-spec behavior map verified against the implementation: Mostly. The main spines and owners are preserved, but the method-specific runtime launch-kind invariant in `BEH-002` is not fully enforced.
- Design review report and round confirmed: Yes — round 4 is authoritative and passed.
- Behavior-basis status: `Contradicted` for the bounded `BEH-002` runtime-validation requirement; all other behavior basis is confirmed.
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Exact three-capability public contract is constructed in `application-worker-runtime.ts` and mapped through the new context-capability protocol. | N/A |
| `BEH-002` | Contradicted | Valid typed calls follow `startAgent/startAgentTeam -> engine host -> orchestration host -> ApplicationRunBindingLaunchService`, preserving initial input and lifecycle attachment. | `ApplicationRunBindingLaunchService.requireLaunchKind` only compares resolved resource kind to `input.launch.kind`; it does not verify that `startAgentRunBinding` is `AGENT` or `startAgentTeamRunBinding` is `AGENT_TEAM`. A runtime-JavaScript caller can supply a mutually matching but method-incompatible resource/launch pair and reach the wrong launch implementation. See `CR-001`. |
| `BEH-003` | Confirmed | `agentResources.listAvailable/getConfigured` dispatch to the existing resource resolver/configuration authorities with app scoping preserved. | N/A |
| `BEH-004` | Confirmed | `publishedArtifacts.list/readRevision` dispatch to the existing binding-authorized artifact projection paths; the exact nine-field summary is exported once. | N/A |
| `BEH-005` | Confirmed | Non-empty normalized `launchRequestId` is persisted uniquely, echoed, app-scoped by the platform store, and used by both built-in recovery services. | N/A |
| `BEH-006` | Confirmed | v3-only bundle/definition admission, current DDL/baseline SQL, generated packages, and current-shaped journal JSON are present; prohibited migration/version/checkpoint paths are absent. | N/A |
| `BEH-007` | Confirmed | No frontend, streaming, iframe, HTTP, or WebSocket production capability was added. | N/A |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The public/IPC aggregation is split while the existing orchestration authorities remain authoritative. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Public names, signatures, nine-field artifact summary, launch-request semantics, and no-compatibility rules match the approved API contract. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | `DS-001` through `DS-005` remain traceable across handler, worker, engine host, orchestration, stores, and built-in apps. | None. |
| Ownership boundary preservation and clarity | Pass | Worker translates, engine host scopes/dispatches, orchestration owns behavior, and repositories own current persistence. | None. |
| Off-spine concern clarity | Pass | Contract validation, generated packaging, fresh-schema definitions, and inventory checks remain attached to their intended owners. | None. |
| Existing capability/subsystem reuse check | Pass | Existing resource, launch, binding, artifact, storage, and migration/lifecycle subsystems are reused without a new migration owner. | None. |
| Reusable owned structures check | Pass | Specialized start inputs, the artifact summary, and the discriminated protocol union are shared from their canonical owners. | None. |
| Shared-structure/data-model tightness check | Pass | No generic optional start bag, parallel artifact item, old correlation field, or dual schema representation remains. | None. |
| Repeated coordination ownership check | Pass | Shared start completion remains in `completeStartedBinding`; host dispatch and launch coordination each have one owner. | None. |
| Empty indirection check | Pass | Capability facades translate public calls across the worker boundary and do not introduce policy-only forwarding layers. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Larger pre-existing facade/runtime files remain cohesive for their owners; the patch does not add a mixed migration or streaming concern. | None. |
| Ownership-driven dependency check | Pass | Worker -> engine host -> orchestration host remains intact; no worker/store or app/server shortcut was introduced. | None. |
| Authoritative Boundary Rule check | Pass | Engine host depends on the orchestration host rather than its stores/services; apps depend only on the backend SDK context. | None. |
| File placement check | Pass | Contract, protocol, worker, orchestration, store, app repository, baseline SQL, and generated outputs remain in their owning areas. | None. |
| Flat-vs-over-split layout judgment | Pass | The existing flat contract export and facade files remain proportionate; focused capability types/protocol variants are readable without artificial folders. | None. |
| Interface/API/query/command/service-method boundary clarity | Fail | Public method subjects are explicit, but their runtime invariant is not: the launch-service guard validates resource-vs-payload kind, not method-vs-kind. | Resolve `CR-001`. |
| Naming quality and naming-to-responsibility alignment check | Pass | Active product source uses capability and launch-request names; old terms are absent outside ticket history. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Agent/team inputs are specialized and shared completion is factored; app-local correlation schemas legitimately differ by business ID. | None. |
| Patch-on-patch complexity control | Pass | Partial migration/checkpoint work was removed rather than layered with a compatibility patch. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Old public types/protocol names, old active tokens, old baseline filenames, stale binding compatibility cleanup, and appended migration work are absent. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Existing positive launch/correlation/resource/artifact/v2 tests are clear, but neither wrong-kind call through `startAgent` nor through `startAgentTeam` is covered. | Add focused negative runtime tests with `CR-001`. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Capability mocks and binding builders are reused; the large app correlation suite remains organized by business scenario. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Old run-binding stale-shape tests were removed consistently with the approved no-old-storage product contract; explicit v2 rejection tests remain intentionally. | None. |
| API/E2E readiness for the next workflow stage | Fail | Builds and focused checks pass, but the approved runtime launch-subject invariant must be fixed before downstream execution. | Return to implementation and repeat source review before API/E2E. |

## Source File Size And Structure Audit (If Applicable)

Generated bundles/declarations, tests, docs, and ticket artifacts are excluded from source-size thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/index.ts` | 364 | Pass | Pass — +14; existing canonical aggregate and broader split is explicitly deferred | Pass | Pass | Accept | None. |
| Backend SDK/devkit/manifest/template source family | 35–183 | Pass | N/A | Pass | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-engine/runtime/protocol.ts` | 107 | Pass | N/A | Pass | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts` | 381 | Pass | Pass — +13; remains the engine lifecycle/scoped reverse-dispatch owner | Pass | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | 413 | Pass | Pass — +16; context composition and handler invocation remain one worker-runtime concern | Pass | Pass | Accept | None. |
| Worker entry and host-bridge client | 69–113 | Pass | N/A | Pass | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | 411 | Pass | Pass — +16; broad facade delegates to focused owners | Pass | Pass | Accept | None. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | 380 | Pass | Pass — +11; launch construction remains cohesive | Pass | Pass | Local Fix (`CR-001`) | Add method-specific runtime launch-kind validation and focused tests; no file split required. |
| `application-execution-event-journal-store.ts` | 257 | Pass | Pass — no effective-line growth | Pass | Pass | Accept | None. |
| `application-run-binding-store.ts` | 228 | Pass | Pass — reduced by 46 effective lines | Pass | Pass | Accept | None. |
| Brief Studio backend source and baseline SQL | 19–243 | Pass | Pass — only the 243-line launch service exceeds 220 and did not grow | Pass | Pass | Accept | None. |
| Socratic Math Teacher backend source and baseline SQL | 9–296 | Pass | Pass — the 296-line runtime service did not grow | Pass | Pass | Accept | None. |
| Both built-in `scripts/build-package.mjs` files | 335–336 | Pass | Pass — version-only changes, no line growth | Pass | Pass | Accept | None. |

No changed implementation-source file exceeds 500 effective non-empty lines.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | One v3 handler context/protocol/schema path; v2 is rejected rather than emulated. |
| No legacy old-behavior retention in changed scope | Pass | Active old context/correlation names are absent. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Old public types, protocol, stale binding cleanup, old baseline filenames, and prohibited partial migration artifacts are removed. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Canonical DDL/baseline SQL are updated directly; schema metadata remains version 1. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Current repositories serialize/hydrate only `launchRequestId`. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | `Discard or Rebuild` is followed; production migration/lifecycle service files have no ticket diff. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

`None`.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: Public handler-context names and backend definition compatibility changed.
- Files or areas likely affected: Contract/backend SDK READMEs, custom application development docs, server application engine/orchestration/communication/session docs, and both built-in app READMEs. These areas are already updated in the implementation; `CR-001` requires no additional public-doc change unless the chosen error wording is documented.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `PREM-MIG-001` | Confirmed | No migration/checkpoint/version mechanism or old-storage path was reintroduced; the premise remains not reachable for this ticket. |

No new or reclassified material premise was needed. `CR-001` follows an explicit reviewed interface/runtime-validation requirement and a direct supported v3 handler -> context capability -> worker/host -> launch-service contract path.

## Reviewer Checks Executed

- `pnpm --filter @autobyteus/application-sdk-contracts test` — Pass, 4 tests.
- `pnpm --filter @autobyteus/application-devkit test` — Pass, 13 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-engine/application-engine-host-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-backend/app-owned-launch-request-correlation.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts` — Pass, 4 files / 40 tests.
- `git diff --check 8c7e2c2aa591b174a3d5c90eb0d05584538bbf12..HEAD` — Pass.
- Active old-token inventory outside ticket history — Pass; no `runtimeControl`, `ApplicationRuntimeControl`, `bindingIntentId`, `binding_intent_id`, pending-binding-intent, or `invokeRuntimeControl` token remains.
- Prohibited production-path inventory — Pass; no platform schema migration service/version advance, appended rename SQL, or production migration/lifecycle service diff exists.
- Reviewer-created devkit test output was removed; the worktree was clean before writing this report.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.3`
- Overall score (`/100`): `92.7`
- Score calculation note: Simple average of the ten mandatory categories. The high overall score does not override the blocking sub-9 interface/runtime/API-E2E readiness categories.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | Data-Flow Spine Inventory and Clarity | 9.5 | All five reviewed spines remain traceable through the actual implementation. | No material spine gap; the defect is a local boundary invariant. | Preserve the current spine while adding the guard. |
| `2` | Ownership Clarity and Boundary Encapsulation | 9.5 | Public, worker, engine, orchestration, and persistence authorities remain separated with no bypass. | Large pre-existing facades still require discipline as they grow. | Keep new behavior in focused owners rather than expanding facade policy. |
| `3` | API / Interface / Query / Command Clarity | 8.6 | Names and discriminants are clear, but runtime calls do not enforce that each explicit start method accepts only its own subject kind. | `startAgent` and `startAgentTeam` can receive a mutually matching resource/payload pair for the opposite subject in runtime JavaScript. | Resolve `CR-001` with method-specific validation and clear errors. |
| `4` | Separation of Concerns and File Placement | 9.2 | Changes stay in existing owners and no migration/streaming concern leaked in. | Several pre-existing facade/runtime files are above 380 effective lines, though still cohesive. | Avoid adding unrelated policy; split only if a future concern creates real responsibility drift. |
| `5` | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | Specialized start inputs, one artifact summary, one correlation field, and a discriminated protocol replace loose parallel shapes. | No material gap. | Preserve one canonical type/protocol representation. |
| `6` | Naming Quality and Local Readability | 9.6 | Capability, operation, repository, schema, and launch-request names align with responsibility. | No material gap. | Preserve the clean vocabulary. |
| `7` | API/E2E Readiness | 8.7 | Focused builds/tests pass and downstream scenarios are well identified. | A reviewed runtime boundary invariant lacks both enforcement and negative coverage. | Fix/review `CR-001` before API/E2E starts. |
| `8` | Runtime Correctness And Behavioral Fidelity | 8.6 | Valid flows preserve lifecycle, scoping, correlation, resources, artifacts, and input semantics. | Wrong-kind explicit-start calls can enter the wrong launch implementation instead of rejecting at the boundary. | Enforce the method subject before any run creation, persistence, or observer work. |
| `9` | No Backward-Compatibility / No Legacy Retention | 9.8 | The implementation is a clean v3/current-schema cutover with explicit early v2 rejection. | No material gap. | Keep old-state handling out of follow-up fixes. |
| `10` | Cleanup Completeness | 9.7 | Old public/protocol/schema names and prohibited partial migration work are absent; generated packages are rebuilt. | No material gap. | Ensure the bounded fix does not reintroduce old terms or generated drift. |

## Findings

### `CR-001` — Explicit start methods do not enforce their subject kind at runtime

- Severity: `Medium / blocking`
- Classification: `Local Fix`
- Affected behavior / contract: `BEH-002`; `REQ-002`, `REQ-006`; `AC-002`, `AC-006`; design-spec interface map lines 377–378 and implementation guidance lines 614–615.
- Evidence:
  - `ApplicationEngineHostService.handleContextCapability` routes `startAgent` and `startAgentTeam` directly to distinct orchestration methods.
  - `ApplicationRunBindingLaunchService.startAgentRunBinding` and `startAgentTeamRunBinding` both call the same `requireLaunchKind(resource, input.launch)`.
  - That helper checks only `resource.kind === launch.kind`; it does not check the invoked method's required kind.
  - Therefore a runtime v3 JavaScript handler can call `startAgent` with an `AGENT_TEAM` resource plus `AGENT_TEAM` launch, or `startAgentTeam` with an `AGENT` resource plus `AGENT` launch. The guard passes and the request reaches the wrong specialized launcher, producing misrouting or incidental downstream errors instead of the approved early subject rejection.
  - No focused test currently covers either cross-method mismatch.
- Why this is proportionate: The reviewed design explicitly requires runtime validation despite TypeScript specialization. Application bundles execute as JavaScript, so static types alone are not the runtime boundary.
- Required action:
  1. At the authoritative launch boundary, require `AGENT` for `startAgentRunBinding` and `AGENT_TEAM` for `startAgentTeamRunBinding`, validating both the resolved resource and payload launch kind before any run creation, persistence, observer attachment, or input dispatch.
  2. Return a clear method/subject mismatch error rather than an incidental definition lookup or property error.
  3. Add focused negative tests for both opposite-kind calls and retain the valid agent/team routing tests.
  4. Rerun implementation checks, regenerate only if source/package output changes, and return the package through implementation-source review.

## Classification

`Local Fix` — bounded implementation-owned runtime guard and test coverage. The reviewed design and requirements are sufficient; no upstream redesign or requirement clarification is needed.

## Recommended Recipient

`implementation_engineer`

After the fix, implementation-owned changes must return through source review and then proceed to API/E2E.

## Residual Risks

- Broader API/E2E and isolated fresh-storage validation remain outstanding by workflow ownership.
- External pre-release v2 packages must rebuild and will be rejected by design.
- The repository-level server `pnpm typecheck` baseline TS6059 configuration issue remains separate; build-specific TypeScript compilation is the relevant passing check.
- Larger pre-existing engine/orchestration/runtime files remain below the hard limit and cohesive, but future unrelated growth should trigger renewed decomposition review.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — no finding relies on an unsupported premise; `PREM-MIG-001` remains not reachable and no migration mechanism exists.
- Score Summary: `9.3/10` (`92.7/100`); interface clarity, runtime fidelity, and API/E2E readiness are below the clean-pass threshold because of `CR-001`.
- Failure Origin (when applicable): `N/A` — this is implementation review, not API/E2E failure-origin review.
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: Resolve `CR-001`, rerun focused implementation checks, update the implementation handoff, and return for round-2 source review. Do not begin API/E2E until source review passes.
