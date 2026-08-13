# Canonical Hierarchical AgentTeam Execution

> **Draft — not published.** Prepared for the DR-008 user-verification
> checkpoint. Version, archive path, and publication remain subject to explicit
> user authorization and a fresh target/tag check.

## What's New

- AgentTeam definitions support rooted hierarchical Agent and Team placements,
  ordered handoff guidance, exact coordinator ingress, and nested task execution
  without flat rosters or synthetic representatives.
- Team-bound AutoByteus, Codex, and Claude Agents automatically receive the
  current collaboration instruction and the `get_handoff_rules`,
  `send_message_to`, and `delegate_task` tools.
- Team execution identity is canonical across backend and frontend:
  `{rootTeamRunId, taskTeamRunIds, memberAddress, taskAgentRunId}`.
- Agent streaming now has one AgentRun-owned segment lifecycle that admits
  provider facts once and publishes exact canonical identity, type, content,
  terminal state, and diagnostic evidence to every consumer.

## Improvements

- `send_message_to` and `delegate_task` use explicit `recipient_address`
  addressing. Nested, sibling, upward, cross-branch, task-Agent, and task-Team
  collaboration preserves exact sender/receiver identity and fails closed on
  invalid or out-of-scope addresses.
- Team launch uses immutable draft admission with one allocation and promotion,
  failure-preserving retry, exact first-send ownership, and read-only pending
  configuration presentation across desktop and mobile.
- Team streams use strict `agent_execution` bindings. Send, interrupt, approval,
  status, task, token, communication, and history flows use the complete exact
  execution address rather than route/path/instance aliases.
- Task records and UI distinguish stable topology from concrete task executions,
  expose durable task/reference details, and preserve ordered restore, focus,
  selection, and cleanup behavior.
- Provider converters, file-change processing, memory/history, compaction,
  external channels, application projection, WebSocket cadence, and browser
  segment/tool handlers consume the same canonical lifecycle without generated
  segment ids, repeated source type, lookup fallback, or downstream identity
  repair.
- Turn-scoped and runtime-scoped diagnostics remain observable and non-terminal,
  preserving later valid output and command/lifecycle state.

## Data And Compatibility

- TeamRun metadata is schema-v3 and recursive. Task records, Team Communication,
  external bindings, Token Usage, and history use current canonical addresses.
- The required forward-only canonical Team identity migration converts supported
  historical Team metadata/task/token/binding state and removes legacy identity
  columns/fields transactionally. Runtime read-time compatibility paths are not
  retained.
- Physical Team memory uses the root TeamRun and ancestor TeamRun ids plus the
  AgentRun id. Logical member addresses are not filesystem paths.
- Bare recipient names, `recipient_name`, member/source path and route-key
  identities, task instance ids, generic Team egress identity, generated segment
  ids, and browser lookup-key compatibility are intentionally unsupported.

## Validation

- Full source review: CRR-078 Pass, `9.3/10 (92.5/100)`.
- API/E2E: API-REV-036 Pass, `98%` confidence.
- Durable test review: CRR-079 Pass with no findings across exactly `109` paths
  (`4 added / 97 updated / 8 removed`; `53 server / 56 web`; `101 active`).
- Current repository selections passed `622` server tests with nine explicitly
  declared capability-gated skips and `540/540` web tests.
- Server and web production builds passed.
- Fresh real browser/provider validation passed standalone and imported nested
  Team journeys for AutoByteus, Codex, and Claude, including desktop/mobile,
  collaboration, task, restore, read-only configuration, and cleanup checks.
  Declared capability skips were not counted as passes.

## Operational Disclosure

Earlier validation rounds accidentally targeted the operational production
SQLite database twice: API-REV-014 applied one pending Prisma migration and
recorded a failed canonical migration; API-REV-018 inherited that target on an
unsafe raw start. No rollback or repair was attempted. Accepted later evidence
used checked disposable targets, and the operational database and protected user
stack were not touched by delivery.
