# API / E2E Testing

- Ticket: `linux-appimage-memory-dir-startup`
- Last Updated: `2026-04-02`

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Expected Outcome | Execution Command | Result |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Requirement | AC-001 | `src/app.ts` initializes effective config before importing the broader runtime graph. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app.test.ts` | Passed |
| SCN-002 | Requirement | AC-003 | Touched startup-sensitive modules import without import-time config-path binding. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/mcp-server-management/file-provider.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts` | Passed |
| SCN-003 | Requirement | AC-004 | Team-member projection behavior still works and keeps `memoryDir` metadata. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/team-member-run-view-projection-service.test.ts` | Passed |
| SCN-004 | Requirement | AC-002, AC-005 | Refactored Linux AppImage starts its embedded server and logs the effective app-data and memory directories under `~/.autobyteus/server-data/**`. | `AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 pnpm -C autobyteus-web build:electron:linux` + `timeout 20s ./AutoByteus_personal_linux-1.2.52.AppImage` | Passed |
| SCN-005 | Requirement | AC-006 | Ticket captures commit/date/root-cause provenance for the original regression. | `git blame -L 60,90 ...` + `git show 03b8f9a -- ...` | Passed |
| SCN-006 | Cleanup | AC-001, AC-003 | The bootstrap entrypoint remains bootstrap-only after removing the proxy export, and focused startup regressions still pass. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app.test.ts tests/unit/config/app-config.test.ts tests/unit/mcp-server-management/file-provider.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts` + `pnpm -C autobyteus-server-ts build:file` | Passed |

## Acceptance Criteria Closure Matrix

| Acceptance Criteria ID | Execution Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`) | Mapped Scenarios | Notes |
| --- | --- | --- | --- |
| AC-001 | Passed | SCN-001, SCN-006 | `app.ts` bootstrap ordering still holds after the proxy cleanup. |
| AC-002 | Passed | SCN-004 | Packaged AppImage constructor/init logs now report the effective app-data and memory directories. |
| AC-003 | Passed | SCN-002, SCN-006 | Touched import-timing regression tests still pass after the boundary cleanup. |
| AC-004 | Passed | SCN-003 | Existing projection behavior test still passes after the bootstrap refactor. |
| AC-005 | Passed | SCN-004 | Packaged Linux AppImage reached `running` without the `/tmp/.mount_*/resources/server/memory` failure. |
| AC-006 | Passed | SCN-005 | Git history recorded in investigation and handoff artifacts. |

## Test Failures & Escalations

- No validation failures in the ticket scope.
- Repo-wide strict bootstrap enforcement is intentionally deferred; this ticket validates the production server entry path plus touched import-time regressions.
