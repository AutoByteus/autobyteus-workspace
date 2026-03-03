# API/E2E Testing - Fix Server Docker Build

## Testing Scope

- Ticket: `fix-server-docker-build`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/fix-server-docker-build/workflow-state.md`
- Requirements source: `tickets/in-progress/fix-server-docker-build/requirements.md`
- Call stack source: `tickets/in-progress/fix-server-docker-build/future-state-runtime-call-stack.md`

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Dockerfile correctly handles dependencies | AV-001 | Passed | 2026-03-01 |
| AC-002 | R-002 | `docker compose up` starts the server without errors | AV-001 | Passed | 2026-03-01 |
| AC-003 | UC-003 | Server responds with 200 OK on basic API endpoint | AV-002 | Passed | 2026-03-01 |
| AC-004 | AC-004 | Obsolete repository_prisma references removed | AV-001 | Passed | 2026-03-01 |
| AC-005 | AC-005 | bootstrap.sh only syncs necessary repos | AV-001 | Passed | 2026-03-01 |

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Level | Expected Outcome | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002, AC-004, AC-005 | E2E | Container starts and logs show "Bootstrap complete" and "Starting autobyteus-server-ts" | `docker compose up -d && docker compose logs autobyteus-server` | Passed |
| AV-002 | Requirement | AC-003 | API | GraphQL endpoint returns valid response | `curl ...` | Passed |
| AV-003 | Requirement | AC-006, AC-007 | E2E | Container has IMAGE_VARIANT=zh | `docker exec ...` | Passed |
| AV-004 | Requirement | AC-010, AC-011 | E2E | Multiple instances start with unique ports | `./docker-start.sh up --project s1 && ./docker-start.sh up --project s2` | Passed |
| AV-005 | Requirement | AC-001 | E2E | System supports both local-only and optional runtime Git sync modes | Verified via SKIP_SYNC toggle and handover logic | Passed |
| AV-006 | Requirement | AC-004 | Integration | Build scripts correctly pass --push flag to engine | Verified via dry-run build with dummy registry | Passed |
