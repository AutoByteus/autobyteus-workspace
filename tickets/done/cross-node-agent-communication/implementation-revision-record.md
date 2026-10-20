# Implementation Revision Record — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-013, SR-014, ARCH-REV-002 | Implemented; handed to code review |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (round 1, Fail) | CR-001 | `Local Fix` | CRR-001, SR-014, ARCH-REV-002 | Fixed; back to code review for a targeted delta review |
| IR-003 | Architecture reviewer (ARCH-REV-004, ARCH-REV-006) for SR-015 / SR-016; code reviewer CRR-003 (from API/E2E F-001) | AR-005 … AR-009; CR-002 | `Design Impact` (upstream, resolved) + `Local Fix` | SR-015, SR-016, ARCH-REV-004, ARCH-REV-006, CRR-003, API-REV-001 | Steps 3–6 brought in line; CR-002 fixed; to code review (targeted delta) |
| IR-004 | Architecture reviewer ARCH-REV-007 (SR-017), from code reviewer CRR-005 (API/E2E F-002, API-REV-002) | F-002 | `Design Impact` (upstream, resolved) | SR-017, ARCH-REV-007, CRR-005, API-REV-002 | Package validators accept remote message endpoints; to code review (targeted) |
| IR-005 | Delivery engineer DR-002 (`delivery-revision-record.md`): integration refresh blocked by source conflicts | DR-002 merge conflicts | `Local Fix` (integration) | DR-001, DR-002 | `origin/personal` `3b9014215e` merged; to code review (merge), then API/E2E |

## Revision Entries

### IR-001 — Slice 1 implemented: settings, channel, remote links, remote delivery in all three root kinds, web tab, docs

- Triggering role, report path, and round: architecture reviewer (`architecture_reviewer_3f2fb8418663470e884249ccd42b9963`), `tickets/in-progress/cross-node-agent-communication/design-review-report.md`, ARCH-REV-002 (Pass at SR-013).
- Triggering finding IDs: N/A (baseline). Review notes N-6 … N-11 were applied (see the handoff's trace).
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation ready for code review at the commits listed in the handoff.
- Related solution revision IDs: SR-013 (reviewed design), SR-014 (DI-1 raised during this round: remote activation order follows `dispatchTaskCopy`; the peer's run is created in `planActivation`).
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation of the reviewed design.
- Approved behavior or requirement IDs affected: BEH-101 … BEH-106; REQ-101 … REQ-115; AC-101 … AC-112 at unit/in-process level (AC-113 is the user's check).
- Implementation delta:
  - Step 0: remote links on disk (a `taskExecutions` entry with `nodeId`), loaded into the optional in-memory `remoteTaskExecutions` by the shared split; `delegatedFrom` in standalone `run_metadata.json`.
  - Steps 1–2: `src/remote-collaboration/` (switch, peers, published Agents, `PeerClient`, `PeerGateway`, receivers), REST `/rest/remote/*`, route class `REMOTE_PEER`, GraphQL settings, web Nodes → Remote Collaboration tab.
  - Step 3: `agent-collaboration/execution/remote/` (reference, port, refusal codes, `RemoteRunLinks`, `RemoteTaskActivation`); engine `sendToRemote` / `acceptFromRemote`; adapters' `commitSentToRemote`.
  - Steps 4–5: the standalone root's back-link, remote endpoints, `acceptRemoteMessage` (message and work packet), host idle shutdown; `delegate_task` `node`; in-process A↔B test.
  - Step 6: Team and Org roots wired to `RemoteRunLinks` (tree list, index, delivery, task adapter).
  - Step 7: docs (`remote_collaboration.md` and sections in three other module docs).
- Changed files or areas: about 93 server source files (29 new), 18 web files, 21 test files; see the handoff § Key Files Or Areas.
- Local validation and result: typecheck, full server unit suite, focused remote tests, full web suite, web guards, a real-HTTP two-server smoke and a rendered UI check. All passed (handoff § Checks Run).
- Next recipient or routing: code reviewer (Large / High).
- Remaining limitations or risks: the two-server E2E with a scripted runtime (AC-101 … AC-111) and AC-113 (the user's desktop + Docker check) are not run here; Team and Org remote delegation is covered by unit tests of their adapters, walkers and delivery, not by an end-to-end run; RSK-106 (at-most-once) as recorded in FU-002.

### IR-002 — CR-001: remote-endpoint messages no longer leave a gap in the root view stream

- Triggering role, report path, and round: code reviewer (`code_reviewer_905377eb52914beba173d7604d83e5a1`), `tickets/in-progress/cross-node-agent-communication/code-review-report.md`, CRR-001 (round 1, Fail).
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001. A message with a remote endpoint was published to the root's view stream, so it took the next change sequence, and the view projectors then returned `null` for it. Every web client treats a sequence gap as "reopen required", so the run view of a Team or Org delegator broke on every reply from the remote run, and other views broke on their next root event.
- Current authoritative result: the root does not publish a message with a remote endpoint to its view stream at all, so no sequence is taken. The projectors no longer drop sequenced events. The view snapshots still leave these messages out.
- Related solution revision IDs: SR-014 (unchanged)
- Related architecture-review revision IDs: ARCH-REV-002 (unchanged)
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the fix for CR-001.
- Approved behavior or requirement IDs affected: BEH-104 (presentation only; delivery, logs and message state unchanged); REQ-106, REQ-112.
- Implementation delta:
  - The decision is made where the event is published. `RootCommunicationAdapter.commitAppend` takes a required `publishToRootView`. The engine passes `true` from `deliver` (local) and `false` from `acceptFromRemote`. `commitSentToRemote` never publishes.
  - Standalone and Org adapters: `publish` only when `publishToRootView`; the receiver's presentation is unchanged.
  - Team: the append plan takes `publishToRootView`. It publishes `COMMUNICATION` only when the flag is true, and always publishes `MEMBER_INPUT` for a local receiver, so the reply's member input still reaches the team view.
  - Projectors: the event-level `isPublicMessage` checks are removed. `projectSequencedTeamRunEvent` and `agent-team-stream-handler.ts` are back to their base shape (no `null`). The snapshot filters stay.
  - `public-message-scope.ts` comment and `docs/modules/remote_collaboration.md` updated.
- Changed files or areas: `root-communication-adapter.ts`, `root-communication-engine.ts`, `standalone-root-communication-adapter.ts`, `agent-org-communication-adapter.ts`, `team-communication-adapter.ts`, `team-communication-message-append-plan.ts`, the three view projectors, `agent-team-stream-handler.ts`, `public-message-scope.ts`, the module doc. Tests: new `tests/unit/remote-collaboration/remote-message-view-sequence.test.ts`; `publishToRootView` added to the fixtures of `communication-commit-path.test.ts` and `team-communication-message-append-plan-current.test.ts`.
- Local validation and result:
  - The new test (Team, Agent and Org roots) fails on the IR-001 code (3 of 3) and passes on the fix (IMP-10).
  - Typecheck passes (IMP-09).
  - Full server unit suite at the fix commit passes: 760 files, 6,255 tests (IMP-11).
  - Commit `744641b35c`.
- Next recipient or routing: code reviewer (targeted delta review), then API/E2E.
- Remaining limitations or risks: the web clients are unchanged. A remote-endpoint message is visible in the local agent's own stream and in the logs, but not in the root's communication view, as in IR-001.

### IR-003 — Steps 3–6 brought in line with SR-015 / SR-016; CR-002

- Triggering role, report path, and round:
  - architecture reviewer (`architecture_reviewer_3f2fb8418663470e884249ccd42b9963`), `design-review-report.md`: ARCH-REV-004 (SR-015: AR-005 … AR-007) and ARCH-REV-006 (SR-016: AR-008, AR-009), both Pass, after the review was reopened at the user's direction;
  - code reviewer (`code_reviewer_905377eb52914beba173d7604d83e5a1`), `code-review-report.md` CRR-003: failure-origin review of API/E2E F-001 (API-REV-001, RC-03), finding CR-002.
- Triggering finding IDs: AR-005, AR-006, AR-007, AR-008, AR-009 (design); CR-002.
- Classification: the design findings were `Design Impact` resolved upstream (SR-015, SR-016); CR-002 is a `Local Fix`.
- Prior authoritative result: IR-002. `RemoteRunLinks` held the pair rule, the side (`delegating` / `receiving`), the Task chain, the existing-copy refusal, placement and activation, and `send` / `accept`, which handed the engine a transmit callback (`sendToRemote`). Task closure of a remote run counted `NO_AUTHORITY` as stopped. Adding a peer URL that answered with a page or 404 said "could not be reached".
- Current authoritative result: one owner per concern (design § Remote Messaging: Owners And Order, § Task Closure Of A Remote Run).
- Related solution revision IDs: SR-014 (kept), SR-015, SR-016
- Related architecture-review revision IDs: ARCH-REV-004, ARCH-REV-006
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001 (F-001)
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the existing implementation of steps 3–6 brought in line with the revised design, and CR-002.
- Approved behavior or requirement IDs affected: BEH-103, BEH-104, BEH-105 (ownership only; behavior unchanged except the closure result text, AR-007); BEH-101 / REQ-102 (CR-002 wording of the refusal).
- Implementation delta:
  - New `remote-endpoint.ts`: the `delegated_run` / `delegator` union, each kind with `allowsSender` / `allowsTarget`, `ownershipChain`, `transmission`, `refusals`, and its own rule (`closureFence`; `admitsWorkPacket`).
  - `remote-run-links.ts` reduced to membership (`endpointFor`, `inboundEndpoint`, `has`), `deliver` (returns the peer's name when accepted) and `peerName`; no root identity, no side.
  - New `remote-message-send.ts` (`RemoteMessageSend`): the outbound order and its refusals; the result names the node.
  - New `remote-delegation.ts` (`RemoteDelegation`): `delegationPlacement`, `delegate`, `planActivation`, `beginActivation`, `RemoteDelegationRefusedError` (moved from `RemoteRunLinks`).
  - Engine: `sendToRemote(input, transmit)` replaced by `prepareRemoteSend` and `commitSentToRemote(prepared)`; `acceptFromRemote` takes the endpoint and checks the sender is it.
  - Roots: the three deliveries keep `endpointFor` → `remoteSend.send` (under the sender's lease) and the inbound order with their own wake; the AR-003 checks in the three roots are removed; the three task adapters use `RemoteDelegation` and `endpoint.ownershipChain()`.
  - Lifecycle: `RemoteEndpointLookup` option and the AR-003 refusal after `resolveAssignment`; `remoteRunLinks` option for the resource scope.
  - Resource scope: closed `delegated_run` executions get `fenced_remote` (no cancel, no release); hosted runs keep the existing cancel-before-await release. `TaskExecutionStopResult` = `TaskExecutionReleaseResult | TaskExecutionRemoteFence`; the release logger logs the fence as info.
  - CR-002: `PeerClient.fetchServerInstanceId` — transport failure or timeout → `PEER_UNREACHABLE`; non-2xx, non-JSON body or JSON without `serverInstanceId` → `PEER_NOT_AUTOBYTEUS`.
  - Docs: `remote_collaboration.md` § In the roots; `standalone_agent_run_root.md` wording.
- Changed files or areas: see commit `31d46978ad` (26 source files, 3 new; 7 test files, 2 new; 2 docs).
- Local validation and result:
  - Typecheck passes (IMP-12); no unused locals in the changed files.
  - Focused tests: 88 passed (IMP-13), including the new shared `RemoteMessageSend` sequence test, the shared lifecycle refusal test, the `fenced_remote` test, the endpoint-kind tests, the routing test per root kind and the CR-002 cases (HTML 200, 404, body timeout).
  - Full server unit suite at `31d46978ad` passes: 762 files, 6,273 tests (IMP-14).
- Next recipient or routing: code reviewer (targeted delta covering SR-015 / SR-016 and CR-002), then API/E2E (RC-03 and the held RC-02, RC-04 … RC-19).
- Remaining limitations or risks: unchanged from IR-002 (RSK-106 / FU-002; Team and Org delegators are exercised end to end only by API/E2E).

### IR-004 — F-002: package validators accept remote message endpoints (SR-017)

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` ARCH-REV-007 (SR-017, Pass), from the code reviewer's failure-origin review CRR-005 (`code-review-report.md`) of API/E2E F-002 (API-REV-002, `api-e2e-execution-coverage-report.md`, `evidence/api-e2e/API-13-F002-*.log`).
- Triggering finding IDs: F-002 (AR-001 walker table lacked "Package-state validation").
- Classification: `Design Impact`, resolved upstream as SR-017; implemented here.
- Prior authoritative result: IR-003. `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` required both endpoints of every stored message to be tree agents (`index.requireAgent`). The stores (AR-001) compose delegator ↔ remote messages into the view, so a Team or Org delegator's package was dropped by the admission scan and the restore (AC-106 for Team and Org delegators).
- Current authoritative result: both validators check endpoints against `agentRunIdsOfTree(shape, tree)` (the store-owned set that composed the view; it includes the remote runs), keep the distinct-endpoints check, and require at least one endpoint to be an agent of the index. The index stays local-only.
- Related solution revision IDs: SR-017
- Related architecture-review revision IDs: ARCH-REV-007
- Related code-review revision IDs: CRR-004 (Pass of IR-003), CRR-005
- Related API/E2E revision IDs: API-REV-002 (F-002)
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the bounded F-002 fix.
- Approved behavior or requirement IDs affected: REQ-107, REQ-108, AC-106 (Team and Org delegators); AC-112 preserved (local packages validate as before, N-15).
- Implementation delta: `run-history/services/team-run-state-package-validator.ts`, `agent-org-execution/services/agent-org-state-package-validator.ts` (the two files SR-017 names). The migration `agent-org-history-first-message-summary-v1` imports the current Org validator; left unchanged as the review directs (FU-004).
- Changed files or areas: the two validators; `tests/unit/remote-collaboration/remote-link-walkers.test.ts` (Team and Org: admission scan + restore with a stored delegator ↔ remote message; refusals kept; N-15 set equality). Commit `7a5a9af077`.
- Local validation and result:
  - The guard test fails on the IR-003 validators (4 cases) and passes on the fix (IMP-15).
  - Typecheck and 910 tests of the validators' consumers (run history, Org, app-data migrations, remote collaboration, the Org integration test) pass (IMP-16).
  - Full server unit suite at `7a5a9af077` passes: 762 files, 6,279 tests (IMP-17).
- Next recipient or routing: code reviewer (targeted source review), then API/E2E (full two-server E2E plus API-21 / API-22).
- Remaining limitations or risks: unchanged (RSK-106 / FU-002). The code reviewer's readability note on `root-task-execution-lifecycle.ts` (move `RemoteEndpointLookup` below the imports) waits until that file is next changed; this round does not touch it.

### IR-005 — Integration with `origin/personal` `3b9014215e` (autobyteus-205, 1.5.8-beta.4)

- Triggering role, report path, and round: delivery engineer (`delivery_engineer_bf0429c6cd784c2abd8aa8e53a23ad23`), `delivery-revision-record.md` DR-002: `git merge origin/personal` conflicted in 5 server source files; delivery aborted and handed the resolution here.
- Triggering finding IDs: DR-002 merge conflicts.
- Classification: `Local Fix` (integration).
- Prior authoritative result: IR-004 on base `5de6a698b9` plus DR-001's merge `4f03cce09d` (one additive conflict in `server-settings-service.ts`, resolved by delivery: remote collaboration and update checks both kept).
- Current authoritative result: merged with `origin/personal` `3b9014215e`, which removes Skill Improvement (autobyteus-205: `src/skill-improvement/` deleted, `launchPurpose` removed from run metadata, a one-time data-removal migration) and bumps to `1.5.8-beta.4`. Merge commit `c59c6f7359`.
- Related solution revision IDs: SR-017 (unchanged)
- Related architecture-review revision IDs: ARCH-REV-007 (unchanged)
- Related code-review revision IDs: CRR-006 (Pass of IR-004)
- Related API/E2E revision IDs: API-REV-004 (latest)
- Related delivery revision IDs: DR-001, DR-002
- Why this implementation revision is recorded: the integration resolution, owned by implementation at delivery's request.
- Approved behavior or requirement IDs affected: none changed. `delegatedFrom` (BEH-106, N-10) and the remote-collaboration setting (REQ-101) kept; the base's removal of `launchPurpose` and Skill Improvement taken whole.
- Implementation delta (conflict resolution; each was the same pair, the base's removal beside this branch's addition):
  - `run-history/store/agent-run-metadata-types.ts`: `delegatedFrom?` kept, `launchPurpose?` dropped.
  - `run-history/store/agent-run-metadata-store.ts` `normalizeMetadata`: the `delegatedFrom: parseDelegatedFrom(...)` spread kept, the `launchPurpose` spread dropped.
  - `agent-execution/services/agent-run-provisioning-service.ts` (prepared-run metadata): the `delegatedFrom` spread kept, `launchPurpose` dropped.
  - `agent-execution/services/agent-run-service.ts`: the `DelegatedFrom` import and `CreateAgentRunInput.delegatedFrom` kept, `AgentRunLaunchPurpose` / `launchPurpose` dropped.
  - `services/server-settings-service.ts`: `REMOTE_COLLABORATION_CAPABILITY_SETTING_KEY` kept, the Skill Improvement import and setting dropped.
- Checks delivery asked for:
  - (a) No `launchPurpose`, `AgentRunLaunchPurpose` or Skill Improvement reference remains from this branch, in source, tests or auto-merged files. The remaining mentions belong to the base itself: `remove-skill-improvement-data-migration.ts`, its registry entry, its fixtures, the retired-setting policy entry (`ENABLE_SKILL_IMPROVEMENT`) and older migrations that name the old folders.
  - (b) The base's `remove-skill-improvement-data-migration.ts` reads `run_metadata.json` as raw JSON only to recognise helper runs (`agentDefinitionId` of the improver, or `launchPurpose: "server_helper"`), skips delegated copies' own files, and never writes `run_metadata.json`. It writes only `run_history_index.json` (dropping helper rows) and deletes helper-run folders. A run a peer delegated here is neither, so its folder, metadata, history row and `delegatedFrom` are untouched. New test `tests/unit/remote-collaboration/delegated-run-metadata-across-migrations.test.ts` runs the real migration over such a run and checks the metadata and the index byte for byte and the store's `delegatedFrom` read (IMP-20, commit `300bf4c09a`).
  - (c) `pnpm install` + prebuild + typecheck (IMP-18); the remote-focused set (IMP-13/15) plus run metadata, catalog and every app-data migration test (IMP-19); the full server and web suites (IMP-21, IMP-22).
- Changed files or areas: the 5 resolved files (merge `c59c6f7359`); one new test (`300bf4c09a`).
- Local validation and result (handoff's Checks Run, IMP-18 … IMP-22):
  - Typecheck passes; the focused set passes (72 files, 550 tests); the migration-interaction test passes.
  - Full server suite: 6,391 passed, 1 failed (`native-compaction-terminal-drain.test.ts`, an extra `failed` status under load); it passes alone 6 of 6 and checks code this branch does not touch.
  - Full web suite: 4,624 passed, 4 failed in 3 files, all `Test timed out in 5000ms` under load (voice-input extension, managed extension service, Org collaboration messages); the 3 files pass alone (8 of 8); this branch changes none of those areas.
  - FU-006 (`team-member-run-view-projection-service.import.test.ts`) did not fail in this run.
- Next recipient or routing: code reviewer (the merge, and DR-001's merge `4f03cce09d` as delivery asks), then API/E2E as the reviewers decide (the two-server E2E needs `pnpm -C autobyteus-server-ts build` first), then delivery.
- Remaining limitations or risks: the known pre-existing failure `team-member-run-view-projection-service.import.test.ts` (5 s cold-import timeout under load; also on the base, FU-006) may appear in the full suite.
