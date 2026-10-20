# Solution Revision Record — `cross-node-agent-communication`

The SR-001 and SR-002 entries are carried from `history-sr-002/solution-revision-record.md` unchanged in substance. Their artifacts are in `history-sr-002/`.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline from the user conversation 2026-09-30 → 2026-10-01 | N/A | N/A | Draft | Old BEH-001…007, REQ-001…016, AC-001…013, SCN-001…009, DEC-001…006 | Draft presented; Product brainstorming requested |
| SR-002 | Evidence | Rebase on `origin/personal` `b0b077b02` (2026-10-01) | N/A | Draft | Draft | Old BEH-003, BEH-008, DEC-006, DEC-007, OPT-001 | Evidence refreshed; Task parked 2026-10-09 |
| SR-003 | Requirements | Task unparked 2026-10-19; rewrite on the collaboration model around the first slice; slice plan | N/A | Draft (SR-002) | Ready for Approval | New BEH-101…107, REQ-101…115, AC-101…113, SCN-101…109, DEC-101…110, ASM-101…104; `slice-plan.md` | Presented to the user for DEC-101/102/103 and approval |
| SR-004 | Requirements | The user's approval, 2026-10-19 | N/A | Ready for Approval | Approved | DEC-101/102/103 → (a) as recommended; slice 1 Task text: architecture first, with the user | Approved; slice 1 proposed to `/project_task_manager` |

## Revision Entries

### SR-001 — Initial baseline (2026-10-01)

See `history-sr-002/solution-revision-record.md` § SR-001.

### SR-002 — Evidence refresh after rebase (2026-10-01)

See `history-sr-002/solution-revision-record.md` § SR-002.

### SR-003 — Rewrite on the collaboration model; slice 1 and the slice plan (2026-10-19)

- Phase and classification: Requirements / `Refinement` (rewrite of a never-approved draft on a changed foundation)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the parent Task from `/project_task_manager`, 2026-10-19 (the user's decision to unpark; direction: start simple, security later, first slice text-only desktop ↔ Docker, slices one by one). Evidence: S-01 … S-15.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: Requirements `Draft` (SR-002, old IDs); no design.
- Current authoritative requirements/design status: Requirements `Ready for Approval` (new IDs, slice 1 specified, parent outlined); no design (slice 1's Task makes it).
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all old IDs are superseded. New: BEH-101…107, UC-101…105, REQ-101…115, AC-101…113, SCN-101…109, QR-101…105, ASM-101…104, DEC-101…110, RSK-101…105. Old DEC-007 is obsolete; the other old decisions are mapped in the requirements doc § Old Draft Decisions.
- Scenario-basis or scenario-validity changes: scope narrowed to slice 1 (text only, Agents only). SCN-108 is an explicit refusal edge; SCN-109 is an unsupported refusal path.
- Why this baseline or revision was recorded: the collaboration model replaced the basis of the old draft (collaborators removed; CM-5 … CM-9). The user asked for a first small slice and a plan of slices.
- Canonical sections changed: all sections of `requirements-doc.md` and `investigation-notes.md`, rewritten on the new base `69d7d4f3e6`.
- Supplemental artifacts added, changed or removed: added `slice-plan.md`; added `history-sr-002/` (the old draft, unchanged).
- Product design evidence or product decisions incorporated: none. DEC-103 asks whether the 2026-10-01 brainstorming is still wanted.
- Intended behavior changed: `Yes` (never approved before; rewritten).
- Approval impact, exact approved requirements baseline, who approved, and approval reference: not approved. It waits for the user's answers to DEC-101/102/103 and approval of `requirements-doc.md` + `slice-plan.md` at SR-003.
- Behavior-defining supplement versions and approval references: `slice-plan.md` SR-003, not approved.
- Affected design/review basis invalidated or rebuilt: N/A (no design).
- Post-design task-size/risk classification and rationale changes: N/A. Expected for slice 1: Large / High, because of a new inter-node contract, persistence of a new link kind, and changes to the lifecycle and routing of collaboration roots. It will be classified after its design.
- Applied handoff-rule outcome / result-file reference: none yet. This is a routine approval hold in the user conversation. After approval, slice 1 is proposed to `/project_task_manager` (see `handoff-result.md` once written).
- Downstream and architecture-review impact: none yet.
- Remaining gaps, assumptions or blocked decisions: DEC-101, DEC-102, DEC-103 (`Needs user`); ASM-101, ASM-102, ASM-104; RSK-104, RSK-105 for slice 1's architecture.
- Next action: the user answers and approves. Then record the approval here and in the requirements doc, and send the slice 1 proposal to the Project Task Manager.

### SR-004 — The user's approval of slice 1 and the slice plan (2026-10-19)

- Phase and classification: Requirements / `Refinement` (approval capture; no intended-behavior change)
- Triggering user feedback: the user, in the Solution Designer conversation, 2026-10-19:
  - "In general, yeah, text one, slice one text only remote delegations S2. Yeah, I think you had a good plan … You had a really good plan."
  - "you can send the suggested ticket to project task manager, then it can create those tickets. And then we start after that, so we start to work on text only."
  - "the main thing is that we should discuss about the architecture … the very first ticket is how do we achieve … the communication itself … we set up the main architecture, main frame."
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: Requirements `Ready for Approval` (SR-003); no design.
- Current authoritative requirements/design status: Requirements `Approved`; no design (slice 1's Task makes it).
- IDs affected: DEC-101, DEC-102, DEC-103 → Decided (a), as recommended; the user approved the plan as presented without answering them one by one. `slice-plan.md` § Slice 1 Task text: architecture first, with the user.
- Scenario-basis or scenario-validity changes: None.
- Why recorded: approval capture.
- Canonical sections changed: requirements-doc Document Status, Decisions (status column), Readiness Check; slice-plan status and slice 1 Task text.
- Supplemental artifacts added, changed or removed: `slice-plan.md` (status, slice 1 Task text); `handoff-result.md` added.
- Product design evidence or product decisions incorporated: DEC-103 (a): no Product brainstorming now; revisit for S3/S5.
- Intended behavior changed: `No`.
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved by the User, 2026-10-19 (quotes above). Baseline: `requirements-doc.md` with SR-003 content plus `slice-plan.md`. If the user changes DEC-101/102/103 during the slice 1 architecture discussion, that goes through Recovery with renewed approval.
- Behavior-defining supplement versions and approval references: `slice-plan.md` SR-004, approved by the User, 2026-10-19.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification: N/A (expected Large / High for slice 1).
- Applied handoff-rule outcome / result-file reference: see `handoff-result.md` (the slice 1 proposal to `/project_task_manager`).
- Downstream and architecture-review impact: slice 1's Task starts with an architecture discussion with the user.
- Remaining gaps, assumptions or blocked decisions: ASM-101, ASM-102, ASM-104; RSK-104, RSK-105 (slice 1 architecture).
- Next action: the Project Task Manager creates slice 1 as a part of the parent (and, if the user wants, S2 … S6 as planned parts), then dispatches slice 1 with the user's approval.

### SR-005 — Architecture discussion: tool shape and no version check (2026-10-19)

- Phase and classification: Requirements / `Requirement Gap` resolved with the user (found at the design reading gate: DESIGN.md rule 9 conflicts with REQ-114's version check), plus a tool-shape decision deferred to architecture.
- Triggering user feedback, 2026-10-19:
  - on the tool shape: "if we do not add this node parameter, then by default it's the same machine. If we add this node parameter, then it is going to the other machines … I like this design … It's like explicit."
  - on the version check: "we don't want to introduce … if people want to use our latest feature, of course, they must upgrade the node … the way the rule nine is used to make sure that we can keep our code clean."
- Prior status: Requirements `Approved` (SR-004). Current status: Requirements `Approved` (SR-005); design `Draft`.
- IDs affected:
  - REQ-114: the version check is removed; the single entry point is kept.
  - REQ-109: the "incompatible peer version" reason is removed.
  - AC-104, AC-111: the version parts are removed.
  - QR-104: removed.
  - ASM-101: settled.
  - DEC-111: added (optional `node` parameter on `delegate_task`).
- Intended behavior changed: `Yes` (small: no version refusal).
- Approval impact: approved by the User (quotes above). Baseline: `requirements-doc.md` at SR-005.
- Design impact: `design-spec.md` is written on this basis.
- Next action: write `design-spec.md` (Draft); discuss its open points with the user; then classify and route to architecture review.

### SR-006 — `node` on both tools (2026-10-19)

- Phase and classification: Requirements + Design / `Refinement` with the user
- Trigger: the user, 2026-10-19: "after delegate task … we will use send message to … how can we send the message to the remote node?"; "the agent run ID itself already can carry that information"; "why do i think with node parameter is better, because … send message to is consistent".
- Change: DEC-111 → `node` on both `delegate_task` and `send_message_to`. A run is named by `(node, run id)`; without `node`, it means this node. A remote run ID without `node` (or with the wrong node) is refused with guidance. Node-in-ID options were considered and rejected (per-node labels, two ID formats, the link is still needed). REQ-106 wording updated. Design: selector rule, DS-002/DS-003, interface map, file mapping, examples.
- Intended behavior changed: `Yes` (agent-facing tool shape); approved by the User in the same conversation.
- Next action: the user's view on design points 1–4; then classify and send to architecture review.

### SR-007 — Back to `node` on `delegate_task` only (2026-10-19)

- Phase and classification: Requirements + Design / `Refinement` with the user (reverts the SR-006 tool shape)
- Trigger: the user asked which shape is better from the LLM's perspective. The Solution Designer's answer: a follow-up is a plain copy of the returned run ID, so requiring a node label beside it adds a failure mode (lost pairing after long conversations or compaction) without adding information. The node is still shown in results and headers. The user, 2026-10-19: "I agree with you."
- Change: DEC-111 → (b). `node` stays on `delegate_task` only; `send_message_to` keeps its parameters; the root's index routes linked run IDs. REQ-106 wording restored. Design: selector rule, BEH-104 row, DS-002/DS-003, interface tables, file mapping, examples.
- Intended behavior changed: `Yes` (agent-facing tool shape); approved by the User.
- Next action: the user's view on design points 1–4; then classify and send to architecture review.

### SR-008 — Contract and on-disk data model first (2026-10-19)

- Phase and classification: Design / `Refinement` at the user's direction: "that [contract] one should be updated first … the data model on disk, we have to design that first … then the upper code is easier."
- Change:
  - `design-spec.md` § On-Disk Data Model (new authority section; replaces the persisted-data section): exact files and JSON on both nodes; the separate `remoteTaskExecutions` array; the `remoteTaskAgent` section (not a reuse of `taskAgent`); Task records unchanged; one log line per node; a lifecycle table; the migration checklist.
  - `autobyteus-server-ts/docs/design/collaboration_model.md` drafted in the branch: vocabulary, CM-10 … CM-12, § 3 remote storage, § 4 Cross-Node, § 5 status rows.
  - Change sequence step 0.
  - Evidence A-13.
- Intended behavior changed: `No`.
- Next action: the user reviews the contract and data model; then classify and send to architecture review.

### SR-009 — The link carries the node (2026-10-19)

- Phase and classification: Design / `Refinement` with the user. The user's intuition: "the collaboration tree should include node itself … every node is almost independent."
- Change:
  - The remote link is the existing `taskExecutions` entry with an optional `nodeId` (absent means this node). It replaces the separate `remoteTaskExecutions` list.
  - The back-link is the existing `taskAgent` section with an optional `coordinatingNodeId`. It replaces the separate `remoteTaskAgent` section.
  - Readers load links and back-links into explicit local/remote kinds, so every walker handles remote runs explicitly (the compiler checks this). A separate list would have left code that must see remote runs (Task closure, the S3 run tree) silently blind.
  - A run with a remote coordinator is the host of its own standalone root on its node and is listed as a top-level run.
  - `RemoteRunReference` uses `nodeId`.
- Files: `design-spec.md` (data model items 4 and 7, picture, principles, lifecycle table, spines, mapping, examples, tradeoffs); `collaboration_model.md` § 3.
- Intended behavior changed: `No`.
- Approval: the user, 2026-10-19: "I think it's kind of quite clean."

### SR-010 — Rebase on autobyteus-197; back-link decision open (2026-10-20)

- Phase and classification: Evidence + Design / `Refinement`.
- Trigger: the Project Task Manager reported autobyteus-197 done (2026-10-20) and asked for the worktree to be updated before any code. The skill package was updated (`follow-ups.md`, `handoff.md`).
- Change:
  - Worktree fast-forwarded to `5de6a698b9`; the contract edit was re-applied cleanly (A-14).
  - Design: the remote link loads as its own kind, `RemoteTaskAgentExecution`, because `TaskAgentExecution.source` is now required. The back-link (item 7) is written as open decision DEC-112: (a) `delegatedFrom` (recommended) or (b) `taskAgent` + `coordinatingNodeId`; `origin` is gone from both.
  - Added § Legacy Removal Policy.
  - `follow-ups.md` created with FU-001 (sent, done as autobyteus-197).
- Intended behavior changed: `No`.
- Next action: the user answers DEC-112 and design points 2–4. Then classify and hand off to architecture review.

### SR-011 — Back-link `delegatedFrom`; design complete (2026-10-20)

- Phase and classification: Design / `Refinement` → `Architecture Design Complete`.
- Trigger: the user, 2026-10-20: "Cool, I agree. Yeah, it looks great … from the data model perspective, it looks intuitive" (DEC-112 = `delegatedFrom`, after the symmetric picture: A's link names node B and its run; B's `delegatedFrom` names node A and the delegating run).
- Change:
  - Design § On-Disk Data Model item 7: `delegatedFrom {nodeId, coordinatingRun, delegatorAgentRunId}` on B's standalone run file; the `taskAgent` option is recorded as rejected.
  - Contract `collaboration_model.md` § 3 updated to match.
  - Points 2–4 decided by the Solution Designer as proposed (user informed).
  - Classification: `Large` / `High`.
  - Design status `Ready`.
- Intended behavior changed: `No`.
- Applied handoff-rule outcome: see `handoff-architecture-review.md`.
- Next action: architecture review.

### SR-012 — Naming review (2026-10-20)

- Phase and classification: Design / `Refinement` (naming only) with the user.
- Trigger: the user: "why don't you use /rest/peers … or /remote/ instead of cross-node in the url"; "what is the RootRemoteLinks?"; "please still use Remote, remote makes me feel it's from remote"; "PeerNode or RemoteNode?" → `PeerNode` ("Good … continue").
- Change: naming rule (peer = the other node, remote = what lives on a peer, the feature = remote collaboration, no "cross-node" in names).
  - `RootRemoteLinks` → `RemoteRunLinks`; `CrossNodeChannelPort` → `RemoteRunChannel`; `CrossNodeGateway` → `PeerGateway`.
  - `CrossNodeSettingsService` split into `PeerDirectory`, `PublishedAgentService` and `RemoteCollaborationCapability`.
  - `/rest/cross-node/*` → `/rest/remote/*`; route class `REMOTE_PEER`.
  - `ENABLE_CROSS_NODE` → `ENABLE_REMOTE_COLLABORATION`; `<data>/cross-node/` → `<data>/remote-collaboration/`; `src/cross-node/` → `src/remote-collaboration/`; module doc `remote_collaboration.md`.
  - GraphQL: `peerNodes`, `addPeerNode`, …; `coordinatingRoot` unified to `coordinatingRun`.
  - Contract § 4 retitled "Remote Delegated Runs".
- Intended behavior changed: `No`.
- Next action: premise checks (route policy, Docker host reachability, standalone restore on message), then a revision note to the architecture reviewer.

### SR-013 — Architecture review round 1 findings resolved (2026-10-20)

- Phase and classification: Design / `Design Impact` (ARCH-REV-001: AR-001 … AR-004, N-1 … N-5). Approved intent unchanged.
- Trigger: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` round 1 (Fail, Design Impact), reviewed commit `02933975c6`.
- Changes in `design-spec.md`:
  - **AR-001:** new § Remote Links In Memory. The shared compose/split owner (`task-execution-tree-split.ts`) puts `nodeId` links into the in-memory `remoteTaskExecutions`, never into `taskExecutions`, so every existing walker excludes them by construction. A walker-category table says where remote links are included (membership, delivery, stored message view, Task ownership chain), fenced (Task closure), refused (existing-copy assignment) or excluded (everything else). One guard test per root kind. The principles bullet "the compiler checks" is replaced.
  - **AR-002:** new § Remote Delivery In The Engine. `RootCommunicationEngine.sendToRemote` and `acceptFromRemote`, each with the checks that apply and those that don't. The sender's node assigns the message ID; the receiver's log only on accept, the sender's log only after the peer accepted (adapter `commitSentToRemote`). `RemoteRunLinks` never touches the adapter. Health assessment, ownership, spines DS-002/DS-003, file mapping and step 3 updated.
  - **AR-003:** the existing-copy form refuses a remote run with `REMOTE_SAVED_TASK_NOT_SUPPORTED` in each root's `assignToExistingCopy`, before any Task change. Interface row added.
  - **AR-004:** new § Contract Between Nodes. The envelope carries `{fromNodeId, toNodeId}`; the gateway order is mobile credential → `toNodeId` → switch → registered peer → dispatch; both request bodies and both answer shapes (with the responder `nodeId`) are written out, plus the HTTP status rules.
  - **N-1:** `requestId` dropped. **N-2:** the prepared-run path on B (TTL 24 h, cleanup); RSK-106 restated. **N-3:** mobile credentials refused on `/rest/remote/*`. **N-5:** the idempotency claim dropped; a duplicate is the existing conflict refusal.
  - Escalation trigger and RSK-108 restated.
- `investigation-notes.md`: N-4 (A-09 aligned with SR-009/SR-013); A-15 added.
- `slice-plan.md`: "versioned" wording removed (cosmetic, from the report).
- Intended behavior changed: `No`. The disk shape the user chose (SR-009) is unchanged.
- Next action: send round 2 to the architecture reviewer.

#### Review note — ARCH-REV-002 Pass (2026-10-20)

- The architecture reviewer passed SR-013 (commit `910f024ec5`) as ARCH-REV-002. Large / High is confirmed; AR-001 … AR-004 and N-1 … N-5 are resolved. Six non-blocking implementation notes (N-6 … N-11) are in `design-review-report.md`.
- The reviewer handed off to `/software_engineering_team/implementation_engineer`. Informational; there is no new SR round and no repeated handoff.

### SR-014 — Remote activation order follows `dispatchTaskCopy` (DI-1, 2026-10-20)

- Phase and classification: Design / `Design Impact` from implementation (`/software_engineering_team/implementation_engineer`, DI-1). Approved intent unchanged.
- Finding: `dispatchTaskCopy` (`root-task-dispatch.ts`) plans the copy's identity, then links the Task with that run ID, then runs prepare/commit/acceptSeed. The design had both "prepare calls startDelegatedRun" and "linkedAt before the request to B", which cannot both hold. Verified by reading `root-task-dispatch.ts` (2026-10-20).
- Decision: the engineer's recommended resolution.
  - The remote placement's `planActivation` calls `startDelegatedRun`, and B's ID becomes the copy's identity.
  - Then the Task link; then `RemoteTaskActivation`: prepare does nothing remote, commit writes the link with `nodeId`, acceptSeed sends the packet.
  - The lifecycle and dispatch are unchanged, and the contract is unchanged (B assigns the ID).
  - Rejected alternative: A assigns the ID, which would mean a contract change and an externally supplied identity on B.
- Consequences:
  - A refusal by B leaves nothing on A (matches AC-104 literally).
  - A failure after B prepared leaves a prepared run on B that expires after 24 h (RSK-106).
  - The peer call now runs before the root's task queue, not in it (it no longer holds the queue).
- Implementation details accepted within the design (the engineer records them in the handoff): (a) `RootCommunicationAdapter.assertDeliveryAllowed` takes run IDs; (b) on B, the stored message view counts `delegatedFrom.delegatorAgentRunId` as loaded; (c) on B, the first message creates the remote run's `collaboration/` package.
- Sections changed: data model item 5, lifecycle table, DS-001, ownership (`RemoteTaskActivation`), tradeoffs, classification rationale.
- Review impact: a local correction aligning the design with the existing dispatch, within the reviewed boundaries (ARCH-REV-002). No re-review requested; the code review checks it against SR-014.

### SR-015 — Clean ownership of remote messaging (ARCH-REV-003, 2026-10-20)

- Phase and classification: Design / `Design Impact` (ARCH-REV-003: AR-005 … AR-007; notes N-6 … N-11). The review was reopened after the round-2 Pass at the user's direction: "if the ownership is not clean and you found like a problem, you should definitely … improve it … architecture is extremely important … we will use this functionality a lot." Approved intent unchanged.
- Basis: design at SR-014 (`a3b0cf1028`; the review read SR-013 `910f024ec5`, and SR-014 changed only the DS-001 order). The implementation already exists (steps 0–7, code review CRR-002); it is reviewed against the code (`remote-run-links.ts` with `side`, the `sendToRemote` callback, the closure fence via NO_AUTHORITY).
- Changes in `design-spec.md`, new § Remote Messaging: Owners And Order (replaces § Remote Delivery In The Engine):
  - **AR-005:** the root's message delivery is the single governing owner of each node's half: outbound pair rule → `engine.prepareRemoteSend` (no state change) → `RemoteRunLinks.deliver` (channel only) → `engine.commitSentToRemote` (sender's log, no Task re-check); inbound link check → wake (N-8) → `engine.acceptFromRemote`. No callback.
  - **AR-006:** `RemoteEndpoint` union `delegated_run` (A) / `delegator` (B), each owning its pair rule, Task chain (`[{agentRunId}]` / `[]`, N-11) and kind rules; `RemoteRunLinks` is a shared core (membership, deliver) with no side branch; remote delegation (placement, planning, activation) moved to its own owner `RemoteDelegation`.
  - **AR-007:** new § Task Closure Of A Remote Run: an explicit `fenced_remote` result, no release invoked, a truthful message (replaces N-9); the hook for S3's stop on the peer.
  - **N-6:** `acceptRemoteWorkPacket` in the standalone root. **N-7:** the compose shortcut accounts for remote-only trees. **N-10:** the prepared-run metadata example; `delegatedFrom` kept at activation; round-trip test.
  - Spine inventory and spines DS-002/DS-003 now have one owner per node; ownership map, walker table, interface rows, file mapping, steps 3–4 and health assessment are updated.
- Follow-ups: FU-002 (reliable delivery: outbox plus idempotent inbox), recorded by the architecture reviewer with the user's agreement; sent when the ticket leaves the team.
- Coordination: steps 3–6 are on hold at the implementation engineer; API/E2E is asked to limit validation to steps 0–2.
- Intended behavior changed: `No`.
- Next action: round 3 to the architecture reviewer.

#### Review note — ARCH-REV-004 Pass (2026-10-20)

- The architecture reviewer passed SR-014 and SR-015 (commit `f1d7dd9337`) as ARCH-REV-004. Large / High; AR-005 … AR-007 are resolved; MP-004 (a prepared run left on B) is a residual risk only. The reviewer released steps 3–6 to the implementation engineer.
- Text corrections N-12 (Spine Narratives DS-002/DS-003/DS-005, the Spine Actors list) and N-13 (one ownership bullet for `RemoteDelegation`) were applied to `design-spec.md` the same day. They are editorial and change no decision.

### SR-016 — One owner for the remote send and the existing-copy refusal (ARCH-REV-005, 2026-10-20)

- Phase and classification: Design / `Design Impact` (ARCH-REV-005: AR-008, AR-009). The review was reopened after the round-4 Pass at the user's direction that remaining problems become findings and get fixed. Approved intent unchanged. The Solution Designer had proposed the same change to the user before this finding.
- Changes in `design-spec.md`:
  - **AR-008:**
    - The new shared owner `RemoteMessageSend` (`remote-message-send.ts`, one per root) runs the outbound sequence once: pair rule → `prepareRemoteSend` → `deliver` → `commitSentToRemote`. Each root's delivery keeps only the routing decision.
    - The inbound order stays per root only for its root-specific wake, using the shared link check and `acceptFromRemote`.
    - The existing-copy refusal is checked once in `RootTaskExecutionLifecycle.assignToExistingCopy`, after `resolveAssignment` (a read) and before `resolveExistingCopy`, through the port `RemoteEndpointLookup.isRemoteEndpoint`.
    - Tests: one shared sequence test, one shared lifecycle refusal test, one routing test per root kind.
    - Updated: the spine inventory, DS-002/DS-003, narratives, actors, ownership map, walker table, interface rows, file mapping and health assessment.
  - **AR-009:** the summaries are aligned (narratives DS-002/DS-003/DS-005, Spine Actors). Remote planning is stated once: root adapters delegate to `RemoteDelegation`, the only caller of `startDelegatedRun`. The DS-001 spine and the dependency rule are aligned.
- Coordination: the implementation engineer was told on 2026-10-20 that the outbound sequence and the existing-copy refusal each move into one shared owner, and that the rest continues.
- Intended behavior changed: `No`.
- Next action: round 5 to the architecture reviewer.

#### Review note — ARCH-REV-006 Pass (2026-10-20)

- The architecture reviewer passed SR-016 (commit `213a5d9668`) as ARCH-REV-006. Large / High; AR-001 … AR-009 are all resolved. The reviewer handed off to `/software_engineering_team/implementation_engineer`.
- N-14 (text): the DS-001 narrative now describes the SR-014 order (B asked in `planActivation`, before the Task link, outside the queue), and the `RemoteDelegation` ownership bullet now says only `dispatchTaskCopy` is unchanged. Applied the same day; editorial.

### SR-017 — Package validators accept remote message endpoints (CRR-005, 2026-10-20)

- Phase and classification: Design / `Design Impact` from the code reviewer's failure-origin review of API/E2E F-002 (CRR-005, API-REV-002, code `31d46978ad`). Approved intent unchanged; this protects REQ-107/REQ-108 and AC-106 for Team and Org delegators.
- Finding: by AR-001, the Team and Org stores compose delegator ↔ remote messages into the stored view. `validateTeamRunStatePackage` and `validateAgentOrgStatePackage` still require both endpoints to be tree agents (`index.requireAgent`), so the package is dropped by the admission scan and the state loaders. The AR-001 walker table lacked a row for this. Verified by reading (A-16); reproduced by API/E2E (`API-13-F002-*.log`).
- Decision:
  - A walker-table row "Package-state validation: Include as message endpoints".
  - Both validators check endpoints against the store-owned `agentRunIdsOfTree` (the set that composed the view), keep the distinct-endpoints check, and add "at least one endpoint is a local agent". The index stays local-only.
  - The single-reader rule is restated: `agentRunIdsOfTree` is the one owner of the message-endpoint set.
  - The guard test per root kind is extended (a stored delegator ↔ remote message passes admission and restore).
  - The escalation trigger is extended.
  - The code change is bounded to the two validators.
- Sections changed: the walker table, the guard paragraph, the guard tests, the file mapping and the escalation trigger. Evidence A-16.
- Intended behavior changed: `No`.
- Route: a revised Large/High package → architecture review (handoff rule), then implementation, then the code reviewer's targeted source review, then the full two-server E2E plus API-21/API-22.

#### Review note — ARCH-REV-007 Pass (2026-10-20)

- The architecture reviewer passed SR-017 (commit `b9f630de6b`) as ARCH-REV-007. Large / High. It handed off to `/software_engineering_team/implementation_engineer`.
- Applied the same day (editorial, design-spec walker table):
  - N-16: the rule "consumers of the stored message view take endpoints from `agentRunIdsOfTree`, never the index", plus a row for the CR-001 exclusion in `public-message-scope.ts` (S3);
  - N-15: the guard-test assertion `agentRunIdsOfTree` = the index agent set for local-only trees.
- FU-004 (the reviewer's; pre-existing, not urgent: the migration `agent-org-history-first-message-summary-v1` imports the current Org validator) is in `follow-ups.md`. It is sent when the ticket leaves the team, together with FU-002 and FU-003.
