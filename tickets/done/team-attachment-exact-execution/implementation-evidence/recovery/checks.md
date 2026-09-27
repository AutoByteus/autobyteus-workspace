# IR-002 local implementation checks — 2026-09-27

These are implementation-scoped checks, NOT API/E2E, actual installed-copy startup, Electron startup, or release sign-off.

- `pnpm install --offline --ignore-scripts --frozen-lockfile`: pass (local cached dependencies only; expected unbuilt devkit-bin warnings).
- `pnpm -C autobyteus-server-ts prepare:shared` and `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma`: pass; dependency-build.log.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`: pass; source-typecheck.log. This checks production source, not all preexisting test TypeScript.
- `pnpm -C autobyteus-server-ts exec vitest run <19 files below> --no-watch`: **157 tests pass**, server-unit.log. Scoped fixture databases only; no installed data read or written by implementation.
- `git diff --check`: both software and companion pass; diff-check.log.
- `python3 /Users/normy/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/normy/autobyteus_org/autobyteus-worktrees/team-attachment-migration-workflow/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer`: pass; companion-skill-validation.log.
- Changed production sources <=500 non-empty lines; maximum 482. >220 delta in readiness is the D2 extraction, not one enlarged multi-concern file; source-size-check.txt.

## Final Vitest selection (relative to autobyteus-server-ts)
```
tests/unit/app-data-migrations/team-context-file-execution-locators-v1.test.ts
tests/unit/app-data-migrations/agent-org-context-file-locator-transition.test.ts
tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts
tests/unit/context-files
tests/unit/run-history/services/root-run-package-readiness-index.test.ts
tests/unit/run-history/services/team-run-package-catalog.test.ts
tests/unit/run-history/services/agent-run-history-catalog-service.test.ts
tests/unit/run-history/services/agent-run-view-projection-service.test.ts
tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts
tests/unit/agent-org-execution/agent-org-execution-tree-location-service.test.ts
tests/unit/agent-team-execution/agent-team-run-manager-lifecycle.test.ts
tests/unit/agent-org-execution/agent-org-run-manager-lifecycle.test.ts
tests/unit/server-runtime-app-data-migration-gate.test.ts
tests/unit/standalone-application-host/standalone-application-host-lifecycle.test.ts
```

## Local coverage and corrections
Current strict fixtures include sidecars/metadata, rather than directory/tree-only packages incorrectly taken as usable. Old structural-only/raw-payload-independent and blanket-fatal assertions were replaced with D2 current-reference/scoped-admission assertions. Existing isolated lifecycle suites mock the admission owner only where their scope builder/metadata is already mocked; disk-backed admission/restore rejections are exercised separately.

Migration cases: empty/nonempty incomplete roots; all history excluded and new standalone preparation/catalog publication; nested task Team, repeated address physical provenance; complete archives/tasks/updates/messages; metadata absence; malformed sidecars; old/exact unavailable cross-root refs, transitive and standalone dependencies, valid cycles; no-write exclusions; genuine per-group commit failure with independent conversion; normal interrupted commit/progress/completion/ledger retry; released incomplete plans retained under excluded groups; original bytes, completed journal bytes/mtime and newer current writes preserved. Explicit warnings use counts plus at most five samples/disposition, no majority threshold.

Direct reads: current stored-tree async/sync, standalone owner async/sync, standalone projection and restore rejection, exact finalization/read/provider normalization. Both startup entrypoint UNIT suites show independent readiness is sequenced before composition/listening for SUCCEEDED/WARNINGS/FAILED/RUNNING/NOT_RUN/missing attachment ledger states; existing true core gate controls remain. These mocks do not prove real process or desktop startup.

## Known remaining validation work
API/E2E must update the existing real-process/REST fixtures, including the obsolete universal-fatal assertions in tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts and required memoryDir input on ContextFileOwnerResolver construction in tests/integration/api/rest/agent-org-context-files.integration.test.ts and tests/integration/agent-memory/user-attachment-history.integration.test.ts. No compatibility bypass should be added to satisfy old fixtures.

Mandatory fresh evidence: both actual entrypoints, ordinary repeat startup, same-ID failed retry and terminal ledger skip + independent current admission, predecessor warning residue, zero admitted history + actual new work, complete retained eight-root installed-copy corpus, current history/attachment access and reported Electron startup boundary. User verification/Delivery remain gates. API-REV-002 remains FAIL; incident remains OPEN.

Generated untracked autobyteus-application-backend-sdk/dist and autobyteus-application-sdk-contracts/dist are dependency build output, not authored deliverables. No commit/push/release/live data mutation.
