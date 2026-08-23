# Requirements — Universal Application Framework Latest-Personal Integration

## Status

Design-ready SR-004 revision for the mandatory latest-base refresh. The previously integrated ticket checkpoint is protected and verified, but the user requires the ticket branch to incorporate the current fetched `origin/personal@7edfb162559ec5a6eb4c00c23a929920eabe3dc1`. Delivery found a bounded 11-path semantic conflict set at `1629441a3...`; solution-design revalidation against the one-commit-newer current ref confirms the same conflict set and adds only two unrelated delivery-document edits. Implementation and Electron rebuild remain paused until this revised package passes architecture review.

## Goal / Problem Statement

Refresh the completed Universal Application Framework integration checkpoint `663f44d31deb05bf47f0eda780de4d754187a51b` from its previously integrated Personal base `d7d4eace46dc6534d50e9150c3e84d4bd41fedfb` to current `origin/personal@7edfb162559ec5a6eb4c00c23a929920eabe3dc1`. Preserve the proven Studio/standalone contract and all already-integrated current execution/identity behavior while adopting Personal's new provider catalog, current-model selection, pricing, provider-error, native transport, and unrelated current delivery-record behavior through the ticket's retained owners. Resolve the refresh semantically; do not restore retired authorities or select either side wholesale.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The completed ticket checkpoint contains the proven dual-host foundation and the previously integrated Personal base, but it is 32 commits behind current Personal. | The same ticket branch history incorporates `origin/personal@7edfb1625...` once and remains the verification branch; `personal` itself is untouched by this ticket. | The protected checkpoint and source branches remain recoverable and are not rewritten. | REQ-001, REQ-002; AC-001, AC-002, AC-014 |
| BEH-002 | The finalized feature provides `pnpm dev`, `dev:studio`, `build`, `validate`, and `start`; latest Personal applications still use custom package builders and mirrored/generated trees. | Retain the native application developer workflow and one canonical source tree, adapted to current Personal package contracts. | A package built once remains importable in Studio and runnable as standalone. | REQ-003; AC-003, AC-004 |
| BEH-003 | Personal has newer agent/team execution state, rooted member identity, provider preparation/publication, and cleanup behavior. The feature branch has application-scoped execution/publication integration against older owners. | Dual-host application execution uses Personal's current lifecycle and identity owners while preserving application-scoped publication, messaging, cleanup, and projection. | No global/process fallback may replace an application-scoped dependency. Native provider tools and the external Studio MCP gateway remain outside the application transport change. | REQ-004, REQ-005; AC-005–AC-008 |
| BEH-004 | The verified ticket has self-contained Codex/Luna package defaults, Studio sparse overrides, and host readiness. New Personal removes old AutoByteus catalog IDs and rejects them through a current-model guard in legacy configuration owners that the ticket removed. | Preserve the ticket launch model while relocating exact AutoByteus current-model validation into the retained launch/readiness/direct-run boundaries. Stale values stay visible and block; Codex/Claude remain owned by their provider runtimes. | Studio overrides never mutate packages; no model alias, silent replacement, row rewrite, or package-default fallback is allowed. | REQ-005, REQ-008; AC-006, AC-009, AC-012 |
| BEH-005 | The initial integration resolved its historical 177-conflict surface. The new 32-commit refresh has the same 11 conflicts and 13 production changed-both paths; five conflicts target paths deliberately deleted by the ticket and one marker-free auto-merge imports a deleted helper. The newest commit changes only two unrelated completed-ticket delivery documents. | Resolve the bounded refresh by current owner, keep retired/generated paths deleted, retain the unrelated delivery-document update, and record both marker and marker-free decisions. | Do not hand-merge generated application SDK output or restore deleted configuration seams. | REQ-002, REQ-006, REQ-008; AC-002, AC-010, AC-014 |
| BEH-006 | The pre-refresh checkpoint has passed architecture, source, API/E2E, package, provider, and Electron verification, while the newest Personal release has its own passing provider evidence. Neither proves their refreshed combination. | Re-run focused current-model/error/contract checks, existing architecture/source checks, both real hosts, provider/tool/publication behavior, package parity, current Personal regressions, and Electron. | Prior evidence is a characterization baseline, not proof of the refreshed commit. | REQ-007, REQ-008; AC-011, AC-015 |
| BEH-007 | New Personal preserves original redacted-safe provider messages and native safe metadata, while the verified application stream still emits a generic local message and has an exact closed v6 identity/field contract. | Accept the latest native error path and project only the original safe nonblank message through the application ERROR variant; preserve exact `agentRunId`/`memberAddress`/URL semantics and reject provider metadata at the application SDK boundary. | Diagnostic filtering and strict exclusion of raw errors, secrets, stacks, headers, provider IDs, and extra fields remain unchanged. | REQ-008; AC-013, AC-015 |

## Investigation Findings

- The historical integration conflict set was resolved and verified. The newest non-mutating merge preview adds **11 conflicts**: 6 content conflicts and 5 modify/delete conflicts.
- This refresh has 13 changed-both paths. Two marker-free overlaps require explicit audit: the SDK README merges compatibly, while the run-binding service auto-merges an import of a legacy helper that the ticket deleted and therefore must be corrected semantically.
- The new Personal provider behavior is sound but lands application current-model checks in the retired configuration service/normalizer. The behavior must move into `ApplicationLaunchConfigurationService`, host capability readiness, and the current run-binding owner without restoring those paths.
- The latest provider error producer/native transport changes apply cleanly; the application SDK conflicts must combine the original safe message with the ticket's exact closed v6 target/producer contract.
- Latest Personal has not independently absorbed the feature: its tree lacks the explicit Studio and standalone builders, the four-projection application platform boundary, the standalone host, and maintained application devkit configuration.
- Rebase would replay the conflict surface through 115 feature commits. Selective cherry-pick/reimplementation risks omitting behavior distributed across the finalized branch. A single semantic merge on a branch created from latest Personal is the least risky and most auditable strategy.
- Personal is authoritative for newer provider and agent/team execution behavior; the feature is authoritative for the same-package/two-host boundary and its tested developer experience. The integration requires a small structural adaptation where those authorities meet, not a wholesale selection of either version.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `integration-strategy-analysis.md` | Intended integration strategy and semantic authority matrix | REQ-001–REQ-007 | AC-001–AC-011 | Design-ready; approved by the user's delegated technical-direction instruction | Constrains how the merge may be resolved and verified. |
| `integration-runtime-contracts.md` | Exact lifecycle, activation/provisioning, construction, launch persistence, and verification contract | REQ-004–REQ-007 | AC-005–AC-011 | Design-ready; within the approved preserved-behavior boundary | Closes the bounded architecture-review precision gaps without adding product scope. |
| `latest-base-refresh-design-analysis.md` | Exact 32-commit refresh authority, conflict, current-model, provider-error, inventory, and verification design | REQ-001–REQ-008 | AC-001–AC-015 | Design-ready SR-004 supplement; pending architecture review | Defines how newest Personal behavior enters current owners without reopening the passed platform architecture. |
| `merge-conflict-inventory.txt` | Evidence: exact no-commit conflict set | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Supports conflict classification. |
| `branch-overlap-inventory.txt` | Evidence: changed-both path inventory | REQ-002, REQ-006 | AC-002, AC-010 | Complete; approval N/A | Prevents reliance on conflict markers alone. |
| `integration-path-inventory.txt` | Evidence: add/modify/remove/regenerate candidate inventory | REQ-003–REQ-007 | AC-003–AC-011 | Complete; approval N/A | Drives detailed implementation and review inventory. |
| `merge-attempt.log` | Evidence: isolated merge transcript | REQ-002 | AC-002 | Complete; approval N/A | Proves the measured conflict surface. |
| `latest-base-refresh-conflict-report.md` | Delivery blocker and original 31-commit refresh measurement | REQ-001–REQ-002, REQ-006–REQ-008 | AC-001–AC-002, AC-010–AC-015 | Complete delivery evidence; approval N/A | Triggers SR-004 and records why delivery stopped before merge/build. |
| `evidence/delivery/dr-004-base-refresh-and-integration.log` | Raw fetch/ref/path/merge-tree evidence from delivery | REQ-001–REQ-002, REQ-006 | AC-001–AC-002, AC-010 | Complete delivery evidence; approval N/A | Grounds the original refresh measurement; solution-design revalidation extends it to current `7edfb1625...`. |

## Design Health Assessment

- Change posture: `Refactor` and integration of a previously completed `Larger Requirement`.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` plus `Legacy Or Compatibility Pressure`.
- Refactor posture: `Likely Needed`.
- Evidence basis: the feature's application-scoped services target older execution owners, while latest Personal's new managers still contain process-default seams. Directly selecting either side would lose tested behavior. Generated mirrors and custom builders also conflict with the one-source devkit design.
- Requirement or scope impact: the integration may adapt internal construction and identity plumbing, but it may not add new product behavior or redesign the current Personal agent/team domain.

## Recommendations

1. Keep the dedicated branch created from latest Personal.
2. Perform one history-preserving semantic merge of the finalized feature branch.
3. Use an explicit authority matrix: current Personal owns evolved runtime behavior; the feature owns dual-host requirements and boundary behavior.
4. Delete/regenerate derived package outputs instead of manually resolving them.
5. Adapt application-scoped run/session/publication wiring to Personal's current activation and rooted-member identity model; do not resurrect feature-era registries.
6. Verify the integrated state from source, not by inheriting either branch's old test result.

## Scope Classification

`Large` overall ticket; **bounded Design Impact refresh** for SR-004 — 31 new Personal commits, 11 conflicts, 13 changed-both paths, one relocated model policy, one closed error projection, and mandatory full integrated verification.

## Scope Guardrail

### In-Scope Use Cases

- **UC-001:** Create an integration branch/worktree from the latest tracked Personal ref and merge the finalized feature history once.
- **UC-002:** Resolve canonical source, contract, application, server, web, SDK/devkit, and durable-test overlaps semantically.
- **UC-003:** Develop, validate, build, start standalone, and import/run the same maintained package in Studio.
- **UC-004:** Launch current agent/team resources from an application using package defaults or a valid Studio override.
- **UC-005:** Use application-scoped Agent Tools, team messaging, artifact publication, projection, recovery, and cleanup in both hosts.
- **UC-006:** Regenerate disposable outputs and prove package/source parity.
- **UC-007:** Verify current Personal behavior, dual-host behavior, and Electron packaging on the integrated candidate.
- **UC-008:** Merge the newly fetched Personal ref into the protected ticket checkpoint and resolve all 11 conflicts plus both marker-free overlaps by the recorded owner map.
- **UC-009:** Evaluate current and removed AutoByteus model selections through package/saved/direct agent and team paths without affecting Codex/Claude ownership or mutating stored/package values.
- **UC-010:** Propagate a safe provider failure through native transports and the message-only application agent/team stream while retaining v6 identity and strict field exclusion.

### Out of Scope

- Merging or pushing the result into `personal`, releasing, deploying, tagging, or deleting either source branch.
- Rewriting the feature branch through rebase.
- A repository-wide redesign of agent/team execution, providers, MCP, or application manifests.
- Authentication/user support, a shared external Studio MCP gateway for standalone, or alteration of native Codex/Claude tools.
- Compatibility aliases/wrappers for source seams removed on either branch.
- Hand-maintaining generated package output as an independent source of truth.

### Preserved Behavior Boundary

BEH-001–BEH-007 govern. The integrated branch must preserve latest Personal semantics except where the approved dual-host behavior explicitly extends them; Studio and standalone differ in hosting/ingress, not in application business behavior.

### Review Authority

- Every blocking Design Impact or implementation correction must cite an approved BEH, REQ, or AC ID.
- New product behavior, migration, security, or operational policy is a Requirement Gap and requires user approval.
- Technical possibility or aesthetic preference alone is non-blocking.
- Reviewer comments do not silently amend this requirements basis.

## Functional Requirements

- **REQ-001 — Latest-base isolation:** The authoritative work remains on the dedicated ticket branch and protected checkpoint; it must incorporate fetched `origin/personal@7edfb1625...` once without rewriting or directly modifying `personal` or the finalized feature history.
- **REQ-002 — History-preserving semantic integration:** Preserve the completed feature integration history, merge the newly fetched Personal ref once, and resolve every new conflict and changed-both path by behavior and ownership, never by wholesale `ours`/`theirs` selection.
- **REQ-003 — Dual-host developer experience:** The maintained Brief and Socratic packages retain devkit-owned `dev`, `dev:studio`, `build`, `validate`, and `start`, one canonical source tree, and build-once Studio/standalone use.
- **REQ-004 — Current Personal execution authority:** Retain current Personal agent/team provisioning and preparation, claim-before-await activation, private candidates, metadata-before-publication, provider-identity validation, quarantine, rooted-member identity, event publication, exact teardown, provider availability, migration gates, and current package contract values.
- **REQ-005 — Dual-host application authority:** Retain explicit Studio and standalone assembly roots, narrow application-platform projections, one awaited required-tool readiness owner, package-owned launch defaults, sparse non-mutating overrides, host readiness, scoped Agent Tools session/publication, application communication, projection, recovery, and ordered stop.
- **REQ-006 — Clean source transition:** Remove obsolete mirrored/custom-builder/old-owner paths; regenerate derived outputs from the integrated canonical source; do not add compatibility wrappers or global fallbacks.
- **REQ-007 — Integrated proof:** Validate architecture boundaries and omission cases, compile/build affected workspaces, run focused and broad regressions, exercise real Brief/Socratic flows in both hosts, prove package parity, and rebuild/test Electron.
- **REQ-008 — Latest provider/model behavior on current boundaries:** Preserve newest Personal's exact AutoByteus current-model rejection, external-runtime ownership, original redacted-safe provider message, and native error metadata. Implement application current-model validation through the retained launch/readiness/direct-run owners, preserve stale values without rewrite or fallback, and keep the focused application-agent ERROR contract message-only with exact v6 identity and strict metadata/secret exclusion.

## Acceptance Criteria

- **AC-001:** `git merge-base --is-ancestor 7edfb162559ec5a6eb4c00c23a929920eabe3dc1 HEAD` succeeds on the refreshed ticket branch; `origin/personal`, the protected checkpoint, and the finalized feature history have not been rewritten.
- **AC-002:** The refresh merge preserves both histories, has no unresolved index entries or conflict markers, and records a semantic resolution for all 11 conflicts and both marker-free changed-both paths.
- **AC-003:** From each maintained application directory, `pnpm dev` starts standalone, `pnpm dev:studio` targets Studio, `pnpm build` creates the importable package, `pnpm validate` accepts it, and `pnpm start` runs the built standalone package.
- **AC-004:** One package build is byte/contract compatible with both the Studio import path and standalone selection path; canonical source is not duplicated into maintained editable mirrors.
- **AC-005:** Current Personal provisioning/preparation/activation/publication semantics remain authoritative: claims precede provider awaits, candidates remain private until durable metadata commits, provider identity is validated, indeterminate cleanup/commit is quarantined, rooted `memberAddress` identifies team placement, and old feature-era manager/member-registry identity paths are absent.
- **AC-006:** Brief and Socratic package defaults resolve to `codex_app_server` + `gpt-5.6-luna`; Studio sparse overrides/reset and current unavailable-model retention/blocking operate without mutating package bytes.
- **AC-007:** Before either host listens, one shared awaited owner registers the existing required Core, Browser, Task Delegation, Agent Communication, Published Artifact, Media, and provisioned Search tool units exactly once; both hosts then register the internal `/mcp/agent-tools/:sessionId` transport with application-scoped session/publication identity, while standalone does not expose Studio's external `/mcp/gateway`.
- **AC-008:** A real team run in each host performs recipient-name handoff, publishes artifacts, projects them into the application, survives the supported recovery/restart paths, and revokes/detaches resources exactly once on termination/stop.
- **AC-009:** Current Personal readable-provider migration/startup gating, model availability, serialized manifest/bundle/SDK contract values, event-await semantics, and user-facing warnings remain intact.
- **AC-010:** Generated/derived conflicts are resolved by removal and deterministic regeneration; obsolete custom builders, mirrored source directories, old runtime owners, and compatibility aliases are absent.
- **AC-011:** The final candidate passes git integrity checks, architecture-boundary tests, affected workspace builds/typechecks, focused server/web/devkit/application suites, both real host journeys, package parity, current Personal regression suites identified during overlap review, and Electron build/smoke verification.
- **AC-012:** A removed AutoByteus model already stored remains byte-for-byte visible and yields `HOST_REQUIREMENT_MISSING` with `CURRENT_MODEL_SELECTION_REQUIRED`; Save rejects before store upsert; direct agent/team launch rejects before run/team allocation; current AutoByteus and provider-owned Codex/Claude selections retain their existing owners and behavior.
- **AC-013:** A representative provider failure reaches native clients with latest Personal's safe message/metadata contract and reaches the application agent/team SDK as exactly `{ type: "ERROR", message }`; diagnostic filtering remains, and provider metadata, details, raw errors, stacks, credentials, provider IDs, and extra keys do not cross the application boundary.
- **AC-014:** The three retired application configuration paths and two generated SDK declaration paths remain absent; the current run-binding service has no import/reference to them; the SDK retains current launch/readiness types, unversioned iframe symbols, exact `agentRunId` URL codec, and the new issue code.
- **AC-015:** The refreshed candidate passes newest Personal catalog/pricing/missing-key/provider/native-error suites, focused current-model and application-error tests, retained architecture/source checks, both real Studio/standalone package journeys, package parity, recovery/cleanup, and a new Electron build/smoke verification.

## Constraints / Dependencies

- Node/pnpm workspace tooling and the existing repository build/test scripts remain authoritative.
- The integration must use current Personal contract numbers: application manifest 4, backend bundle 1, and current backend/frontend SDK contract 6 where applicable; clean internal names remain unversioned.
- The application path must fail closed when an application-scoped dependency is omitted; general-process assembly may retain deliberately named defaults.
- No generic DI container, service locator, generic event bus, mode-switched `buildServer(mode)`, later-bound proxy, singleton fallback, compatibility wrapper, or package-ID special case.
- The feature's existing passing evidence and Personal's existing tests are characterization baselines only.

## Persisted Data Outcome

- Stored subject / location: Personal server database and application data roots, including package records, launch overrides, run/history state, artifact revisions, and host-managed provider configuration.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve: all current Personal data and migration ledger; valid current `__autobyteus_resource_configurations.resource_ref_json` and `launch_profile_json` rows remain directly readable through one target store and are interpreted as sparse overrides using current rooted `memberAddress` identity. Invalid/stale rows—including rows that reference a removed AutoByteus catalog ID—remain visible and explicitly resettable rather than being silently rewritten, deleted, remapped, or replaced by package defaults.
- Unacceptable data loss or corruption: database replacement, copied/seeded defaults, launch override mutation, run/history loss, package mutation, or skipped Personal migrations.
- Availability/rollout constraints: Personal's current migration gates must complete before either integrated host is ready; standalone uses its own data root and the same current migration authority. The physical table/columns remain unchanged. Normal reads never migrate data; explicit Save writes only the current-rooted sparse override and explicit Reset deletes the row.
- Related IDs: REQ-004–REQ-008; AC-005, AC-006, AC-009, AC-011–AC-015.

## Assumptions

- Protected ticket checkpoint `663f44d...` and `origin/personal@7edfb1625...` are the explicit refresh inputs. Implementation must re-fetch and stop for re-analysis if Personal moves again before the merge.
- Generated application outputs are reproducible from canonical source and may be deleted/regenerated.
- The user wants the existing finalized behavior, not a greenfield rewrite.

## Risks / Open Questions

- Personal may advance again before finalization; delivery must refresh and repeat semantic integration against the then-current ref.
- Auto-merged files can contain semantic regressions despite no conflict marker; the two changed-both marker-free production paths and all application-facing clean provider paths in the 31-commit production delta require the recorded audit. The 32nd commit is separately verified as delivery-document-only.
- Exact source-file inventory may change while adapting to Personal's current owners, but behavior and boundary IDs may not drift.
- Full Electron/provider tests depend on the existing environment and credentials; unavailable infrastructure must be reported, not replaced by false proof.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-008 |
| REQ-002 | UC-001, UC-002, UC-008 |
| REQ-003 | UC-003, UC-006 |
| REQ-004 | UC-002, UC-004, UC-005, UC-007–UC-010 |
| REQ-005 | UC-003–UC-005, UC-009–UC-010 |
| REQ-006 | UC-002, UC-006, UC-008 |
| REQ-007 | UC-007–UC-010 |
| REQ-008 | UC-008–UC-010 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Intended Scenario |
| --- | --- |
| AC-001–AC-002 | Latest-ref ancestry, refresh parentage, worktree, 11-conflict, and marker-free semantic-resolution audit |
| AC-003–AC-004 | Maintained application CLI workflow and package parity |
| AC-005 | Current Personal run/team identity and lifecycle characterization plus application-scope construction proof |
| AC-006 | Fresh-root defaults and Studio override/reset/unavailable-model journeys |
| AC-007–AC-008 | Real Studio/standalone Agent Tools, handoff, publication, projection, recovery, and cleanup |
| AC-009 | Retained Personal provider/migration/model/event regression matrix |
| AC-010 | Source/derived/legacy inventory and regeneration proof |
| AC-011 | Full integrated source, API/E2E, package, and Electron evidence |
| AC-012 | Current/stale AutoByteus read, Save, direct agent/team, and external-runtime ownership matrix |
| AC-013 | Native provider error plus strict application agent/team message-only projection |
| AC-014 | Exact conflict deletion/contract/identity/no-retired-import audit |
| AC-015 | Complete refreshed latest-Personal and dual-host verification matrix |

## Approval Status

Approved requirements basis through the user's explicit instruction to keep the ticket on latest `origin/personal`; SR-004 is the bounded design response to delivery's newest-base Design Impact. No refresh implementation or Electron rebuild is authorized until architecture review passes.
