# Implementation Handoff — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Current result and authority

**IR-003 — CRR-003 / CR-002 Local Fix complete; ready for independent source re-review. `task_size=Medium` / `architectural_risk=High`, confirmed unchanged.**

Authority: approved `SR-002`, completed `SR-003` / `DS-001`, passing independent `ARCH-REV-001`, resolved `CRR-001/002` finding `CR-001`, and implementation-owned `CRR-003` finding `CR-002` from `API-REV-001 B01`. Product prototype and Delivery review are N/A. `CRR-003` and API/E2E remain Fail until this correction receives independent source re-review and B01 rerun; no acceptance is claimed.

- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config`
- Ticket: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config`
- Branch: `codex/stopped-org-whole-config`
- Source/base HEAD: `64852674b5f003aea2a169233093f12a9f80ffba`
- Eventual target: `origin/requirements/flat-agent-organization-model`, not personal.
- State: cumulative implementation is uncommitted because no Git finalization was authorized. No push, merge, release, migration, repair, user-server/data, conversation, provider, or Electron action was performed.

## Cumulative input package

All names below are relative to the ticket directory; the routing message supplies absolute paths.

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `solution-handoff.md`
- `design-review-report.md`, `architecture-review-revision-record.md` (`ARCH-REV-001`)
- supplied investigation screenshot and earlier completed stopped-member requirements reference
- `implementation-revision-record.md` (`IR-001`–`IR-003`)
- `code-review-report.md`, `code-review-revision-record.md` (`CRR-001`–`CRR-003`, resolved `CR-001`, open trigger `CR-002`)
- `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md` (`API-REV-001`)
- reviewer/API evidence under `validation/crr001-*`, `validation/crr003-failure-origin.md`, and `validation/api-live/runtime-r3/`

## Implemented result

### IR-003 stable semantic editor load identity

- `ExistingRunConfigEditor` no longer watches a freshly allocated identity object by reference. It watches two semantic scalar sources—subject kind and exact run ID—so a canonical context publication that reprojects an equivalent parent target cannot retrigger the read.
- A real subject-kind or run-ID change still performs one legitimate canonical reload. Canonical publication, authoritative network reads, and existing-run store ownership are unchanged; no downstream loop masking, request cache, or publication suppression was added.
- New production-boundary coverage mounts the actual `AgentOrgWorkspaceView` and actual `ExistingRunConfigEditor` for both configured direct and mounted-Team Settings entries. The mocked read reproduces canonical publication by replacing the reactive target/context with semantically equal new objects, then proves one read, a completed non-busy editor, and rendered whole-Org form. A separate control proves one reload when the semantic Org ID actually changes.
- IR-003 changes only `ExistingRunConfigEditor.vue` and adds the boundary test. All 45 other IR-002 manifest entries are byte-identical; CR-001's draft-retention correction remains unchanged.

### IR-002 determinate failure correction

- A determinate AgentOrg Save failure now adopts trustworthy returned lifecycle/editability and canonical baseline tree information **without rebuilding the submitted hierarchy planner**. Root and member values attempted by the user, their patch plan, and scoped field errors therefore stay aligned and correctable.
- This applies to validation failures, model/schema unavailability, and confirmed pre-write persistence failures. No persistence retry or canonical refresh is introduced for those determinate outcomes.
- `PERSISTENCE_INDETERMINATE` remains intentionally different: the existing explicit network canonical refresh replaces the draft only after authoritative verification and never resubmits the mutation.
- The correction is confined to `existingRunModelConfigStore.ts` plus its real Pinia-store regression. All 44 other IR-001 manifest entries are byte-identical; server aggregate atomicity and every other whole-Org path are unchanged.

### One whole-Org subject and shared form

- `AgentOrgWorkspaceView.vue` now treats configured direct or mounted-Team member gear as an entry gesture and opens `ExistingRunConfigEditor` with the enclosing `{kind:'agent_org', orgRunId}` target.
- New presentational `AgentOrgRunConfigForm.vue` owns the root/direct-Agent/mounted-Team body used by both launch and existing-run controllers. Launch retains Run ownership; stopped Settings retains Save ownership and locked existing-run fields.
- `AgentOrgDirectAgentOverrideRow.vue` supports launch and existing-mode nodes without duplicating hierarchy markup.
- The obsolete member-only panel/composable/client and selected-member target have been removed cleanly.

### Recursive linked-scope editing

- New `existingHierarchicalModelConfigDraft.ts` owns parent-linked propagation and deterministic patch planning.
- Team now adapts through the same pure planner, with focused regressions preserving existing Team behavior.
- New AgentOrg adapter flattens only configured root/direct/mounted-Team scopes; tasks are excluded. Parent-equal descendants follow until directly edited; original or directly edited overrides remain independent, including explicit `null`, `0`, and `false` values.
- `existingAgentOrgRunFormModel.ts` projects canonical stopped values, options, and draft state into the shared form without consulting mutable definitions.

### Aggregate canonical read/options/save

- New whole-root domain contract and pure tree mutator replace the exact-member contract.
- `AgentOrgRunManager` remains the definitive transition owner. It resolves every configured target, rejects duplicate/address/kind/task mismatches, checks active/fail-stopped/archive/application/admission eligibility, validates all selections with `validateMany`, builds one immutable next tree, writes once, and reads back once.
- Confirmed no-op requests skip the write. Pre-rename failure remains retryable; post-rename/unreadable results remain indeterminate and never replay automatically.
- `AgentOrgRunService` provides whole-root read, exact-length batched model options, and aggregate update. GraphQL exposes only the replacement whole-root operations; exact-member operations are deleted.
- Inspect/save does not restore the Org, start a provider, send input, allocate new IDs, or change runtime/workspace/tool policy.

### Existing-run state and retained-context reconciliation

- `existingRunModelConfigStore` now owns explicit AgentOrg target generations, canonical load, options, recursive patch plan, Save, feedback, and reconciliation-required behavior. Result/reconciliation actions were split into `existingRunModelConfigResultActions.ts` to keep source ownership cohesive and the main store below the 500-line guard.
- `agentOrgContextsStore` preserves operation exclusion, binding/view/submission checks, stale-target rejection, and deferred disposal while invoking the whole-root client.
- `AgentOrgExecutionContext.applyRunModelConfig` stages and validates the complete returned tree after erasing only model fields. It rejects any topology/identity/task/handoff/archive/application/locked-field drift, rebuilds the index once, and synchronously patches retained Agent contexts in place without replacing conversations, Activity, drafts, attachments, selection, or status.

### Clean removal and documentation

Removed without wrappers/fallbacks:

- exact-member server domain and mutator
- exact-member GraphQL read/options/update paths and tests
- `AgentOrgMemberRunConfigPanel.vue` and its test
- `useAgentOrgMemberModelConfig.ts`
- `agentOrgMemberModelConfigClient.ts`
- `AgentOrgExecutionContext.applyMemberModelConfig`

Canonical server and web AgentOrg architecture docs now describe the whole-root path. Current schema-v1 persisted runs are **Directly Usable — No Migration**.

## Behavior trace

| IDs | Implemented path and outcome |
| --- | --- |
| `BEH-001`, `REQ-001`, `AC-001` | Direct and mounted configured member gear both select one explicit enclosing Org target and render the same existing-run controller after one bounded authoritative read; semantically equal context reprojection does not reload, while a real subject change does. Task/ineligible entry remains excluded. |
| `BEH-002`, `REQ-002`–`REQ-003`, `AC-001`–`AC-002` | Launch and stopped Settings share the real AgentOrg form body and complete configured hierarchy. Existing mode exposes only model/parameter edits and one Save. |
| `BEH-003`, `REQ-004`, `AC-002` | Recursive pure planner preserves linked propagation through root → Team → Agent and protects original/direct overrides and explicit falsy/null values. |
| `BEH-004`, `REQ-005`–`REQ-006`, `AC-003`–`AC-004` | One manager transition validates all patches, writes/readbacks once, rejects lifecycle/ownership/stale/invalid targets, and returns truthful unchanged/validation/indeterminate results with no partial success. |
| `BEH-005`, `REQ-007`–`REQ-008`, `AC-005`–`AC-006` | Model-only full-tree adoption preserves retained content and locked canonical state; ordinary continuation remains the sole activation point; standalone Agent/Team, AgentOrg launch/`+`, and task policy stay on their existing paths. |

## Design health, classification, and data

Implementation confirms the reviewed architecture: whole AgentOrg run is the correct domain subject, the existing-run state machine is the correct frontend owner, and manager transition plus atomic tree store is the correct persistence boundary. No requirement or design expansion was needed.

`Medium / High` remains unchanged because aggregate root persistence, lifecycle concurrency, canonical state validation, and retained-context publication are central to correctness even though the surface is bounded. Independent source review remains mandatory. Persisted data is directly usable; there is no migration, dual reader, repair, or old exact-member compatibility path.

All changed implementation source files are at or below 500 effective non-empty lines. The largest tracked production delta is 200 changed lines total; no >220 changed-line refactor threshold was crossed. Exact counts and clean-cut scans are in `validation/ir001-guards.log`.

## Implementation-scoped checks

- **Server: 2 files / 9 tests passed** — `validation/ir001-server-focused.log`. Covers root/direct/mounted target resolution, task/kind/duplicate rejection, `validateMany`, all-or-none/no-op/write/readback and result projection.
- **Current web: 11 files / 88 tests passed** — `validation/ir003-web-focused.log`. This preserves IR-002 and adds the actual parent/editor feedback-boundary cases for direct/mounted entry plus legitimate semantic subject change.
- **Focused parent/editor boundary: 1 file / 3 tests passed** — `validation/ir003-boundary-focused.log`.
- **Reviewer probe: 1 test passed** — the unchanged `CRR-001` failing probe was copied temporarily into the real store-test location, rerun against IR-002, and removed; `validation/ir002-reviewer-probe.log`.
- **Focused store: 1 file / 17 tests passed** — `validation/ir002-store-focused.log`.
- **Guards pass** — `validation/ir001-guards.log`: `git diff --check`, legacy exact-member production-symbol scan, temporary dependency/build-artifact cleanup, and source-size checks.
- **IR-002 guards pass** — `validation/ir002-guards.log`; current diff/cleanup/legacy scan and 500-line guard pass.
- **IR-003 guards pass** — `validation/ir003-guards.log`; current diff/cleanup/legacy scan and 500-line guard pass while preserving the API/E2E-created real dependency directory.
- **Source manifests** — `validation/ir003-source-manifest.json` is the current 47-entry cumulative manifest; `validation/ir003-preservation.json` proves 45 IR-002 entries unchanged and only the semantic watcher plus new durable boundary test differ.
- **Web typecheck not completed** — `validation/ir001-web-typecheck.log` / `.exit`: available `vue-tsc` fails before project checking on the TypeScript package-export mismatch.
- **Server global typecheck fails on workspace baseline/dependency skew** — `validation/ir001-server-typecheck.log` / `.exit`: unavailable built `@autobyteus/application-sdk-contracts`, stale `autobyteus-ts` exports/pricing contracts, and dependent implicit-any fallout. No recorded diagnostic names an IR-001 changed implementation file; this is still reported as a failure, not a pass.

## Frontend feedback loop

The focused frontend suite mounts the real shared `AgentOrgRunConfigForm`, renders the root/direct/mounted hierarchy, expands disclosures, and drives direct-Agent existing-mode interaction. IR-003 additionally mounts the actual workspace parent and editor for both entry placements, performs the canonical read/publication/rerender feedback sequence, and observes a stable rendered form after one read. Layout semantics, labels, hierarchy, locks, Save-versus-Run ownership, and adjacent launch behavior were checked in the rendered DOM.

Limitation: no isolated browser connected to a real stopped backend run was created during implementation. This component-level rendered interaction is implementation self-validation, not API/E2E acceptance.

## Downstream verification required

After independent source review, API/E2E must rerun **B01 first** from both direct and mounted member gear, prove the actual Chrome form stabilizes after a bounded read, then complete B02–B04 and post-Save B05:

1. open the same whole-Org form from a stopped configured run;
2. edit root plus multiple linked/overridden scopes and Save once;
3. reopen from either placement and observe canonical values;
4. ordinary Send restores and uses saved scope configuration while preserving IDs, conversation, Activity, drafts, attachments, tasks, handoffs, application binding, and untouched config;
5. verify all-or-none validation, pre-write failure, post-write uncertainty/explicit refresh/no replay, active-root/offline-leaf, stale target/binding/submission and task guards;
6. verify zero Agent/provider starts during inspect/save and retain standalone Agent/Team Settings plus AgentOrg launch/`+` controls.

Direct GraphQL alone is not sufficient. Provider/runtime pairs that are unavailable must be reported honestly rather than generalized.

## Selected next route

Pending a fresh `get_handoff_rules` evaluation. This is an implementation-owned `CRR-003 / CR-002` Local Fix on a confirmed `Medium / High` package, so independent source re-review remains required before API/E2E resumes. The selected recipient and successful transport will be recorded in the handoff message rather than inferred here.
