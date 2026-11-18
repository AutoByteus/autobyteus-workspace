# Implementation Revision Record — autobyteus-316

| ID | Date | Trigger | What changed | Evidence |
|---|---|---|---|---|
| IR-001 | 2026-10-31 | Build released after ARCH-REV-002 Pass and the user's go (commit `945610a16c`) | Whole first delivery implemented per `design-spec.md` and `run-runtime-switch-contract.md` in five commits (`ebb137a012` pending-switch metadata, commit function, recorder, per-file journal runtime; `d81709f15e` settings save, activation, hand-over notice, composition; `3927e39775` web settings choice and the `…Selection` rename; `bb6fc32b10` tests for every part, docs, glossary; `3521ae05f1` single commit path clean-up, live e2e, real-run evidence). No requirement or design change. | `evidence/implementation/ir-001/` (superseded by IR-002) |
| IR-002 | 2026-10-31 | `Design Impact` resolved by the Solution Designer: API-REV-001 (F-1, F-2), CRR-002, ARCH-REV-004 Pass + `switchId` addendum | Round-4 design: ticket/watermark activation order, one memory port with `discard`, derived hand-over, chat reader over the switch segments, `switchId`, no current model while pending. See the entry below. | `evidence/implementation/IMP-01…IMP-06`, `evidence/real-run/` |

## Notes on the build

- Failures found and fixed on the way (all in tests or test fixtures, none in the design): journal-service tests needed a per-segment runtime (`rotateActive(runDir, runtimeKind)`, `setSegmentRuntimeKind`); memory-search discovery stub returned no runtime (`?? null`); lifecycle mocks returned the extra `clearPendingRuntimeSwitch` key (a helper strips it); a "restore commit did not land" test needed a different session ID; live e2e: wait for `CONNECTED` before the first send, count records before creating the socket, `AGY_FAKE_CASE=auto_compaction` because the scripted CLI's default case is a terminal error.
- Dead-code clean-up at the end: the catalog's `commitRunModelConfig` and `agent-run-model-config-commit.ts` were removed once nothing but their own test called them; their recovery tests moved to the switch commit's test file. An attempt to keep a separate model-only commit path was reverted because it duplicated the write/read-back logic and needed test rewrites in three suites.
- Clean-clone proof first failed only because a narrowed `pnpm install --filter` left the SDK packages without their links; a full `pnpm install --frozen-lockfile` fixed the setup (not a code issue).

## IR-002 — Round-4 design: a failed attempt leaves nothing, the chat reads the switch segments, the hand-over is derived, `switchId`

- Triggering role, report path, and round: API/E2E `api-e2e-execution-coverage-report.md` (API-REV-001); code reviewer `code-review-report.md` round 2 (CRR-002 failure-origin); architecture reviewer `design-review-report.md` round 4 (ARCH-REV-004 Pass, ARCH-F-008 Low clarifications, and the `switchId` addendum, SR-004 note 16)
- Triggering finding IDs: API-REV-001 F-1, F-2; CRR-002 F-1, F-2 (Design Impact), F-3 (Local Fix); ARCH-F-007 (fixed by the design); ARCH-F-008 items 1–3
- Classification: `Design Impact` (resolved upstream by the Solution Designer, SR-004 notes 14–16), implemented here
- Prior authoritative result: CRR-001 Pass (superseded) / API-REV-001 Fail
- Current authoritative result: implementation complete, awaiting code review
- Related solution revision IDs: SR-004 notes 14, 15, 16
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the first design assumed that preparing a candidate writes nothing to the run's raw traces (false for native and Grok targets), that the chat reads all raw-trace files (it reads the active file only), and that a pending switch's model had run (F-3). The round-4 design fixes the activation order and failure rules, the chat reader and the pending-model context.
- Approved behavior or requirement IDs affected: REQ-002, REQ-003, REQ-010 (amended), REQ-011, REQ-014 (new), AC-002, AC-009, AC-010 (new), I-3, I-5, I-7, I-10, I-11
- Implementation delta: (1) library `RunMemoryFileStore`: `rotateActiveRawTracesForRuntimeSwitch`, `removeActiveRawTracesAfter`, `readLastActiveRawTraceId`, `scanActiveRawTraces`; `jsonl-log-file.ts`: `scanJsonlRecordsFromStart`, `readLastJsonlRecord` (bounded, read-only). (2) One port `RuntimeSwitchMemory { begin, record, discard }` with a plain-value ticket; the notice port, `register` and `getRuntimeSwitchState` removed; `RuntimeSwitch.markerTraceId` derived from the key. (3) `activateSwitched`: ticket → prepare → identity check → record → commit → publish; `discardFailedSwitchAttempt` aborts the candidate and discards only when the release is confirmed (for a failed prepare, the activation operation's own stage). (4) Chat: `readChatRawTraces`/`getChatRawTraceSnapshot` serve `buildProjection` and `buildActiveTracePage`. (5) Derived hand-over: `readPendingRuntimeHandover` (bounded, read-only), `RuntimeHandoverNoticeService` reworked as a notice source with `runPublished`/`runReleased` forgetting the cache. (6) `pendingRuntimeSwitch.requestedAt` → `switchId` (clean cut; the updater generates a UUID, the commit stays pure). (7) `selectionContextFor`: no current model while a switch is pending. (8) Test fixture: a failed preparation reads as released, like the real operation.
- Changed files or areas: see "Key Files Or Areas" in `implementation-handoff.md`; commits `1bc6f85506` (code and tests), `ce8ca5ba8f` (evidence)
- Local validation and result: IMP-01…IMP-06 all Pass (clean clone: library 2108, server 7617 unit tests, typecheck; built-server RS-01/02/03; live three-runtime run on the final code)
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large + High)
- Remaining limitations or risks: see "Known Risks"; the deviation of `readPendingRuntimeHandover` (by memory folder) from the file mapping is stated in the handoff for confirmation
