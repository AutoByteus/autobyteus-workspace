# Implementation Revision Record — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Revision Index

| Revision | Date | Trigger | Prior Result | Current Result |
| --- | --- | --- | --- | --- |
| IR-001 | 2026-09-17 | Initial implementation of SR-003 / DS-001 after ARCH-REV-001 | N/A | Implementation complete; ready for independent source review |
| IR-002 | 2026-09-17 | CRR-001 / CR-001 implementation-owned Local Fix | Source review Fail / Local Fix | Local Fix complete; ready for independent source re-review |
| IR-003 | 2026-09-18 | CRR-003 / CR-002 after API-REV-001 B01 failure-origin review | Source review/API validation Fail / Local Fix | Local Fix complete; ready for independent source re-review |

## Revision Entries

### IR-001 — Whole-root stopped AgentOrg configuration

- Triggering role/report/round/findings: Architecture Reviewer, `design-review-report.md`, `ARCH-REV-001`, no findings.
- Upstream revisions: `SR-003` design on explicitly approved `SR-002`; `ARCH-REV-001`; `CRR` N/A; `API-REV` N/A; `DR` N/A.
- Prior result: N/A — initial baseline.
- Current result: Implementation complete; ready for independent source review.
- Classification: `task_size=Medium`, `architectural_risk=High`, unchanged.
- Why recorded: establishes the initial implemented baseline for the approved replacement of exact-member AgentOrg Settings with one aggregate whole-root editor and atomic persistence path.
- Affected behavior/requirements: `BEH-001`–`BEH-005`; `REQ-001`–`REQ-008`; `AC-001`–`AC-006`; `SCN-001`–`SCN-005`.

#### Code delta

- Replaced the exact-member server domain/mutator/service/GraphQL operations with whole-root read, batched options, aggregate patches, `validateMany`, one immutable tree write, and strict canonical readback under `AgentOrgRunManager.withTransition`.
- Added a recursive pure linked-scope planner with Team and AgentOrg adapters; preserved Team behavior while supporting root → mounted Team → Agent propagation and explicit/direct override independence.
- Extracted `AgentOrgRunConfigForm.vue` so launch and stopped Settings share the form body while retaining separate Run/Save orchestration.
- Extended the existing-run target/store/client state machine with explicit `{kind:'agent_org', orgRunId}`, whole-root load/options/Save/reconciliation, current-target generations, and no optimistic canonical updates.
- Replaced single-leaf context mutation with defensive whole-tree model-only adoption that preserves retained conversations, Activity, drafts, attachments, selection, status, tasks, handoffs, and other locked state.
- Routed both configured direct and mounted-Team member gear entries to the same enclosing Org editor and deleted the exact-member panel/composable/client/API/domain/mutator/tests without wrappers or fallback.
- Updated canonical server/web AgentOrg architecture documentation.

#### Focused validation

- Server: 2 files / 9 tests passed — `validation/ir001-server-focused.log`.
- Web: 10 files / 80 tests passed — `validation/ir001-web-focused.log`.
- Source/cleanup guards pass — `validation/ir001-guards.log`.
- Rendered component check mounts and interacts with the real shared hierarchy; full browser/backend journey remains downstream.
- Web typecheck blocked before project compilation by `vue-tsc`/TypeScript export incompatibility; server global typecheck fails on pre-existing/missing shared workspace package contracts. See `validation/README.md` and the recorded logs.

#### Remaining limitations

- Independent source review is required by Medium/High routing.
- API/E2E must perform actual direct and mounted stopped-run UI Save/reopen/Send, all-or-none validation and uncertainty, active/offline/task/stale guards, provider non-start on inspect/save, and adjacent standalone Agent/Team plus AgentOrg `+` controls.
- No commit/push/merge/release, migration/repair, provider startup, or user-data/runtime action was authorized or performed.

### IR-002 — Preserve submitted AgentOrg draft on determinate Save failure

- Triggering role/report/round/findings: Code Reviewer, `code-review-report.md`, `CRR-001`, `CR-001`.
- Upstream revisions: approved `SR-002`; `SR-003`; `ARCH-REV-001`; `CRR-001`; `API-REV` N/A; `DR` N/A.
- Prior result: Source review Fail / Local Fix, score 9.4/10, because determinate AgentOrg failure handling rebuilt the planner from unchanged canonical state before presenting scoped errors.
- Current result: Local Fix complete; ready for independent source re-review.
- Classification: `task_size=Medium`, `architectural_risk=High`, unchanged.
- Why recorded: preserves submitted root/member edits and their field-error correspondence for correctable determinate failures without weakening aggregate persistence, lifecycle locks, or indeterminate verification.
- Affected behavior/requirements: `BEH-003`–`BEH-004`; `REQ-004`–`REQ-005`; `AC-002`–`AC-003`; `SCN-001`–`SCN-003`.

#### Code delta

- `autobyteus-web/stores/existingRunModelConfigStore.ts`: determinate AgentOrg failure adoption still parses and records the trustworthy canonical baseline tree plus current lifecycle/editability, but retains the submitted hierarchy planner rather than recreating it. This covers `VALIDATION_FAILED`, `MODEL_UNAVAILABLE`, `SCHEMA_UNAVAILABLE`, and `PERSISTENCE_FAILED` without automatic refresh/replay.
- `autobyteus-web/stores/__tests__/existingRunModelConfigStore.spec.ts`: added real Pinia-store coverage for root plus member draft retention, exact scoped errors, correction and second Save, every determinate failure family, and authoritative replacement after `PERSISTENCE_INDETERMINATE` refresh.
- All other IR-001 application/docs/test entries remain byte-identical; see `validation/ir002-preservation.json`.

#### Focused validation

- Current web regression suite: 10 files / 85 tests passed — `validation/ir002-web-focused.log`.
- Owning store: 1 file / 17 tests passed — `validation/ir002-store-focused.log`.
- Unchanged reviewer probe: 1 test passed — `validation/ir002-reviewer-probe.log`.
- Diff, cleanup, legacy-symbol, size and preservation guards pass — `validation/ir002-guards.log`.
- Server code is unchanged from IR-001; its supplied 2 files / 9 test pass remains `validation/ir001-server-focused.log`.

#### Remaining limitations

- Independent source re-review is required; API/E2E remains gated.
- IR-001 global web/server typecheck qualifications remain unchanged; no full browser/backend stopped-run journey was claimed.
- No commit/push/merge/release or user runtime/data action was authorized or performed.

### IR-003 — Stabilize canonical editor reads across context publication

- Triggering role/report/round/findings: Code Reviewer, `code-review-report.md`, `CRR-003`, `CR-002`; originating executable evidence `API-REV-001 B01` / `AC-001`.
- Upstream revisions: approved `SR-002`; `SR-003`; `ARCH-REV-001`; resolved `CRR-001/002` / `CR-001`; `CRR-003` / `CR-002`; `API-REV-001`; `DR` N/A.
- Prior result: `CRR-003 Fail — Local Fix`; actual direct and mounted Chrome Settings entry issued unbounded successful canonical reads and never rendered the form.
- Current result: Local Fix complete; ready for independent source re-review.
- Classification: `task_size=Medium`, `architectural_risk=High`, unchanged.
- Why recorded: stops same-subject reactive reprojection from retriggering the authoritative read without suppressing canonical publication or preventing real subject changes.
- Affected behavior/requirements: `BEH-001`; `REQ-001`–`REQ-002`; `AC-001`; `SCN-001`–`SCN-002`; API case `B01`.

#### Code delta

- `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`: replaced the object-reference identity watcher with stable scalar `selectedKind` and `selectedRunId` sources. Equivalent `{kind, id}` values do not reload; a genuine kind or ID change still does.
- `autobyteus-web/components/workspace/org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts`: mounts the actual workspace/editor boundary for both direct and mounted entry, republishes canonical context through fresh reactive objects during the read, proves one bounded read/non-busy rendered form, and proves an actual Org ID change reloads once.
- All other IR-002 application/docs/test entries remain byte-identical; see `validation/ir003-preservation.json`. CR-001 remains resolved.

#### Focused validation

- Current web regression suite: 11 files / 88 tests passed — `validation/ir003-web-focused.log`.
- Actual parent/editor boundary: 1 file / 3 tests passed — `validation/ir003-boundary-focused.log`.
- Diff, temporary-artifact, legacy-symbol, source-size, and IR-002 preservation guards pass — `validation/ir003-guards.log`.
- Server source is unchanged from IR-001; its supplied 2 files / 9 test pass remains `validation/ir001-server-focused.log`.

#### Remaining limitations

- Independent source re-review is required; API/E2E must rerun B01 first in actual Chrome for both placements, then B02–B04 and post-Save B05.
- IR-001 global web/server typecheck qualifications remain unchanged. Component feedback-boundary validation is not a substitute for the failed live browser rerun.
- No commit/push/merge/release or user runtime/data/provider action was authorized or performed.
