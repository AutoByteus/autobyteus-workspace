# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer package (design-spec.md, switch-member-record-contract.md); Architecture Reviewer pass ARCH-REV-002 | N/A (ARCH-F-007..010 are non-blocking and were applied) | `Initial Baseline` | SR-001 (notes 1-2), ARCH-REV-002 | Implemented; ready for Code Review (Large / High) |
| IR-002 | Code Reviewer failure-origin review CRR-002 after the API/E2E Fail (`code-review-report.md`, `api-e2e-execution-coverage-report.md`) | F-1, F-2 | `Local Fix` | CRR-002, API-REV (round 1), IR-001 | F-1 and F-2 fixed; RSM-01..05 pass |

## Revision Entries

### IR-001 — Agent runtime switch for Team members, Org members and delegated copies

- Triggering role, report path, and round: Solution Designer package in this folder (`design-spec.md`, `switch-member-record-contract.md`, `requirements-doc.md`); `design-review-report.md` (ARCH-REV-002 Pass); round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: the autobyteus-316 standalone switch is extended to a Team member, an Org member (a direct Agent and an Agent of a mounted Team) and a delegated copy (a task Agent, and a member of a task Team), through one shared pure rule, one activation class and one new commit kind.
- Related solution revision IDs: SR-001 (notes 1-2)
- Related architecture-review revision IDs: ARCH-REV-002 (ARCH-F-007..010 applied)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved design.
- Approved behavior or requirement IDs affected: REQ-001..REQ-009; AC-001..AC-010; D-1..D-10; M-7.
- Implementation delta (commits on `codex/runtime-switch-members`, oldest first):
  - `572677be95` contracts: optional `runtimeKind` / `runtime_kind` on the user launch selection in both stream-contract packages (sources, tests, tracked `dist/`).
  - `888063bbef` steps 1-2: `run-history/domain/runtime-selection-rule.ts` (`applyRuntimeSelection`, `commitRuntimeSwitch`, `commitRuntimeSwitchOnRecord`); `pendingRuntimeSwitch` on member and copy records, schemas and own files; commit kind `runtime_switch`; the three root tree mutators; `ConfiguredAgentSwitchAttempt`; planner `beginSwitch`; the shared handle's switch sequence (begin, prepare, record, commit, publish; discard only after a confirmed release; M-7 drop of the pending switch); `replaceSelection` at the copy restore sites.
  - `3b4f10435a` step 3a: Team and Org saves carry `runtimeKind`; the clean-cut renames (`updateStoppedTeamRunSelections`, `selectionPatches`, `team-run-selection-mutator.ts`, `updateStoppedSelections`); validation context `selectionContextFor`.
  - `dba00b2416` step 3b: delegated copy choices carry the runtime; `delegated-launch-selection.ts` uses the shared rule for an agent copy, a Team copy and a Team copy member.
  - `877ee8ba33` step 4: memory discovery reads the open-file runtime for Team, Org, task Team and task Agent runs; parity test of the three launch-rule mirrors.
  - `0649bb6b44` step 5: web (drafts, patches, delegated draft, clients, renamed operations, regenerated types, row runtime control, hint text).
  - `b47e49c509` step 6: documents and glossary.
  - `a199e9d543`, `d3463e0a7e` step 7: built-server cases, copy commit and restore tests, e2e inputs naming the required runtime; type-policy fix of the new tests.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Local validation and result: all recorded checks pass from a clean clone of `d3463e0a7e` (IMP-01..IMP-08) and on the built server (IMP-09..IMP-12).
- Next recipient or routing: Code Reviewer (`/software_engineering_team/code_reviewer`), because the package is Large / High.
- Remaining limitations or risks: no live Claude Agent SDK / Codex App Server pair was run (see the handoff); the web surface was not rendered in a browser by me.

### IR-002 — Org settings wire tree (F-1) and fresh copy rows after Save (F-2)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` / `code-review-revision-record.md` CRR-002 (failure-origin review of the API/E2E Fail, tests at `1269820159`).
- Triggering finding IDs: F-1 (RSM-02, RSM-03), F-2 (RSM-04)
- Classification: `Local Fix`
- Prior authoritative result: CRR-001 Pass, superseded by CRR-002 Fail
- Current authoritative result: fix committed at `9e28c019b6`; ready for the targeted delta review
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-002
- Related API/E2E revision IDs: API/E2E Fail round 1 (`api-e2e-revision-record.md`)
- Related delivery revision IDs: N/A
- Why this revision is recorded: two defects found in the rendered Settings, both caused by this ticket's change.
- Approved behavior or requirement IDs affected: REQ-001 (AC-002), REQ-002 (AC-004), REQ-006; contract §6 (the pending switch is not on the wire).
- Implementation delta:
  - **F-1, server.** `AgentOrgRunService.getRunConfig` and `updateStoppedRunConfig` (the only two callers' sources of raw Org JSON: the resolver's `getAgentOrgRunConfig.executionTree` and the Save result's `canonical`) now return the tree through the existing `projectAgentOrgExecutionTree`, which has no pending field. I searched the other sites: `getAgentOrgRunInspection` (`projectAgentOrgExecutionSnapshot`) and the root history (`projectAgentOrgExecutionTree`) were already projected; the delegated-launch service returns outcomes only. The contract schemas are not widened. Internal callers (`runModelOptions`, the manager) still use the stored tree.
  - **F-1, web.** The projection exposed a second problem the raw tree had hidden: `assertAgentOrgRunConfigChange` (the Org config adoption guard) masked only model fields, so the canonical tree of a switched Agent (new `runtimeKind`, session dropped to `null`) was refused as "changed topology, identity, or locked fields". It now masks the agent runtime too and accepts a changed session only as `null` on an Agent whose runtime changed; any other session or identity drift is still refused. `AgentOrgExecutionContext.applyRunConfig` now applies the new `runtimeKind` to the Agent's context config (it applied only the model before).
  - **F-2.** `agentRunCollaborationStore.viewFor(hostRunId, { fresh })` reads a stopped host's stored view again when `fresh` is set and the host has no stream; `existingRunConfigStore.readAgentCanonical` / `loadAgentCanonical` take `fresh`, passed after a committed Save (`reloadCanonical(true)`), by the failure reconcile and by Retry. The first open still reads once (autobyteus-358). Cause as read: `viewFor` returned the cached view of the stopped host, and nothing refreshes it after a Save. This is not proven to be a regression of the model-only copy refresh: I did not run the base probe for it; the code path is the same for a model-only Save, so the fresh read fixes both.
- Changed files or areas: `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts`; `autobyteus-web/services/agentOrgExecution/{agentOrgRunConfigAdoption,agentOrgExecutionContext}.ts`; `autobyteus-web/stores/{agentRunCollaborationStore,existingRunConfigStore,existingRunConfigEditActions,existingRunConfigResultActions}.ts`.
- Local validation and result:
  - New server test `tests/unit/agent-org-execution/agent-org-run-config-wire.test.ts`: the config read and the Save result parse with `agentOrgExecutionTreeDtoSchema` while a direct Agent, an Agent of a mounted Team and a delegated copy are pending (and the raw stored tree is shown not to parse, so the test is not vacuous).
  - New web tests: adoption of a switched direct Agent and mounted-Team Agent, refusal of a changed runtime that keeps a session and of an invented session (`agentOrgRunConfigAdoption.spec.ts`); fresh read after a committed Save and a failure reconcile (`existingRunConfigStore.spec.ts`); `viewFor` fresh (`agentRunCollaborationStore.spec.ts`).
  - Rendered: `pnpm -C autobyteus-web test:e2e:runtime-switch-members` RSM-01..05 all Pass (IMP-16). Before the web adoption fix the same run showed RSM-02/03 failing with "Org configuration changed topology, identity, or locked fields", RSM-04 passing.
  - Server typecheck, server unit (7864 passed; one load-sensitive file-watcher test failed once and passed alone twice and in the clean-clone run), web typecheck, web nuxt (5013), guards, codegen:check, and the gated built-server runs (IMP-14..IMP-17).
- Next recipient or routing: Code Reviewer (targeted delta review), then API/E2E reruns RSM-02..04. The red contract test `autobyteus-collaboration-stream-contracts/tests/org-member-pending-runtime-switch.test.mjs` asserts the widening the approved wire decision rejects; I did not change it (API/E2E owns it) and it should be replaced.
- Remaining limitations or risks: the checks above ran in the worktree, not a fresh clean clone; the full-suite clean-clone proof of `d3463e0a7e` (IMP-01..IMP-08) still covers everything this delta did not touch.
