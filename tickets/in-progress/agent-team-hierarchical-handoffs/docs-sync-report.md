# Docs Sync Report

## Current Result

- Delivery revision: `DR-009`
- Reviewed lineage: `SR-024; ARCH-REV-018; IR-044; CRR-081; API-REV-038; CRR-083`
- Current branch addition: implemented but not source-reviewed `SR-025` / `IR-045` source/test commit `b8798338c`
- Integrated checkpoint: `29337af23c13ce3c711f28b73c0c802c5e62e3c2`
- Base: `origin/personal@54890a07f74e941a7a12b6daaa26364f4c927b72`
- Result: `Blocked — current branch is newer than the reviewed package`
- No-impact classification: not permitted until the SR-025 delta clears review

## Historical DR-008 Documentation — Not Current Proof

### Server

- `autobyteus-server-ts/docs/modules/agent_communication.md`
- `autobyteus-server-ts/docs/modules/agent_team_definition.md`
- `autobyteus-server-ts/docs/modules/agent_team_execution.md`
- `autobyteus-server-ts/docs/modules/agent_tools.md`
- `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`
- `autobyteus-server-ts/docs/modules/prompt_engineering.md`
- `autobyteus-server-ts/docs/modules/agent_execution.md`
- `autobyteus-server-ts/docs/modules/agent_streaming.md`
- `autobyteus-server-ts/docs/modules/run_history.md`
- `autobyteus-server-ts/docs/modules/token_usage.md`
- `autobyteus-server-ts/docs/modules/agent_memory.md`
- `autobyteus-server-ts/docs/modules/agent_artifacts.md`
- `autobyteus-server-ts/docs/modules/codex_integration.md`
- `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`
- `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`
- `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`
- `autobyteus-server-ts/docs/features/shared_member_multi_team_membership_future.md`
- `autobyteus-server-ts/docs/features/task_agent_identity_future_improvements.md`
- `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md`

### Web

- `autobyteus-web/docs/agent_teams.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/agent_artifacts.md`
- `autobyteus-web/docs/memory.md`
- `autobyteus-web/docs/settings.md`

## Historically Documented Contract

- Rooted logical AgentTeam addresses and exact four-field
  `TeamExecutionAddress` values are the only current Team identity.
- `send_message_to` uses `recipient_address`; Team-bound runtimes automatically
  expose exactly `get_handoff_rules`, `send_message_to`, and `delegate_task`.
  No flat roster, representative, route-key, path, or instance-id compatibility
  contract remains.
- Team launch, immutable draft admission, task execution, focus, command,
  communication, hydration, history, token, memory, and context-file ownership
  are separated and use their current canonical owners.
- Every Team Agent event carries one strict `agent_execution` binding. Team
  commands use exact `execution_address`; root Team liveness, leaf Agent status,
  transport state, and command acknowledgement are independent facts.
- Agent segments are admitted once by the AgentRun-owned lifecycle. Canonical
  consumers receive exact identity/type/evidence; repeated starts, malformed
  source facts, runtime diagnostics, file context, coalescing, and browser
  presentation no longer rely on generated ids or downstream repair.
- Schema-v3 Team metadata and canonical Token Usage migration/storage are the
  persisted-data boundary. Physical memory lineage uses root/ancestor TeamRun
  ids; logical addresses are not filesystem paths.

## Current DR-009 Decision

Delivery did not edit long-lived documentation for SR-024/SR-025. Although the
base is current and conflict-free, commit `b8798338c` changes production prompt
composition and six durable unit suites after CRR-083's explicit reviewed HEAD.
Documentation cannot be declared synchronized against that unreviewed state.

The DR-008 documentation below remains useful historical context, but it cannot
serve as the current delivery result. IR-045 has completed implementation
handoff/checks; the current source/test delta must now route through source
review, API/E2E coverage investigation/execution, and proportional durable
review when applicable.

## Historical Verification

Delivery documentation checks cover:

- `git diff --check`;
- conflict-marker absence;
- balanced Markdown fences and resolvable relative Markdown links;
- current contract assertions and retired-contract scans;
- exact 109-path durable inventory (`4 added / 97 updated / 8 removed`,
  `53 server / 56 web`, `101 active`);
- reviewer-audit integrity; and
- preservation of mandatory safety disclosures and protected state.

Evidence is recorded under
`tickets/in-progress/agent-team-hierarchical-handoffs/delivery-evidence/`.

## Finalization Hold

Documentation synchronization is blocked. The ticket remains in progress, and
the former DR-008 verification request is superseded. No archival, repository
finalization, release, deployment, or cleanup is permitted.
