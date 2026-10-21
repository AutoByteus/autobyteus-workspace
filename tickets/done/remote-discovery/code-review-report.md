# Code Review Report — remote-discovery (autobyteus-261)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (DS-001 … DS-004, § Agent-Facing Texts)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001, FU-002)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (N-401 strict parser, N-402 registration order)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (7 assumptions)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`. Branch `codex/remote-discovery`, range `900e84f1b7..93dc932920`: 46 files, +1067 / −141.
- Trigger: implementation engineer, "autobyteus-261 'Remote discovery' (slice S5) is implemented and ready for source review", Medium / High.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`. It adds a new peer protocol surface (two routes), a new port, and new agent tools on every runtime.
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none

## Review Scope

- Changed implementation and behavior reviewed:
  - the discovery port and its implementation;
  - the peer-client calls and their strict parser;
  - the gateway kinds and the catalog lister;
  - the routes and composition;
  - `target {kind, name}` (DEC-407);
  - the entry builder (DEC-405);
  - both tools on AutoByteus, Agent Tools MCP and Claude, with their opt-in exposure;
  - the texts, the docs and the loader and architecture-test edit.
- Files / areas reviewed: every `src/` file in the range; the tests for the new paths (`remote-discovery-tools.test.ts`, `remote-node-discovery.test.ts`, `remote-catalog-lister.test.ts`, peer-client and peer-gateway cases, the receiver and starter `target` cases, and the pinned text tests); and the docs `agent_tools.md`, `remote_collaboration.md` and `agent_communication.md`.
- Explicit exclusions: the two-server E2E (AC-401 … 406), which goes to API/E2E, and AC-408, the user's two-node check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-401 … 409, AC-401 … 408, DEC-401 … 408.
- Design-spec behavior map verified against the implementation: yes.
- Design review report and round confirmed: ARCH-REV-001; N-401 and N-402 are carried out.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-401 / DS-001 | Confirmed | `list_available_nodes` → `listAvailableNodesFor`: `requireDiscoveryContext`, then the port (the "turned off" refusal when the port isn't bound). Then `RemoteNodeDiscovery.listNodes`: the switch is checked (OFF refusal), the peers are listed and checked with `Promise.all(client.checkAvailability)`. An accepted answer is `available`; any refusal or rejection is `unavailable`. Each call is bounded by the PeerClient's 20 s timeout. On B, `checkAvailability` is admission only (credential, toNodeId, switch, registered peer). |
| BEH-402 / DS-002 | Confirmed | `list_available_agents {node}` → `listAvailableAgentsFor`. Without `node` (`undefined`), the local path is unchanged apart from the entry builder. A blank or non-string `node` gets VALIDATION_ERROR. Otherwise: the port, then `findPeer` (unregistered peer → the existing text), then `client.listAvailableAgents`, then the strict `availableAgentsOf` (exactly name, kind, address and an optional description; anything else → PEER_UNREACHABLE "it answered without its list"). On B: the gateway admits the request, then `RemoteCatalogLister` runs `policy().listEligible(catalogPort)` through `availableCollaboratorEntry`. That is the same policy and port a delegation from a peer resolves with, so the list is exactly what a delegation accepts. |
| BEH-404 / DS-004 | Confirmed | `peerRefusalText` uses `target.kind` (Agent Team, Agent, or "at that address"). The receiver sends `target {kind: ref.kind, name}`; the team starter sends `{kind: "agent_team"}`. The `delegate_task` description and the `node` text, the peerNotRegistered text and the AGENT_NOT_FOUND text all match § Agent-Facing Texts word for word. |
| DEC-405 | Confirmed | `availableCollaboratorEntry` leaves out a blank description, for both local and remote entries. |
| REQ-406 opt-in | Confirmed | AutoByteus: the resolver binds the tool only when the definition names it and the context can list. MCP: `resolveRegisteredStaticAdapters(requestedToolNames)`, then `isAvailable`. Claude: `listAvailableNodesEnabled` (from the definition) and the context. The session registry clones the new flag. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-401 | REQ-401/402, AC-401/402 | User | Agent on A | Delegate to a peer's entry without being told its address | `list_available_nodes`, `list_available_agents {node}`, `delegate_task {node}` | Normal | as BEH-401/402 | The work starts on beta | requirements SCN-401; unit tests; E2E pending | Supported Normal | Use |
| SCN-402 | REQ-401/406, AC-401/404 | User | Agent on A | Find out why a peer can't be used | `list_available_agents {node}` for an unavailable peer | Normal | port → findPeer / client → refusal text | The same reason a delegation would give | requirements SCN-402; peer-client and discovery tests | Supported Normal | Use |
| SCN-403 | REQ-406, AC-404 | User | Agent | The switch is off | either tool | Explicit Edge | switch check before any request | "turned off"; nothing sent | `remote-node-discovery.test.ts` | Supported Explicit Edge | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | `node: null` (or `""`) is refused with VALIDATION_ERROR rather than treated as absent | SCN-401, assumption 3 | A model that fills optional parameters with null or an empty string | The agent reads "leave it out to list this node's agents" and calls again | The text tells the agent how to recover; there is no evidence that a supported runtime sends null for an omitted optional parameter | Hold for Evidence | — | API/E2E can watch for it in the runs on each runtime. It is not a defect on the evidence. |
| C-2 | The two tools' resolver branch uses a ternary for the tool constructor | Contract (readability) | — | none | `autobyteus-agent-tool-resolver.ts` L84–95 | Reject | — | Both tools share one availability rule, so one branch is reasonable |
| C-3 | `listAvailableAgentsFor` defaults `discovery` to `findProcessRemoteDiscoveryChannel()` at call time | Contract (port binding) | — | It reads the binding at each call, as `RemoteRunChannel` does | `remote-discovery-channel.ts` | Reject | — | It is consistent with the existing port pattern |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | The design's spines DS-001 … DS-004 are carried out as specified | — |
| Matches behavior-defining supplemental artifacts | Pass | The texts table matches word for word; DEC-401 … 407 are carried out | — |
| Data-flow spine clarity | Pass | One path each: tool → contract fn → `RemoteDiscoveryChannel` → `RemoteNodeDiscovery` → `PeerClient` → B gateway → `RemoteCatalogLister`. The listing doesn't go through the roots (it doesn't depend on the asking run), and the docs say so | — |
| Ownership boundary preservation | Pass | `agent-collaboration` owns the port; `remote-collaboration` implements it and owns the switch, peers, client, gateway and lister; the tools own only argument checks and the result shape | — |
| Off-spine concern clarity | Pass | Refusal rendering: `agentDiscoveryToolText` (native) and `toAgentDiscoveryMcpResult` (MCP) | — |
| Existing capability reuse | Pass | `CollaboratorCandidatePolicy.listEligible` + `NodeCatalogPort` (the same eligibility as delegation); `findPeer`; the existing refusal texts and codes; the PeerClient bound | — |
| Reusable owned structures | Pass | `availableCollaboratorEntry` is the one entry builder (ready for 260); `requireDiscoveryContext` is shared by both tools | — |
| Data-model tightness | Pass | `AvailableNode {name, status}`; `target {kind, name}` replaces `targetName` (no parallel fields) | — |
| Repeated coordination ownership | Pass | The availability rule is written once for native (`requireDiscoveryContext`); the MCP `isAvailable` and Claude flags repeat the same one-line check, as `list_available_agents` already does | — |
| Empty indirection | Pass | `register-agent-discovery-tools.ts` registers both tools, so the loader names one module | — |
| Separation of concerns / file responsibility | Pass | Contract, tool and MCP provider per tool; one shared refusal file | — |
| Ownership-driven dependencies | Pass | The tools depend on the `agent-collaboration` port, not on `remote-collaboration` | — |
| Authoritative Boundary Rule | Pass | The tools don't reach the PeerClient or peer store; the discovery goes through `findPeer` and the client, not the store internals | — |
| File placement | Pass | `discovery/`, `inbound/remote-catalog-lister.ts`, `agent-tools/agent-discovery/`, `mcp/providers/` | — |
| Flat-vs-over-split layout | Pass | 7–56-line files with clear subjects | — |
| Interface boundary clarity | Pass | `listNodes()`, `listAvailableAgents(node)`; `checkAvailability` / `listAvailableAgents` on client and gateway | — |
| Naming quality | Pass | Names match their responsibilities | — |
| No unjustified duplication | Pass | The MCP result mapping was moved into one helper used by both providers | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed | Pass | The old `AvailableAgentEntry`, the old inline thrower and `registerAgentDiscoveryTools` in the tool file are removed | — |
| Test scenarios clear and requirement-aligned | Pass | Unit cases for the switch off, unregistered, stopped, mismatched, malformed and extra-field (`members`) answers; the blank `node`; the MCP isError; the opt-in exposure; the `target` texts | — |
| Test fixtures/helpers coherent | Pass | — | — |
| No stale / compatibility-only tests | Pass | The pinned texts were updated, not duplicated | — |
| API/E2E readiness | Pass | Routes, tools and composition are wired; AC-401 … 406 need the two-server E2E | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `remote-collaboration/channel/peer-client.ts` | 154 | 196 | Pass | Pass | Pass | OK | — |
| `startup/agent-tool-loader.ts` | 152 | 152 | Pass | Pass | Pass | OK | — |
| `claude-session-tooling-options.ts` | 139 | 150 | Pass | Pass | Pass | OK | — |
| `remote-collaboration/channel/peer-gateway.ts` | 112 | 133 | Pass | Pass | Pass | OK | — |
| `autobyteus-agent-tool-resolver.ts` | 127 | 132 | Pass | Pass | Pass | OK | — |
| all other changed `src/` files (24) | 0–96 | 7–97 | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | `targetName` is removed, not kept beside `target` (rule 9). A peer without the routes answers 404, which is read as unreachable; nothing detects versions |
| No legacy old-behavior retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data transition | Pass | No persisted data |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | Both nodes run the same release (rule 9) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and done.
- Why: REQ-409.
- Files: `agent_tools.md` (both tools, opt-in, the optional `description`, the refusal forms per runtime), `remote_collaboration.md` (the four requests, `target`, the strict reader, `RemoteCatalogLister`, § Discovery), and `agent_communication.md`. These match the code. CM-12 in `collaboration_model.md` was updated in the design commit (design spec, Change Scope: "done in this design"), outside this code range.

## Additional Material Premise Validation

None. N-401 (strict parser) is confirmed by `availableAgentsOf` and its extra-field test. N-402 (registration order) is confirmed: `listNodes` keeps the peer store's order through `Promise.all`.

## Review Scorecard

- Overall score: 9.4/10 (94/100)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | One clear path per tool, through the port | — | — |
| 2 | Ownership / Boundaries | 9.5 | The port is owned by `agent-collaboration`; the list on B comes from the delegation policy and port | — | — |
| 3 | API / Interface Clarity | 9.5 | Two small port methods; `target {kind, name}` | — | — |
| 4 | SoC / File Placement | 9.5 | Small files, placed by owner | — | — |
| 5 | Data-Model Tightness / Reuse | 9.5 | One entry builder; no parallel fields | — | — |
| 6 | Naming / Readability | 9.0 | Clear | The resolver's shared branch with a ternary is slightly dense | — |
| 7 | API/E2E Readiness | 9.0 | Everything is wired | The two-server cases are not yet run | Run AC-401 … 406 |
| 8 | Runtime Correctness | 9.0 | The switch, bound, strict reader and refusals are correct in unit tests | C-1 is held for evidence | Watch for null/blank `node` from runtimes in E2E |
| 9 | No Backward Compat | 10.0 | Clean cut | — | — |
| 10 | Cleanup | 9.5 | The old types and the misplaced registration function are removed | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review Pass), with an informational notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- C-1: a runtime that sends `node: null` or `""` for the omitted optional parameter gets a VALIDATION_ERROR. The agent can recover from the text. Watch for it in the E2E runs on each runtime.
- The pre-existing architecture-test failure (FU-002) is still present. It fails at the base too.
- AC-408 is the user's two-node check.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: All 7 assumptions in the handoff were checked and accepted:
  1. A refusal is an MCP `isError` result with the text; on AutoByteus it is the tool's error.
  2. "Not composed" gives the "turned off" refusal, which is correct because nothing can be sent.
  3. A blank `node` gets VALIDATION_ERROR with a recovery text (see C-1).
  4. The texts are kept in the contract files.
  5. One registration module; the loader and the architecture-test list are updated together.
  6. AGENT_CANNOT_RUN without a target reads "The Agent at that address", which is the pre-existing fallback.
  7. `findPeer` is reused, so an unregistered node gets the existing text.
