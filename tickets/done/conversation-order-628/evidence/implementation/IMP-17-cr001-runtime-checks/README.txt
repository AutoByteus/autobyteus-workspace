# IMP-17 (CR-001; AC-001…AC-003, AC-005, AC-006) the runtime checks after the recorder became strict: MSP-105, the server e2e, the server integration suite
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-105 --output-dir=<tmp>/cr1-msp105 ;
#          cd autobyteus-server-ts && pnpm test:integration:prepare ;
#          env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm exec vitest run tests/e2e ;
#          env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:integration
# commit: eaebb94304 (MSP-105, the whole e2e run); 8fbffd707f (the integration suite, and the one e2e file fixed after the whole run)
# env: macOS arm64, Node v22.23.1, clean environment for the server suites, scripted runtimes, no provider keys
# date: 2026-11-24
# result: Pass, after fixing fixtures (no product change):
#   - MSP-105 passes all three rounds live and reopened; the node stores each user message before its notice; the probe's
#     node logs hold no "has no occurredAt" refusal.
#   - Whole e2e on eaebb94304: 126 files passed, 1 failed (run-projection-toolcalls-graphql, 3 tests). It hands canonical
#     events straight to the accumulator, unstamped, which the strict recorder now refuses (the case CR-001 asked for).
#     The file now stamps them with stampForDelivery and passes (7 of 7 with the integration file below).
#   - The integration suite was not run in IR-001. Its first run failed 16 tests in 5 files, all fixtures written before D-2/D-3:
#     unstamped TeamAgentEvents or backend events fed past the run, expectations without occurred_at, and the native
#     preface notice expected before its message (REQ-002 reverses it). With the fixtures fixed: 92 files, 523 tests pass,
#     and the log holds no "has no occurredAt" refusal.

## MSP-105
[mobile-shell] MSP-105 …
[mobile-shell] MSP-105 Pass
mobile-shell probe: Pass

## whole e2e (eaebb94304)
      Tests  3 failed | 570 passed | 784 skipped (1357)
 FAIL  tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts > Run projection tool-call GraphQL e2e > preserves Codex reasoning across runtime writes and reloads through getRunProjection
 FAIL  tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts > Run projection tool-call GraphQL e2e > preserves the exact packaged tool-update reasoning sequence through GraphQL reload
 FAIL  tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts > Run projection tool-call GraphQL e2e > reopens a newly recorded provider-shaped Codex command failure with its enriched diag
 Test Files  1 failed | 126 passed | 165 skipped (292)

## the fixed e2e file and the codex MCP integration file (8fbffd707f)
 Test Files  2 passed (2)
      Tests  7 passed (7)

## integration suite, first run (before the fixture fixes)
      Tests  16 failed | 507 passed | 71 skipped (594)
 FAIL  tests/integration/agent-execution/codex-command-failure-transport.integration.test.ts > Codex command failure transport integration > preserves one enriched provider-shaped failure through stan
 FAIL  tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts > AgentRun-owned Team segment lifecycle > correlates a real AutoByteus native sequence before Team, stand
 FAIL  tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts > AgentRun-owned Team segment lifecycle > transports a canonical provider error through standalone, Team,
 FAIL  tests/integration/agent/agent-status-websocket.integration.test.ts > Agent status WebSocket contract integration > keeps diagnostic errors running, terminalizes the current turn to error, then 
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Org /ws/agent-org' > coalesces two interleaved agents into one batch, each agent's text in order (A
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Org /ws/agent-org' > delivers pending text before every boundary, immediately and contiguously (AC-
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Org /ws/agent-org' > leaves direct root subscribers unthrottled while the socket holds the text (AC
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Org /ws/agent-org' > lets a boundary from either interleaved agent close the batch first (AC-009, A
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Org /ws/agent-org' > sends a 30-delta burst with identical running statuses as one batch after the 
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Org /ws/agent-org' > uses a changed interval only for the next newly opened window (AC-003)
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Team /ws/agent-team' > coalesces two interleaved agents into one batch, each agent's text in order 
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Team /ws/agent-team' > delivers pending text before every boundary, immediately and contiguously (A
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Team /ws/agent-team' > lets a boundary from either interleaved agent close the batch first (AC-009,
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Team /ws/agent-team' > sends a 30-delta burst with identical running statuses as one batch after th
 FAIL  tests/integration/agent/chat-socket-content-cadence.integration.test.ts > content cadence on 'Team /ws/agent-team' > uses a changed interval only for the next newly opened window (AC-003)
 FAIL  tests/integration/skill-update-notices/native-skill-notice-history.integration.test.ts > native AutoByteus skill update notice history > replays a notice combined into the user's input as a sys
 Test Files  5 failed | 87 passed | 21 skipped (113)

## integration suite (8fbffd707f)
 Test Files  92 passed | 21 skipped (113)
      Tests  523 passed | 71 skipped (594)
refusals ("has no occurredAt") in the final integration log: 0
