# Implementation Handoff — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2`, branch `codex/cross-node-agent-communication-r2`; base `origin/personal` `5de6a698b9`; finalization target `origin/personal`.

Implementation commits (on top of the reviewed design `910f024ec5` and SR-014 `a3b0cf1028`):

| Commit | Content |
| --- | --- |
| `1bc48b2f49` | Step 0: remote links and `delegatedFrom` on disk and in memory |
| `4c07f5b268` | Steps 1–6: settings, channel, `RemoteRunLinks`, engine entry points, standalone root, `delegate_task` `node`, Team and Org roots |
| `8491e0d916` | Steps 1 and 7: web Nodes → Remote Collaboration tab, server follow-ups, docs |
| `6076a3aadf` | Engine takes the attachment refusal from the one code/text owner; idle-shutdown unit test |
| `37224bf2dc` | This handoff, the revision record, evidence (IR-001) |
| `744641b35c` | IR-002 (CR-001): remote-endpoint messages are not published to the root view stream; stream-sequence test |
| the IR-002 documents commit (named in the handoff message) | This handoff and the revision record updated; IMP-09 … IMP-11 evidence |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High); ARCH-REV-002 Pass. The review sent the package here.
- Requirements doc: `tickets/in-progress/cross-node-agent-communication/requirements-doc.md` (approved baseline SR-007)
- Investigation notes: `tickets/in-progress/cross-node-agent-communication/investigation-notes.md`
- Solution revision record: `tickets/in-progress/cross-node-agent-communication/solution-revision-record.md` (current SR-014)
- Design spec: `tickets/in-progress/cross-node-agent-communication/design-spec.md` (SR-014)
- Supplemental task artifacts: `slice-plan.md` (approved); `follow-ups.md` (FU-001 done as autobyteus-197; FU-002 added by the architecture reviewer)
- Design review report: `tickets/in-progress/cross-node-agent-communication/design-review-report.md` (ARCH-REV-002, notes N-6 … N-11)
- Architecture review revision record: `tickets/in-progress/cross-node-agent-communication/architecture-review-revision-record.md`
- Triggering rework report: `tickets/in-progress/cross-node-agent-communication/code-review-report.md` (CRR-001, finding CR-001); `code-review-revision-record.md`

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002 on top of IR-001)
- Implementation revision record: `tickets/in-progress/cross-node-agent-communication/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-013, SR-014
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-001 (IR-002; see the revision record for the delta)

What exists now:

- **Node settings** (`src/remote-collaboration/settings/`): the switch `ENABLE_REMOTE_COLLABORATION` (off by default; GraphQL reports `source` `DEFAULT_DISABLED` or `SERVER_SETTING`), `peers.json` (`PeerDirectory`: add pins the peer's `serverInstanceId`, needs the switch on; refuses this node, a duplicate node and a taken name; rename; remove) and `published-agents.json` (`PublishedAgentService` + `PublishedLaunchCheck`; the address is derived with the catalog's address rules, never stored).
- **Channel**: `PeerClient` implements the process-bound `RemoteRunChannel` port (switch, registration, 20 s bound, pinned-identity check on the answer, agent wording with the peer's name). `PeerGateway` is the one inbound entry (`toNodeId` → switch → registered peer → handler; every answer names this node, including the 400). REST `POST /rest/remote/delegated-runs` and `POST /rest/remote/messages`, route class `REMOTE_PEER` (mobile credential → 403).
- **Receivers**: `RemoteDelegationReceiver` prepares a standalone run of the published Agent with its launch settings and `delegatedFrom`; `RemoteMessageReceiver` routes a work packet or a message without `coordinatingRun` to the run's own standalone root, and a message with `coordinatingRun` to that coordinating root (restored when needed).
- **Shared remote component** (`src/agent-collaboration/execution/remote/`): `RemoteRunReference`, the port, the refusal codes and root texts, `RemoteRunLinks` (one per root: endpoints, pair rule `route`, inbound link check, ownership chain, `refuseExistingCopy`, `delegationPlacement` / `delegate`, `accept`, `planActivation` / `beginActivation`, `send`) and `RemoteTaskActivation`.
- **Engine**: `RootCommunicationEngine.sendToRemote` (sender log committed only after the peer accepted) and `acceptFromRemote` (receiver log only, the sender's message ID kept); each adapter's `commitSentToRemote`; message log owner `REMOTE_RUN_LOG` skipped when writing.
- **Roots**: standalone, Team and Org roots answer `hasAgentExecution` for their remote endpoints, route `deliverExact` through `RemoteRunLinks`, accept inbound messages (`acceptRemoteMessage`), and record remote links in the topmost tree through their task adapters. The standalone root on B also admits the work packet (N-6) and runs `StandaloneHostIdleShutdown` (DS-006).
- **Tool**: `delegate_task` has `node`; the result names the node. `send_message_to` is unchanged (DEC-111).
- **Views**: messages with a remote endpoint are kept out of the public run views (the web asserts that every message's sender and receiver are participants). The root never publishes them to its view stream: `commitAppend` takes `publishToRootView` (`false` from `acceptFromRemote`) and `commitSentToRemote` never publishes, so the change sequence has no gap (IR-002, CR-001). The view snapshots filter them with `isPublicMessage`. A reply from a remote run still produces the receiver's member-input or presentation event.
- **Web**: Nodes → Remote Collaboration tab (switch, peers, published Agents), en and zh-CN.
- **Docs**: `autobyteus-server-ts/docs/modules/remote_collaboration.md` (new); sections in `agent_tools.md`, `standalone_agent_run_root.md`, `autobyteus-web/docs/settings.md`.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 93 server source files (29 new), 18 web files; a new inter-node contract, new persisted fields in three exact-written tree kinds and in run metadata, a new inbound surface, remote activation around the task queue.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` open. DI-1 (activation order) was raised during implementation and resolved by the Solution Designer as SR-014 (see § Important Assumptions). No walker of `taskExecutions` outside the AR-001 table and no writer bypassing the shared split was found.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-101 | Switch + peers with pinned identity (REQ-101/102/114/115) | `remote-collaboration/settings/remote-collaboration-capability.ts`, `peer-directory.ts`, `peer-store.ts`; `channel/peer-client.ts` (`readServerIdentity`); `channel/peer-gateway.ts`; `api/rest/remote.ts`; `api/security/remote-access-route-policy.ts`; `api/graphql/types/remote-collaboration-settings.ts`; web tab | Implemented. Unit: settings, gateway, client, route policy. Real HTTP: IMP-07. UI: IMP-08 |
| BEH-102 | Published Agents with launch settings (REQ-103) | `settings/published-agent-service.ts`, `published-agent-store.ts`, `published-launch-check.ts`; web `RemoteCollaborationPublishedAgentsSection.vue`, `RemoteCollaborationPublishForm.vue` | Implemented. Any shared Agent definition is publishable, including built-in ones (REQ-103 says "shared"; an earlier built-in exclusion was removed) |
| BEH-103 | `delegate_task({node,…})` → B prepares a standalone run → A links it → work packet (REQ-104/105/109/111) | Tool: `agent-tools/task-delegation/*` (`node` parameter, parser, serialization). Root: `RemoteRunLinks.delegate` / `delegationPlacement` → unchanged `RootTaskExecutionLifecycle` → adapter `planActivation` (calls `startDelegatedRun`, SR-014) → `beginActivation` (`RemoteTaskActivation`: one tree write of the link, then the work packet). B: `inbound/remote-delegation-receiver.ts` → prepared run with `delegatedFrom`; `standalone-root-message-delivery.ts` `acceptRemoteWorkPacket` (N-6) | Implemented for all three root kinds as delegators. In-process A↔B test (IMP-03) for a standalone delegator |
| BEH-104 | Run-ID messages both ways through the link (REQ-106/107/108) | `hasAgentExecution` → root `deliverExact` → `RemoteRunLinks.route` / `send` → `RootCommunicationEngine.sendToRemote` → `PeerClient` → B `PeerGateway` → `RemoteMessageReceiver` → root `acceptRemoteMessage` → `RemoteRunLinks.accept` (link check; root `wake` restores the host, N-8) → `acceptFromRemote`. Headers name the node (`received-message-header.ts`) | Implemented. In-process test: both directions, one ID in both logs, restart of both nodes, pair-rule refusals |
| BEH-105 | Files and saved Task refused before anything is sent (REQ-110) | `RemoteRunLinks.delegationPlacement` (task_id, reference_files), `refuseExistingCopy` (AR-003, in `assignToExistingCopy`), `RootCommunicationEngine.sendToRemote` (follow-up files) | Implemented; codes `REMOTE_SAVED_TASK_NOT_SUPPORTED`, `REMOTE_ATTACHMENTS_NOT_SUPPORTED` |
| BEH-106 | Remote run is a normal standalone run on B (REQ-112) | `RemoteDelegationReceiver` (prepared run via the existing provisioning path, `PrepareAgentRunInput.delegatedFrom`); `agent-run-metadata-store.ts` keeps `delegatedFrom` (N-10); `StandaloneHostIdleShutdown` (DS-006) | Implemented. The rendered history view of B is left to API/E2E (AC-110) |

Review notes:

| Note | Where |
| --- | --- |
| N-6 work packet on B | `standalone-root-message-delivery.ts` `acceptRemoteWorkPacket`: link check against `delegatedFrom`, host made ready, system task notification naming the node, package created with the first message |
| N-7 compose shortcut | `task-execution-tree-split.ts` `composeTreeFile(Sync)`: the shortcut partitions remote entries; test "partitions a tree whose only link is remote" per tree kind |
| N-8 wake placement | `RemoteRunLinks.accept` calls the root's `wake(…)` around `acceptFromRemote` (standalone `wakeAndRun`, Team and Org their live-lease paths) |
| N-9 closure text | Task-closure release results are only logged (`projects/runtime/task-execution-resource-release.ts`); no agent- or user-facing text says the remote run stopped |
| N-10 `delegatedFrom` survives activation | catalog test: `delegatedFrom` kept through `recordRunStarted`; metadata store round trip |
| N-11 ownership chain on B | `RemoteRunLinks.ownershipChainFor`: `[{agentRunId}]` on the delegating side, `[]` on the receiving side |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):

- New subsystem `remote-collaboration/`: `domain/` (peer node, published agent, requests, refusal texts, settings error), `settings/` (schema, stores, `PeerDirectory`, `PublishedAgentService`, `PublishedLaunchCheck`, capability), `channel/` (`PeerClient`, `PeerGateway`), `inbound/` (two receivers), `remote-collaboration-services.ts`.
- New shared component `agent-collaboration/execution/remote/`: `remote-run-reference.ts`, `remote-run-channel.ts`, `remote-refusal-codes.ts`, `remote-run-links.ts`, `remote-task-activation.ts`.
- Engine and adapters: `agent-collaboration/execution/communication/root-communication-engine.ts`, `root-communication-adapter.ts`, `root-communication-runtime-builder.ts`, `received-message-header.ts`; the three adapters' `commitSentToRemote`; `task-agent-message-logs.ts` (`REMOTE_RUN_LOG`).
- Data model: `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts`, `remote-task-execution-links.ts` (new), `task-execution-tree-split.ts`, `coordinating-tree-shapes.ts`, the three tree types and validators, `agent-run-metadata-types.ts`, `delegated-from-schema.ts` (new), `agent-run-metadata-store.ts`.
- Roots: `standalone-agent-run-root/` (root, message delivery, `standalone-host-idle-shutdown.ts` (new), builder, manager, persistence coordinator, task adapter, tree mutator); Team (`root-team-run.ts`, `team-run-message-delivery.ts`, `team-communication-service.ts`, task adapter, mutator); Org (`agent-org-run.ts`, message delivery, task adapter, mutator).
- Tool: `task-delegation-command.ts`, `catalog-delegation.ts` (`RemoteAgentPlacement`), `task-execution-input.ts`, the `delegate_task` parser, schema, serialization, result contract and LLM contract texts.
- API and composition: `api/rest/remote.ts`, `api/graphql/types/remote-collaboration-settings.ts`, `api/security/remote-access-route-policy.ts`, `remote-access/domain/models.ts`, `server-settings-service.ts`, `compositions/remote-collaboration-composition.ts` (new; bound in `build-studio-server.ts`, released on close).
- Views: `services/agent-streaming/public-message-scope.ts` (new) and the standalone, team and org view projectors.

Web (`autobyteus-web/`): `components/settings/RemoteCollaboration*.vue` (4 new), `NodeManager.vue`, `NodeManagerTabs.vue`, `ApplicationWorkspaceRootSelector.vue` (`customPathHelp` prop), `stores/remoteCollaboration*.ts`, GraphQL query/mutation files, `localization/messages/{en,zh-CN}/remoteCollaborationSettings.ts`.

Places that deserve the reviewer's closest look:

1. `remote-run-links.ts` — the pair rule, the inbound link check, `planActivation` (SR-014) and the refusal paths that must leave nothing behind.
2. `root-communication-engine.ts` `sendToRemote` / `acceptFromRemote` — the only message-state writers for remote endpoints (AR-002).
3. `task-execution-tree-split.ts` + `remote-task-execution-links.ts` — remote entries never reach `taskExecutions` in memory and survive every save (AR-001, RSK-108).
4. `peer-gateway.ts` — admission order (REQ-114).
5. `standalone-root-message-delivery.ts` — work-packet admission and wake on B.

## Important Assumptions

- **SR-014 (DI-1)**: the peer's `startDelegatedRun` runs in the adapter's `planActivation`, before the lifecycle links the Task, because `dispatchTaskCopy` plans before it submits to the root's queue. A refusal by the peer throws `RemoteDelegationRefusedError` from planning, so nothing is written on A. Details accepted by the Solution Designer within the design:
  - (a) the plan's target uses the peer's run ID as `ingressAgentRunId` and an empty `ownedAgentRunIds`;
  - (b) `beginActivation` commits the link in one tree write, then sends the work packet in `acceptSeed`; a refused work packet leaves the link (the prepared run on B expires);
  - (c) the refusal codes and the root texts live next to the port (`remote-refusal-codes.ts`), and the agent texts of channel and peer refusals in `remote-collaboration/domain/remote-refusals.ts`, so roots do not depend on `remote-collaboration`.
- `remoteTaskExecutions` is optional in memory and absent when empty, so validators that rebuild trees (including app-data migrations, which write validator output) keep today's exact key set when there are no remote links.
- The roots receive the channel through an option `remoteRunChannel` (tests inject one; production uses the process-bound port).
- `delegatedFrom` is parsed strictly: a malformed section makes `run_metadata.json` unreadable, as for the file's other sections. A malformed remote link in a tree is left out with a warning naming the run and stays on disk (DESIGN.md rule 7).
- On A's Task board, the worker status of a remote run shows "offline" (A has no live state for it).

## Known Risks

- RSK-106 (at-most-once, no retries): recorded as FU-002 by the architecture reviewer, by design for slice 1.
- RSK-103: identity is claimed, not proven, until S6.
- Team and Org as delegators are exercised by unit tests of their adapters, delivery and walkers, not by an end-to-end delegation run; the in-process A↔B test uses a standalone delegator (the design's "prove step 5 first").

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (feature)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed` (two bounded extensions: engine entry points; shared split partition)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes` for DI-1 (resolved as SR-014); nothing else.
- Evidence / notes: `remote-link-walkers.test.ts` guards the AR-001 table for all three root kinds.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (unused `PeerIdentityAnswer`, `RemoteRefusalCode`, `sameRemoteRun` removed; the engine's duplicated refusal literals replaced by the one owner)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (a distinct `RemoteTaskAgentExecution` and `RemoteRunReference`; no optional `nodeId` on local types)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (no changed source file above 500 effective lines; largest new file `remote-run-links.ts` at 264 effective lines; largest change to an existing file `root-communication-engine.ts`, +141 / −22)
- Notes: no version checks between nodes (DESIGN.md rule 9).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (new files and new optional fields; no migration)
- Design-spec decision reference: `design-spec.md` § Persisted-data transition decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: existing tree, metadata and app-data-migration suites pass unchanged in shape (trees without remote links keep their exact key set); `remote-task-execution-links.test.ts` (12) proves the on-disk shape, the round trip and preservation for each tree kind.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm install` and `pnpm -C autobyteus-server-ts prebuild` (builds `autobyteus-ts` and the SDK packages, generates Prisma) before the typecheck.
- The web suite needs `nuxi prepare` once in a fresh worktree.
- No user data or running AutoByteus was touched: every check used temp data roots and its own ports, and every process started was stopped.

## Checks Run

Evidence is in `tickets/in-progress/cross-node-agent-communication/evidence/`. Environment for all rows: macOS (Darwin 25.5), Node v22.23.1, pnpm via corepack.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `6076a3aadf` | as above | all server source | all | Pass | `IMP-01-server-typecheck.log` | `tsc -p tsconfig.build.json --noEmit` followed by `exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` (full unit suite) | `8491e0d916` (the behaviour-identical engine change of `6076a3aadf` was saved during the run; its new test is in IMP-03) | as above, temp dirs only | all server unit tests | AC-112, QR-105 and all | Pass | `IMP-02-server-unit-full.excerpt.log` | `Test Files  758 passed \| 4 skipped (762)`, `Tests  6248 passed \| 7 skipped (6255)`, `exit=0` |
| IMP-03 | `npx vitest run tests/unit/remote-collaboration tests/unit/run-history/store/remote-task-execution-links.test.ts tests/unit/standalone-agent-run-root/standalone-host-idle-shutdown.test.ts tests/unit/agent-collaboration/execution/communication` (in `autobyteus-server-ts`) | `6076a3aadf` | as above | new remote code, engine, tree links, idle shutdown | BEH-101 … BEH-106; AC-101 … AC-109, AC-111 (in process) | Pass | `IMP-03-server-remote-focused.log` | `Test Files  8 passed (8)`, `Tests  50 passed (50)`; `standalone-remote-delegation.test.ts (7 tests)` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt` (full web suite) | `8491e0d916` (web unchanged since) | as above | all web code | BEH-101, BEH-102 (UI) | Pass | `IMP-04-web-tests.excerpt.log` | `Test Files  644 passed \| 2 skipped (646)`, `Tests  4582 passed \| 5 skipped (4587)` |
| IMP-05 | web guards: `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `8491e0d916` (web unchanged since) | as above | web boundary and localization rules | REQ-115 | Pass | `IMP-05-web-guards.log` | `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.`, `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-07 | Two built servers (dist), separate temp data roots and ports; GraphQL and `/rest/remote/*` over real HTTP with curl | dist of `4c07f5b268` + capability `source` (in `8491e0d916`) | as above | settings, gateway, route policy over HTTP | BEH-101; AC-101, AC-102, AC-111 (partial) | Pass | `IMP-07-two-server-http-smoke.log` | `"source":"DEFAULT_DISABLED"`; `REMOTE_COLLABORATION_OFF`; `PEER_NOT_REGISTERED`; `PEER_IDENTITY_MISMATCH`; `403` for a mobile credential; `400` for a malformed body. The case labelled "A URL that is not an AutoByteus node" used the frontend URL proxied to A and so shows `PEER_IS_THIS_NODE` |
| IMP-09 | `pnpm -C autobyteus-server-ts typecheck` | `744641b35c` | as above | all server source | CR-001 | Pass | `IMP-09-server-typecheck-cr001.log` | `exit=0` |
| IMP-10 | `npx vitest run tests/unit/remote-collaboration/remote-message-view-sequence.test.ts`, on the fix and with `src/` from `37224bf2dc` | `744641b35c` and `37224bf2dc` | as above | the three adapters, engine, append plan, view projectors | CR-001; BEH-104 | Pass (fails before the fix) | `IMP-10-cr001-stream-sequence.log` | after: `Tests  3 passed (3)`; before: `Tests  3 failed (3)` |
| IMP-11 | `pnpm -C autobyteus-server-ts test:unit` (full unit suite) | `744641b35c` | as above, temp dirs only | all server unit tests | AC-112 and all | Pass | `IMP-11-server-unit-full-cr001.excerpt.log` | `Test Files  760 passed \| 4 skipped (764)`, `Tests  6255 passed \| 7 skipped (6262)`, `exit=0` |
| IMP-08 | Rendered web tab against the two-server stack (Nuxt dev, browser) | web as in `8491e0d916` | Chromium via the agent browser tool | Nodes → Remote Collaboration | BEH-101, BEH-102, REQ-115 | Pass (observed) | `IMP-08-ui-remote-collaboration-tab.png`, `IMP-08-ui-peer-refusal-and-rename.png`, `IMP-08-ui-publish-form.png` | the switch on; peer "docker" listed with its node ID; the refusal next to the peer form; the publish form with runtime, model, workspace and auto-approve |

- Not run, and why:
  - Two-server E2E with a scripted runtime for AC-101 … AC-111 (delegation, both-way messages, idle shutdown and restore, restart of both nodes, Task closure, captured requests): owned by API/E2E; start from `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` (design § Guidance).
  - AC-110 (B's run history in the browser) and AC-113 (the user's desktop + Docker check, both directions): API/E2E and the user. On Linux Docker, the desktop is reached through `host-gateway`; not checked here.
  - Full server build (`pnpm -C autobyteus-server-ts build`) ran only to produce the dist for IMP-07 / IMP-08 (it passed, including the built-in agents bootstrap smoke); not rerun at the final commit.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Nodes window → new "Remote Collaboration" tab: switch; add / rename / remove a peer; publish / edit / unpublish an Agent with launch settings.
- Approved UI/UX, interaction, requirement, or design references: REQ-115, DEC-108; no separate UI spec.
- Existing design system, shared components, and adjacent product surfaces reviewed: the Nodes window tabs, the Remote Access card (layout and switch), the application setup's runtime/model/workspace selectors (reused, with a new optional `customPathHelp` prop on `ApplicationWorkspaceRootSelector.vue` so its application-specific help text is not shown here).
- Testing guideline or development / preview instructions and rendered surface used: `pnpm dev` of `autobyteus-web` against two built servers on temp data roots and ports (60063, 60081; frontend 60101); stopped afterwards and the temp root removed.
- States, layouts, viewports, and interactions inspected: switch off (sections hidden) and on; empty peers; add peer success and refusal (this node); rename; remove; empty published list; publish form (definition choice, defaults from the definition, runtime/model/workspace, auto-approve); published row; unpublish.
- Visual or interaction issues found and corrected: definitions filtered against `'shared'` instead of the GraphQL enum `SHARED` (fixed with `normalizeDefinitionOwnershipScope`); the workspace help text spoke about applications (new prop); one global error banner far from the action (errors now shown in the section that failed); the publish button label.
- Check IDs: IMP-04, IMP-08. Not inspected: narrow (mobile-width) layout, zh-CN rendering (messages are present and pass the localization guards).

## Downstream Coverage Hints / Suggested Scenarios

- Run two server instances with separate data dirs and ports and a scripted runtime on each; register both ways; publish an Agent on B.
- AC-104/105: `delegate_task({node:"B", recipient_address:"/publisher", description})` from a standalone run, a Team member and an Org member on A; reply from B by run ID; follow-up from A; assert one message ID in both logs, headers naming the node, the link entry in A's topmost tree (`taskExecutions` entry with `nodeId`, exact keys) and `delegatedFrom` in B's `run_metadata.json`.
- AC-106: let B's host idle out (short grace via the idle shutdown setting), then message it; restart B, then A; message again both ways.
- AC-107: a run on A that did not delegate, and a run on B not started from A → `REMOTE_TARGET_NOT_PERMITTED`, nothing written on the target.
- AC-108: `reference_files` on delegate and on a follow-up; `task_id` with `node`; giving the saved Task of a remote run to it again (AR-003).
- AC-109: delegate under a Project Task, mark it DONE, then messages both ways are refused with the closed-Task reason; the remote run keeps running on B until idle.
- AC-101/102/103/111: switch off on either side; an unregistered caller; a wrong `toNodeId`; an unpublished Agent; a published Agent whose runtime is unavailable; capture the request bodies and check that no credential or secret is present.
- QR-102: stop B; a delegation and a message from A are refused with `PEER_UNREACHABLE` within about 20 s.
- RSK-106 timeout ambiguity is accepted for slice 1 (FU-002); do not treat it as a failure.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The two-server E2E (AC-101 … AC-111) with a scripted runtime, including Team and Org delegators and restarts.
- AC-110 in a browser against B; AC-113 with the user.
- Regression: the same-node collaboration, Task and run-history suites with the switch on (AC-112, QR-105); the unit suite here ran with the switch off by default.
