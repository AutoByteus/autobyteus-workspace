# Implementation Handoff — Remote Discovery (autobyteus-261)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-001 `Pass` on design commit `3024a61dce` (SR-003); the review files are in `900e84f1b7`. This handoff goes to the code reviewer (architectural risk `High`).
- Requirements doc: `tickets/in-progress/remote-discovery/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `tickets/in-progress/remote-discovery/investigation-notes.md`
- Solution revision record: `tickets/in-progress/remote-discovery/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/remote-discovery/design-spec.md`
- Supplemental task artifacts: `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-12, updated in the design)
- Design review report: `tickets/in-progress/remote-discovery/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/remote-discovery/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery`, branch `codex/remote-discovery`, base `origin/personal` `8fbe77c461`. One implementation commit, `93dc932920`, following the change sequence:

1. **The entry builder:** `availableCollaboratorEntry` / `AvailableCollaboratorEntry`. `list_available_agents` without `node` now goes through it.
2. **The contract:** `REMOTE_AVAILABILITY_PATH`, `REMOTE_AVAILABLE_AGENTS_PATH`, `AvailabilityAnswer`, `AvailableAgentsAnswer`, and `RemoteRefusalTarget` (`target {kind, name}` replaces `targetName`).
3. **B:**
   - `PeerGateway.checkAvailability` (the admission is the answer) and `listAvailableAgents`, both through `admit`;
   - `RemoteCatalogLister`;
   - the routes `/rest/remote/availability` and `/rest/remote/available-agents`;
   - the composition handler;
   - the receiver and the Team starter answer `target`.
4. **A:**
   - `PeerClient.checkAvailability` / `listAvailableAgents` with a strict list parser (N-401);
   - `RemoteNodeDiscovery` behind the new `RemoteDiscoveryChannel` port, bound at composition;
   - `peerRefusalText` words the target's kind.
5. **The tools:**
   - `node` on `list_available_agents`;
   - the new `list_available_nodes`;
   - exposure on AutoByteus (native), Agent Tools MCP (Codex, AGY …) and Claude;
   - one registration module.
6. **The texts (DEC-406) and their pinned tests, then the docs.**

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/remote-discovery/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001 … SR-003
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A (the review's non-blocking notes N-401 and N-402 are implemented; see the trace)

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - two new request kinds between nodes and a changed refusal field;
  - a node's catalog becomes readable by registered peers;
  - approved agent-facing texts change;
  - no persistence and no root changes;
  - 10 new source files, all small; the largest change to an existing file is `peer-client.ts` (+49).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No persisted state and no root-level change were needed.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-401 / REQ-401, 406, 407 | List the registered peers with `{name, status}`. Every peer is checked in parallel within 20 s. The switch must be on. Opt-in tool | `list_available_nodes` tool (`agent-tools/agent-discovery/list-available-nodes-{contract,tool}.ts`, MCP provider) → `RemoteDiscoveryChannel.listNodes` → `RemoteNodeDiscovery.listNodes` (switch, `PeerDirectory.list`, `Promise.all(PeerClient.checkAvailability)`) → B: `PeerGateway.checkAvailability` (admission only) | Implemented. Unit: available, refused (switch off, not registered), 404, transport failure, timeout (bounded: 7 peers in under 1 s with a 50 ms bound), wrong node, no peers, switch off with nothing sent |
| BEH-402 / REQ-402, 403, 405, 407 | `list_available_agents {node}` lists what the peer offers for delegation, exactly what a delegation accepts, with only name, kind, address and description (when it has one) | Tool → `RemoteDiscoveryChannel.listAvailableAgents` → `RemoteNodeDiscovery` (`PeerClient.findPeer`: switch, peer by name) → `PeerClient.listAvailableAgents` (strict parser, then the builder) → B: `PeerGateway.listAvailableAgents` → `RemoteCatalogLister` → `policy.listEligible(nodeCatalogPort)` → the builder | Implemented. `remote-catalog-lister.test.ts`: built-in, team-local and application-owned definitions are excluded, and every listed address resolves through `catalogDefinitionAt`. A Team added between two calls appears in the second (AC-405). In-process A→B: list nodes, list B's offer, delegate to the listed Team without being told its address |
| BEH-402 (preserved) / AC-407 | Local list without `node`: same entries, same order; only an empty `description` is dropped (DEC-405) | `listAvailableAgentsFor` → the sender's root lister → `availableCollaboratorEntry` | Implemented; existing list tests unchanged apart from the wording assertion |
| BEH-404 / REQ-408 | A peer's refusal names its target's kind; the DEC-406 texts | B: `RemoteDelegationReceiver` (`ref.kind`, or `agent` for a failed prepare) and `RemoteTeamRunStarter` (`agent_team`) answer `target {kind, name}`; A: `PeerClient` (`refusalTargetOf`) → `peerRefusalText` | Implemented: "The Agent Team Studio Team on node … cannot run there: …"; the Agent text is unchanged; `AGENT_NOT_FOUND` and `peerNotRegistered` read as in § Agent-Facing Texts. A malformed target is left out ("The Agent at that address …") |
| DEC-406 texts | `delegate_task` `node` and the node line; `list_available_agents` description and `node`; `list_available_nodes`; unknown node; `AGENT_NOT_FOUND`; malformed list | `agent-team-collaboration-llm-contract.ts`, the two tool contracts, `remote-refusals.ts`, `peer-client.ts` | Exact texts asserted in tests; the pinned SHA-256 values of the two changed `delegate_task` texts are updated, with exact-text assertions beside them |
| N-401 | `PeerClient`'s strict parser decides what a peer may send | `availableAgentsOf` in `peer-client.ts`: exactly `name`, `kind` (agent or agent_team), `address` (begins with `/`) and an optional string `description`; anything else → "it answered without its list" | Implemented; unit cases include `members` and `launchConfiguration` fields, an Org kind, a missing or relative address, a numeric description, null entries and a non-array |
| N-402 | One wording for the peer order | "registration order" in the port, `RemoteNodeDiscovery` and both docs (add appends; rename and remove keep the order) | Implemented |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

(Paths under `autobyteus-server-ts/src`.)

- New:
  - `agent-collaboration/collaborators/available-collaborator-entry.ts`
  - `agent-collaboration/execution/remote/remote-discovery-channel.ts`
  - `remote-collaboration/discovery/remote-node-discovery.ts`
  - `remote-collaboration/inbound/remote-catalog-lister.ts`
  - `agent-tools/agent-discovery/{list-available-nodes-contract,list-available-nodes-tool,agent-discovery-refusal,register-agent-discovery-tools}.ts`
  - `agent-tools/mcp/providers/{list-available-nodes-mcp-adapter-provider,agent-discovery-mcp-result}.ts`
- Modified:
  - `remote-collaboration/channel/{peer-client,peer-gateway}.ts`
  - `remote-collaboration/domain/{remote-requests,remote-refusals}.ts`
  - `remote-collaboration/inbound/{remote-delegation-receiver,remote-team-run-starter}.ts`
  - `remote-collaboration/remote-collaboration-services.ts`
  - `compositions/remote-collaboration-composition.ts`
  - `api/rest/remote.ts`
  - `agent-tools/agent-discovery/list-available-agents-{contract,tool}.ts`
  - `agent-tools/mcp/providers/{list-available-agents-mcp-adapter-provider,default-agent-tool-mcp-adapter-providers}.ts`
  - `agent-tools/mcp/agent-tool-mcp-session-registry.ts`
  - `agent-execution/shared/runtime-agent-tool-exposure.ts`
  - `agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`
  - `agent-execution/backends/claude/session/claude-session-tooling-options.ts`
  - `startup/agent-tool-loader.ts`
  - `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`
- Docs:
  - `docs/modules/agent_tools.md` (§ Server-Owned Agent Discovery Tools)
  - `remote_collaboration.md` (four requests, `target`, the lister, the new § Discovery)
  - `agent_communication.md`
- Tests:
  - new: `tests/unit/remote-collaboration/{remote-node-discovery,remote-catalog-lister}.test.ts`, `tests/unit/agent-tools/agent-discovery/remote-discovery-tools.test.ts`
  - extended: `peer-client`, `peer-gateway`, `remote-delegation-receiver`, `remote-team-run-starter`, `team-remote-delegation`, `standalone-remote-delegation`, the LLM contract test, the exposure test and the loader tests.

## Important Assumptions

1. **Refusal delivery per runtime.**
   - A discovery tool's refusal is the native tool's error on AutoByteus.
   - Over Agent Tools MCP it is an `isError` tool result with the refusal text (`agent-discovery-mcp-result.ts`). The MCP dispatcher turns a thrown error into a generic JSON-RPC internal error, which would hide the reason.
   - The design says only "a refusal becomes a tool error with the existing text".
2. **Remote collaboration not composed** (a server without it): both tools answer the same "turned off" refusal as the switch off. Nothing can be sent there.
3. **A blank or non-string `node`** on `list_available_agents` is refused (`VALIDATION_ERROR`, "node must be the name of a peer node registered on this node; leave it out to list this node's agents and agent teams.") rather than treated as absent. This mirrors `delegate_task`, which rejects a blank `node`. The text is mine (wording delegated, DEC-406).
4. **Where the texts live.**
   - The `list_available_*` descriptions stay in their tool contract files (`agent-tools/agent-discovery/`), next to the existing `list_available_agents` description.
   - The `delegate_task` texts are changed in `agent-team-collaboration-llm-contract.ts`, as the file map says.
5. **One registration module.** `register-agent-discovery-tools.ts` registers both tools; the loader now points there (its unit test and the architecture test's loader list are updated).
6. **`AGENT_CANNOT_RUN` without a valid `target`** reads "The Agent at that address on node … cannot run there: …", as it did before without `targetName`.
7. **`listNodes` reuses `PeerClient.findPeer`** for `listAvailableAgents` (the same switch check and the same refusal text as `delegate_task`). `listNodes` checks the switch itself before reading the peers.

## Known Risks

- **RSK-401 (accepted in the design):** any registered peer can read the offer; identity is claimed, not proven, until S6.
- **RSK-402:** `list_available_nodes` can take up to 20 s when a peer black-holes packets.
- **FU-001 (from the architecture review, unchanged):** application-owned runs can list a peer's catalog, as they can delegate to it.
- **FU-002 (new, pre-existing):** an architecture guard test fails at the base commit too (see IMP-03).
- **Contract change both ways:** both nodes must run this build. `target` replaces `targetName`, and an older peer answers the discovery routes 404, which reads as `unavailable` (rule 9).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: feature plus a small contract correction.
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the gateway, client and policy absorbed the feature as investigated (E-04, E-06). The only additions beyond the file map are three small helpers: `agent-discovery-refusal.ts` (the two tools' shared availability rule and refusal handling), `agent-discovery-mcp-result.ts` (the MCP error result) and `register-agent-discovery-tools.ts`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (`target` replaces `targetName` with no parallel field; no version detection)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed:
  - `targetName` (types, the client and the text signature);
  - the per-entry mapping in `listAvailableAgentsFor`;
  - the `AvailableAgentEntry` type;
  - `registerAgentDiscoveryTools` from the agents tool file (it moved to the registration module).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. One entry shape for local, wire and remote; `AvailableNode` has two fields, always set.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. No changed file is near 500 effective lines, and the largest delta is +63 (`list-available-nodes-tool.ts`, new).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (nothing is stored; REQ-407)
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no install. I ran `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` (TESTING.md). `typecheck` builds the shared packages, which leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. Their source is unchanged and they are not part of this change.
- Test-owned data only (temp directories, the test SQLite DB under `tests/.tmp/`); no running app or `~/.autobyteus` data touched. No web change, so no UI preview.

## Checks Run

Evidence: `tickets/in-progress/remote-discovery/evidence/implementation/`. Environment: macOS Darwin 25.5.0, Node v22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm exec tsc -p tsconfig.build.json --noEmit` (`autobyteus-server-ts`) | `93dc932920` | macOS | all server sources | all | Pass | `IMP-01-server-typecheck.log` | `TYPECHECK EXIT 0` |
| IMP-02 | `pnpm exec vitest run tests/unit/remote-collaboration tests/unit/agent-tools tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts tests/unit/agent-execution/shared tests/unit/startup` | `93dc932920` | macOS | discovery, the gateway and client, the lister, the receivers, the tools and their exposure, the texts, the loader | BEH-401, 402, 404; AC-401 … AC-406 and AC-404 at unit / in-process level; N-401 | Pass | `IMP-02-discovery-focused.log` | `Test Files  70 passed (70)`, `Tests  538 passed (538)` |
| IMP-03 | `pnpm exec vitest run tests/architecture`, plus the failing case at base `900e84f1b7` | `93dc932920` | macOS | the dependency and boundary guards (including the tool loader list) | dependency rules | 43 pass, 1 fail (pre-existing: fails identically at the base; FU-002) | `IMP-03-architecture.log` | `Tests  1 failed \| 43 passed (44)`; at the base `Tests  1 failed \| 19 passed (20)`, the same case |
| IMP-04 | `pnpm exec vitest run tests/unit` (`autobyteus-server-ts`) | `93dc932920` | macOS | the whole server unit suite | AC-407 (unit level) | Pass apart from one timing flake outside this change (IMP-05) | `IMP-04-server-unit-full.log` | `Test Files  1 failed \| 785 passed \| 4 skipped (790)`, `Tests  1 failed \| 6455 passed \| 7 skipped (6463)`; the failure is `native-compaction-terminal-drain.test.ts` (`expected [ 'failed', 'started', 'stopped' ]`) |
| IMP-05 | the IMP-04 failure alone, 3 runs | `93dc932920` | macOS | `agent-execution` native compaction shutdown ordering (not touched by this change) | — | Pass (3 / 3) | `IMP-05-native-compaction-rerun.log` | three `Tests  1 passed (1)` |

- Not run, and why:
  - the two-server E2E (AC-401 … AC-406 extending the existing suite) and the user's desktop ↔ Docker check (AC-408): API/E2E and the user;
  - `tests/integration`: not run (prerequisites; the paths are covered at unit / in-process level);
  - web suites: no web change.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: agent-facing only (requirements § UI: none); no web file changed.

## Downstream Coverage Hints / Suggested Scenarios

- **Two-server E2E**, extending `remote-delegation-two-server.e2e.test.ts` (or the Team suite):
  - AC-401 with four peers: up, stopped, switch off, and this node not registered there. Expect `available` / `unavailable`; `list_available_agents` per node gives the reason; the call takes at most about 20 s.
  - AC-402: the offer is exactly Publisher (no `description` field) and Studio Team, with built-in, Org and application-owned definitions absent; the request and answer bodies carry nothing else. Then delegate to each listed address with that `node`.
  - AC-404: A's switch off means no request leaves A; an agent without the tool has no peer list; an unregistered node gets the new text.
  - AC-405: a Team added on B between two calls appears in the second.
  - AC-406: a Team that can't run reads "The Agent Team …"; an unknown address reads "…no Agent or Agent Team at … If you have list_available_agents …".
- **Exposure on real runtimes:** select `list_available_nodes` in a definition and check it appears for AutoByteus and an MCP runtime (Codex or Claude), and not without the selection.
- **AC-408:** the user's desktop ↔ Docker check, both directions.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-401 … AC-406 at the two-server level, and AC-408 with the user.
- The existing 191 / 245 / 247 E2E with this build (AC-407). Their `targetName`-based expectations, if any, now read `target`.
