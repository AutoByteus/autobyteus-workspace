# Handoff Summary — search-model-settings (Project Task autobyteus-146)

## What Changed

**Settings → Server Settings → Embedding** manages the node's meaning-search models and indexes, on the desktop and on a Docker node opened from a browser:

- **Models:** see each supported model's state (Active, Ready, Downloaded, Not downloaded, Downloading, Unavailable) and its size on disk. Download a model ahead of time, Cancel, Remove, switch the active model (with a confirmation when it is not yet downloaded), and Retry an unavailable model. Opening the section starts nothing.
- **Project indexes:** see each Project's index state for the active model (Not indexed, Needs update, Indexing n of N, Ready · N Tasks, Unavailable). You can filter the list, run Index now or Rebuild on one Project, or Index all Projects.
- **Index after writes:** a few seconds after a Task is created or its description edited, by the user or an agent, the server indexes that Project in the background when the model is on disk. Saves never wait for it. Writes that change no description (status, dependencies, "part of", assignments) load no model.
- The status read is cheap: refreshes take milliseconds. The first load is about as fast as the Projects list for the same backlog (DEC-012).

## Classification And Route

- `task_size`: Medium; `architectural_risk`: High; route: reviewed. Code review CRR-001…CRR-006; API/E2E API-REV-002, Pass at 95%.

## Integration

- `origin/personal` @ `fc93276e6f` (63 commits, including "part of" Task relations) merged as `f9de3d57d7` with no conflicts.
- Rechecked at DR-002: unchanged.
- Checks on the merge:
  - typecheck;
  - server unit: 745 files, 6,112 tests;
  - `tests/e2e/projects`: 7 files, 44 tests;
  - web settings and projects: 74 files, 450 tests.
  All passed (`evidence/delivery/DR-001-*`).

## Verification

- Verified from the evidence on the clarified requirements (SR-008 / DEC-015), with no user check needed:
  - AC-001…AC-015 are proven;
  - QR-001 is proven, with a thin desktop margin.
- The per-criterion table is in `release-deployment-report.md`.

## Release Decision

No release: none was requested, so the release guide's default applies. The change ships with the next release; a beta is available on request.

## Docs

- `autobyteus-web/docs/settings.md` and `autobyteus-server-ts/docs/modules/embeddings.md` are updated, as are `projects.md` (server) and `autobyteus-web/docs/projects.md`.
- Delivery added the DEC-015 cadence sentence and the "part of" marks (`docs-sync-report.md`).

## Residual Risks And Follow-Ups

- An already-open panel shows indexing that the server started on its own at its next 10 s refresh. This is by design per DEC-015.
- QR-001 desktop first load: 15 of 16 samples within 1 s; one took 1,204 ms on a loaded shared host.
- Untested here: Windows, Linux and macOS x64 desktop, and Docker amd64. The release workflows build them.
- The Project store's whole-backlog read bounds the first load (DEC-012 follow-up).
- `project-task-service.ts` is near the size limit (autobyteus-147).
- `native-compaction-terminal-drain.test.ts` is flaky in base code (autobyteus-103 Part 4).
