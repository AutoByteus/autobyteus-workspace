# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer package (design-spec.md, switch-member-record-contract.md); Architecture Reviewer pass ARCH-REV-002 | N/A (ARCH-F-007..010 are non-blocking and were applied) | `Initial Baseline` | SR-001 (notes 1-2), ARCH-REV-002 | Implemented; ready for Code Review (Large / High) |

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
