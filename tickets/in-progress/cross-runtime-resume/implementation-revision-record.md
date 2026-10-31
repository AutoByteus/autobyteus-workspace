# Implementation Revision Record — autobyteus-316

| ID | Date | Trigger | What changed | Evidence |
|---|---|---|---|---|
| IR-001 | 2026-10-31 | Build released after ARCH-REV-002 Pass and the user's go (commit `945610a16c`) | Whole first delivery implemented per `design-spec.md` and `run-runtime-switch-contract.md` in five commits (`ebb137a012` pending-switch metadata, commit function, recorder, per-file journal runtime; `d81709f15e` settings save, activation, hand-over notice, composition; `3927e39775` web settings choice and the `…Selection` rename; `bb6fc32b10` tests for every part, docs, glossary; `3521ae05f1` single commit path clean-up, live e2e, real-run evidence). No requirement or design change. | `implementation-handoff.md`, `evidence/implementation/`, `evidence/real-run/` |

## Notes on the build

- Failures found and fixed on the way (all in tests or test fixtures, none in the design): journal-service tests needed a per-segment runtime (`rotateActive(runDir, runtimeKind)`, `setSegmentRuntimeKind`); memory-search discovery stub returned no runtime (`?? null`); lifecycle mocks returned the extra `clearPendingRuntimeSwitch` key (a helper strips it); a "restore commit did not land" test needed a different session ID; live e2e: wait for `CONNECTED` before the first send, count records before creating the socket, `AGY_FAKE_CASE=auto_compaction` because the scripted CLI's default case is a terminal error.
- Dead-code clean-up at the end: the catalog's `commitRunModelConfig` and `agent-run-model-config-commit.ts` were removed once nothing but their own test called them; their recovery tests moved to the switch commit's test file. An attempt to keep a separate model-only commit path was reverted because it duplicated the write/read-back logic and needed test rewrites in three suites.
- Clean-clone proof first failed only because a narrowed `pnpm install --filter` left the SDK packages without their links; a full `pnpm install --frozen-lockfile` fixed the setup (not a code issue).
