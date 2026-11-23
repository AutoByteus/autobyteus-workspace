# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was required (`task_size=Medium`, `architectural_risk=High`) and selected; it passed (`ARCH-REV-002`), recommending `/implementation_engineer` with an informational notice to `/solution_designer`.
- Requirements doc: `requirements-doc.md` (Approved, SR-006)
- Investigation notes: `investigation-notes.md` (SR-005 evidence rows A-01..A-17)
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-006, `Ready`)
- Supplemental task artifacts: `probes/autobyteus-53-repro.test.ts` (disposable reproduction; its native cases are turned into the permanent unit tests this round adds — not committed as-is, and removed after use)
- Design review report: `design-review-report.md` (`Pass`)
- Architecture review revision record: `architecture-review-revision-record.md` (ARCH-REV-001 Fail → ARCH-REV-002 Pass)
- Triggering rework report, revision record, or evidence, when applicable: `N/A` (first implementation round)

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`

**IR-002 (this round):** fixes CRR-001 CR-001 (`Local Fix`, High): every Org member model save threw and failed with
`INTERNAL_ERROR`, because `AgentOrgRunManager` built a preview tree through the shared switch rule (`applyAgentOrgRunSelectionPatches`)
before validation had decided a continuation, and `patchAgent` now correctly throws without one. Fixed by splitting a
continuation-free "launch-only" preview (`previewAgentOrgLaunchConfigurations`, new in `agent-org-run-config-mutator.ts`)
out of the mutator, used only to read back each scope's proposed launch for validation; the actual commit still goes
through the real switch rule, after validation decides the continuation, unchanged.

While building IR-002's own required regression test (no prior test drove `AgentOrgRunManager`'s stopped save of a
configured Agent at all), self-validation found a second, pre-existing and independent defect: `ContainerConfigTrees.writeAgent`
and `withLaunch` (`container-config-trees.ts`) never wrote back a node's `platformAgentRunId`, so any Org-member save
whose continuation changes the session ID (every hand-over, undo or cross-runtime switch — not only this ticket's new
cases) silently kept the stale one on disk and the manager then reported `PERSISTENCE_INDETERMINATE` to the user instead
of `UPDATED`. This breaks the in-scope AC-008 "Save succeeds" outcome for every Org-member case, so it is this ticket's
functionality (the ticket-scope test: whose functionality is a Save of an Org member's model/runtime — this ticket's,
not other functionality), not a deferred follow-up. Fixed in the same two functions, in the same round.

Implements the design spec's `Change / Refactor Sequence` end to end: `RunContinuation`/`RunHandOver` types; the
selection service's continuation decision table and its options rewrite; `selectionContextFor`'s DEC-005 reference
model and `stoppedRunHandOver`; the switch rule's rewrite to apply a stated continuation instead of inferring one from
the runtime; the three save paths, the two options paths and the three `no_session` launch validators; the marker
text (DEC-008/N-4), the standalone Save message, the native help text (en, zh-CN) and the glossary. Every existing
test that pinned the old runtime-only rule is rewritten to the new rule (REQ-008), and the AC-006 (a)-(d), RS-08 and
DEC-007 cases get new unit coverage at both the selection-service and switch-rule levels, plus one new end-to-end
unit test (`StandaloneStoppedRunSelectionUpdater`) for the native model hand-over's own Save message and the two new
marker-text unit cases (DEC-008, N-4).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` → `Task Size And Architectural Risk`; confirmed unchanged by `design-review-report.md` → `Routing Classification Review`.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation touched exactly the files the design mapped (17 production files in `autobyteus-server-ts`, 2 locale files, `GLOSSARY.md`), all one-line-to-moderate changes within existing owners (see `git diff --stat`, largest file delta well under the 220-line escalation trigger). The shared switch rule and the validation contract still change across every stopped-run surface as designed, and `pendingRuntimeSwitch` still gains the new same-runtime legal state — no new owner, module or web-visible API field appeared during implementation.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review` (`get_handoff_rules`: `architectural_risk=High` → `/code_reviewer`).
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk; independent Code Review applies, not the direct-route self-review)
- New design impact or escalation trigger: `None`. The implementation matched the design's rule shape, file mapping and sequence exactly; no code path depended on the two agent runtimes differing beyond what the design already found (Risks section) and routed into the rewritten rule.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/BEH-002 | Every offered native model listed; Save accepted; next input hands over | `run-model-selection-service.ts` (`optionsWithEvidence`, `continuationFor`); `stopped-run-selection-context.ts`; `standalone-stopped-run-selection-updater.ts` | Done. Native options list every offered model unless `handOver === "unavailable"`; a capacity mismatch with `handOver === "available"` now returns `continuation: "hand_over"` instead of `invalid` |
| BEH-006 | Smaller offered AutoByteus model accepted, hand-over pending | `run-model-selection-service.ts` (`continuationFor`) | Done. Same decision table row as BEH-001/002 |
| BEH-005 | Equal/bigger verified capacity stays in the same session (preserved) | `run-model-selection-service.ts` (`continuationFor`, `fits` branch) | Done, unchanged outcome; new test confirms it still holds when the record cannot hand over too |
| BEH-003 | Runtime-switch undo/re-edit semantics preserved, with the reference now the pending switch's `from` (DEC-005) | `stopped-run-selection-context.ts` (`selectionContextFor`); `runtime-selection-rule.ts` (`applyRuntimeSelection`) | Done. AC-006 (a)-(d) and RS-08 covered by new `runtime-selection-rule.test.ts` cases; existing cases rewritten with their continuation stated explicitly (REQ-008) |
| BEH-004 | External-runtime model edit stays same-session (preserved) | `run-model-selection-service.ts` (`continuationFor`, external-runtime branch) | Done, unchanged outcome |
| DEC-006 | Non-switchable run (peer-started, application/system-owned) keeps today's refusal | `standalone-agent-run-eligibility.ts` (`stoppedRunHandOver` → `unavailable`) | Done. AC-009 covered by rewritten native-refusal unit tests |
| DEC-007 | A scope with no session (Team/Org default launch, never-started standalone run) accepts any offered model directly | `standalone-agent-run-eligibility.ts`, `team-run-delegated-launch-plan.ts`, `agent-org-run-manager.ts`, options callers, the three launch validators | Done. New unit test in `run-model-selection-service.test.ts`; `team-run-model-selection-save.test.ts` confirms the Team default scope never reads native capacity |
| REQ-006/DEC-008 | Same-runtime marker reads "Model changed from … to …" only when the model differs; N-4 keeps today's text for a stored same-runtime, same-model pending switch | `runtime-switch.ts` (`buildRuntimeSwitchBetween`) | Done. Two new unit cases in `runtime-switch-session-renewal.test.ts` (the model-hand-over case and the N-4 same-model case); `buildSessionRenewal` left untouched |
| REQ-007 | Truthful native help text and Save message | `standalone-stopped-run-selection-updater.ts`; `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | Done; no existing test pinned the old copy, so none needed rewriting (`Should` priority) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Exactly the design spec's `Final File Responsibility Mapping`, all in `autobyteus-server-ts/src` unless noted:

- `llm-management/domain/run-model-selection.ts` — `RunContinuation`, `RunHandOver`; `handOver` on both context types; `continuation` on the valid result.
- `llm-management/services/run-model-selection-service.ts` — the decision table (new private `continuationFor`); `optionsWithEvidence` lists all offered native models unless `handOver === "unavailable"`.
- `agent-execution/services/stopped-run-selection-context.ts` — the DEC-005 reference model (pending `from`, or the stored binding); `handOver` parameter.
- `agent-execution/services/standalone-agent-run-eligibility.ts` — new `stoppedRunHandOver(metadata)`.
- `agent-execution/services/standalone-stopped-run-selection-updater.ts` — passes `stoppedRunHandOver`; forwards `continuation`; the new same-runtime Save message.
- `run-history/domain/runtime-selection-rule.ts` — `RuntimeSelection.continuation`; `applyRuntimeSelection` rewritten to the two continuation branches.
- `agent-team-execution/services/team-run-delegated-launch-plan.ts`, `team-run-selection-mutator.ts` — `handOver` by `scopeKind`; `continuation` carried next to the patch in the target (the design's "implementer's choice" option), not added to the GraphQL-facing patch type.
- `agent-org-execution/services/agent-org-run-manager.ts`, `agent-org-run-config-mutator.ts`, `agent-org-run-service.ts` — the same shape for Org saves, options and the Org-create launch validator.
- `run-history/services/studio-run-model-config-service.ts` — options `handOver` for a standalone Agent and for Team scopes.
- `agent-execution/domain/runtime-switch.ts` — the marker text (DEC-008, N-4), `buildRuntimeSwitchBetween` only.
- `launch-preferences/launch-usability-check.ts`, `model-routing/model-routing-settings.ts` — `handOver: "no_session"` (AR-002).
- `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`, `GLOSSARY.md` — copy and glossary updates.
- IR-002: `agent-org-execution/services/agent-org-run-config-mutator.ts` (new `previewAgentOrgLaunchConfigurations`), `agent-org-execution/services/agent-org-run-manager.ts` (uses it for the pre-validation preview), `agent-org-execution/container/container-config-trees.ts` (`writeAgent`/`withLaunch` now persist `platformAgentRunId`).

Test files touched are listed in `implementation-revision-record.md`'s delta.

## Important Assumptions

- `RunContinuation` lives in `llm-management/domain/run-model-selection.ts` (pure types) and `run-history/domain/runtime-selection-rule.ts` imports it, per the design's stated preference and the architecture review's `Pass` on that exact direction.
- The Team/Org "normalized patch carries continuation" note was implemented by adding `continuation` next to `patch` on the internal `*SelectionTarget` types (not on the GraphQL-facing `*SelectionPatch` types), matching the design's explicit implementer's-choice fallback.
- `stoppedRunHandOver` classifies a run that cannot switch at all (`canSwitchRuntime` false) and was never started as `no_session` before `unavailable`, matching the design's builder ordering (`canSwitchRuntime` → `available`; `!startedAt` → `no_session`; else `unavailable`).

## Known Risks

- Carried from the design review (`design-review-report.md` → Residual Risks), unchanged by implementation:
  - the native→native path (AC-002) and the Team-member case (AC-008) are proven at the full E2E level only by the planned built-server E2E, not by this round's unit/integration coverage (IR-002 now does add direct unit coverage of `AgentOrgRunManager`'s own stopped save for a direct Org member and a Team-mounted member, closing the "no test drives this path at all" gap CRR-001 found, but a real end-to-end run through activation is still the API/E2E engineer's);
  - the editorial `requirements-doc.md` Document Status line still says "baseline SR-005" (Solution Designer's document, not touched here).
- IR-002 found and fixed, in round, a second pre-existing defect unrelated to the continuation decision itself: `ContainerConfigTrees` never wrote back an Org member's `platformAgentRunId` on any save that changes the session ID (see Current Implementation Summary). No other instance of the same shape was found: the standalone path (`agent-run-runtime-switch-commit.ts`) and the Team path (`TeamRunExecutionTreeStore`'s own write, used directly by `AgentTeamRunManager`, not through a second composed-write layer) both write the whole node object, so they were not exposed to this defect.
- No other new risk found during implementation. The one place the design flagged as needing care — a code path that infers "a switch" from different runtimes instead of reading `continuation` — was searched again during implementation; only `runtime-switch-recorder.ts:37` reads `from.runtimeKind`, unchanged and correct for a same-runtime hand-over.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Missing Invariant` (the switch rule inferred the continuation from whether the runtime differed, instead of a stated decision)
- Reviewed refactor decision: `Refactor Needed Now` (small — the continuation became an explicit input, decided by its evidence owner)
- Implementation matched the reviewed assessment: `Yes`. `applyRuntimeSelection` now has exactly two branches (`same_session` / else), both driven by `selection.continuation`; no runtime-equality branch remains anywhere in the rule.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the rewritten rule matches the design spec's target-shape example (`Concrete Examples / Shape Guidance`) field-for-field; the case checks there (undo, AR-001 rows, RS-08, a switch, an external edit, a native ≥ edit) are now permanent unit tests in `runtime-selection-rule.test.ts`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The runtime-only branches in `applyRuntimeSelection` (`runtime-selection-rule.ts:48-60` on the prior baseline), the native refusal for `available`/`no_session` callers, and the "fresh because null" inference in `selectionContextFor` are all removed, per the design's Removal / Decommission Plan; nothing else in the touched files was found dead.
- Dead code found elsewhere, added to `follow-ups.md`: `None`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`. `RunContinuation`/`RunHandOver` are each one field with one meaning; `currentModelIdentifier: null` keeps its single meaning ("another runtime than the last session"), decided only inside the selection service.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; no upstream routing was needed.
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case: `None` beyond the design's own recorded deviation (Principle 15, `pendingRuntimeSwitch` stored name; reviewed and passed in `design-review-report.md`).
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest touched file (`agent-org-run-service.ts`) is 324 effective non-empty lines; largest changed-line delta (`run-model-selection-service.ts`, `runtime-selection-rule.ts`) is well under 220 lines (see `git diff --stat`).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → `Persisted Data / State Transition Decision`
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: unchanged from the design's read-only scan of this node's app data (two same-runtime pending switches, one cross-runtime); the rule and the parser accept both shapes unchanged, confirmed by the N-4 unit test using exactly that shape (same runtime, same model) and by the existing pending-switch parser tests (unaffected, still passing).
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

None. No new dependency, environment variable, or build-step change.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `1f761bc8db` + this round's uncommitted diff | macOS, Node/pnpm workspace | Every changed `src` file; every changed/added test file | — (compile gate) | Pass | `evidence/IMP-01-server-typecheck.log` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` |
| IMP-02 | `npx vitest run tests/unit/llm-management tests/unit/run-history tests/unit/agent-execution tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/launch-preferences tests/unit/model-routing` (in `autobyteus-server-ts`) | same | macOS | The selection service, the switch rule, both standalone/Team/Org save paths, both options paths, the three launch validators, the marker text | BEH-001..006, AC-001, AC-003..006, AC-007 (rule-level), AC-009, DEC-007, REQ-006/DEC-008/N-4 | Pass | `evidence/IMP-02-focused-unit-suites.log` | `Test Files  310 passed \| 4 skipped (314)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | same | macOS | Whole server unit suite (incl. `tests/architecture`) | Regression check: every other server unit behavior | Pass | `evidence/IMP-03-server-unit-suite.log` | `Test Files  1072 passed \| 5 skipped (1077)` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `pnpm -C autobyteus-server-ts test:integration` | same | macOS | Whole server integration suite, incl. `agent-team-run-manager.integration.test.ts` and `team-agent-tools-mcp-lifecycle.integration.test.ts` (both construct a `modelSelectionValidator` fake touched by this change) | Regression check | Pass | `evidence/IMP-04-server-integration-suite.log` | `Test Files  92 passed \| 21 skipped (113)` |
| IMP-05 | `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-web guard:localization-boundary`; `pnpm -C autobyteus-web audit:localization-literals` | same | macOS | Web compiles the server's `src` through its cross-package tests; the two changed locale files | REQ-007/AC-010 (compile + localization-boundary gate only; no pinned-text test exists) | Pass | `evidence/IMP-05-web-typecheck-and-guards.log` | `[typecheck] PASS`; `[guard:localization-boundary] Passed.`; `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-06 (IR-002) | typecheck; `pnpm -C autobyteus-server-ts build`; `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` (the reviewer's reproduction); `tests/unit/agent-org-execution` + `tests/integration/agent-org-execution`; the new `agent-org-run-manager-model-selection-save.test.ts`; full server unit + integration suites; web typecheck | on top of `14c28a91f9` | macOS | `agent-org-run-config-mutator.ts`, `agent-org-run-manager.ts`, `container-config-trees.ts`, and everything downstream of them | AC-008 (Org member save), BEH-003 (Org member switch, preserved) | Pass | `evidence/IMP-06-crr001-fix-validation.log` | `Test Files 1073 passed \| 5 skipped (1078)`; `Test Files 92 passed \| 21 skipped (113)`; e2e `Tests 1 passed (1)`; new file `Tests 3 passed (3)` |

- Not run, and why (left to API/E2E, gated, needs a live system): the built-server E2E for the native→native model hand-over (AC-002), the Team-member case (AC-008), and a full rerun of the existing switch E2Es (AC-007 end-to-end) all need the fake LM Studio endpoint / scripted runtime harness that `api_e2e_engineer` owns, per the design's `Guidance For Implementation` and `Residual Risks`. The probe (`probes/autobyteus-53-repro.test.ts`) was copied into `tests/unit/llm-management/` and run once to confirm its old pinned assertions now fail against the fixed behavior (native options list both models; native capacity mismatch returns `valid`/`hand_over` instead of `invalid`); it was then deleted (disposable, not committed) — its two native-flip assertions are the same ones the new `run-model-selection-service.test.ts` cases now assert permanently.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`. The only web-visible change is two locale strings (`workspace.runModelConfig.nativeModelHelp`, en/zh-CN) read by existing, unchanged component code (`utils/existingRunModelHelp.ts` just returns the key; no component logic, layout, or interaction changed). The GraphQL contract and every other web-read shape are unchanged, per the design's `Change Scope` ("Keep the GraphQL contract unchanged; the web needs only the locale texts"). No new state, journey, or rendered surface to inspect.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002: on a native run whose saved model is gone, Save a smaller/gone-model replacement, then send a message — expect the marker "Model changed from … to …", the hand-over notice before the user text, the previous records archived, and the request going to the new model (fake LM Studio endpoint).
- AC-008: the same for a Team member, plus a Team default row on a gone model (accepted directly, no hand-over).
- AC-007: rerun the existing RS-01..RS-09 / undo / members / session-renewal E2Es unchanged, to confirm the rewritten rule did not disturb them end-to-end (unit-level coverage for this already passed in IMP-02/IMP-03).
- AC-011: a user check on a beta — replace a removed LM Studio model and confirm the run continues from the journal.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Per the design's `Guidance For Implementation` and `Change / Refactor Sequence` step 7:

- a built-server E2E for a native→native model hand-over, with the fake LM Studio endpoint (AC-002);
- one Team-member case (AC-008);
- a rerun of the existing switch E2Es unchanged (AC-007);
- the user check (AC-011), when the beta is available.
