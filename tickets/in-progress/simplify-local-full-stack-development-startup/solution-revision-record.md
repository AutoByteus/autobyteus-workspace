# Solution Revision Record — Simplify Local Full-Stack Development Startup

Canonical solution authority remains in `requirements.md`, `investigation-notes.md`, `design-spec.md`, and `development-startup-contract.md`. This record is only the durable solution-round index.

## SR-001 — Initial implementation-ready baseline

- **Triggering role / round / finding IDs:** `solution_designer`, initial solution round; upstream investigation findings `BEH-001`–`BEH-006`, requirements `REQ-001`–`REQ-014`, acceptance criteria `AC-001`–`AC-013`.
- **Prior result:** `N/A` — initial baseline.
- **Current result:** `Implementation Ready`.
- **Baseline established:** One root-owned `pnpm dev` supervisor and isolated repository-local development runtime replace misleading test-labelled manual launchers; deterministic E2E remains test-owned under `pnpm test:e2e`; real-provider E2E remains explicit and separate.
- **Upstream clarification included:** Current AppConfig/memory path inspection showed that ambient `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_MEMORY_DIR`, and `AUTOBYTEUS_TEMP_WORKSPACE_DIR` can redirect runtime state independently of `--data-dir`. The requirements and development-startup contract now explicitly make these three keys, along with the four template keys, launcher-owned. This closes the all-data-under-root invariant without changing unrelated shell variables or server runtime code.
- **Affected canonical artifacts / sections:** `requirements.md` status, behavior `BEH-004`, finding list, `REQ-006`, `AC-006`, and approval status; `investigation-notes.md` status, supplement inventory, source log, behavior `BEH-004`, and findings; `development-startup-contract.md` status, materialization ownership, and child-environment ownership; `design-spec.md` current-state read, intended change, behavior map, materialization/lifecycle boundaries, file mapping, and readiness validation.
- **Implementation impact:** Add `scripts/development/development-runtime.mjs`, `scripts/development/run-dev.mjs`, and durable launcher tests; add `.env.development`, root/server ignore and root command changes; remove the three manual test launchers/scripts; update operational docs. Preserve server, Nuxt, test bootstrap, Electron, Docker, provider, vault, and importer owners.
- **Repeated readiness checks:** All approved use cases are mapped; every behavior has a complete production path and spine coverage; shared design principles pass for ownership, boundaries, dependencies, reuse, persisted-data decision (`Not Affected`), legacy removal, and proportionality.
- **Remaining gaps:** None blocking. Downstream must validate cross-platform child cleanup, readiness timeouts, path/symlink confinement, exact command execution, and any pre-existing deterministic E2E failures.
