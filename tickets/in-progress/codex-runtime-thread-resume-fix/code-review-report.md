# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Trigger: Initial source/architecture review of commit `ddfb494e7df1647ebbeb44c77cfa77820f1acf17` on `codex/codex-runtime-thread-resume-fix`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: Round 1 / `CRR-001`
- Coverage Investigation Reviewed (failure-origin entry point): N/A
- Execution Coverage Report Reviewed (failure-origin entry point): N/A
- API/E2E Revision Record Reviewed (failure-origin entry point): N/A
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record Reviewed (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: N/A
- Exact Failing Commands / Execution Mode: N/A
- Failure Evidence Paths: N/A — the temporary reviewer probe command and observed output are recorded in `CODE-FIND-001`.

## Review Scope

- Changed implementation and behavior reviewed: The complete source delta from base `2b0f8ea99296bb3f983c497d1f5c00a4d839f404` to `ddfb494e7df1647ebbeb44c77cfa77820f1acf17`, covering private AgentRun candidates, team binding durability, direct-task activation, standalone durability/admission, activity guarding, exact Codex restore, and Claude UUID lifecycle.
- Files / areas reviewed: All 37 changed production TypeScript files under `autobyteus-server-ts/src`, their relevant unchanged callers/contracts, the affected execution-tree and runtime models, and the cumulative upstream artifact package.
- Explicit exclusions: Raw retained browser images/logs were used through their canonical evidence summaries rather than re-running the pre-fix reproductions. API/E2E coverage maintenance and realistic post-fix execution remain downstream-owned. The separately excluded Electron/database migration issue was not reviewed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Provider-native identity must be durable before input, known identities must resume exactly or fail, local history remains independent, and native Autobyteus team runtimes must remain valid with a null provider binding.
- Design-spec behavior map verified against the implementation: Partially. The Codex, Claude, root durability, candidate, activity, direct-task, and standalone paths are implemented substantially as reviewed. The native-neutral branch of `BEH-003` is contradicted by the handle implementation.
- Design review report and round confirmed: Yes — `ARCH-REV-002` / round 2 passed the cumulative design after `ARCH-FIND-001` and `ARCH-FIND-002` were resolved.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: None. The defect is against already-approved and explicitly preserved `BEH-003` behavior.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Team command -> one `MixedAgentMemberHandle` readiness promise -> one private external candidate -> root lock-head binding commit -> synchronous publication; restore uses exact stored ID. | N/A |
| `BEH-002` | Confirmed | Local memory/history remains separate; readiness failures project an agent `ERROR` plus rejected operation without rewriting history. | N/A |
| `BEH-003` | Contradicted | Configured and direct-task handles stage/adopt any non-null `candidate.platformAgentRunId`; recursive root mutation and task-transaction integration are otherwise present. | Requirements lines 19, 63, 79, 98, and 114 preserve native null binding. `AutoByteusAgentRunBackend.getPlatformAgentRunId()` returns the local `runId` (`src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts:99-101`). `MixedAgentMemberHandle` adopts/stages every truthy candidate ID without checking external runtime (`:129-135`, `:227-235`). After persistence, the same handle selects strict platform restore from any truthy binding (`:217-225`), while `AgentRunManager` rejects `platformAgentRunId === runId` (`src/agent-execution/services/agent-run-manager.ts:113-120`). |
| `BEH-004` | Confirmed | Standalone restore enters the one-flight activation owner, reconstructs exact external provider state, reconciles metadata, and publishes only afterward. Native standalone restore retains its native manager path. | N/A |
| `BEH-005` | Confirmed | Null external team state is classified from active plus complete archived traces before a private create candidate is prepared. | N/A |
| `BEH-006` | Confirmed | Prior-activity/null and unreadable activity fail before provider creation; Codex known-ID restore uses `thread/resume` only. | N/A |
| `BEH-007` | Confirmed | Fresh Claude reserves one UUID, team root adopts before publication, SDK create uses `sessionId`, later queries use `resume`, and stream UUIDs confirm exactly. | N/A |
| `BEH-008` | Confirmed | Standalone Claude uses one activation promise, persists the reserved UUID before publication/input, and restores through exact provider state. | N/A |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The refactor establishes the reviewed root, handle, manager-candidate, standalone, and provider lifecycle owners. | None beyond `CODE-FIND-001`. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Codex/Claude reproduction premises and provider identity contracts are reflected in exact resume and UUID lifecycle code. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | External spines are preserved, but native candidates enter the external binding/adoption and later strict-restore spine. | Resolve `CODE-FIND-001`; retain native null and native activation/restore routing. |
| Ownership boundary preservation and clarity | Pass | Root owns durable team bindings; task activation owns staged pre-node bindings; standalone service owns metadata admission; manager owns candidate/registry lifecycle. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Activity inspection, stores, provider adapters, event projection, and cleanup remain attached to explicit owners. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Existing persistence coordinator, tree mutator, metadata/catalog, and provider managers are extended; new files cover genuinely missing candidate, standalone, activity, and Claude lifecycle owners. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | `TeamAgentPlatformBinding`, `AgentRunActivationCandidate`, strict metadata state, and Claude discriminated binding are reused at their owning boundaries. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | New structures have one narrow meaning and no optional kitchen-sink representation. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | One handle readiness promise and one standalone activation map replace duplicated coordination. | None. |
| Empty indirection check (no pass-through-only boundary) | Pass | New candidate, standalone activation, and activity files each own concrete state or classification. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Manager/candidate, standalone activation/provisioning/facade, root/mutator/persistence, and Claude lifecycle/client responsibilities remain distinct. | None. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Pass | Handles use the root acceptor rather than stores; standalone activation uses metadata/catalog and candidate APIs; provider code has no team/root dependency. | None. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | No caller introduced mixed root/store, standalone/store bypass, or team/provider shortcut. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Added files are placed under agent execution, agent memory, team domain/task delegation, and Claude client/session owners. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | The larger lifecycle changes are split by real state ownership without pass-through fragments. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Fail | Interfaces are mostly explicit, but the team handle treats the generic backend `platformAgentRunId` as provider-native without applying the reviewed external-runtime eligibility rule. | Resolve `CODE-FIND-001` at the team handle boundary rather than broadening root/provider semantics. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Candidate, binding, lifecycle, strict metadata, and lock-head mutation names align with responsibility. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Candidate cleanup/claim logic and activation ownership are centralized. | None. |
| Patch-on-patch complexity control | Pass | Obsolete eager, refresh, fallback, placeholder, and rebinding paths were removed instead of wrapped. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Searches found no retained eager manager APIs, capture/refresh path, Codex fallback, Claude placeholder/rebinding/inference, or duplicate activation maps. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | The handoff's focused evidence does not cover the required native-null branch, and the reviewer probe falsifies it. Existing affected durable suites are also awaiting downstream coverage investigation. | Correct `CODE-FIND-001`; after source re-review, downstream coverage must include configured and direct-task native-null preservation plus restart behavior. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | No durable test file changed in this implementation round; current failures are disclosed for downstream classification rather than compatibility-patched. | Downstream coverage investigation remains required. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | No new compatibility tests were added. Existing affected tests are explicitly disclosed and must be classified by `api_e2e_engineer`; source review does not infer their validity from failure alone. | Downstream coverage investigation remains required. |
| API/E2E readiness for the next workflow stage | Fail | The native team preservation requirement is currently violated before API/E2E begins. | Return to `implementation_engineer`, then repeat source review before API/E2E. |

## Source File Size And Structure Audit (If Applicable)

Effective-line counts exclude blank and line-comment-only lines. The delta trigger counts added plus deleted source lines against base `2b0f8ea99`; it is diagnostic, not an automatic failure.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | 76 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/backend/claude-agent-run-context.ts` | 42 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-provider-session-lifecycle.ts` | 81 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session-manager.ts` | 161 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session-message-cache.ts` | 39 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session-state-input.ts` | 30 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session.ts` | 488 | Pass | Pass | Pass — cohesive turn/session lifecycle, near hard limit but not expanded beyond it | Pass | Monitor only | Avoid unrelated growth. |
| `agent-execution/backends/codex/thread/codex-thread-manager.ts` | 213 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/errors.ts` | 45 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-activation-candidate.ts` | 66 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-command-coordinator.ts` | 271 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-manager.ts` | 372 | Pass | Triggered (482-line rewrite delta) — acceptable after extracting candidate and standalone policy | Pass | Pass | None | None |
| `agent-execution/services/agent-run-provisioning-service.ts` | 262 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-service.ts` | 257 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/standalone-agent-run-activation-service.ts` | 251 | Pass | Triggered (271 added lines) — cohesive new durability/admission owner | Pass | Pass | None | None |
| `agent-memory/services/agent-conversation-activity-inspector.ts` | 74 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | 394 | Pass | Pass | Fail — external provider eligibility is not applied before binding/adoption/restore | Pass | `Local Fix` / `CODE-FIND-001` | Gate provider binding and strict platform restore to external runtimes; preserve native null. |
| `agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | 62 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | 164 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/members/mixed-task-team-execution-registry.ts` | 166 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-team-manager.ts` | 278 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | 121 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-team-run-context.ts` | 52 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/domain/prepared-task-execution.ts` | 18 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/domain/root-team-run.ts` | 448 | Pass | Pass | Pass — cohesive root boundary, near hard limit | Pass | Monitor only | Avoid unrelated growth. |
| `agent-team-execution/domain/team-agent-platform-binding.ts` | 40 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/agent-team-run-manager.ts` | 223 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-execution-tree-mutator.ts` | 203 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-persistence-contract.ts` | 116 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-persistence-coordinator.ts` | 202 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-service.ts` | 194 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/task-delegation/task-delegation-execution-resolution.ts` | 39 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/task-delegation/task-delegation-service.ts` | 500 | Pass (not greater than 500) | Pass | Pass — cohesive task policy owner at limit | Pass | Monitor only | Avoid unrelated growth; split only along a real owner if it grows. |
| `run-history/services/agent-run-metadata-service.ts` | 35 | Pass | Pass | Pass | Pass | None | None |
| `run-history/store/agent-run-metadata-store.ts` | 113 | Pass | Pass | Pass | Pass | None | None |
| `runtime-management/claude/client/claude-sdk-client.ts` | 453 | Pass | Pass | Pass — existing cohesive SDK adapter | Pass | Monitor only | Avoid unrelated growth. |
| `runtime-management/claude/client/claude-sdk-session-binding.ts` | 3 | Pass | Pass | Pass | Pass | None | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No version-specific or historical behavior branch was added. |
| No legacy old-behavior retention in changed scope | Pass | Eager manager publication, late team refresh, Codex resume fallback, Claude placeholder/rebinding, and duplicate activation maps are removed. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Source searches found no retained production references to the removed mechanisms. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Existing current-schema fields are used directly; no migration or dual schema path was introduced. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Strict current-state reads and exact restore are used. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Decision remains `Directly Usable — No Migration`; broken null/placeholder histories fail closed. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `No`
- Why: The change repairs existing continuity guarantees and does not add a public API, configuration option, or supported workflow. Ticket/review artifacts already describe the operational behavior; delivery may still record no-impact against integrated state.
- Files or areas likely affected: N/A

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status (`Confirmed`/`Reclassified`/`No Longer Relevant`) | Changed Evidence / Reason (Required For `Reclassified` Or `No Longer Relevant`) |
| --- | --- | --- |
| `PREM-ARCH-001` | Confirmed | N/A |
| `PREM-ARCH-002` | Confirmed | N/A |

No new or reclassified premise is required. `CODE-FIND-001` follows directly from approved `BEH-003`/`REQ-003`/`AC-005` and a supported native team execution path; it does not rely on a hypothetical failure state.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 8.66
- Overall score (`/100`): 86.6
- Score calculation note: Simple average of the ten mandatory categories. The native preservation defect independently fails the review regardless of the average.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.5 | External team, task, standalone, return/error, and candidate spines are implemented coherently. | Native team candidates are incorrectly routed into external provider binding and strict platform restore. | Keep native team execution on its null-binding/native lifecycle while external candidates alone enter binding adoption. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.2 | Root, task, manager, standalone, memory, and provider authorities are explicit and no store bypass was introduced. | The team handle applies the right root owner to the wrong runtime category. | Preserve the owner model while correcting runtime eligibility locally. |
| `3` | `API / Interface / Query / Command Clarity` | 8.8 | Candidate, binding, strict metadata, and SDK interfaces are narrow and explicit. | `candidate.platformAgentRunId` is consumed as provider-native at the team boundary even though the native backend returns its local run ID through that generic interface. | Make the external-runtime eligibility rule explicit at handle binding/restore decisions. |
| `4` | `Separation of Concerns and File Placement` | 9.1 | New owners are sensibly separated and placed; large files remain cohesive. | Several files are near size limits, but no current responsibility split is missing. | Keep future growth owner-driven; no immediate split required. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.1 | Binding, candidate, lifecycle, and strict-state shapes are tight and reusable. | The binding value intentionally lacks runtime type, so correct eligibility depends on the handle boundary. | Enforce eligibility at the handle without widening the root binding model. |
| `6` | `Naming Quality and Local Readability` | 9.1 | Names align well with lifecycle and ownership; control flow is generally traceable. | Dense lifecycle files require careful reading but remain coherent. | Keep follow-up fix narrow and explicit. |
| `7` | `API/E2E Readiness` | 7.5 | Build/type checks pass and most target paths are structurally ready. | A required preserved native path is already contradicted, and AC-005 native-null evidence is absent. | Fix and re-review before coverage investigation/execution advances. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.0 | Codex/Claude exact continuation and durability mechanics align strongly with the reviewed behavior. | Native configured/direct-task activation persists the local run ID as a provider binding; restart then rejects that self-ID through strict restore. | Resolve `CODE-FIND-001` and prove native tree/context binding remains null across activation/restart. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.2 | Obsolete fallback, refresh, placeholder, and duplicated coordination paths are removed cleanly. | No material legacy weakness found. | None. |
| `10` | `Cleanup Completeness` | 9.1 | Changed production searches and diffs show the intended obsolete paths removed. | Durable test cleanup/updates remain downstream-owned and unclassified. | Complete coverage investigation after source passes. |

## Findings

### `CODE-FIND-001` — Native team runtimes are persisted as external provider bindings and fail strict restore

- Severity: High
- Classification: `Local Fix`
- Affected approved behavior / requirements: `BEH-003`, `REQ-003`, `AC-005`; preserved native Autobyteus team behavior in requirements lines 11, 19, 63, 79, 92, 98, and 114.
- Supported initiating trigger and forward production path: A user uses the existing team conversation surface to send a normal message to a configured Autobyteus member, or normal task delegation activates a direct Autobyteus task agent. `RootTeamRun.executeAgentCommand` / task preparation reaches `MixedAgentMemberHandle`; the AutoByteus backend reports `getPlatformAgentRunId() === local runId`; the handle stages or root-adopts that truthy value and publishes the run. After the supported full server restart/reopen operation, restored config carries the self-ID; the first message enters `prepareRestoreAgentRunFromPlatformState`, which rejects `platformAgentRunId === runId` as invalid before native execution can resume.
- Source evidence:
  - `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts:99-101` returns the local `runId` from `getPlatformAgentRunId()`.
  - `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts:129-135` stages any truthy candidate ID during direct-task preparation.
  - `src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts:217-235` selects strict platform restoration for any truthy context binding and root-adopts any truthy candidate ID, without checking `isExternalProviderRuntimeKind`.
  - `src/agent-execution/services/agent-run-manager.ts:113-120` rejects a persisted provider ID equal to the local run ID.
- Reviewer execution evidence: `node /tmp/review-native-binding-probe.mjs` against the built modules produced `{"acceptedBinding":{"execution":{"rootTeamRunId":"root_probe","memberAddress":"/native_member","agentRunId":"native_probe_run"},"platformAgentRunId":"native_probe_run"},"contextBinding":"native_probe_run"}`. This demonstrates the production handle accepts and mirrors the native local ID as a team platform binding.
- Material consequence: New configured and direct-task native team executions no longer retain null as required. Once physically persisted, their first post-restart activation is rejected as `PLATFORM_AGENT_RUN_BINDING_INVALID`, regressing a supported runtime that the change must preserve.
- Required action: At the `MixedAgentMemberHandle` team lifecycle boundary, make provider-binding staging/adoption and strict platform-state restoration conditional on an external provider runtime. A native candidate's generic backend ID must not become `TeamAgentPlatformBinding` or the member-context/tree binding; native team activation must retain null and continue through its native lifecycle. Do not broaden root binding semantics or add a compatibility fallback. Provide focused implementation evidence for configured and direct-task native null preservation and post-restart readiness; durable coverage remains subject to the later coverage investigation.
- Why proportionate: The reviewed architecture already places runtime adaptation in the handle and keeps the root provider-neutral. The correction is bounded to applying the approved runtime eligibility rule at that existing boundary.

## Classification

`Local Fix` — the reviewed design is adequate; the defect is a bounded implementation error in team runtime eligibility/routing.

## Recommended Recipient

`implementation_engineer`

Implementation-owned correction must return through source review before API/E2E coverage investigation and execution.

## Residual Risks

- Existing focused unit suites contain intentionally obsolete contracts (handoff: 19 passed / 41 failed); `api_e2e_engineer` must classify and maintain durable coverage after source passes.
- Historical external team null bindings and standalone Claude local-ID placeholders remain intentionally non-recoverable.
- A durably reserved but not provider-materialized Claude UUID can fail exact resume after abrupt restart; fail-closed behavior is approved.
- Cleanup uncertainty can leave an unused remote artifact, but the candidate claim/quarantine must keep it unpublished and prevent same-process replacement.

## Latest Authoritative Result

- Review Decision: **Fail**
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Score Summary: `8.66/10` (`86.6/100`); API/E2E readiness and runtime fidelity are below the clean-pass threshold because of `CODE-FIND-001`.
- Failure Origin (when applicable): N/A — initial implementation review.
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: The external Codex/Claude continuity architecture is substantially and cleanly implemented, but approved native-null preservation is contradicted. Do not advance to API/E2E until the local fix is re-reviewed.
