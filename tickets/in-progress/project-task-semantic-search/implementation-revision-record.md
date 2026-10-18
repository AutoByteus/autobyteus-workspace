# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer pass, ARCH-REV-002 (`design-review-report.md`, round 2) | N/A | `Initial Baseline` | SR-004 (requirements), SR-006 (design), ARCH-REV-002 | Implemented; all three catalog entries verified on the production stack; local checks green; ready for code review |
| IR-002 | Code reviewer, CRR-001 (`code-review-report.md`, round 1, Fail, Local Fix) | CR-001, CR-002 (+ optional C-03) | `Local Fix` | SR-006, ARCH-REV-002, CRR-001 | Locator works while meaning search prepares; dead export removed; back to code review |

## Revision Entries

### IR-001 — Local meaning search for Project Tasks on a reusable server-side embedding layer

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, Pass), round 2.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete on branch `codex/project-task-semantic-search` (commit recorded in `implementation-handoff.md`); companion `autobyteus-agents` branch `codex/project-task-semantic-search` @ `344da76`.
- Related solution revision IDs: SR-004, SR-006
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed design (Change / Refactor Sequence steps 1–9; step 10 validation belongs downstream).
- Approved behavior or requirement IDs affected: BEH-001…BEH-005; REQ-001…REQ-015.
- Implementation delta:
  - new `autobyteus-server-ts/src/embeddings/` (catalog + setting, model files, worker + runner, vector store, collection job, relevance, readiness, `EmbeddingIndex`);
  - new `src/projects/search/project-task-search-service.ts`; delete hooks in `ProjectTaskService` / `ProjectService`; composition wiring;
  - GraphQL `searchProjectTasks`, `retryEmbeddingModel`; tool `search_project_tasks` (contract, manifest, native class); setting registration;
  - web `useProjectTaskSearch`, board changes (client predicate removed), status line, en/zh-CN texts;
  - desktop packaging prune + runtime check (`scripts/onnxruntime-web-packaging.mjs`, hooked into `prepare-server.mjs` and `prepare-server.sh`);
  - docs (server `embeddings.md` new, `projects.md`, `agent_tools_mcp_server.md`, `search.md`, `README.md`; web `docs/projects.md`);
  - catalog verification and calibration (LEAF-IR floor 0.19 → 0.24);
  - companion Project Task Manager tool + skill guidance.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` § Local Implementation Checks Run (server unit/E2E/typecheck, gated real-model check of all three models, web tests and guards, licensing/hygiene, desktop packaging, rendered board check).
- Next recipient or routing: per `get_handoff_rules` (Large / High → code review).
- Remaining limitations or risks: RSK-002, RSK-004 (calibration on real backlogs), RSK-005/RSK-009 (memory), RSK-008 (`listTasks` cost); QR-001…QR-005 measurement on the built app is downstream (AC-015).

### IR-002 — Locator while meaning search prepares; dead export (CRR-001 local fix)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-001, Fail, Local Fix), round 1.
- Triggering finding IDs: CR-001, CR-002; optional C-03 applied; optional C-04 left to follow-up FU-CR-1 (split `ProjectTaskService`), as the reviewer routed it.
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (`b27dd7b284`), code review Fail.
- Current authoritative result: commit `722b9b3918` on `codex/project-task-semantic-search`.
- Related solution revision IDs: SR-006
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: CR-001 broke REQ-004/AC-005 (locator) during first use and model switches; CR-002 is dead code.
- Approved behavior or requirement IDs affected: BEH-001; REQ-004, REQ-009, REQ-010; AC-005.
- Implementation delta:
  - CR-001, `autobyteus-web/composables/projects/useProjectTaskSearch.ts`:
    - `schedule(delay, refresh)` and `run(refresh)` take a `refresh` flag;
    - the 2 s readiness poll for the same Project and query is a refresh: it never sets `pending`, so `settled` stays true for the shown answer;
    - a new query or Project, the debounce, a Task-list re-search, the first request, Retry and reload still make the answer unsettled;
    - an older or superseded refresh answer is still dropped (latest request wins).
  - New spec in `ProjectsPanelTaskLocate.spec.ts`, "locates while meaning search is preparing…". It locates a shown Task while the answer is PREPARING, then a Task hidden by the search after a readiness poll; the search is cleared and the card located. It fails on the previous code and passes now.
  - CR-002: removed `isSettledReadiness` from `autobyteus-server-ts/src/embeddings/embedding-readiness.ts` (no references).
  - C-03: `embedding-worker.ts` imports `EmbeddingModelOutput` as a type-only import (erased: the compiled worker imports only `node:*`, `onnxruntime-web` and `@huggingface/tokenizers`) instead of redeclaring it.
- Changed files or areas: the four files above.
- Local validation and result:
  - web `components/projects`: 14 files, 113 tests passed;
  - the web guards passed;
  - server embeddings, search and tool tests: 6 files, 38 tests passed;
  - typecheck clean;
  - the gated real-model check (LEAF-IR) through the changed worker passed.
- Next recipient or routing: code reviewer (Large/High Local Fix → source review).
- Remaining limitations or risks: unchanged from IR-001.
