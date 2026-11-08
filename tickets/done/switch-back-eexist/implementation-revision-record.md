# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer package (design-spec.md) | N/A | `Initial Baseline` | SR-001 | Implemented; ready for direct API/E2E |

## Revision Entries

### IR-001 — A new Antigravity start replaces the earlier capsule (autobyteus-440)

- Triggering role, report path, and round: Solution Designer, `design-spec.md` "Intended Change"; round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: a run (standalone or Team member) can switch back to Antigravity after another agent runtime, and an Antigravity start that failed after its capsule was made can be retried.
- Related solution revision IDs: SR-001; others N/A
- Why recorded: the second Antigravity era failed with `EEXIST: mkdir …/agy-project` (reproduced on the base for a standalone run by the designer and for a Team member by me, U-1).
- Approved behavior or requirement IDs affected: REQ-001..REQ-004; AC-001..AC-007.
- Implementation delta (commit `9833f51bf9`): `createAgyRunCapsule` (`agent-execution/backends/antigravity/capsule/agy-run-capsule.ts`) removes the run's capsule folder (`fs.rm(root, { recursive: true, force: true })`) before the existing exclusive `mkdir`; the exclusive writes stay; the doc comment says a new start replaces the capsule of an earlier era or failed start and that restore never calls it. Nothing else in production code.
- Changed files: that one source file (+7 lines); tests: `runtime-switch-native-built-server.e2e.test.ts` (RS-09), `runtime-switch-members-built-server.e2e.test.ts` (MS-05), `agy-run-capsule.test.ts` (6 cases), `agy-agent-run-backend-factory.test.ts` (2 cases).
- Local validation and result: IMP-01..IMP-06; the new built-server cases and the unit cases fail on the base and pass with the fix.
- Next recipient or routing: API/E2E engineer (direct route, Small / Low).
- Remaining limitations or risks: see the handoff.
