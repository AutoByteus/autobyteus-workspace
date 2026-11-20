# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Fail`

- Date: 2026-11-20
- Trigger: CRR-002 `Pass` (Large / High), from `/code_reviewer`
- Code tested: `cd26f4d913` (records `2e5f786091`); test edits of this round in `e571b1dd9e`
- Result: `Fail`, AC-001 / REQ-001: an application-owned run of a bundled team-local agent cannot start. `AgentSemanticMemory.prepareForRun` creates `<memory>/semantic/<encodeURIComponent(definition id)>`, a 439-byte folder name for Brief Studio's team-local members (`ENAMETOOLONG`). Fails `agent-runtimes-running-agents` RA-04, `application-import-codex-launch` IC-01, `application-reload-repair` RE-05.
- Preliminary classification: `Design Impact` (folder naming for long ids, shared with the episodic catalog, and what a run start does when the folder cannot be prepared). Recommended owner: failure-origin review by `/code_reviewer`.
- Proven this round: AC-002 to AC-012; CR-001 rendered (SMV-090/091) with a negative control; semantic workspace ids refused as run workspaces (API-06).
- Durable coverage changed: `semantic-memory-view-probe.mjs` SMV-090/091; workspace doubles in three integration tests (made untrue by this change).
- Next Round, after the fix: the stale E2E tests `agent-package-private-skills`, `configured-skill-on-demand-loading`, `memory-sync-multiprocess`, `memory-sync-api` (first, as separate commits); the whole server E2E suite; live SML for Codex, Claude and native AutoByteus (API-08); the fresh-start desktop build (API-11).
- Follow-ups added: FU-004 (imported older-layout team cards at 0, base alike), FU-005 (personal-settings E2E teardown timeout, base alike).
- Observation: a semantic folder's path given as `workspaceRootPath` makes an ordinary filesystem workspace, like any folder the user picks (API-06); the view's own workspace is never used.

## API-REV-002: round 2, `Pass`

- Date: 2026-11-20
- Trigger: CRR-004 `Pass` (Large / High) after IR-003 (SR-009: DEC-015 contained preparation, DEC-016 one folder name rule)
- Code tested: `f393f403d5`; test commits of this round `5edda27b2d` (stale E2E rewrites), `42c2f5189b` (IC-03, SM-12, fixture)
- Prior failure (API-REV-001, `ENAMETOOLONG`): resolved. RA-04, IC-01, RE-05 pass (API-15); the whole suite has no `ENAMETOOLONG` (API-10).
- Rerun delta: API-00, API-02 (server), API-05 (+SM-12), API-07, API-09, API-10 rerun; API-08 live (Codex, Claude, native) and API-11 fresh-start build run for the first time; API-14 (stale rewrites), API-15 (AC-013 IC-03, negative control), API-16 (AC-014) new. API-01, API-03, API-04, API-06, API-12 reused (code they exercise unchanged).
- Result: `Pass`, overall confidence 95.1%, no category below 90%; every critical criterion directly proven (AC-013 and AC-014 included).
- Failures seen and classified, none caused by this change: OS folder-watcher integration files and timing-sensitive E2E files under a host loaded by other worktrees (`fseventsd` 108–179%), each failing alike on a built base worktree or passing alone (API-09, API-10); the Codex live suite's run 1 (`terminateAgentRun` `success: false` once, not reproduced) and run 2 (the model did not run the control command).
- Durable coverage changed: see the report's table (round 2 rows).
- Residuals: CF-11, CF-13 (delivery note), Grok/DeepSeek/Antigravity live, signing and other platforms, host load. Follow-ups FU-003…FU-005 unchanged.
