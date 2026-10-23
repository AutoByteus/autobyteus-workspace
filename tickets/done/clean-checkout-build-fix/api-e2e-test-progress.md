# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-23T23:30:55Z | API-01 | Completed | Pass | Reused IMP-01 |
| 2026-10-23T23:31:01Z | API-02 | Started |  | git clone --no-local |
| 2026-10-23T23:32:02Z | API-02 | Completed |  | API-02-fresh-clone.log |
| 2026-10-23T23:32:05Z | API-06 | Started |  | pnpm install --frozen-lockfile && pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts typecheck && pnpm -C autobyteus-server-ts build && pnpm -C autobyteus-server-ts test:integration:prepare |
| 2026-10-23T23:33:40Z | API-06 | Completed | Pass | API-06-clone-build.log |
| 2026-10-23T23:33:41Z | API-07 | Started |  | pnpm -C autobyteus-server-ts test:unit |
| 2026-10-23T23:41:59Z | API-07 | Completed | Pass | API-07-clone-server-unit.log |
| 2026-10-23T23:41:59Z | API-08 | Started |  | pnpm -C autobyteus-server-ts test:integration |
| 2026-10-23T23:45:16Z | API-08 | Completed | Pass | API-08-clone-server-integration.log |
| 2026-10-23T23:45:16Z | API-09 | Started |  | cd autobyteus-server-ts && pnpm exec vitest run tests/architecture tests/e2e/app-data-migrations --no-watch; a=$?; pnpm exec vitest list tests/e2e > /tmp/ab282e2e/e2e-list.txt 2>&1; b=$?; echo "vitest run exit=$a"; echo "vitest list tests/e2e exit=$b entries=$(grep -c '' /tmp/ab282e2e/e2e-list.txt)"; exit $a |
| 2026-10-23T23:50:11Z | API-09 | Completed | Fail (exit 1) | API-09-clone-architecture-and-e2e.log |
| 2026-10-23T23:50:11Z | API-05 | Started |  | probe in the clone: untrack the restored files, bare memory rule, new untracked import |
| 2026-10-23T23:50:13Z | API-05 | Completed | Pass (fails as expected) | API-05-check-negative-probe.log |
