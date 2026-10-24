# Implementation Revision Record — node-vocabulary (autobyteus-290)

The current code and `implementation-handoff.md` are authoritative. This record locates the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer package (SR-007, design `f75d537365`, N-910/N-911 at `9bc90eff80`); Architecture Reviewer ARCH-REV-005 pass | N/A | `Initial Baseline` | SR-007, ARCH-REV-005 | Steps 1, 1b, 2, 3, 4, 5, 5b, 6 and SM-1 … SM-10 built; handed to Code Review |
| IR-002 | Code Reviewer CRR-001 (`code-review-report.md`); SR-008 (design `8e3512429b`); ARCH-REV-006 pass | F-001, F-002, N-912 | `Design Impact` (F-001, resolved in the design) / `Local Fix` (F-002) | SR-008, ARCH-REV-006, CRR-001 | Memory Sync's identity is `memorySyncSourceId`; `PeerStartedRunViews`; back to Code Review |

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

### IR-002 — `memorySyncSourceId` (CRR-001 F-001, SR-008) and `PeerStartedRunViews` (F-002)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001); Solution Designer SR-008 (design `8e3512429b`, the user's name); Architecture Reviewer ARCH-REV-006 (pass); round 2.
- Triggering finding IDs: F-001 (`sourceId` collides with the skill, update-notification and package sources' `sourceId`), F-002 (`RemotePeerStartedRunViews` repeats the noun and is on the word list), N-912 (disposition).
- Classification: F-001 Design Impact, resolved by SR-008; F-002 Local Fix.
- Prior authoritative result: IR-001 (Memory Sync identity `sourceId`, `boundSourceId`, `source.json`, `shared/source-id.ts`, UI "Source ID").
- Current authoritative result: `memorySyncSourceId`, `boundMemorySyncSourceId`, `memory-sync-source.json`, `shared/memory-sync-source-id.ts` (`normalizeMemorySyncSourceId`, `MemorySyncSourceIdError`, `MemorySyncSourceMetadata`), GraphQL and hub wire `memorySyncSourceId`, UI "Memory Sync source ID" / zh-CN "记忆同步源 ID", test id `memory-sync-source-id`, `GLOSSARY.md` "Memory Sync source ID". SM-2 … SM-5 write these targets (changed in place; unreleased). `PeerStartedRunViews`.
- Related solution revision IDs: SR-008
- Related architecture-review revision IDs: ARCH-REV-006
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this revision is recorded: rework for CRR-001.
- Approved behavior or requirement IDs affected: REQ-910, REQ-911 (SM-2 … SM-5 targets), AC-901.
- Implementation delta: the rename across the Step 5b files only (the skill, update-notification and package `sourceId`s are untouched); in `generated/graphql.ts` only the Memory Sync types' lines (checked identical to a fresh codegen); texts and docs; migration targets and its tests; F-002 type rename.
- Changed files or areas: `memory-sync/**`, `agent-memory/services/memory-explorer-source-service.ts`, GraphQL `memory-sync-schema.ts`, `memory-explorer-schema.ts`, `memory-sync.ts`, REST `memory-sync.ts`, `app-data-migrations/migrations/memory-sync-source-id-names/`, `frozen/released-memory-sync-files.ts` (comment only), `remote-collaboration/inbound/remote-run-view-provider.ts`; web memory types, stores, card, GraphQL documents, generated types, en/zh-CN; docs, `GLOSSARY.md`, READMEs.
- Local validation and result: see the handoff's Checks Run (IMP-15 … IMP-19).
- Next recipient or routing: Code Reviewer (Targeted Delta Review of F-001, F-002).
- Remaining limitations or risks: N-912 (dev/test data that ran the IR-001 variant needs a manual reset; see the handoff).
