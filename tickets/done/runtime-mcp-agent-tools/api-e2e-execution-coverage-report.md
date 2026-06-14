# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- Local Fix Reroute Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-local-fix-mixed-restore-metadata.md`
- Current Execution Round: 4
- Trigger: Code review round 6 pass after implementation local fix for `LIVE-MIXED-RESTORE-001`; resume API/E2E sign-off for all active runtime communication.
- Latest Authoritative Round: 4

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial API/E2E after code-review round 1 | N/A | LIVE-CLAUDE-001: route-backed delivery worked but sender memory raw traces were empty | Fail | No | Routed for design/implementation rework. |
| 2 | Code-review round 2 pass after memory/run-history fix | LIVE-CLAUDE-001 | E2E-CLAUDE-003 stale optional `message_type` assertion; fixed during API/E2E | Pass | No | Live Claude route-backed same-runtime row passed. Durable E2E changed and returned through code review. |
| 3 | Code-review round 5 pass after Codex Agent Tools MCP and no-leak fixes | All-active-runtime coverage gap | LIVE-MIXED-RESTORE-001: updated AutoByteus+Codex restore scenario failed because restore read metadata from default memory root | Fail / Local Fix | No | New all-runtime direct matrix and same-runtime rows passed; restore/rematerialization coverage exposed implementation bug and was routed for local fix. |
| 4 | Code-review round 6 pass after local fix | LIVE-MIXED-RESTORE-001 | None | Pass / Code-review recheck required | Yes | Rechecked the previously failing mixed restore path, all directed mixed-runtime matrix, same-runtime rows, default-gated durable coverage, focused local-fix units, build, diff, and static scans. |

## Pre-Execution Coverage Investigation

- Investigation artifact was updated before durable coverage edits and final execution: `Yes`.
- The latest investigation records that current scope is all active runtimes: AutoByteus native, Codex App Server via Agent Tools MCP, and Claude Agent SDK via Agent Tools MCP.
- Repository-resident durable coverage was added/updated during API/E2E round 3 and remains in the final repository state: `Yes`.
- Because durable E2E coverage changed after the initial code review, final API/E2E classification is `Pass / route to code_reviewer before delivery`.

## Durable Coverage Added Or Updated

- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts`
  - Covers direct top-level AutoByteus -> Claude, Claude -> AutoByteus, Codex -> Claude, Claude -> Codex, AutoByteus -> Codex, and Codex -> AutoByteus.
  - Asserts sender tool execution, canonical `send_message_to` lifecycle where emitted, team communication projection/recipient input acceptance, recipient token response, no old provider or Agent Tools MCP secret leakage, and route-backed memory traces for external senders.
- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
  - Starts Agent Tools MCP routes and seeds `AUTOBYTEUS_INTERNAL_SERVER_BASE_URL` before Codex bootstrap; removes stale dynamic-send-message wording.
- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`
  - Starts Agent Tools MCP routes and keeps the route server alive through create/restore; awaits websocket close during reconnect flow.
- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`
  - Starts Agent Tools MCP routes and seeds the internal server base URL for nested mixed route-backed senders.
- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`
  - Starts Agent Tools MCP routes and seeds the internal server base URL before standalone Codex sender bootstrap.

## Execution Evidence

| Scenario ID | Behavior / Boundary | Command / Evidence | Result |
| --- | --- | --- | --- |
| ENV-001 | Runtime availability | `node --version`, `pnpm --version`, `codex --version`, `claude --version`, `sw_vers` | Available from this API/E2E cycle: Node `v22.21.1`, pnpm `10.28.2`, Codex CLI `0.139.0`, Claude CLI `2.1.175`, macOS `26.2`. |
| E2E-GATED-001 | All touched live E2E files compile under default gates | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch` | Pass: `7` files skipped, `19` tests skipped, duration `13.79s`. |
| UNIT-LOCALFIX-001 | Local fix coverage for memory-root-aware metadata, stale active-run restore preflight, and deferred Codex context-file resolver construction | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/team-run-metadata-service.test.ts tests/unit/agent-execution/agent-run-manager.test.ts tests/unit/agent-execution/backends/codex/thread/codex-user-input-mapper.test.ts --no-watch` | Pass: `3` files, `16` tests, duration `4.35s`. |
| LIVE-AUTOBYTEUS-SAME-001 | AutoByteus -> AutoByteus native live team communication | `RUN_LMSTUDIO_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts -t "routes send_message_to between real AutoByteus team members and projects reference files" --no-watch` | Pass: `1` test passed, `4` skipped, duration `41.34s`. Ollama unavailable warning was non-blocking; LM Studio was available. |
| LIVE-CODEX-SAME-001 | Codex -> Codex route-backed live team communication | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in codex team runtime" --no-watch` | Pass: `1` test passed, `4` skipped, duration `21.06s`. |
| LIVE-CLAUDE-SAME-001 | Claude -> Claude route-backed live team communication | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts -t "routes live inter-agent send_message_to ping->pong->ping roundtrip in claude team runtime" --no-watch` | Pass: `1` test passed, `4` skipped, duration `15.95s`. |
| LIVE-ALL-MATRIX-001 | Direct mixed-runtime matrix: AutoByteus -> Claude, Claude -> AutoByteus, Codex -> Claude, Claude -> Codex, AutoByteus -> Codex, Codex -> AutoByteus | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts --no-watch` | Pass: `1` test passed, duration `78.06s`. |
| LIVE-MIXED-RESTORE-001 | Existing AutoByteus<->Codex mixed-runtime delivery before/after restore | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts -t "creates a live mixed-runtime team, proves cross-runtime delivery in both directions" --no-watch` | Pass after local fix: `1` test passed, duration `80.72s`; pre-restore and post-restore AutoByteus <-> Codex delivery/projection completed. |
| BUILD-001 | Server/package build | `pnpm -C autobyteus-server-ts run build` | Pass. Built-in agents bootstrap smoke check passed. |
| DIFF-001 | Diff whitespace | `git diff --check` | Pass. |
| SCAN-001 | Deleted old provider/fallback and leak-surface scan | `rg` scans for old provider names, Codex dynamic send-message files, raw descriptor/bearer/header surfaces | Pass with expected findings only: old `mcp__autobyteus_team__send_message_to` appears only in negative E2E leak assertions; Agent Tools MCP header/bearer names appear only in materializer/redaction helpers/negative scans, not app-facing leaks or fallback paths. |

## All Active Runtime Communication Matrix Status

| Sender Runtime | Recipient Runtime | Durable Evidence | Live Result |
| --- | --- | --- | --- |
| AutoByteus | AutoByteus | Existing `autobyteus-team-runtime-graphql.e2e.test.ts` | Pass live in round 4. |
| Codex App Server | Codex App Server | Updated `codex-team-inter-agent-roundtrip.e2e.test.ts` | Pass live in round 4. |
| Claude Agent SDK | Claude Agent SDK | Existing updated `claude-team-inter-agent-roundtrip.e2e.test.ts` | Pass live in round 4. |
| AutoByteus | Codex App Server | New all-runtime matrix plus existing mixed file before/after restore | Pass live in round 4. |
| Codex App Server | AutoByteus | New all-runtime matrix plus existing mixed file before/after restore | Pass live in round 4. |
| AutoByteus | Claude Agent SDK | New all-runtime matrix | Pass live in round 4. |
| Claude Agent SDK | AutoByteus | New all-runtime matrix | Pass live in round 4. |
| Codex App Server | Claude Agent SDK | New all-runtime matrix | Pass live in round 4. |
| Claude Agent SDK | Codex App Server | New all-runtime matrix | Pass live in round 4. |

Conclusion for the user's matrix question: direct live communication coverage now exists and passed for AutoByteus native, Codex App Server, Claude Agent SDK, and all supported directed mixed-runtime pairs. The prior mixed AutoByteus+Codex restore/rematerialization failure is resolved and rechecked.

## Failure Details

No open API/E2E failures remain.

Resolved prior failure:

- `LIVE-MIXED-RESTORE-001`: previously failed because the mixed AutoByteus+Codex restore path read team-run metadata through a default-root singleton while the E2E app data/catalog/projection path used the temporary memory root.
- Resolution reviewed in code-review round 6 and rechecked live in API/E2E round 4: memory-root-aware metadata service, deferred Codex context-file resolver construction, and restore preflight for stale inactive active-run registry entries.
- Required coverage remained intact; no compatibility/default-root fallback read was added.

## Compatibility / Legacy Scope Check

- Old Claude `autobyteus_team` send-message path remains removed: no production hits in static scan.
- Codex dynamic `send_message_to` registration/spec builder remains removed: no production hits in static scan.
- The durable E2E coverage rejects Agent Tools MCP provider names and bearer/header/config keys in app-facing websocket event payloads where relevant.
- No compatibility-only coverage was added.

## Tests Removed As Stale Or Obsolete

None in this API/E2E round.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added/updated after the initial code review: `Yes`.
- Required next route: `code_reviewer` before `delivery_engineer`, because the durable E2E files added/updated during API/E2E remain in the repository.

## Cleanup Performed

- No temporary repository-resident diagnostic code remains.
- Live E2E harnesses closed websocket/Fastify resources and removed temporary app-data/workspace directories.

## Classification

- `Pass`: API/E2E and executable coverage sign-off complete.
- `Code Review Required`: Yes, re-review repository-resident durable coverage added/updated during API/E2E before delivery.
- `Local Fix`: None open; previous `LIVE-MIXED-RESTORE-001` resolved.
- `Design Impact`: None.
- `Requirement Gap`: None.
- `Blocked`: None.
