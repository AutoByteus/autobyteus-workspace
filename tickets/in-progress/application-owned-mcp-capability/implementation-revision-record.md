# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record preserves the initial baseline and subsequent implementation corrections for review.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer` / `design-review-report.md` / Round 4 | `N/A` | `Initial Baseline` | `SR-001`–`SR-004`; `ARCH-REV-004`; `CRR-*`, `API-REV-*`, `DR-*`: `N/A` | Ready for code review |
| IR-002 | `/architecture_reviewer` / `design-review-report.md` / Round 5, after `/code_reviewer` / `CRR-001` | `CR-DI-001` | `Local Fix` after upstream design resolution | `SR-005`; `ARCH-REV-005`; `CRR-001`; `API-REV-*`, `DR-*`: `N/A` | Corrected; ready for renewed code review |

## Revision Entries

### IR-001 — Initial application-owned agent-tool implementation baseline

- Triggering role, report path, and round: `/architecture_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`; architecture review Round 4.
- Triggering finding IDs: `N/A` — `ARCH-DI-001` and `ARCH-DI-002` were closed before implementation.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Reviewed v5/v7 application-owned agent-tool capability, runtime projections, worker gateway, ownership rules, staged catalog lifecycle, maintained source transition, and Brief Studio sample are implemented and locally build-validated; ready for `/code_reviewer`.
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: Establishes the first complete implementation handoff against the architecture-approved cumulative solution package.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-007`; `REQ-001`–`REQ-017`; `AC-001`–`AC-031`.
- Implementation delta: Added the canonical portable schema/declaration and handler contracts; immutable application-local catalog/routes; sealed capability; strict Ajv/JSON/size gateway; application-only raw native adapter and MCP projection; exact worker handler protocol; live standalone/configured/descendant Team ownership; per-app call lanes; serialized staged package/application catalog transition with rollback/quarantine/removal behavior; shutdown drain; strict version transition; maintained app/template changes; and Brief Studio binding-derived sample tool. Removed the obsolete refresh coordinator and direct destructive bundle refresh APIs.
- Changed files or areas: application SDK contracts/backend SDK/devkit; server application-agent-tools, application engine worker, MCP/native provider projection, application execution scope, orchestration ownership/reentry, bundle/package/catalog runtime, composition roots/lifecycle; Brief Studio and Socratic Math Teacher maintained sources; direct Ajv dependency/lockfile.
- Local validation and result: Workspace dependencies established; SDK/backend/devkit/server builds passed; Prisma and sanitized server bootstrap passed; maintained backend typechecks and application build/validation passed; narrow contract/schema/native/MCP/worker/bundle/lifecycle/ownership checks passed; source-size, prohibited-path, unchanged-fundamental, and whitespace checks passed.
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks: API/E2E investigation and execution remain required; existing durable coverage fixtures need v4/v6 validity classification; realistic provider/child-worker/Team/concurrency/shutdown matrices were not executed here; delivery documentation still needs current contract synchronization; no rendered frontend is affected.

### IR-002 — Complete registered-static namespace correction

- Triggering role, report path, and round: `/architecture_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`; architecture review Round 5 after `/code_reviewer` reported `CRR-001` in `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`.
- Triggering finding IDs: `CR-DI-001`
- Classification: `Local Fix` — the source correction follows the upstream `SR-005` / `ARCH-REV-005` resolution of the design impact.
- Prior authoritative result: `IR-001` failed source review at `CRR-001` because application declarations and defensive route composition reserved only configured-protected static adapters, allowing a registered `prefer_configured_mcp` adapter such as `open_tab` to be shadowed.
- Current authoritative result: The complete registered static-adapter namespace now governs application declaration readiness and defensive application-route collision checks, while the no-application configured-MCP-versus-static precedence branch remains unchanged; implementation-scoped build and focused unit checks pass; ready for renewed `/code_reviewer` source review.
- Related solution revision IDs: `SR-005` (with `SR-001`–`SR-004` retained)
- Related architecture-review revision IDs: `ARCH-REV-005`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: Corrects the source-review failure identified by `CR-DI-001` without widening configured-MCP collision protection or coupling readiness/native projection to MCP implementation details.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-003`; `REQ-004`, `REQ-009`; `AC-013`.
- Implementation delta: Replaced the ambiguous supported/protected public readers with `AgentToolMcpCatalog.listStaticAdapterToolNames()`; exposed only an immutable `AgentToolsMcpHost.staticAdapterToolNames` snapshot; separated registered, active, and configured-protected static views inside MCP composition; rejected an application route that collides with any registered static adapter; carried only the name snapshot through Studio/standalone readiness; and added focused all-provider, application-`open_tab`, protected-static, inactive-static, non-static application-over-configured, and configured-browser-precedence unit coverage.
- Changed files or areas: Agent Tools MCP catalog and host; application readiness/runtime composition wiring; focused MCP host/catalog and readiness unit tests; direct runtime-isolation construction input updated for the renamed dependency.
- Local validation and result: `corepack pnpm --filter autobyteus-server-ts test --run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts tests/unit/application-platform/application-definition-runtime-readiness.test.ts` passed (3 files, 16 tests); final `corepack pnpm --filter autobyteus-server-ts build` passed with shared builds, Prisma generation, TypeScript compilation, asset copying, and sanitized bootstrap smoke; `git diff --check`, removed-symbol, dependency-boundary, unchanged-generic-schema/tool, and source-size checks passed.
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks: Renewed source review is required before API/E2E. Broader provider/worker/Team/catalog-transition/shutdown execution and stale v4/v6 durable-fixture classification remain downstream responsibilities; no rendered frontend is affected.
