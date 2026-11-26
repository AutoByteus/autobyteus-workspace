# Code Review Report: autobyteus-581

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, REQ-001 to REQ-018, DEC-101 to DEC-114; the uncommitted DEC-115 row seen in the worktree, see CR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (P-1 to P-14)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001 to SR-007 committed; SR-008 present uncommitted in the worktree)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `history-484/sandbox-relay-data-contract.md` (reader rule V-7), `follow-ups.md`, the public skill `autobyteus-sandboxes/SKILL.md` (skills worktree, commit `f85b30a`)
- Relevant Solution Revision IDs: SR-007 (reviewed basis); SR-008 (in progress, not reviewed)
- Design Review Report Reviewed As Context: `design-review-report.md` (round 3, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: `/implementation_engineer` IR-001 handoff (code `1bc0f90811`, docs `268b0f0042`, base `origin/personal` @ `9f803aa84d`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. A cross-node credential route, login tokens, container lifecycle and five runtime launch paths; nothing in the code changes it.

## Review Scope

- Changed implementation and behavior reviewed: the committed IR-001 code at `1bc0f90811` (164 files, about 4,700 lines added): the relayed node and relay node (C1 to C5, C9, C10), the per-runtime launch shapes, runtime status, the peer `role`, sandboxes (C6 to C8, C11), the three tools on both entry forms, the Electron release variable, the autobyteus-ts endpoint option and the public skill.
- Files and areas reviewed in full: `credential-proxy/provider-relays/*`, `credential-proxy/provider-relay-peer/*`, `credential-proxy-forwarder.ts`, `credential-proxy-host.ts`, `credential-proxy-routes.ts`, `run-pass-registry.ts`, `delivery-definitions.ts`, `remote-collaboration/channel/peer-relay-client.ts`, `api/rest/remote.ts`, the peer store, directory and pairing service, `sandboxes/*`, `agent-tools/sandboxes/*`, the sandbox MCP adapter, `compositions/{build-studio-server,sandbox-composition,remote-collaboration-composition,agent-runtime-status-composition}.ts`, the Claude client, spawn environment and session options, `codex-app-server-launch-config.ts` and its manager, the ACP launcher and the Grok and DeepSeek Harness profiles, the sign-in reader and the Claude, DeepSeek Harness and Grok strategies, `available-llm-construction.ts`, `llm-provider-service.ts`, the secret catalog and alias, autobyteus-ts `llm-endpoint.ts`, `llm-factory.ts` and the Anthropic and Gemini clients, Electron `baseServerManager.ts`. Test lists of the new suites, and the evidence logs IMP-08 and IMP-10.
- Explicit exclusions: the **uncommitted** worktree changes (DEC-115 / SR-008: `relay-offer.ts`, `provider-relay-settings.ts`, `codex-app-server-launch-config.ts`, `server-settings-service.ts`, three tests, `credential_proxy.md`, three ticket docs, modified 16:58 to 17:00 during this review). They are not part of IR-001 and are reviewed when committed (CR-002). The 15 one-to-two-line provider client edits in autobyteus-ts were sampled (Anthropic, Gemini) and are covered by IMP-07.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001 to REQ-018 with DEC-109 to DEC-114).
- Design-spec behavior map verified against the implementation: Yes, per spine DS-001 to DS-006.
- Design review report and round confirmed: round 3, Pass (N-3, N-4 applied).
- Behavior-basis status: `Confirmed` for SR-007. The Codex login-token walk is revised by SR-008, which is not yet committed or reviewed (CR-002).
- Changed or newly discovered behavior: none from this review.
- Remaining material ambiguity: none for SR-007.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed (Codex login token: see CR-002) | `ProviderRelayAccess.routeFor/routeForNativeProvider` from C1 parsed once (`provider-relay-settings.ts:48-83`); launches: native `available-llm-construction.ts:36-58`, Claude `claude-sdk-client.ts:365-370` + `buildClaudeRelayedSpawnEnvironment`, Codex `resolveCodexAppServerLaunch`, ACP `acp-session-launcher.ts relayOfRun` + Grok/DSH profiles. Unrelayed paths return to the prior code (null relay → `process.env` and `parseArgs()`). Live: IMP-08, four runtimes `TURN_COMPLETED` with relayed 200 lines in C5. | — |
| BEH-002 | Confirmed | `ProviderRelayPeerHandler.handle`: relay/kind/path → C2 → credential (vault or login reader, never renewed) → forward with exactly that kind → C5; every reply marked. Two-node integration test with the real gate and signing. | — |
| BEH-003 | Confirmed | `AgentRuntimeSignInReader.relayedReading` (C1 decides; Antigravity signed out); Claude api-key mode from the vault (`claude-agent-runtime-strategy.ts`); `llm-provider-service.ts:333-339` (R-E). | — |
| BEH-004 | Confirmed | autobyteus-ts `providerAddressThrough` + `LLMFactory.createLLM(…, endpoint)`; IMP-07, IMP-08 native turn. | — |
| BEH-005 | Confirmed | `SandboxManager.create` → serialized limit check and `starting` → folders → `SandboxDocker.startContainer` (C8, `-e NAME` only) → `SandboxPairing.connect/pair/importPackages` → `ready`. IMP-08 `ready 9s`. | — |
| BEH-006 | Confirmed | `runIn`, `destroy`, `scheduleExpiry`, `sweepAtStart`; `removeRecord` order: `removing` → `docker rm -f -v` → unpair → entry; folders kept. | — |
| BEH-007 | Confirmed | `PeerPairingService.createInvite({role})` keeps the role beside the code hash; `exchange` saves it with the peer; `PeerStore` tolerant reader; Nodes page label. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal Or Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001..004, AC-001..003, 006, 007 | Operational | Owner, then runs | Runs on a node without credentials | Relay peer setting | Normal | DS-001 → DS-002 | Turns complete through the relay node; C5 lines | requirements, IMP-08, two-node test | Supported Normal | Use |
| SCN-002 | AC-004, AC-005 | Operational | Relay node's owner | Subscription instead of API billing | C2 switch + stored login | Explicit Edge | As SCN-001 with `loginToken` | Login token attached; expired logins refused | requirements DEC-108, DEC-109; IMP-10 | Supported Explicit Edge | Use |
| SCN-003 | BEH-005, 006, AC-008, 011, 012, 014, 015 | User (agent) | Evaluator agent | Evaluate a package in a sealed node | `create_sandbox`, `delegate_task`, `run_in_sandbox`, `destroy_sandbox` | Normal | DS-003, DS-006 | Results in the folders; nothing left after destroy | IMP-08 | Supported Normal | Use |
| SCN-004 | AC-013 | System | Host node | Never leave sandboxes behind | Expiry, start | Normal | `scheduleExpiry`, `sweepAtStart` | All removed, folders kept | unit tests | Supported Normal | Use |
| SCN-X | — | — | — | Sandbox relaying to a third node, nested sandboxes | — | — | — | — | requirements | Technically Possible but Unsupported | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `SandboxCaller` has an `owner` variant that no production code creates; `create` refuses it, `requireOwned` lets it through | Principle 7; C7 (the tools are the only entry surface) | — (contract) | Only `sandbox-manager.test.ts:192` constructs `{ kind: "owner" }`; the tools always pass `{ kind: "run" }` (`sandbox-tool-manifest.ts:20-23`) | grep of `src` and `tests` | Promote → CR-001 | This ticket | New dead code in a new file; remove it |
| C-02 | IR-001's Codex ChatGPT-mode launch never sends its model call (WebSocket first, then "selected workspace missing from routing discovery") | SCN-002, AC-005 (Codex), DEC-108 | Relay node switch on + Codex login stored | `resolveCodexAppServerLaunch` login-token branch → Codex 0.171 → no `codex/responses` call | IMP-10; handoff Known Risks U-1; DEC-115 / SR-008 already decided | Promote → CR-002 | This ticket | Implement SR-008 (already in progress, uncommitted), prove it live once, or mark Codex login tokens "not supported" as DEC-115 says |
| C-03 | The start sweep runs in the background (`void manager.sweepAtStart()`) while the tools are already bound; a create during the sweep could lose its container or peer | SCN-004 vs SCN-003 | Requires an agent to call `create_sandbox` within the few seconds the sweep runs after a node start | Sweep lists labelled containers and sandbox peers after removing records | `sandbox-composition.ts:44`, `sandbox-manager.ts:185-201` | Reject | — | Two supported actions overlapping in a seconds-wide window after start; no product goal makes that timing normal (Principle 6). A cheap hardening (create awaits the sweep's promise) is optional |
| C-04 | Shared-folder paths go into `--mount type=bind,src=<path>,…` unescaped; a path with a comma would break the option list | DEC-113 | An existing host folder whose name contains a comma, given by the host's own evaluator | Docker refuses the mount → `SANDBOX_START_FAILED`; cleanup runs | `sandbox-docker.ts:61` | Reject | — | The input comes from the host's own agent, not the evaluated one; the outcome is a clear refusal, not a weaker mount |
| C-05 | REQ-015 (no link following) is met only by the reader rule in the tool description and the skill, not by code | REQ-015, AC-011, 484 contract V-7 ("reader rule … part of the contract") | — | The evaluator's own file tools follow links; the skill tells it to `realpath` and stay inside the folders | `SKILL.md` § 4; `sandbox-tool-manifest.ts:15` | Reject as a code finding | — | This is the approved contract's mechanism; API/E2E must prove AC-011's planted link with the skill-following agent (Residual Risks) |
| C-06 | C5 `durationMs` of a forwarded call is measured when the provider's headers arrive, not when its streamed body ends | C5 / REQ-007 | Any relayed streaming call | `provider-relay-peer-handler.ts:139` records before the body streams | code | Reject as a finding | — | REQ-007 names a duration without defining it and nothing reads the field; recorded as a doc note for delivery (Docs-Impact) |
| C-07 | Sandbox tools reach the manager through a process binding (`bindProcessSandboxManager`) not named in the design or the handoff deviations | Principle 16 | — | Bound by the composition before serving; a missing binding throws `Sandboxes are not available on this server.`; no cycle | `sandbox-process-binding.ts`, `sandbox-composition.ts:43` | Reject | — | The three conditions hold (same pattern as the existing process slots); record it among the handoff's deviations |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present and preserved | Pass | One relay owner (`ProviderRelayAccess`); holders `run \| node` with `providerRelays` map; per-kind routes | — |
| Implementation matches approved supplemental artifacts | Pass | C1 to C11 as designed; deviations below | — |
| Data-flow spine inventory clarity | Pass | DS-001 to DS-006 traceable one owner per node | — |
| Ownership boundary preservation | Pass | Credentials attached only on the relay node; Docker calls only in `SandboxDocker`; C1 read once (`relayedNodeSettings`), else only as the read-only "is relayed" fact for a loud refusal | — |
| Off-spine concern clarity | Pass | Activity log, login reader and relay offer serve the handler or host | — |
| Existing capability reuse | Pass | Forwarder extended (`credentialHeaders`, drop list), signing reused, pairing/setup code/import reused | — |
| Reusable owned structures | Pass | `forwardableRequestHeaders/ResponseHeaders`, `providerRelayRefusal` shared by both sides | — |
| Shared-structure tightness | Pass | `ProviderRelay.routes.{apiKey,loginToken}`; `RelayCredential {secret, accountId}`; `IntegrationDeliveryRoute` keeps `auth` off relay routes | — |
| Repeated coordination ownership | Pass | Every launch asks `routeFor`/`prepareForRun`; no launch decides its own credential | — |
| Empty indirection check | Pass | `PeerRelayClient` is a real transport boundary; `ProviderRelayPeerForwarder` owns reply mapping | — |
| Separation of concerns and file responsibility | Pass — deviation recorded, reason holds | Deviation 3: reply marking in the peer forwarder keeps relay refusal codes out of `remote-collaboration` | — |
| Ownership-driven dependency check | Pass | credential proxy → remote collaboration through a late, loud binding (`createLateRemoteCollaborationBinding.peerRelays`) | — |
| Visible dependencies check | Pass — deviation recorded, reason holds | Process slot for Claude/Codex singletons (design); deviation 8 (`ClaudeSessionManager` optional access; relayed launch throws in the client); C-07 process binding meets the three conditions | Record C-07 in the handoff |
| Authoritative Boundary Rule | Pass | No caller uses both `ProviderRelayAccess` and its registry or relays | — |
| File placement | Pass | Files as in the design's mapping | — |
| Flat-vs-over-split layout | Pass | `sandboxes/` five files plus folders; `provider-relay-peer/` four | — |
| Interface boundary clarity | Pass | `routeFor(runtimeKind)` vs `routeForNativeProvider(provider)` (N-2); `prepareForRun` vs `prepareForNode` | — |
| Naming and vocabulary | Pass | `relayCredentialKind` always qualified; `role: "sandbox"`; node pass | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Fail | CR-001 | Remove the `owner` caller variant |
| Test scenarios clear and requirement-aligned | Pass | Two-node relay test (real gate, signing, handler), sandbox manager, launch shapes, peer role | — |
| Test fixtures/helpers reusable | Pass | `provider-relay-access-double.ts` | — |
| No stale or compatibility-only tests | Pass | Replaced relay tests updated, `createDeepSeekProviderRelay` gone | — |
| API/E2E readiness | Fail | CR-002: the package's Codex login-token code is being replaced in the same worktree (uncommitted SR-008 edits) and IR-001's version fails live | Commit IR-002, then return |

Deviations 1 to 8 in the handoff were judged by their reasons and hold:
1. Pass read from any of the three credential headers: the pass only identifies its holder; the kind comes from the holder's grant (`holder.providerRelays.get(relay.id)`), not the header, and the forwarder drops all three. The `deepseek` route serves dsh (`x-api-key`) and native DeepSeek (Bearer), so a per-route header would split one relay in two.
2. Empty DeepSeek base path: the upstream path dsh reaches is unchanged (`/anthropic/v1/messages`, compared with the removed `createDeepSeekProviderRelay`).
3. Reply marking in the peer forwarder: see above.
4. No explicit undici agent: Node's fetch defaults are connect 10 s, headers 300 s and body 300 s, which are C4's timeouts. No abort signal is passed, so there is no total timeout.
5. `AUTOBYTEUS_TEMP_WORKSPACE_DIR`: needed for runs that peers start to land in the mapped workspace.
6. Protected-folder rule on packages: closes a REQ-011 path (a package copy is placed inside the sandbox).
7. Gemini AI Studio only: C3 lists only that key.
8. Optional `providerRelayAccess` in `ClaudeSessionManager`: `null` is a real host (standalone), and a relayed node refuses loudly in `resolveSpawnEnvironment`.

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sandboxes/sandbox-manager.ts` | 0 | 329 | Pass | New file over 220 | One owner: sandbox lifecycle (folder rules, Docker, pairing and records already split out) | Pass | Acceptable | — |
| `provider-relays/provider-relay-proxy-routes.ts` | 188 | 216 | Pass | Pass | Local route only | Pass | — | — |
| `provider-relays/provider-relay-access.ts` | 78 | 193 | Pass | Pass | The relay owner | Pass | — | — |
| `provider-relays/provider-relays.ts` | 53 | 161 | Pass | Pass | C3 table | Pass | — | — |
| `provider-relay-peer/provider-relay-peer-handler.ts` | 0 | 159 | Pass | Pass | Relay side of C4 | Pass | — | — |
| `autobyteus-agent-run-backend-factory.ts` | 499 | 497 | Pass | Pass | — | Pass | — | — |
| `claude-session.ts` | 497 | 498 | Pass (under 500, +1) | Pass | — | Pass | — | — |
| `server-settings-service.ts` | 465 | 483 | Pass | Pass | Five setting descriptions | Pass | Near the limit (the uncommitted SR-008 edit adds 3) | Watch in IR-002 |
| `build-studio-server.ts` | 464 | 471 | Pass | Pass | Composition | Pass | — | — |

(Non-empty lines at `9f803aa84d` and `1bc0f90811`.)

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No local-vault fallback on a relayed node; refusals are explicit |
| No legacy old-behavior retention | Pass | `providerRelayId`, single `route/consumer`, `agentRuntime/deepseek_harness` consumer removed |
| Dead code removed in touched files | Fail | CR-001 |
| Persisted-data transition followed | Pass | `peers.json` `role`: tolerant reader, written only when set |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | No migration, as decided |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `SandboxCaller` `{ kind: "owner" }` in `sandboxes/sandbox-manager.ts:47`, its refusal in `create` (`:112`) and its branch in `requireOwned` (`:301`) | DormantPath | No production code constructs it; the tool manifest always passes `{ kind: "run" }`; only `tests/unit/sandboxes/sandbox-manager.test.ts:192` uses it | Code only its own test reaches (Principle 7); it suggests an owner entry surface that does not exist | Make the caller a run ID (or keep a one-variant type), drop the owner branch and the owner part of the test |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new routes, settings, vault ID, tools and refusal codes. The implementation already updated `credential_proxy.md`, `node_access_model.md` (NAS-42 to NAS-44), `secret_management.md`, the DeepSeek Harness and Grok runtime docs, the new `sandboxes.md`, `GLOSSARY.md` and `TESTING.md`. A grep for the removed names (`providerRelayId`, `createDeepSeekProviderRelay`, `agentRuntime/deepseek_harness`) finds none.
- Lines for delivery's doc sync (no source change needed):
  - design spec C7 refusal list: add `SANDBOX_ARGUMENT_INVALID`, which the code returns and the skill documents;
  - `credential_proxy.md` C5 description: `durationMs` of a forwarded call is the time to the provider's response headers (C-06);
  - the Codex login-token text in `credential_proxy.md` and the skill changes with SR-008 (CR-002).

## Additional Material Premise Validation

None new or reclassified.

## Review Scorecard (Mandatory)

- Overall score: 9.2 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 to DS-006 map one to one onto code | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One relay owner; credentials only on the relay node; Docker in one owner | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Subject-specific `routeFor` / `routeForNativeProvider`; tool contract shared by both entry forms | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Files as mapped; manager at 329 lines stays one concern | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Per-kind routes, pass holder union, tolerant `role` | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Vocabulary consistent with the glossary | — | — |
| 7 | API/E2E Readiness | 8.5 | API-key paths proven live | The worktree's Codex login-token code is mid-change (CR-002) | Commit IR-002 with its live result |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Refusal order, reply marking, no swap, no fallback, cleanup on failure all hold | AC-005 Codex fails live in IR-001 (CR-002) | SR-008, or "not supported" per DEC-115 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cuts listed in the removal plan all done | — | — |
| 10 | Cleanup Completeness | 9.0 | Removed pieces gone | Dormant `owner` caller (CR-001) | Remove it |

## Findings

### CR-001 — Dormant `owner` caller in `SandboxManager` (Local Fix, low)

- Contract: Principle 7 (no dead code in touched files); C7 (the tools are the only entry surface).
- Problem: `SandboxCaller` has `{ kind: "owner" }`, which no production path creates. `create` refuses it and `requireOwned` lets it through, so the code suggests an owner surface and an authorization path that do not exist. Only a unit test reaches it.
- Required action: reduce the caller to the run (`{ kind: "run"; runId }` or a plain run ID), remove the owner branches and the owner case in `sandbox-manager.test.ts`. REQ-012's "or the owner" stays true in effect: the owner removes sandboxes by restarting the node (the start sweep), and there is no other owner path to authorize. If the Solution Designer later adds an owner surface, the variant comes back with it.

### CR-002 — IR-001's Codex login-token launch fails AC-005, and the reviewed files are being replaced in the worktree (Local Fix, implementation)

- Behavior: SCN-002, AC-005 (Codex), DEC-108 ("both kinds are proven live"); DEC-115 and SR-008 (decided after IR-001).
- Problem: as committed, `resolveCodexAppServerLaunch`'s login-token branch never produces a model call (IMP-10). The Solution Designer has since decided DEC-115, and the worktree already carries uncommitted edits to `relay-offer.ts`, `provider-relay-settings.ts`, `codex-app-server-launch-config.ts`, `server-settings-service.ts`, their tests, `credential_proxy.md`, the requirements doc, the design spec and the solution revision record (modified 16:58 to 17:00, during this review). Passing IR-001 would send API/E2E a worktree whose code differs from the reviewed code and is still changing.
- Required action: finish SR-008 as IR-002. The SR-008 walk asks for the Codex Responses WebSocket features to be turned off; the current edits set `openai_base_url` instead, so either follow the walk or record why `openai_base_url` replaces it. Run the one live check DEC-115 asks for. If it fails, mark Codex login tokens not supported (the relay offer never lists `codex_app_server`). Commit, update the handoff and the implementation revision record, and return for review. The next round is a Targeted Delta Review of the C1 settings parse, the relay offer, the Codex launch config, the settings descriptions, the skill's Codex text and CR-001.

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Local Fix` (implementation): CR-001, CR-002.

## Recommended Recipient

- `/implementation_engineer` (source review identifies implementation-owned Local Fixes before executable coverage).

## Residual Risks

- U-2 (Grok login token) and the Claude login-token live check depend on the user (a fresh Grok login; a `claude setup-token` in the test vault).
- The C3 path lists for login-token routes are fixed lists: a CLI version that calls a new account or OAuth path gets `PATH_NOT_ALLOWED`, most likely for Claude Code with an OAuth token, which IR-001 has not run live.
- REQ-015 relies on the reader rule (skill § 4, tool description). API/E2E's AC-011 planted-link check should use an evaluator that follows the skill, on the runtime evaluators normally use.
- IMP-08's row labels "REQ-015 shared read-only". The read-only shared folder is DEC-113/P-14, and REQ-015 (links) is not yet proven.
- AC-009, AC-010, AC-013 (live restart), AC-015 rendered, AC-016, QR-001, QR-002, QR-004 and the full `test:integration` and E2E suites are left to API/E2E as the handoff says.

## Latest Authoritative Result

- Review Decision: **Fail**, with two implementation-owned Local Fixes. The IR-001 source is otherwise sound: one relay owner, explicit refusals with no fallback, credentials only on the relay node, a Docker boundary and a clean lifecycle.
- Review Entry Point: Implementation Review
- Supported Product Scenario Gate: Pass
- Material-Premise Gate: Pass
- Score Summary: 9.2 average; API/E2E Readiness 8.5, Runtime Correctness 8.6 and Cleanup 9.0 are below 9.2
- Recommended Recipient: `/implementation_engineer`
- Notes: the next round is a Targeted Delta Review (CR-001 and the SR-008 files) unless IR-002 reaches further.
