# Design Rework Response - Round 2

## Review Input

Architecture review round 2 failed with `Design Impact` because native AutoByteus was acknowledged in high-level design text but not consistently represented in implementation-facing design sections.

Review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/offline-agent-initializing-status/design-review-report.md`

## Rework Summary

The design has been revised so native AutoByteus is first-class across the full implementation contract.

### AR-001: AutoByteusTeamRunBackend first-class in concrete design sections

Updated `design-spec.md` to include `AutoByteusTeamRunBackend` in:

- Current-state ownership read.
- Data-flow spine inventory (`DS-003` true no-target native post; `DS-005` overlay clearing).
- Spine narratives.
- Ownership map.
- Thin facade/public wrapper map.
- Removal/decommission plan.
- Return/event spines.
- Bounded local spines.
- Off-spine concerns.
- Existing capability/subsystem reuse.
- Subsystem allocation.
- Draft file responsibility mapping.
- Reusable owned structures and shared-data tightness checks.
- Final file responsibility mapping.
- Ownership boundaries and boundary encapsulation map.
- Dependency rules.
- Interface mapping/checks.
- Naming check.
- Target folder/file placement and folder boundary checks.
- Examples, migration sequence, tradeoffs, risks, and implementation guidance.

Native command-owner decision now states:

`AutoByteusTeamRunBackend` owns native target resolution, native `team.postMessage`, existing real-event cache `lastMemberStatusByRunId`, pending member/root command-start overlays, snapshot/aggregate reflection, and failure/event clearing.

### AR-002: Durable native AutoByteus validation coverage

Updated `requirements.md` and `design-spec.md` to require tests for:

- Native AutoByteus explicit-target `postMessage` emits member-scoped `AGENT_STATUS initializing` before delayed native `team.postMessage` resolves.
- Native AutoByteus `deliverInterAgentMessage` emits recipient member `AGENT_STATUS initializing` before delayed native post resolves.
- Member snapshots and aggregate status reflect `initializing` while native pending overlay exists.
- Native true no-target `postMessage` emits root `TEAM_STATUS initializing` before delayed native post resolves and does not invent a member event.
- Pending member/root overlays clear or replace on matching native events, failure/rejection, termination, or disposal.

### AR-003: Native no-target/default-target behavior clarified

Updated `investigation.md` and `design-spec.md` with code evidence and target behavior:

- In-scope Electron focused sends include `target_member_route_key` from `agentTeamRunStore.ts` via `TeamStreamingService.sendMessage(...)`.
- `TeamRun.resolvePostMessageTarget(...)` also defaults omitted targets to configured coordinator route key or sole member when possible.
- If `AutoByteusTeamRunBackend.postMessage(message, null)` still receives `null`, that is a true team-level/no-target command.
- True no-target native posts emit root `TEAM_STATUS initializing` only; they must not guess a member identity.
- If a member target is explicit/default-resolved, native AutoByteus emits member-scoped `AGENT_STATUS initializing`.

## Updated Artifact Paths

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/offline-agent-initializing-status/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/offline-agent-initializing-status/investigation.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/offline-agent-initializing-status/design-spec.md`
- Prior review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/offline-agent-initializing-status/design-review-report.md`
