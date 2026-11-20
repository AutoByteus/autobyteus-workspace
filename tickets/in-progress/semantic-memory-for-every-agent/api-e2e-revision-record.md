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
