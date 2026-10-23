# Solution Revision Record — remote-runs-in-tree (autobyteus-278)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-23 | Requirements | Baseline for the user's decisions |
| SR-002 | 2026-10-23 | Requirements | The user's decisions from the discussion; Product Design requested |
| SR-003 | 2026-10-23 | Requirements | Product package approved; requirements approved |
| SR-004 | 2026-10-23 | Design | Design complete; Large / High |
| SR-005 | 2026-10-23 | Design | ARCH-REV-001 (AR-401 … AR-403, N-401 … N-404) |
| SR-006 | 2026-10-23 | Design | CRR-003 F-005: the owner mark |
| SR-007 | 2026-10-23 | Design | FU-004 pulled in: one window owner for Retry |

## Revision Entries

### SR-001 — Requirements baseline (2026-10-23)

- Trigger: the PTM's delegation of autobyteus-278.
- Prior status: N/A. Current status: `Ready for Approval`.
- Open: DEC-801, DEC-802, DEC-804 (the user); then the Product Team.

### SR-002 — The user's decisions; Product Design requested (2026-10-23)

- The user's decisions:
  - DEC-801 (a): live output streams through this node's server;
  - DEC-802 (a): conversation only; files and terminal are FU-001;
  - DEC-806: a computer icon plus the node name on the remote row (his direction);
  - DEC-807: the first version is the normal path; failures only shown.
- REQ-804 and AC-804 are reduced to match.
- Open: DEC-804 (stop/terminate), for the UI review.
- Product Design requested from `/product_team` at the user's direction.

### SR-003 — Product package approved; requirements approved (2026-10-23)

- Trigger: Design Completed from the Product UI/UX Designer (`product_ui_ux_designer_47b42f1694e346c58988165bf7257699`). The UI/UX spec is `Approved` by the user, the Product ticket is closed, and the design repository is at `1cc5563`.
- Integrated:
  - REQ-801 gains "did the node answer" and Retry;
  - REQ-808 covers the opened view's offer (text-only composer, no ⚙/＋, panels on the other node, Activity/Team/Usage/Browser from the stream, local-only Delegated copies list);
  - DEC-804 (a), by the user's approval of the UI with Stop shown.
- Open for architecture: PA-805 (feasibility of the panels built from the streamed events), PA-808 (Team and Org delegators).
- Status: `Approved` (the user).
- No Product Task to close: the Solution Designer works on a delegated Task, so its delegation returned no Task ID.

### SR-004 — Design complete (2026-10-23)

- Design: [design-spec.md](design-spec.md). A remote delegated run is a child of its delegator's root.
  - A: the root view lists it; `RemoteRunObservation` holds a stream to B while the root has viewers and turns B's frames into the root's `agent_presentation` events; summaries come by request; commands are routed through `RemoteRunLinks`; member projections are fetched from B.
  - B: `RemoteRunViewProvider` answers only for runs the caller started, and attaches its stream across the root's lifecycle through a new directory listener.
  - Three request kinds and one stream kind between nodes; shared stream contract additions.
- Requirements clarification (no intended behavior change for the user): REQ-803 and AC-803. A user's message is recorded in the remote run's conversation on its node and shown on this node from there, not as a message-log line.
- PA-805 confirmed (the presentation messages carry tools, statuses, usage, file changes). PA-808 is covered: all three root kinds use the same owner.
- Classification: `Large` / `High`. Route: architecture review.

### SR-005 — ARCH-REV-001 resolved (2026-10-23)

- Trigger: ARCH-REV-001, Fail, Design Impact. Verified by reading `standalone_agent_run_root.md:16-17`, `standalone-agent-run-root.ts:375-385`, `standalone-root-message-delivery.ts:93,257,312`, `remote-team-run-starter.ts:87-94`, `remote-endpoint.ts:81`.
- AR-401: on B, a root-owned API per kind behind `RemoteRootDirectory` (`observePairedAgents`, `executeOwnerCommand` on the managers).
  - Standalone: the host's events through the root's presentation adapter, re-attached on `onHostReady`; `postToHost`, host interrupt, `stopRoot`.
  - Team: the publisher filtered to members, plus the directory listener; member commands; `terminateTeamRun`.
  - The Current-State Read and CM-11 are corrected.
- AR-402: frames and statuses only for the paired agents. Frames are `{agentRunId, message}`; A maps them by `agentRunId` to the stored link (mounted addresses) and drops unknown ones.
- AR-403: an end A didn't initiate runs one summary fetch, which sets the row. No reconnect.
- N-401: a first frame `{nodeId}`, which A checks. N-402: a unit test that only the DTO projector maps `remote_agent_presentation`. N-403: one shared `remoteChildOf` helper. N-404: the REQ-803 wording, told to the user.
- Classification unchanged: `Large` / `High`. Next: round 2 of the architecture review.
- SR-005 addendum: ARCH-REV-002 Pass (2026-10-23); the reviewer's round-2 report and revision record committed; implementation handoff delivered by the reviewer.

### SR-006 — The owner mark (CRR-003 F-005, 2026-10-23)

- Trigger: the code reviewer's failure-origin review CRR-003 of API-REV-001. F-005 is a Design Impact: the `remote_owner` metadata had no reader (RC-31 `ownerMarks: []`). The design had not traced the mark to its stored record and readers (design-examples Case 3).
- Design (DS-004a): the mark is a heading in the content, `From the owner of node "<name>":`, composed by `remoteOwnerUserMessage` (its one owner). The unread metadata is removed. A consumer table covers the agent, B's stored conversation and window, A's window, the title and the message logs.
- AC-803 names the heading. The intended behavior is unchanged: "marked as from alpha's owner".
- Local Fixes confirmed by CRR-003, owned by implementation and with no design change:
  - F-002: B sends `{nodeId}` before any frame;
  - F-003: one shared owner of the remote view affordances for the standalone, Team and Org views;
  - F-004: end observations on stop, terminate or delete by any path, but not on idle shutdown (DS-006 already says so).
- Classification unchanged: `Large` / `High`. Route: architecture review of the delta, then implementation with F-002 … F-005.
- SR-006 addendum: ARCH-REV-003 Pass (2026-10-23). N-405 (the window's local echo as a consumer, replaced by message_id / dedupe_key) and N-406 (the title row cited) added to the consumer table. The reviewer's files committed.

### SR-007 — One window owner for Retry (FU-004, 2026-10-23)

- Trigger: the code reviewer (after CRR-004) reports that the user pulled FU-004 into this ticket: "Okay, I agree with you. Go ahead." The rule "refresh on the stream if ready; re-read the selected agent, else the first" was written three times, once per family (design-examples Case 6; the same drift as CRR-003 F-003).
- Design: § Window Retry Rule. `remoteRunsStore.retry` owns the rule; each family registers an adapter with only its stream refresh, its selected agent and its member read; the three copies are removed.
- Intended behavior changed: No (REQ-804 as is). Web only.
- Classification unchanged: `Large` / `High`. Route: architecture review of the delta, then implementation. API/E2E holds its full rerun until the code reviewer's Targeted Delta Review passes.
