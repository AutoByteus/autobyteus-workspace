# Handoff Summary

## Summary Meta

- Ticket: `retired-memory-items-and-stale-built-ins` (Project Task `autobyteus-491`; requested by `/project_task_manager` for the founder)
- Date: `2026-11-18`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed (architecture review `Pass` on design SR-003; implementation IR-001; source review CRR-001 `Pass`; API/E2E `API-REV-001` `Pass`, final confidence 95%; test-code review CRR-002 `Pass`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/retired-memory-items-and-stale-built-ins`, base `origin/personal` @ `2e9ac1e65b` at bootstrap; integrated with `origin/personal` @ `75048cbaf4` (67 commits, merge `45b410675c`, no conflict) before any delivery edit. Product code is final at `91ee1603a5`; the later commits are tests (three labelled baseline fixes and this ticket's E2E additions), reports, evidence and docs.

## Delivery Summary

- Delivered scope:
  - **Part 1, the retired item model is gone from the library.** `autobyteus-ts` no longer defines or exports `EpisodicItem`, `SemanticItem`, `MemoryType`, `Retriever`, `MemoryBundle`, the item file names and their read branches, `MemoryStore.list` or `MemoryManager.memoryTypes`; their tests are removed or rewritten. Nothing visible changes: the server and the Memory page already ignored those files. The old `episodic.jsonl`/`semantic.jsonl` files in run folders stay on disk, unread (the user's decision, DEC-004).
  - **Part 2, two retired built-in agents are removed at startup.** The new startup migration `20261118_remove_retired_built_in_agents` deletes the installed `agents/autobyteus-skill-evolver` (with its own skill) and `agents/autobyteus-memory-compactor`, once, on every machine that has them. Both leave the agent catalog and `list_available_agents` (the Memory Compactor was offered to every agent as `/memory_compactor`). Their runs, every other agent and every other file stay byte-identical. A failed removal reports and retries at the next start and never fails startup; a second start does nothing.
  - **Tests rewritten to the new behavior:** the 20261020 startup E2E and fixtures and the web probe case SIR-002 (they asserted the Self-Evolver stays); registry-tail pins in two migration tests; a new migration unit test and the new startup E2E `remove-retired-built-in-agents-startup.e2e.test.ts` (RRB-1 byte-identity and idempotence, RRB-2 a folder that never had them, RRB-3 a real `list_available_agents` call after the upgrade start). API/E2E also made three labelled baseline-fix commits to stale tests it hit (`cbdf02f15a`, `24582b576c`, `0a7993c227`); the server `typecheck-baseline.json` shrank by one.
- Docs synced (`docs-sync-report.md`): the implementation had updated them all; delivery checked each against the merged state and made no edit. `DESIGN.md`, `TESTING.md` and `RELEASE.md` need no change; a `TESTING.md` proposal is `follow-ups.md` FU-005.
- Durable coverage: the migration unit test, RRB-1…RRB-3 (RRB-3 is gated: `RUN_AGY_FAILURE_E2E=1` and the scripted AGY CLI), the rewritten SID/TAU expectations and SIR-002 (real Chrome, the Agents page).

## Verification Summary

- Verified from evidence by delivery. The only part no one but the founder can check is REQ-007, the first start on his own node: his approval and a backup (the removal deletes the two folders and keeps no copy), then release only on his word. Nothing has run on his data or a copy of it (TESTING.md).
- Final confidence 95% (target met); no category below 90%. All five acceptance criteria are directly proven (REQ-007 is the user's gate, not a proof gap).
- Key evidence (opened by delivery):
  - `evidence/API-01-ac001-grep.log` and delivery's rerun `evidence/DEL-08-ac001-grep-merged.log`: the same 37 hits in the same files, each a doc note that says "retired", frozen or released migration code, or a test that uses the old file names as kept or ignored data (AC-001).
  - `evidence/API-06-07-startup-e2e.log`, rerun in `DEL-09-rerun-e2e.log`: `RRB-1…RRB-3` pass on the built Studio. RRB-1 asserts the migration summary `Scanned 2; migrated 2; skipped 0; failed 0.`, both folders gone, every other pre-existing file byte-identical (old item files and the old compactor runs included), the compactor's runs still listed, and a second start that changes nothing (AC-003, AC-005).
  - `evidence/API-07-rrb3-list-available-agents.json`: an agent's real `list_available_agents` call after the upgrade start answers only `{"name":"My Agent","kind":"agent","address":"/my_agent"}`: no Skill Self-Evolver, no Memory Compactor, no `/memory_compactor` (AC-004, the tool surface).
  - `evidence/API-08-sir-probe/delegated-launch-defaults-evidence.json` and `SIR-002-agents-page-1280.png`: `"agentsPage": {"selfEvolver": 0, "memoryCompactor": 0, …}`, `"stillThere": []`, `"changed": []`; the screenshot lists 15 agents, neither retired one among them (AC-004, the Agents page).
  - `evidence/API-11-fresh-start-build.log`: a fresh clone, `pnpm install --frozen-lockfile`, then the macOS desktop build as the release job runs it: `build exit 0`, engines and client present, the packaged `node-pty` spawn probe passes; signing was not tested locally.
  - `evidence/API-12a-lmstudio-memory-flows.log`, `API-12b-openai-strict-live.log`: the gated memory flows made real model calls through the changed raw-trace reads.
- Integrated-state check on `45b410675c` (the base brought `autobyteus-ts` memory changes, the server's agent-memory writers and contract edits; no lockfile or dependency change):
  - both typechecks `0 production errors` at their baselines (server `1011 in 316 files`, web `87 in 37 files`; `DEL-01`, `DEL-02`), and the server build `exit 0` (`DEL-03`);
  - 111 server unit files (migrations, agent memory, built-in agents, architecture) `913 passed` (`DEL-05`) and the 9 Memory page spec files `41 passed` (`DEL-06`);
  - the `autobyteus-ts` suite `4 failed | 2495 passed | 107 skipped` (`DEL-04`): all four are LM Studio live tests with their cause found (below), and the two memory flows this ticket touched pass with a patient timeout on the merged state (`DEL-10`: `memory-llm-flow` 20.7 s, `memory-tool-call-flow` 26.9 s, both real model round trips);
  - four startup and memory E2E files `16 passed | 2 failed` (`DEL-07`); the two failures have their causes found (below) and both files pass alone, `6 passed` (`DEL-09`), including RRB-3.
- Failures on the merged-state run and their causes (TESTING.md Rule 9; none is caused by this change):
  - RRB-3 `AgyDiscoveryError: Antigravity model discovery timed out`: the Antigravity capability runs the scripted CLI twice, `--help` bounded at 3 s and `models` at 15 s, each also bounded by the caller's deadline (`antigravity-cli-capability.ts` `SHORT_PROBE_TIMEOUT_MS`, `MODELS_TIMEOUT_MS`), and a bound that elapses gives this error. Which bound fired was not captured; three built-server E2E files had started together at a host load of about 120. Alone it passes. API/E2E met the same error in its run 2.
  - TAU-3 `ENOENT … memory/episodic/index.md.<hex>.tmp`: a test-helper race with the episodic catalog's atomic write (the catalog was already in this ticket's base). Follow-up FU-004.
  - Four LM Studio tests: `LMSTUDIO_HOSTS` is exported in this environment, so the default suite ran them against another run's loaded 35B reasoning model, which takes 20–47 s for one reply here (measured: 47 s, 216 tokens), against a 20 s test timeout and 20 s file waits. Follow-up FU-005.

## Residual Risks For The User

- R-1 (the founder's gate, REQ-007): the first start of the new version on his node deletes `agents/autobyteus-skill-evolver` and `agents/autobyteus-memory-compactor` with no copy kept. His words were an approval and a backup first, and release only on his word. This merge starts nothing on his node and no release is made, so the gates are untouched. Any later release by any ticket carries this change; his backup applies before he updates. A read-only check on 2026-11-18 found no team, org or package of his naming either agent (design R-1).
- R-2 (a user-made team or org that lists one of the two agents): after the removal its member definition is gone and the team or org stops being admitted. `release-notes.md` tells users to replace such a member before updating.
- R-3 (rollback): reverting the merge restores no data: a start that has run the migration has already deleted the two folders. Fix forward, or restore from a backup (RELEASE.md "Rollback").
- R-4 (not tested): macOS signing and notarization and the Server Docker image (their inputs that this change touches, the install and the server build, ran in API-11 and DEL-03); the migration on the founder's real data.
- R-5 (the release that carries it): RELEASE.md's "Cutting The Release" records the released migrations in `app-data-migration-registry-order.test.ts` (`RELEASED`). The new migration is not in that list until a release carries it; that release's finalize branch adds it.

## Follow-ups

- FU-001…FU-005 are in `follow-ups.md` (the Solution Designer sends them): the web probe case SIR-001 is stale since autobyteus-461's message-admission rule (FU-001); whole-suite E2E files that also fail on the base (FU-002); load-sensitive watcher tests (FU-003); startup E2E snapshots race with the episodic catalog's temporary files (FU-004, delivery's); the LM Studio live tests' gate and waits, and `TESTING.md`'s Core library row (FU-005, delivery's). The base's `TESTING.md` gained a rule and a helper for watcher-event tests (`tests/helpers/os-latency-under-load.ts`) while this ticket was in review: check FU-002 and FU-003 against it before sending, they may be partly met.

## Release

- No release: RELEASE.md's default (the user did not ask for one) and the founder's word, "release only on my word", which has not been given. A release is available: `release-notes.md` holds the user-facing notes (with a `## What you need to do` section) for the next release.
