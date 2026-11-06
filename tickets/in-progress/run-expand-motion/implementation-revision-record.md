# Implementation Revision Record: run-expand-motion (autobyteus-390)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-handoff.md` (Architecture Design Complete, Small/Low) | N/A | `Initial Baseline` | SR-001 | Implemented; IMP-01…05 pass (IMP-04 fails on the base, as intended); to API/E2E |

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
