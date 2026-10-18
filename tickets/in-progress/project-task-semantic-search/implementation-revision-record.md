# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer pass, ARCH-REV-002 (`design-review-report.md`, round 2) | N/A | `Initial Baseline` | SR-004 (requirements), SR-006 (design), ARCH-REV-002 | Implemented; all three catalog entries verified on the production stack; local checks green; ready for code review |
| IR-002 | Code reviewer, CRR-001 (`code-review-report.md`, round 1, Fail, Local Fix) | CR-001, CR-002 (+ optional C-03) | `Local Fix` | SR-006, ARCH-REV-002, CRR-001 | Locator works while meaning search prepares; dead export removed; back to code review |
| IR-003 | Architecture reviewer pass ARCH-REV-003 on SR-007 (failure origin FO-001 from API-REV-001 F-001 / code review) | FO-001, O-1 | `Design Impact` (resolved upstream; implemented here) | SR-007, ARCH-REV-003, CRR-002, API-REV-001 | Granite is the default; LEAF-IR floor 0.30; O-1; reproducible 1,000-Task check passes for the default |

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

### IR-003 — Granite Small English R2 becomes the default model (FO-001 → SR-007)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-003, Pass) on the SR-007 design revision. Origin: API/E2E API-REV-001 F-001 (API-L04), which code review classified as `Design Impact` FO-001.
- Triggering finding IDs: FO-001; optional O-1 (code review).
- Classification: `Design Impact`, resolved upstream (SR-007, user-approved) and implemented here.
- Prior authoritative result: IR-002 (`722b9b3918`), code review Pass (CRR-002); API/E2E Fail (API-REV-001).
- Current authoritative result: commit `9f0df7eab3`.
- Related solution revision IDs: SR-007
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-002 (FO-001 and O-1 in `code-review-report.md`)
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: LEAF-IR, the previous default, failed AC-001 and AC-004 on 1,000-Task backlogs. The user approved Granite as the default (DEC-011).
- Approved behavior or requirement IDs affected: REQ-001, REQ-003, REQ-015; AC-001, AC-002, AC-004 (up to 1,000 Tasks); QR-003, QR-004 (re-based on Granite, measured downstream); DEC-002, DEC-011.
- Implementation delta:
  - catalog: default id and order; LEAF-IR floor 0.30 and its description; Granite's description;
  - O-1: `hasAllFiles` and progress only for downloads; the index's initial phase;
  - G2: the backlog helper, 24 unrelated queries, the gated test's AC-001 metric and scale mode;
  - default-dependent tests updated;
  - `docs/modules/embeddings.md` updated.
- Changed files or areas:
  - `autobyteus-server-ts/src/embeddings/{catalog/embedding-model-catalog.ts, embedding-index.ts, models/embedding-model-files.ts}`;
  - `docs/modules/embeddings.md`;
  - tests: `helpers/{fake-embedding-model.ts, project-task-search-backlogs.ts (new)}`, `fixtures/project-task-search/queries.json`, `integration/embeddings/embedding-model-quality.integration.test.ts`, `unit/embeddings/{embedding-index,embedding-model-catalog,embedding-model-files}.test.ts`, `e2e/projects/{project-task-search,project-task-search-model-unavailable}.e2e.test.ts`.
- Local validation and result: IMP-01…IMP-07 in `implementation-handoff.md` § Checks Run (IR-003); all Pass. The default passes AC-001 and AC-004 on the fixture (96.8% / 95.8%) and on both 1,000-Task backlogs (93.7% / 95.8%; 92.1% / 95.8%).
- Next recipient or routing: per `get_handoff_rules` (Large / High → code review).
- Remaining limitations or risks:
  - R-9: thin margin, 92.1% against 90% on the repository backlog;
  - R-10: QR-003 on real-length Tasks;
  - R-11: QR-004 peak-memory margin;
  - RSK-002, RSK-005, RSK-008 unchanged;
  - EmbeddingGemma 2 is not measured at 1,000 Tasks.
