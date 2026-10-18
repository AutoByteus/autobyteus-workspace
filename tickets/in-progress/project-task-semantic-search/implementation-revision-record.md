# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer pass, ARCH-REV-002 (`design-review-report.md`, round 2) | N/A | `Initial Baseline` | SR-004 (requirements), SR-006 (design), ARCH-REV-002 | Implemented; all three catalog entries verified on the production stack; local checks green; ready for code review |

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
