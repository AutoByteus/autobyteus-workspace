# Implementation Revision Record — node-vocabulary (autobyteus-290)

The current code and `implementation-handoff.md` are authoritative. This record locates the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer package (SR-007, design `f75d537365`, N-910/N-911 at `9bc90eff80`); Architecture Reviewer ARCH-REV-005 pass | N/A | `Initial Baseline` | SR-007, ARCH-REV-005 | Steps 1, 1b, 2, 3, 4, 5, 5b, 6 and SM-1 … SM-10 built; handed to Code Review |

## Revision Entries

### IR-001 — Node vocabulary, stored-name migrations and hold-backs

- Triggering role, report path, and round: Solution Designer (`design-spec.md` SR-007, `solution-revision-record.md`), Architecture Reviewer (`design-review-report.md`, ARCH-REV-005 pass), round 1.
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implementation complete on `codex/node-vocabulary`; commits `ad36e4d61e` (Step 1), `232e847ed3` (SM-1 and the `node_identity` hold-back), `b085e15a02` (Step 1b), `075ce323ca` (Step 2), `437da24719` (Step 3), `32cf99830e` (Step 4, SM-6 … SM-10), `92ff02df4a` (Step 5), `4b7d13b8c7` (SM-1 backup), `3692422aef` (Step 5b, SM-2 … SM-5, `memory_sync` hold-back), `cb37d82fab` (Step 6). The evidence commit is named in the handoff.
- Related solution revision IDs: SR-007 (with SR-006 for U-3)
- Related architecture-review revision IDs: ARCH-REV-005
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-901 … REQ-913, AC-901 … AC-905 (see the handoff's trace).
- Implementation delta: the renames of the design's Steps; sealed migrations SM-1 … SM-5 (server), SM-6 … SM-8 (`autobyteus-web/client-data-migrations/`), SM-9 (iOS), SM-10 (Android); the `node_identity` and `memory_sync` hold-backs; `GLOSSARY.md`.
- Changed files or areas: server `remote-access`, `remote-collaboration`, `agent-collaboration`, `agent-tools`, `memory-sync`, `agent-memory`, `app-data-migrations`, `startup`, `api`; web types, stores, electron shell, services, components, plugins, `client-data-migrations/`; iOS and Android apps; docs.
- Local validation and result: see the handoff's Checks Run (IMP-01 … IMP-12).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: see the handoff's Known Risks and the checks left to API/E2E.
