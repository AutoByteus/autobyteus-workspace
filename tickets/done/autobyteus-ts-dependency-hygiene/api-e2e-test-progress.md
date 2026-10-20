# API/E2E Test Progress — autobyteus-ts-dependency-hygiene

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases. Scratch: `/tmp/hyg224`.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 10:39Z | API-04 | Started | — | docker image build of the worktree in background (/tmp/hyg224/logs/API-04-build.log) |
| 10:39Z | API-01 | Started | — | temp worktree /tmp/hyg224/fresh at head; install paths |
| 10:42Z | API-01 | Completed | Pass | fresh checkout: frozen/no-frozen/lockfile-only/inside-package keep the committed lockfile byte-identical; dedupe --check identical on base and branch (eventsource-parser one of 8 pre-existing dedupes) → L-1 accepted |
| 10:42Z | API-02 | Started | — | git grep for references to the deleted files |
| 10:42Z | API-02 | Completed | Pass | no reference to the deleted files; no hono import in autobyteus-ts |
| 10:42Z | API-03 | Started | — | isolated instance from the worktree's packaged app; fixture HTTP on :47510 |
| 10:45Z | API-03 | Completed | Pass | preview/discover/gateway calls OK (stdio env+cwd, structured, tool error, HTTP token on all 12 requests); 0 module errors; first stop forced, 3 repro stops graceful 1-2 s |
| 10:45Z | API-04 | Checkpoint | — | image built 10:45Z; container hyg224 starting |
| 10:47Z | API-04 | Completed | Pass | image: no hono in autobyteus-ts, hono 4.12.0 for the 3 packages that need it, MCP journey OK; install context re-resolves the same on base and branch (diff = importer hono only); container + image removed |
| 10:48Z | cleanup | Completed | — | temp checkout and /tmp/hyg224 removed; no fixture process; report and revision record written |
