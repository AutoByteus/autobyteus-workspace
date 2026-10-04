# Implementation Revision Record — standalone-agent-run-root

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 (round 3, Pass) | N/A | `Initial Baseline` | SR-005 (requirements SR-002); ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implementation complete for REQ-001–REQ-010; ready for code review |
| IR-002 | `/code_reviewer`, `code-review-report.md`, CRR-001 (round 1, Fail) | CR-001 | `Local Fix` | SR-005; ARCH-REV-003; CRR-001; API-REV N/A; DR N/A | Child commands no longer restart a crashed host; back to code review |

## Revision Entries

### IR-001 — Complete implementation of SR-005 on base `b37d7a934`

- Triggering role, report path, and round: `/architecture_reviewer`,
  `tickets/in-progress/standalone-agent-run-root/design-review-report.md`, ARCH-REV-003 (delta review of the SR-005 base refresh, Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A. No implementation handoff existed. The branch held the in-progress checkpoint `9c3080a20` (E-21).
- Current authoritative result: all REQ-001–REQ-010 implemented; branch head `bccb1c095` (plus this ticket-artifact commit).
- Related solution revision IDs: SR-005 (design), SR-002 (requirements).
- Related architecture-review revision IDs: ARCH-REV-003 (and ARCH-REV-002 for the SR-004 substance).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff. It covers the checkpoint work (E-21 "present") and the remaining E-21 work completed in this round.
- Approved behavior or requirement IDs affected: REQ-001–REQ-010, BEH-001–BEH-010, AC-001–AC-010.
- Implementation delta:
  - Checkpoint `9c3080a20` (before the rebase, carried by SR-005):
    - REQ-001: module move to `src/standalone-agent-run-root/`; root, host handle, manager; ports; binding removed.
    - REQ-002: `TeamRootCollaboratorAgentRegistry`.
    - REQ-003: Org delivery extraction.
    - REQ-004: self-target rejection.
    - REQ-009 (original scope): catalog injection and the model-save fixture.
  - This round, commit `bccb1c095`:
    - REQ-009 / D-R3: two guard inventory edits.
    - REQ-003: size target. Child-command routing moved into the standalone and Org delivery owners; stopped-run model-settings save extracted to `standalone-stopped-run-model-config-updater.ts`.
    - REQ-005: header in three builders, web parser, frozen migration header.
    - REQ-006: summary service, store, repository, GraphQL query and web Token Meter.
    - REQ-007: active-trace page inter-agent visual, server and web.
    - REQ-008: host label.
    - Docs.
    - One test-wiring fix: `agent-run-prompt-fallback.integration.test.ts` now gets the roots fixture.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - Server typecheck clean (TS6059 noise excepted); web `tsc` error set identical to base.
  - Full server and web suites compared with clean `b37d7a934` by test name and message:
    - server: 0 new, 0 changed; 38 fixed;
    - web: 0 new; 3 apparent message differences resolved as base flakiness.
  - Live checks on the dev stack with General Agent (Claude SDK and Codex).
- Next recipient or routing: `get_handoff_rules` (Large/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks.

### IR-002 — Collaboration-stream child commands use the active root (CR-001)

- Triggering role, report path, and round: `/code_reviewer`,
  `tickets/in-progress/standalone-agent-run-root/code-review-report.md`, CRR-001 (round 1, Fail, Local Fix).
- Triggering finding IDs: CR-001 (Medium).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001. `AgentCollaborationStreamHandler.handleMessage` resolved the root and ran `root.ensureHostReady()` before every child command, so:
  - a crashed host was restored first;
  - a failed restore acked the child command `failed` (`AGENT_ROOT_COMMAND_FAILED`) without reaching the collaborator.
- Current authoritative result: child commands (send, interrupt, approve/deny) use `manager.getActive(hostRunId)` as is, with no host readiness.
  - Only when no root is active do they fall back to `resolveRoot` + `ensureHostReady`, as the base did with `getActive ?? resolveCommandReadyRoot`.
  - `connect` is unchanged (AR-001).
- Related solution revision IDs: SR-005.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001.
- Related API/E2E and delivery revision IDs: N/A.
- Why recorded: the reviewer's Local Fix. Design §1 says "Child commands are unchanged"; REQ-001 and AC-010 require no visible change.
- Approved behavior or requirement IDs affected: REQ-001, AC-001 (host crash), AC-010; BEH-002 and BEH-003 context.
- Implementation delta:
  - The handler constructor now takes `Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">`.
  - `handleMessage` uses `getActive(...) ?? readyRoot(...)`.
  - `api/websocket/index.ts` injects `getActive`.
  - The module doc's "Root lifetime" and stream wording are updated.
- Changed files or areas:
  - `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts`
  - `autobyteus-server-ts/src/api/websocket/index.ts`
  - `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts`
  - `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`
  - Commit `c0e8ce7fd`.
- Local validation and result:
  - New test: with an active root whose host is offline and whose restore would fail, a child SEND_MESSAGE and an INTERRUPT_GENERATION are accepted, reach `executeAgentCommand`, and `ensureHostReady` is not called. It fails against the IR-001 code and passes now.
  - New test: with no active root, a command resolves the root and makes its host ready once.
  - The handler, standalone root, root integration and architecture suites pass (90/90).
  - `tests/unit/services/agent-streaming` and `tests/unit/agent-execution`: 1279 passed; the 26 failures are the known base set, none new.
  - Server tsc is clean.
- Next recipient or routing: `get_handoff_rules`, Large/High Local Fix → `/code_reviewer`.
- Remaining limitations or risks: unchanged from IR-001, except that the CR-001 host-crash child-command path is now covered by a unit test. It was not re-checked live.
