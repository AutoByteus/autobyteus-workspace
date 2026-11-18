# Design Review Report — code-quality-leftovers (autobyteus-357)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/requirements-doc.md` (SR-001, Approved within the direction)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/solution-revision-record.md` (SR-001)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/design-spec.md` (SR-002); root `DESIGN.md` rule 11 (new)
- Supplemental Task Artifacts Reviewed: `merged-task-texts.md`; `follow-ups.md` (FU-001); `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: the Solution Designer's re-review request for SR-002 (commit `ebc5277e52`)
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail, AR-001…AR-003)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers` at `09e99c33bb` (base `efd28d5c4a`). Repo-wide `git grep` for every removed or renamed name. Files read:
  - autobyteus-ts: `llm-phase-summary-port.ts` 100–197
  - server: `recovery-native-fixture.ts` 27–55; `project-task-service.ts` 40–86, 250–285, 450–485; `project-store.ts` 196–212, 262–280; `task-execution-resource-release.ts` (whole); `codex-segment-turn-admission.ts` 53–97; `codex-thread.ts` 308–318; `standalone-root-member-view-projection-service.ts` 128–135; `api/rest/project-task-context-files.ts` (whole)

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`.
- Classification rationale reviewed: the payload is many small removals, but three structural surfaces change. GraphQL `ModelSourceStatus` loses a field, `BaseLLM` loses a method, and `ProjectTaskService` is split. That justifies High under the shared definition (a shared contract plus an ownership boundary). Confirmed.
- Independent Architecture Review required: `Yes`. Design approval: `Not required` (no behavior change). Consistent with the Task.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, except for the consumer inventory of 54.1/54.2 (AR-001).
- Approved intent understood: every leftover is fixed or reported with evidence; no behavior change; tests pass (REQ-001…REQ-005).
- Scope guardrail confirmed: Yes. Blocking findings trace to REQ-001, REQ-005, AC-001 and AC-004.
- Each item's evidence opened or searched:

| Item | Design claim | Verified | Result |
| --- | --- | --- | --- |
| 54.1 `releaseConversation` | Default no-op, no override; only caller the summary port | Yes: no override in any `src/`; caller `llm-phase-summary-port.ts` 188 | Confirmed |
| 54.2 `logicalConversationId` | "only consumer the deny-list" | **No.** No production reader, but 17 test/support files and 5 autobyteus-ts docs name it. The server `recovery-native-fixture.ts` 27, 47 parses `compaction_<id>_<attempt>` from it to recognise compaction requests and attempt 1. That fixture is used by 7 server test files and `test-support/native-input-history` | AR-001 |
| 54.3 / 54.4 `modelKind` | Always `LLM`; only reader is the web | Yes: no use in android, ios, gateway or applications. Missing from the inventory: `useRuntimeScopedModelSelection.ts` 9, 32; web e2e probe mocks `existing-run-model-config-probe.mjs` 225 and `fresh-run-auto-approval-probe.mjs` 171; server doc `llm_management.md` 91 | AR-003 |
| 107 | Dropped, not worth it | Accepted (within the direction) | Confirmed |
| 124 | Dropped, already done | Accepted on the investigation's cited evidence | Confirmed |
| 125.1 | Dead | Yes: no reference outside `applicationLaunch.ts` | Confirmed |
| 125.2 | Test-only | Yes: only the test at 227 | Confirmed |
| 125.3 | Unused import name | Accepted | Confirmed |
| 125.4 | Gone | Yes: only `.ts` files remain in `tests/integration/agent/` (`ccd725cf80`) | Confirmed |
| 125.5 | Unreachable | Yes: the only caller is guarded by `isCodexSegmentTurnAdmissionEventName` (`codex-thread.ts` 314), so the 92–97 condition cannot hold | Confirmed |
| 125.6 | Unread | Yes: `metadataFor` reads `source.launchConfiguration` (`standalone-root-member-view-projection-service.ts` 131), not the location field | Confirmed |
| 135 | Moved out (FU-001) | Accepted; FU-001 complete | Confirmed |
| 157 | 15 current files; frozen and sealed keep the names | Yes: no sealed migration imports the current writers. Some migration tests import current code (e.g. `team-context-file-execution-locators-v1.test.ts` imports current `MessageLog` and the frozen writer) | Confirmed; per-stub guidance in AR-003 |
| 158 | Already moved | Yes: only the frozen copy exists | Confirmed |
| 159 | Docs stale | Accepted | Confirmed |
| 178 | Test-only drain | Yes: no production caller; roots drain their own queues (`agent-org-run.ts` 382, `root-team-run.ts` 470). Removing the method leaves `TaskExecutionResourceRelease.drain` and its `inFlight` set dead | AR-002 |
| 147 | Drafts out; ≤ 470 lines | Plausible: about 47 effective lines move out against a few added (494 → about 450). The locks are file-path locks (`updateJsonFile`, `withFilePathLock`), so a second owner using the same process stores is safe | Confirmed; construction detail in AR-003 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `merged-task-texts.md` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` (FU-001) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | design § Task Design Health | — |
| Root cause explicit and evidence-backed | Pass | Legacy cleanup, vocabulary drift (157), file size (147) | — |
| Refactor decision explicit | Pass | 147 now | — |
| Supported by design sections | Fail | The 54.2 removal plan misses the test fixture that depends on the field | AR-001 |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Other items remove nodes from existing spines; no new spine needed.

## Boundary Encapsulation Verdict

| Boundary | Public Entry | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectTaskContextDrafts` | Pass | Pass | Pass | Pass | How the route obtains it is not stated (AR-003) |
| `TaskContextOwnership` | Pass | Pass | Pass | Pass | One owner for `assertOwner` and the reclaim |

## Dependency Direction / Forbidden Shortcut Verdict

`Pass`. Dependencies run `api/rest → project-task-context-drafts → task-context-ownership, ProjectTaskContextStore, ProjectStore`.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL `ModelSourceStatus` (−`modelKind`) | Pass | Pass | Pass | Low | Pass (DESIGN rule 9 clean cut) |
| `DynamicModelSourceLifecycle.status(key, modelCount)` | Pass | Pass | Pass | Low | Pass |
| `BaseLLM` (−`releaseConversation`) | Pass | Pass | N/A | Low | Pass |
| `ProjectTaskContextDrafts` six operations | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

`Pass`. The design reuses `ProjectTaskContextStore` and `ProjectStore`. The test release tracker replaces a production method used only by tests.

## Subsystem / Capability-Area Allocation Verdict

`Pass`.

## Reusable Owned Structures Verdict

`Pass` (`task-context-ownership.ts`, `tests/support/project-task-release-tracker.ts`).

## Shared Structure / Data Model Tightness Verdict

`Pass`. `ModelSourceStatus` gets tighter, and the write-result union keeps its members.

- Derived consumers listed with a decision for each (Principle 11): `Fail` (AR-001; AR-003 for the smaller omissions).
- One vocabulary (Principle 15): `Pass` (157 fixes a name that said "renamed" for appends).

## File Responsibility Mapping Verdict

`Fail` for the 54.1/54.2 row: it names 3 tests where 17 test/support files and 5 docs are affected (AR-001). Other rows `Pass`.

## Subsystem / Folder / File Placement Verdict

`Pass`. New files go in `src/projects/services/` and `tests/support/`.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| 54.1/54.2 | Pass | Fail | Fail | Fail | AR-001 |
| 178 | Pass | Pass | Fail | Fail | AR-002: `TaskExecutionResourceRelease.drain` and `inFlight` become dead |
| 54.3/54.4 | Pass | Pass | Fail | Pass with note | AR-003 |
| 125.x, 147, 157 | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

`Pass`. No aliases. Frozen and sealed code keeps released names by rule; that is not legacy retention.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| None | Not Affected | Pass: the 157 outcomes are in-process results, not stored and not in any contract | Pass | N/A | Pass | — |

## Change / Refactor Sequence Verdict

`Pass`, once AR-001 adds the fixture change to step 3.

## Example Adequacy Verdict

`Pass` for 157 and 178. An example is needed for the fixture's replacement compaction signal (AR-001).

## Material Premise Validation

None. Every finding rests on direct code evidence, not an assumed scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## Round 2 Re-Review (SR-002)

Basis: worktree at `ebc5277e52`. SR-002 changes `design-spec.md`, `requirements-doc.md`, `investigation-notes.md` and root `DESIGN.md` (rule 11). It also adds REQ-006/REQ-007 and AC-006/AC-007 under the user's direction of 2026-11-01, quoted in the requirements. The tables above are round 1 results. The rows that failed are rechecked here; unaffected rows stand.

| Finding | Recheck | Evidence | Status |
| --- | --- | --- | --- |
| AR-001 | Inventory and replacement signal | Investigation note 54.2 lists every reader (the recovery fixture and its 7 suites, native-input-history, the autobyteus-ts compaction and provider tests, the live-e2e harness, the real-e2e secret test, the docs). The new `isCompactionSummaryRequest(messages)` helper keys on `COMPACTION_SUMMARY_PROMPT` / `COMPACTION_SUMMARY_INSTRUCTION`. Both are exported from `autobyteus-ts/src/memory/compaction/compaction-summary-prompt.ts` 4, 15 (the package exports `./*`), and they are exactly what `compaction-summarizer.ts` 71–72 sends. Retry counting by adjacency has an example. The production compaction identity is kept as `invocationId`. Sequence step 3 refactors the doubles before removing the label. | Resolved |
| AR-002 | Dead `drain` / `inFlight` | In the Removal Plan; the tracker's `settled()` waits one macrotask for the stop logs | Resolved |
| AR-003 | (a) inventory; (b) construction; (c) 157 tests | (a) Added. (b) A `getProjectTaskContextDrafts()` singleton with `store`/`contextStore` dependencies defaulting to the process stores, plus a test reset; `TaskContextOwnership` takes the same getters. (c) "A test value follows the code it feeds", with each migration test checked by its import | Resolved |

New in SR-002:
- `DESIGN.md` rule 11 ("Tests follow the code; they never hold it back") states Principle 7's "code that only its own tests call" as a project rule. It is consistent with the general principles and has a concrete example. REQ-007 / AC-007: `Pass`.
- REQ-006 / AC-006 keep the same assertions in the refactored suites: `Pass`.

Updated verdicts: Derived consumers (Principle 11) `Pass`; File Responsibility Mapping `Pass`; Removal / Decommission `Pass`; Task Design Health "supported by design sections" `Pass`; Example Adequacy `Pass`.

## Review Decision

`Pass` (round 2).

## Findings

None open. AR-001…AR-003 are resolved (ARCH-REV-002).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notification.

## Residual Risks

- **Retry counting by adjacency.** The rule is "a compaction request right after a compaction request is the next attempt". It assumes no suite runs two separate compaction operations back to back with no agent turn between them. One case that would break it: a restart that begins a fresh operation on the same double. If a suite does that, its `compress` count changes. Distinguish the operations by something the double observes (for example, a new double per restart, or a change in the summarised history), not by bringing back a label.
- **Custom summary prompts.** The helper recognises only the default constants. A test that configures its own compaction prompt needs that prompt passed to the helper.
- **Parallel work.** Other teams may touch `project-task-service.ts` and the persistence coordinators; delivery re-integrates.
- **GraphQL field removal.** `ModelSourceStatus.modelKind` is removed as a clean cut, in the same release as its only reader (DESIGN rule 9).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (none needed)
- Notes: ARCH-REV-002 passes SR-002. task_size Large / architectural_risk High.
