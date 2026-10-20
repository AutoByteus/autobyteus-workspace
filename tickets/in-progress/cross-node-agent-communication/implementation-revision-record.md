# Implementation Revision Record — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-013, SR-014, ARCH-REV-002 | Implemented; handed to code review |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (round 1, Fail) | CR-001 | `Local Fix` | CRR-001, SR-014, ARCH-REV-002 | Fixed; back to code review for a targeted delta review |

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
