# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-sr-001.md`, initial | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Web typecheck PASS at baseline (93 in 40); TESTING.md rule added |

## Revision Entries

### IR-001 — Baseline fix for the Codex turn-lifecycle test, and the both-typechecks rule

- Triggering role, report path, and round: Solution Designer, `handoff-sr-001.md`, initial implementation
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: web typecheck PASS (`production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`); test file 2/2
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved design
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-003; REQ-001…005
- Implementation delta: Commit A `47d21e36a`: one import and one property in the test. Commit B `afaeb9ed5`: three TESTING.md edits (Web typecheck row, new "Both typechecks, whatever the change touches" paragraph in Choosing the path, Rerun-by-impact step 5).
- Changed files or areas: `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts`; `TESTING.md`
- Local validation and result: IMP-01…04 all Pass (see `implementation-handoff.md`)
- Next recipient or routing: Direct API/E2E (Small + Low)
- Remaining limitations or risks: RSK-001 (rule documented, not machine-enforced)
