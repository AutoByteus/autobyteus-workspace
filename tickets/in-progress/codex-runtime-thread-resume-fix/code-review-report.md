# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/autobyteus-runtime-reproduction-evidence.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`, `ARCH-REV-002`, `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Trigger: `implementation_engineer` rework `IR-002` at commit `1d0452235a5d5fa1311c15e497f0115361414f4e`, addressing `CODE-FIND-001` and implementing the superseding SR-004 / ARCH-REV-003 native-continuity scope.
- Prior Review Round Reviewed: Round 1 / `CRR-001` — Fail, `Local Fix`
- Latest Authoritative Round: Round 2 / `CRR-002`
- Coverage Investigation Reviewed: N/A
- Execution Coverage Report Reviewed: N/A
- API/E2E Revision Record Reviewed: N/A
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record Reviewed: N/A
- Relevant Delivery Revision IDs: N/A
- Failing Scenario IDs: N/A
- Exact Failing Commands / Execution Mode: N/A
- Failure Evidence Paths: N/A

## Review Scope

- Changed implementation and behavior reviewed: the complete cumulative source delta from base `2b0f8ea99` through `IR-002`, with re-review emphasis on external-only binding, root/configured/task materialization provenance, workspace activation, native same-run restoration, nested configured composition, and preservation of SR-003 candidate/durability/provider/standalone invariants.
- Files / areas reviewed: all cumulative changed production files listed in the source audit; the complete `ddfb494e7..1d0452235` production/test delta; root command ingress, `RootTeamRun`, `TeamRunResolver`, mixed root/subteam/member factories and contexts, native/external candidate APIs, workspace and activity owners, root binding/task publication, provider lifecycle, and seven focused unit/narrow-integration files.
- Reviewer checks: `pnpm exec tsc -p tsconfig.build.json --noEmit` passed; the seven claimed focused files passed 29/29 on reviewer rerun; cumulative `git diff --check` passed; built-module direct-handle and `TeamRunResolver` overlap probes reproduced `CODE-FIND-002` without modifying repository source.
- Explicit exclusions: API/E2E coverage investigation and realistic browser/provider execution remain downstream-owned. The repository-wide test-typing TS6059 configuration issue and already-disclosed stale durable contracts are not reclassified by this source review.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — the cumulative approved scope is exact Codex/Claude provider continuation plus configured native working-context restoration, requested-workspace activation, external-only team bindings, configured-descendant restore inheritance, explicitly fresh task executions, and joined first-command readiness.
- Design-spec behavior map verified against the implementation: Mostly. `CODE-FIND-001` is resolved, and the new native activation plan matches the reviewed design for a single materialized configured path. The configured-subteam composition boundary does not join overlapping materialization callers, so the supported overlap path can reject a command before it reaches the one agent-handle readiness promise.
- Design review report and round confirmed: `ARCH-REV-003` Pass, including `PREM-ARCH-001` and `PREM-ARCH-004` reachability.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: None. `CODE-FIND-002` contradicts already-approved overlap and configured-descendant behavior; it does not establish a new product behavior.
- Remaining material ambiguity, if any: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Configured external candidate -> root binding adoption -> lock-head durability -> synchronous publication; restored binding -> strict provider restore. | N/A |
| `BEH-002` | Confirmed | Local history remains independent; external/native activation completes or rejects before first new input. | N/A |
| `BEH-003` | Confirmed | `MixedTeamRunBackendFactory` discards native self-bindings, and `MixedAgentMemberHandle.createExternalBinding()` gates validation/adoption to external runtime kinds. Direct native tasks stage no binding. | N/A |
| `BEH-004` | Confirmed | Standalone exact-ID metadata selection and strict private restoration remain under `StandaloneAgentRunActivationService`. | N/A |
| `BEH-005` | Confirmed | Fresh external paths use the complete-corpus guard; restored native `none` selects new; no provider identity is invented. | N/A |
| `BEH-006` | Confirmed | Known external restore is strict; prior activity plus null binding rejects; Codex has no resume-to-start fallback. | N/A |
| `BEH-007` | Confirmed | Claude reserved UUID creation, exact subsequent/restored resume, root durability, and stream confirmation remain intact. | N/A |
| `BEH-008` | Confirmed | Standalone one-flight still orders exact UUID metadata durability before publication/input. | N/A |
| `BEH-009` | Contradicted | Root restore mode reaches configured descendants; a materialized native agent with activity selects generic same-run restore. However, `MixedSubTeamMemberHandle` has no in-flight materialization promise. | Two supported overlapping `SEND_MESSAGE` commands to an as-yet-unmaterialized configured nested member both create child `TeamRun` wrappers; `TeamRunResolver` registers one and rejects the other as already registered before the shared agent readiness path. See `CODE-FIND-002`, `PREM-ARCH-001`, and `PREM-ARCH-004`. |
| `BEH-010` | Confirmed | Non-null roots call `WorkspaceManager.ensureWorkspaceByRootPath()` before context building, activity inspection, or candidate construction; the returned ID is used. | N/A |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Root provenance, workspace ownership, handle activation planning, native/external restore separation, and candidate publication follow SR-004/SR-003. | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Native base/personal evidence is addressed by restore-mode propagation, workspace ensure, generic native restore, and external-only binding. | None |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | DS-012/DS-013 are clear for one resolved child, but nested configured materialization is not single-flight under the approved overlapping ingress path. | Resolve `CODE-FIND-002`. |
| Ownership boundary preservation and clarity | Pass | Root, workspace, activity, candidate, provider, task, and standalone authorities remain separated; the missing join is local to the existing subteam-handle owner. | None beyond the local fix. |
| Off-spine concern clarity | Pass | Workspace, activity parsing, provider protocol, cleanup, and event projection remain owned off the main line. | None |
| Existing capability/subsystem reuse check | Pass | Existing WorkspaceManager, activity inspector, generic native restore, root persistence, and candidate lifecycle are reused. | None |
| Reusable owned structures check | Pass | Activation mode, private plan, candidate, binding, and activity union remain tight and owned. | None |
| Shared-structure/data-model tightness check | Pass | Runtime kind governs binding relevance; no persisted mode or widened binding DTO was introduced. | None |
| Repeated coordination ownership check | Fail | Agent readiness is joined, but repeated configured-child materialization callers are not joined by `MixedSubTeamMemberHandle`. | Add one handle-owned in-flight child materialization promise. |
| Empty indirection check | Pass | Explicit root create/restore and configured/fresh-task factory methods encode distinct subjects rather than pass-through aliases. | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Files align with the reviewed responsibility map; the 469-line member handle remains cohesive but near the hard limit. | Monitor only. |
| Ownership-driven dependency check | Pass | No store/provider/standalone bypass or new cycle was found. | None |
| Authoritative Boundary Rule check | Pass | Callers use RootTeamRun, WorkspaceManager, candidate APIs, and standalone activation owners rather than their internal stores/managers. | None |
| File placement check | Pass | New mode, plan, errors, and factory changes reside in their owning capability folders. | None |
| Flat-vs-over-split layout judgment | Pass | The changed layout is navigable and the removed generic factory eliminates conflicting abstraction. | None |
| Interface/API/query/command/service-method boundary clarity | Pass | Create/restore, configured-child/fresh-task, generic-native/strict-external, and external binding interfaces have explicit subjects. | None |
| Naming quality and naming-to-responsibility alignment check | Pass | `configuredMemberActivationMode`, `restore_native`, and the explicit factory method names match lifecycle meaning. | None |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No duplicated activation plan, workspace registry, or provider-binding structure was added. | None |
| Patch-on-patch complexity control | Pass | The rework replaces ambiguous paths rather than layering a truthy-ID compatibility patch. | None |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Ambiguous `createOrRestore`, restore runtime-context reconstruction, and unused generic TeamRun factory interface are removed; searches found no production references. | None |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | The 29 focused tests cover native null binding, workspace ordering, restore/new/failure, root mode, task freshness, and real native restore. The configured-subteam test is sequential only and misses supported overlapping materialization. | Add a latch-based nested/subteam overlap test through the resolver or equivalent production boundary. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Current fixtures and focused native handle helper are coherent; source-size thresholds are not applied to tests. | None |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Changed tests target current explicit contracts. Broader old-suite maintenance remains disclosed for coverage investigation. | None |
| API/E2E readiness for the next workflow stage | Fail | A normal overlapping nested configured command can be rejected before candidate readiness, so source is not ready for downstream API/E2E sign-off. | Return to `implementation_engineer`, then source re-review. |

## Source File Size And Structure Audit (If Applicable)

Effective-line counts exclude blank and line-comment-only lines. Delta is added plus deleted source lines against base `2b0f8ea99`; it is diagnostic, not an automatic failure.

| Source File | Effective Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | 76 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/backend/claude-agent-run-context.ts` | 42 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-provider-session-lifecycle.ts` | 81 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session-manager.ts` | 161 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session-message-cache.ts` | 39 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session-state-input.ts` | 30 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/backends/claude/session/claude-session.ts` | 488 | Pass | Pass | Pass — cohesive provider session lifecycle near limit | Pass | Monitor | Avoid unrelated growth. |
| `agent-execution/backends/codex/thread/codex-thread-manager.ts` | 213 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/errors.ts` | 45 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-activation-candidate.ts` | 66 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-command-coordinator.ts` | 271 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-manager.ts` | 372 | Pass | Triggered (482-line rewrite delta) | Pass after candidate/standalone extraction | Pass | None | None |
| `agent-execution/services/agent-run-provisioning-service.ts` | 262 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/agent-run-service.ts` | 257 | Pass | Pass | Pass | Pass | None | None |
| `agent-execution/services/standalone-agent-run-activation-service.ts` | 251 | Pass | Triggered (271 added) | Pass — cohesive durability/admission owner | Pass | None | None |
| `agent-memory/services/agent-conversation-activity-inspector.ts` | 74 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | 469 | Pass | Triggered (306-line delta) | Pass — cohesive runtime-adaptation/readiness owner near limit | Pass | Monitor | Avoid unrelated growth. |
| `agent-team-execution/backends/mixed/members/mixed-configured-member-registry.ts` | 63 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | 69 | Pass | Pass | Fail — no in-flight materialization join | Pass | `Local Fix` / `CODE-FIND-002` | Join concurrent child materialization. |
| `agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` | 165 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/members/mixed-task-team-execution-registry.ts` | 166 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-sub-team-run-factory.ts` | 47 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-team-manager.ts` | 278 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | 129 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/mixed/mixed-team-run-context.ts` | 58 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/backends/team-run-backend-factory.ts` | Removed | N/A | Pass | Pass — obsolete conflicting interface removed | Pass | Cleanup complete | None |
| `agent-team-execution/domain/prepared-task-execution.ts` | 18 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/domain/root-team-run.ts` | 448 | Pass | Pass | Pass — cohesive root boundary near limit | Pass | Monitor | Avoid unrelated growth. |
| `agent-team-execution/domain/team-agent-platform-binding.ts` | 40 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/errors.ts` | 34 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/agent-team-run-manager.ts` | 235 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-execution-tree-mutator.ts` | 203 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-persistence-contract.ts` | 116 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-persistence-coordinator.ts` | 202 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/services/team-run-service.ts` | 194 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/task-delegation/task-delegation-execution-resolution.ts` | 39 | Pass | Pass | Pass | Pass | None | None |
| `agent-team-execution/task-delegation/task-delegation-service.ts` | 500 | Pass (not greater than 500) | Pass | Pass — cohesive task policy owner at limit | Pass | Monitor | Split only along a real owner if it grows. |
| `run-history/services/agent-run-metadata-service.ts` | 35 | Pass | Pass | Pass | Pass | None | None |
| `run-history/store/agent-run-metadata-store.ts` | 113 | Pass | Pass | Pass | Pass | None | None |
| `runtime-management/claude/client/claude-sdk-client.ts` | 453 | Pass | Pass | Pass — cohesive SDK adapter near limit | Pass | Monitor | Avoid unrelated growth. |
| `runtime-management/claude/client/claude-sdk-session-binding.ts` | 3 | Pass | Pass | Pass | Pass | None | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Runtime-kind-specific normal reading ignores an irrelevant native field; this is not a version branch or fallback. |
| No legacy old-behavior retention in changed scope | Pass | Eager publication, late refresh, Codex fallback, Claude placeholder/rebinding, ambiguous subteam composition, and native truthy binding are removed. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | The unused generic TeamRun backend-factory interface and obsolete APIs have no production references. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Existing current-schema facts are used directly under `Directly Usable — No Migration`. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | No dual schema or native rewrite path was added. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Valid external IDs remain exact; native self-ID fields are ignored by runtime semantics and new native bindings remain null. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `No`
- Why: The change repairs an existing continuity contract without adding a public API, option, or workflow. Ticket artifacts already describe the operational behavior.
- Files or areas likely affected: N/A

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `PREM-ARCH-001` | Confirmed | N/A |
| `PREM-ARCH-002` | Confirmed | N/A |
| `PREM-ARCH-003` | Confirmed | N/A |
| `PREM-ARCH-004` | Confirmed | N/A |

No new or reclassified premise is required. `CODE-FIND-002` uses the independently supported overlapping `SEND_MESSAGE` path from `PREM-ARCH-001` and the configured-descendant path from `PREM-ARCH-004`.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 8.89
- Overall score (`/100`): 88.9
- Score calculation note: Simple average of the ten categories. The supported nested-overlap defect independently fails review regardless of the average.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.6 | External, native, task, standalone, and failure spines are otherwise coherent. | Configured-descendant materialization forks under overlap before the shared agent spine. | Join one child materialization at the configured subteam handle. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 8.8 | Major authorities remain explicit and correctly separated. | The subteam handle owns child materialization but does not own its in-flight coordination. | Add the missing handle-owned promise without widening the root or factory. |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Fresh/restore and configured/fresh-task interfaces are explicit; native/external candidate APIs remain distinct. | No material interface ambiguity remains. | None beyond preserving current shapes. |
| `4` | `Separation of Concerns and File Placement` | 9.1 | The rework follows the reviewed file map and removes conflicting abstraction. | Several cohesive lifecycle files are near size limits. | Avoid unrelated growth. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Mode, plan, candidate, binding, and runtime-kind semantics are tight. | No material data-model weakness found. | None. |
| `6` | `Naming Quality and Local Readability` | 9.2 | Lifecycle and subject names make the new routing readable. | The large member handle remains dense but coherent. | Keep the local follow-up narrow. |
| `7` | `API/E2E Readiness` | 8.4 | Production typing and 29 focused tests pass, including real native restore. | The nested overlap case is absent and currently rejects one supported command. | Add focused coverage and re-review before API/E2E. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.2 | `CODE-FIND-001`, native restore, workspace ordering, and task freshness are correctly implemented. | Two first commands to an unmaterialized configured descendant can produce split TeamRun wrappers and one rejection. | Enforce one materialization result for all overlapping callers. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.3 | Obsolete fallback, placeholder, refresh, and ambiguous factory paths are cleanly removed. | No material legacy weakness found. | None. |
| `10` | `Cleanup Completeness` | 8.9 | Intended obsolete source is removed and normal candidate cleanup remains sound. | The overlap race temporarily leaves distinct active child wrappers under resolver/handle ownership until teardown. | Prevent duplicate child construction rather than cleaning it after divergence. |

## Findings

### `CODE-FIND-002` — Configured subteam materialization is not single-flight, so an overlapping first command is rejected

- Severity: Medium
- Classification: `Local Fix`
- Affected approved behavior / requirements: `BEH-009`; `REQ-012`; `AC-019`; retained SR-003 joined-readiness contract; `PREM-ARCH-001` and `PREM-ARCH-004`.
- Supported initiating trigger and forward production path: On the supported team-conversation surface, a user or normal system delivery sends two `SEND_MESSAGE` commands close together to an agent inside the same configured nested team before that child TeamRun is materialized. Each WebSocket command independently reaches `RootTeamRun.executeAgentCommand()` -> `requireContainingTeamRun()` -> `TeamRunResolver.requireConfigured()`. Both calls observe no registered child and call the same `MixedSubTeamMemberHandle.getOrCreateTeamRun()`. Because the handle stores only the completed `childRun`, each call invokes `materializeConfiguredChild()` and receives a different active wrapper. `TeamRunResolver.registerActive()` accepts the first and rejects the second as already registered, so the second normal command never reaches the configured agent's shared readiness/candidate promise.
- Source evidence:
  - `src/services/agent-streaming/agent-team-stream-handler.ts:159-175` independently accepts and awaits each normal message.
  - `src/agent-team-execution/services/team-run-resolver.ts:31-50` checks the active directory before awaiting child materialization, then registers the returned wrapper; lines 86-90 reject a different wrapper for the same TeamRun ID.
  - `src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts:64-74` checks only completed `childRun`, awaits the factory, and has no in-flight promise to join callers.
  - `tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts` validates sequential reuse only; it does not latch overlapping calls.
- Reviewer execution evidence: a built-module production-boundary probe invoked two concurrent `TeamRunResolver.requireConfigured("nested")` calls. Before resolution it observed `factoryCallsBeforeResolution: 2`; after resolving both wrappers, one call fulfilled and the other rejected with `TeamRun 'nested' is already registered.` A direct handle probe likewise produced two distinct promises and two distinct runs.
- Material consequence: A supported overlapping first message to a configured descendant is dropped/rejected before native restore or input admission. The parent handle and root resolver can also temporarily reference different active child wrappers, weakening lifecycle/status coherence until root teardown.
- Required action: Make `MixedSubTeamMemberHandle` join exactly one in-flight child materialization promise installed before the factory call, set `childRun`/`childRuntimeContext` once, and clear a failed attempt only when retry is safe. Add a latch-based test through `TeamRunResolver.requireConfigured()` or the equivalent production boundary proving two overlapping callers cause one factory call, receive the same TeamRun, avoid registration conflict, and proceed to one configured-agent readiness candidate.
- Why proportionate: The reviewed design already assigns configured-child materialization to this handle and already approves joined readiness. The correction is bounded to enforcing that invariant at the existing owner; no new persisted state, root policy, or design change is needed.

## Classification

`Local Fix` — the cumulative design is adequate; the remaining defect is a bounded missing single-flight at the existing configured-subteam materialization owner.

## Recommended Recipient

`implementation_engineer`

The source correction and focused overlap evidence must return through implementation review before API/E2E begins.

## Residual Risks

- Existing focused durable suites still contain obsolete contracts and require downstream coverage classification after source passes.
- Historical external null bindings, standalone Claude placeholders, and overwritten native snapshots remain intentionally non-recoverable.
- Native activity with missing/corrupt working state and exact provider restore failures remain fail-closed by design.
- Realistic isolated Codex, Claude, native AutoByteus, and standalone Claude restart coverage remains outstanding.
- Cleanup uncertainty can retain an unpublished remote artifact under quarantine; no replacement may be admitted in-process.

## Latest Authoritative Result

- Review Decision: **Fail**
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Score Summary: `8.89/10` (`88.9/100`); API/E2E readiness and runtime fidelity remain below clean-pass threshold because of `CODE-FIND-002`.
- Failure Origin (when applicable): N/A — implementation re-review.
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: `CODE-FIND-001` is resolved and the SR-004 native/external lifecycle is otherwise aligned. Do not advance to API/E2E until configured-subteam materialization joins supported overlapping callers and the local fix passes source re-review.
