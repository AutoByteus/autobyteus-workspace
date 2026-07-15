# Handoff Summary — Browser MCP Activity `[Circular]` Result

## Summary Meta

- Ticket: `mcp-circular-tool-result`
- Date: `2026-06-24`
- Current status: `Verified by user; archived to done; repository finalization and v1.3.74 release in progress`
- Worktree: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation`
- Ticket branch: `codex/mcp-circular-result-investigation`
- Finalization target: `personal` / `origin/personal`
- Integrated base used for user handoff: `origin/personal` at `46acf801847780d936796f3adf493e5ac2378700`
- Finalization refresh after user verification: `origin/personal` still at `46acf801847780d936796f3adf493e5ac2378700`
- Archived ticket path: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result`
- Delivery docs sync artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/docs-sync-report.md`
- Delivery/release report artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/release-deployment-report.md`
- Release notes artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/release-notes.md`

## Delivered Scope

- Fixed backend event-payload serialization so repeated shared object references serialize as duplicated JSON-safe values instead of false `[Circular]` placeholders.
- Preserved safe handling for genuine ancestor cycles: actual cycle edges still serialize as `[Circular]` without crashing event streaming/projection.
- Added/kept focused serializer coverage for shared references, true cycles, and BigInt conversion.
- Added a Codex local MCP Browser `run_script` regression where `params.item.result` and top-level `params.result` alias the same MCP result envelope; the emitted `TOOL_EXECUTION_SUCCEEDED.payload.result` is the normalized Browser result object, not `[Circular]` and not the raw MCP `content` envelope.
- Kept Browser result normalization backend-owned and unchanged; no frontend Activity workaround or broad parser placeholder skip was introduced.

## Changed Source / Durable Coverage

- `autobyteus-server-ts/src/services/agent-streaming/payload-serialization.ts`
  - Replaced global `WeakSet` seen-ever detection with path/ancestor-aware cycle detection.
- `autobyteus-server-ts/tests/unit/services/agent-streaming/payload-serialization.test.ts`
  - Added regression coverage proving shared sibling references remain duplicated values.
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - Added aliased Browser MCP result regression for normalized Activity success payloads.

## Integration Refresh

- Delivery refresh command before user handoff: `git fetch origin personal` on 2026-06-24.
- Finalization refresh command after user verification: `git fetch origin personal` on 2026-06-24.
- Bootstrap base from investigation: `origin/personal` at `46acf801847780d936796f3adf493e5ac2378700`.
- Latest tracked remote base after finalization refresh: `origin/personal` at `46acf801847780d936796f3adf493e5ac2378700`.
- Target advanced after user-verified handoff: `No`.
- Local checkpoint commit before integration: `Not needed`; no base commits required integration and the branch remained current with the tracked base.
- Integration method: `Already current`.
- New base commits integrated into ticket branch: `No`.
- Delivery-owned docs/report edits started only after the tracked base refresh confirmed the branch was current: `Yes`.

## Verification Snapshot

Latest authoritative upstream verification:

- Design review: `Pass` — `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/design-review-report.md`
- Code review: `Pass` — `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/code-review-report.md`
- API/E2E coverage investigation: completed before final execution; no durable coverage changes made during API/E2E — `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/api-e2e-coverage-investigation.md`
- API/E2E execution: `Pass` — `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/api-e2e-execution-coverage-report.md`

Executable checks recorded by API/E2E:

- Direct Browser MCP `open_tab` and serializable `run_script` returned structured JSON, not top-level `[Circular]`.
- Direct Browser MCP `run_script` returning the literal string `[Circular]` preserved it as legitimate result content.
- Temporary cross-boundary Vitest probe passed and was removed, proving aliased Browser MCP completion -> `TOOL_EXECUTION_SUCCEEDED` -> runtime memory raw trace -> run-history projection keeps the normalized result object.
- `corepack pnpm -C autobyteus-server-ts exec vitest tests/unit/services/agent-streaming/payload-serialization.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts` — Pass, 3 files / 51 tests.
- `corepack pnpm -C autobyteus-server-ts exec vitest tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` — Pass, 1 test.
- `corepack pnpm -C autobyteus-server-ts exec vitest tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` — Pass, 5 tests.
- `corepack pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` — Pass.
- `corepack pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Pass.
- `git diff --check` — Pass.

Delivery/finalization-stage checks:

- `git fetch origin personal` — Pass; tracked base remained at `46acf801847780d936796f3adf493e5ac2378700`.
- No new base commits were integrated during delivery/finalization, so no post-merge/rebase rerun was required before commit.
- `git diff --check` after ticket archival/release notes/report edits — Pass.

## Documentation Sync Summary

- Docs result: `No impact`.
- Docs sync artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/docs-sync-report.md`
- Long-lived docs reviewed:
  - `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`
  - `autobyteus-server-ts/docs/modules/agent_streaming.md`
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`
  - `autobyteus-server-ts/docs/modules/run_history.md`
  - `autobyteus-web/docs/settings.md`
  - `autobyteus-web/docs/tools_and_mcp.md`
- Rationale: the fix is an internal backend serialization correction. Existing docs already state that Codex MCP terminal success events own Activity result data, Browser tool results are normalized in the backend before success emission, and frontend Activity renders backend-provided result payloads without provider-specific repair logic.

## Known Validation Limitations / Residual Risks

- Already-emitted or already-persisted historical Activity payloads containing `[Circular]` are not repaired by this change; newly generated events use the corrected serializer.
- A full visible browser UI Activity panel smoke driven by a real Codex model/tool run was not performed because no deterministic repository harness was found and the previously running app may not contain this branch's patched source. Direct Browser MCP probes, converter coverage, memory/projection integration, and GraphQL E2E passed.

## User Verification

- Verification received: `Yes`.
- Verification reference: 2026-06-24 user message: “Okay, the task is done. Let's finalize and release a new version.”
- Finalization authorization: `Yes`.
- Release authorization: `Yes`; user requested a new version release.

## Release / Deployment Status

- Release requested: `Yes`.
- Planned release version: `1.3.74` / tag `v1.3.74`.
- Release/publication/deployment status: `In progress`.
- Release notes artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/release-notes.md`

## Finalization Status

- Ticket archived to `tickets/done`: `Yes`.
- Ticket branch commit/push, target merge/push, release tag push, workflow verification, and cleanup are being handled after this archived ticket update.

## Cumulative Artifact Package

- Requirements: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/requirements.md`
- Investigation notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/investigation-notes.md`
- Design spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/design-spec.md`
- Design review report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/design-review-report.md`
- Implementation handoff: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/implementation-handoff.md`
- Code review report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/code-review-report.md`
- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/api-e2e-coverage-investigation.md`
- Execution coverage report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/api-e2e-execution-coverage-report.md`
- Docs sync report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/docs-sync-report.md`
- Delivery/release report: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/release-deployment-report.md`
- Release notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-circular-result-investigation/tickets/done/mcp-circular-tool-result/release-notes.md`
