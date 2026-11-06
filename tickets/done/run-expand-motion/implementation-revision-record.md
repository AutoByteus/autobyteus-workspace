# Implementation Revision Record: run-expand-motion (autobyteus-390)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-handoff.md` (Architecture Design Complete, Small/Low) | N/A | `Initial Baseline` | SR-001 | Implemented; IMP-01…05 pass (IMP-04 fails on the base, as intended); to API/E2E |
| IR-002 | Solution Designer, `solution-handoff.md` SR-002 (narrowed), after CRR-001 | CR-001 | `Design Impact` | SR-002, CRR-001, API-REV-001 | Implemented at `3e6b5a3dd4`; IMP-06 red and IMP-07…11 pass (IMP-09 and IMP-10 fail on the base and SR-001, as intended); to API/E2E |

## Revision Entries

### IR-001: Mount an Agent run's delegated rows only while expanded

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `.../run-expand-motion/solution-handoff.md`, SR-001.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `7cc31409af` (fix `c5cc87d89d`).
- Related solution revision IDs: SR-001
- Related architecture-review, code-review, API/E2E and delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation.
- Approved behavior or requirement IDs affected: REQ-001…REQ-003, AC-001…AC-004.
- Implementation delta: in `RunListRow.vue`, `AgentRunTaskRows` is mounted with `v-if="entry.kind === 'agent' && state.isRunExpanded(entry.runId)"`; the `v-show` is removed.
- Changed files or areas:
  - `autobyteus-web/components/runList/RunListRow.vue`
  - `components/runList/__tests__/RunListRow.agent.spec.ts` (new)
  - `tests/e2e/run-expand-motion-probe.mjs` and `tests/e2e/fixtures/run-expand-motion.page.vue` (new)
  - `package.json` (`test:e2e:run-expand-motion`)
- Local validation and result:
  - IMP-01: the component spec fails on the base (3 of 4) and passes on the fix (4/4).
  - IMP-02: the web suite passes. 7 files failed to load until the TESTING.md prebuild step was run; they then pass.
  - IMP-03: the probe passes on the fix.
  - IMP-04: the probe fails on the base, with every row at `top: 0` and a move transform in frame 0.
  - IMP-05: typecheck passes at baseline; the guards pass.
- Next recipient or routing: API/E2E (direct route, Small/Low).
- Remaining limitations or risks: the check uses a fixture page, not a live app.

### IR-002: No sliding in the Runs view; the fold back to `v-show` (SR-002 narrowed)

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `.../run-expand-motion/solution-handoff.md` (SR-002, then "SR-002 Narrowed" and "Decision On The User's 'Small Moving' Feedback"), after `code-review-report.md` CRR-001 and API/E2E API-REV-001.
- Triggering finding IDs: CR-001. OBS-2 was withdrawn.
- Classification: `Design Impact` (resolved upstream as SR-002).
- Prior authoritative result: IR-001 (`c5cc87d89d`, `v-if`). Late Task lines slid rows on every expand (CR-001).
- Current authoritative result: `3e6b5a3dd4`.
- Related solution revision IDs: SR-002 (narrowed)
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the redesign after CR-001, and the user's "small moving" feedback, which I relayed to the Solution Designer mid-round. The narrowing followed from it.
- Approved behavior or requirement IDs affected: REQ-001…REQ-004, AC-001…AC-006.
- Implementation delta:
  - `RunListPanel.vue`: `.run-list-scroll :deep(.tree-row-move) { transition: none; }`, with the `run-list-scroll` class on the scroll container.
  - `RunListRow.vue`: the base's `v-show` restored.
  - The first SR-002 pass (`b7fc37aa75`) had removed the shared rule and changed its spec and the `task-closure-tree` probe. Those three files are back to the base in `3e6b5a3dd4`.
- Changed files or areas:
  - `RunListPanel.vue` and `RunListRow.vue`;
  - `RunListPanel.spec.ts` and `RunListRow.agent.spec.ts`;
  - the run-expand-motion probe and fixture (renders `RunListPanel`; adds late Task lines, Team expand, DONE leave and the AC-006 scope check);
  - API/E2E's `run-expand-motion-live-cases.mjs` (hidden instead of removed; flagged).
- Local validation and result:
  - IMP-06: both specs are red on the old code.
  - IMP-07: the web suite passes (702 files, 5161 tests).
  - IMP-08: the probe passes on the fix, REM-01…08.
  - IMP-09 and IMP-10: the probe fails on the base and on SR-001.
  - IMP-11: typecheck and guards pass.
- Next recipient or routing: API/E2E (direct route, Small/Low).
- Remaining limitations or risks:
  - The live probes for AC-006 and the API/E2E live cases were not run here.
  - The Runs view snaps while the other views slide; this is accepted.

