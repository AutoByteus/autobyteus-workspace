# Handoff Summary — project-task-semantic-search (Project Task autobyteus-71)

## What Changed

People and agents can find Project Tasks by what they are about, not only by exact words:

- **Board search** (Projects page and right panel) shows exact matches first, then Tasks related by meaning. Unrelated queries show "no match". On first use the board shows progress while it prepares; if meaning search is unavailable, it says why, keeps exact matches, and offers Retry.
- **Agent tool `search_project_tasks`** (native and MCP) returns a compact best-first list with key, status, one-line summary and match kind. It also reports whether meaning search was used. The Project Task Manager package selects it and searches before creating a Task that may already exist (companion repository).
- **Local embedding layer** in the server (`src/embeddings/`). It runs a small model (default IBM Granite Small English R2, 55 MB, Apache-2.0) on the CPU through WebAssembly in a worker thread. The model is downloaded once and SHA-256 checked. Vectors are kept in `embeddings.sqlite` and stay in step with Task edits and deletes. A server setting can switch the model without a restart. No GPU, hosted API or vector database is involved, and Task text never leaves the machine.

## Classification And Route

- `task_size`: Large; `architectural_risk`: High; route: reviewed (architecture review ARCH-REV-003, code review CRR-006, API/E2E API-REV-003, test-code review CRR-005 Pass / CRR-007 Not Applicable).

## Integration

- Bootstrap base `origin/personal` @ `55bff1f5ee`. DR-001 found 136 new base commits whose merge conflicted with the removal of `create_or_update_project` and with Task adoption (`Local Fix`).
- IR-004 merged `origin/personal` @ `2b04a9971d` as `600d079b9c` (merge method), with seven Project/Task tools and both delete-cleanup steps.
- DR-002 rechecked the base: still `2b04a9971d`, already contained. The delivery HEAD differs from `600d079b9c` only under `tickets/`.
- Post-integration checks: API-REV-003 reran every case on `600d079b9c` (Pass, 95%). The delivery smoke rerun of `tests/e2e/projects` on the delivery HEAD passed: 6 files, 35 tests, `exit=0` (`evidence/delivery/DR-002-01-e2e-projects-smoke.log`).

## Verification

Verified from the evidence: every critical acceptance criterion (AC-001…AC-016) is directly proven on the merged state. No user check is needed. The judgement and the files checked are in `release-deployment-report.md` § Verification.

## Release Decision

No release: none was requested, which is the release guide's default. The change ships with the next release; a beta or stable release is available on request.

## Docs

The change itself updated the server docs (`embeddings.md` new, `projects.md`, `agent_tools_mcp_server.md`, `search.md`, `README.md`) and `autobyteus-web/docs/projects.md`. Delivery reviewed them on the merged state; no further edits were needed (`docs-sync-report.md`).

## Residual Risks And Follow-Ups

- C-12: AC-001 margin on real text is thin (92.1% against 90%).
- C-10: the real-text backlog of the opt-in scale test drifts as `tickets/done` grows; a frozen fixture could be a follow-up.
- Untested here: Windows, Linux and macOS x64 packaging, and Docker amd64. The release workflows build and validate them.
- RSK-002 / FU-2: model downloads ignore HTTP proxies. Behind a proxy, meaning search shows unavailable and exact search still works.
- O-2 / FU-1: the embedding-model setting appears in Advanced settings only once it has a value; a model chooser is FU-1.
- O-3 / FU-5: the Docker image keeps the unpruned `onnxruntime-web` (≈136 MB).
- O-4: during indexing, meaning results come only from the part already indexed.
- C-14: an intermittent compaction test in base code, not observed in round 3.
- FU-1…FU-6 and autobyteus-147 (split `ProjectTaskService`).
- Companion timing: the Project Task Manager package on `autobyteus-agents` `main` selects `search_project_tasks` before any released app has it. Older apps skip the unknown tool with a warning (proven by the base's resolver tests). The skill still mentions the search; the agent keeps `list_project_tasks`, which the skill names as the alternative. This fallback is not separately tested.
