# Executable Validation

## Validation Round Meta

- Current Validation Round: 1
- Trigger Stage: 6
- Prior Round Reviewed: None
- Latest Authoritative Round: 1
- Ticket: `windows-prisma-url-regression`
- Scope: Small
- Interface shape: Windows native desktop, embedded server process, and Prisma CLI
- Lifecycle boundaries: startup and migration

## Validation Asset Strategy

- Durable assets: focused value-object, configuration, import CLI, migration
  environment, and Electron runtime environment tests.
- Temporary methods: disposable SQLite migration probe, patched installed server
  bundle probe, and unpacked Electron application startup with isolated app data.
- Cleanup: test processes stopped, port 29695 released, and packaging stage removed.

## Acceptance Criteria Coverage

| Acceptance Criterion | Requirement | Scenario | Status | Evidence |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | AV-001 | Passed | Windows formatter unit test emits `file:C:/...` |
| AC-002 | REQ-003 | AV-002 | Passed | Canonical `file:///C:/...` import test returns the native path and Prisma URL |
| AC-003 | REQ-002, REQ-004, REQ-005 | AV-003 | Passed | Focused server and Electron suites pass, 83 tests total |
| AC-004 | REQ-001 | AV-004, AV-005 | Passed | Fresh Prisma database migrated; packaged desktop server reached health |

## Spine Coverage

| Spine | Scope | Governing Owner | Scenarios | Status |
| --- | --- | --- | --- | --- |
| DS-001 Desktop startup | Primary end-to-end | `ApplicationDatabaseLocation` | AV-001, AV-004, AV-005 | Passed |
| DS-002 Explicit import | Bounded local | `ApplicationDatabaseLocation.fromAbsoluteFileUrl()` | AV-002, AV-003 | Passed |
| DS-003 Invalid input | Bounded local | `decodeConfiguredPath()` | AV-003 | Passed |

## Scenario Results

| ID | Mode | Objective | Result |
| --- | --- | --- | --- |
| AV-001 | Unit | Preserve Prisma-compatible Windows and POSIX URL syntax | Passed: 31 config tests |
| AV-002 | Unit/integration | Accept generic absolute import URLs and normalize once | Passed: 32 import/migration tests |
| AV-003 | Unit/integration | Preserve Electron runtime URL generation and invalid-input rejection | Passed: 20 Electron tests |
| AV-004 | CLI/process | Open a fresh Windows SQLite path with the generated URL | Passed: all 19 Prisma migrations applied |
| AV-005 | Native desktop lifecycle | Start the packaged Electron shell and embedded server from fresh app data | Passed: renderer changed `starting` to `running`; `/rest/health` returned `ok` |

## Build And Runtime Evidence

- `pnpm -C autobyteus-server-ts build`: passed, including Prisma generation,
  TypeScript compilation, shared packages, and built-in agent smoke.
- Ubuntu WSL2 with Node 24.13.0: 55 applicable server tests passed (the single
  Windows-only assertion was skipped), 20 Electron URL/runtime tests passed, and a
  fresh `file:/home/...` SQLite database applied all 19 Prisma migrations.
- A server bundle executed under the installed Electron 42 runtime applied migrations,
  listened on a dynamic port, and returned a healthy REST response.
- `electron-dist/win-unpacked/AutoByteus.exe` started with isolated application data,
  applied every migration, loaded the renderer, and returned
  `{"status":"ok","message":"Server is running"}` on port 29695.
- A Windows installer was produced at
  `autobyteus-web/electron-dist/AutoByteus_enterprise_windows-1.4.42.exe`.

## Environment Constraints And Residual Risk

- The normal packaging command cannot rebuild `node-pty` on this host because the
  Visual C++ Spectre-mitigated libraries are not installed. For local package
  validation only, the existing Electron-42-compatible `node-pty` native output from
  installed version 1.4.42 was copied into the prepared bundle before packaging.
- Standalone `pnpm typecheck` reports existing `TS6059` errors because the project
  includes tests while declaring `rootDir` as `src`; the production build passes.
- Five broader secret-import fixture cases fail on this Windows host because existing
  ACL trust checks reject inherited temporary-directory permissions. The focused
  import CLI and migration environment suites pass, and the failing path is unrelated
  to database URL serialization.
- No acceptance criterion is infeasible or waived. The native rebuild constraint is
  a build-host prerequisite, not an unresolved product-runtime failure.
- Native macOS packaging/startup was not available on this host. macOS uses the same
  POSIX `/...` path branch proven on Linux and by the existing `/Users/...` Electron
  tests, but a macOS release build remains the final platform-specific packaging check.

## Round History

| Round | Trigger | New Failures | Gate Result | Latest | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | No product failures | Pass | Yes | All criteria and runtime spines passed |

## Stage 7 Gate Decision

- Latest authoritative result: Pass
- Stage 7 complete: Yes
- Durable executable validation updated: Yes
- All acceptance criteria and relevant spines mapped and passed: Yes
- Critical executable scenarios passed: Yes
- Infeasible or waived criteria: No
- Temporary validation-only scaffolding cleaned up: Yes
- Unresolved escalation items: No
- Ready for Stage 8 code review: Yes
