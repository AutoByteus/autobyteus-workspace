# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-554 (2026-11-19) | N/A | N/A | Requirements Approved; Design Ready | BEH-001…004, REQ-001…009, AC-001…007, DEC-001…007 | Architecture Design Complete, Large / High |
| SR-008 | Design (+ requirement wording) | ARCH-REV-003 `Fail` | AR-003…AR-006 | Design Ready; review Fail | Design Ready (consolidated) | REQ-007, AC-008, AC-011 (new), AC-012 (new), DEC-004/010/011 status | Architecture Design Complete, Large / High |
| SR-007 | Mixed | The founder approved the UI ("Approved", 2026-11-20); the final Product package | N/A | Ready for Approval | Requirements Approved; Design Ready | REQ-005, REQ-006, REQ-012; design DS-002 (SR-007 section) | Architecture Design Complete, Large / High |
| SR-006 | Mixed | The founder: merge autobyteus-555 into 554 ("the global memory is just like other semantic memory, it's just a folder"); round 5's Global tab | N/A | Ready for Approval (round 4) | Ready for Approval (final UI pending) | BEH-005, REQ-006, REQ-010…012, AC-009, AC-010, DEC-012…014 | Design revised; waiting for the final UI/UX package |
| SR-005 | Requirements | The founder after the round-2 review: the Memory page should follow the ownership hierarchy | N/A | REQ-005, REQ-007 Ready for Approval | REQ-006 rewritten; Ready for Approval (round 3 pending) | REQ-006, DEC-011; design DS-002 (adds a per-agent episodic run list across places) | Product Design round 3 requested |
| SR-004 | Mixed | The founder's round-1 review (via the Product UI/UX Designer) | N/A | REQ-005…008 Ready for Approval | REQ-005, REQ-007 revised; Ready for Approval (round 2 pending) | REQ-005, REQ-007, AC-005, AC-006, DEC-010 | Waiting for the final UI/UX package |
| SR-003 | Requirements | The founder, 2026-11-19: "you haven't even designed the UI … the product team to build UI is a better" | N/A | Requirements Approved; Design Ready; implementation started | REQ-005…008 Ready for Approval (UI pending Product Design); implementation stopped | REQ-005…008, AC-005…008 | Product Design Requested (New Request) |
| SR-002 | Mixed | ARCH-REV-001 `Fail` | AR-001, AR-002, N-2 | Design Ready; review Fail | Requirements Approved (SR-002); Design Ready | REQ-006, REQ-007, AC-006, AC-008 (new), DEC-008, DEC-009 | Architecture Design Complete, Large / High |

## Revision Entries

### SR-001 — Baseline

- Phase: `Initial Baseline` (requirements + design)
- Trigger: Project Task autobyteus-554 (the founder's request of 2026-11-19, read by the PM)
- Approval: Solution Designer within the direction; user informed in the Solution Designer's conversation on 2026-11-19 (DEC-001…007)
- Classification: `task_size=Large`, `architectural_risk=High`
- Next action: architecture review

### SR-002 — Internal agents hidden in the tab; links not opened (ARCH-REV-001)

- Classification: `Requirement Gap` (AR-001: the new tab applies the existing autobyteus-308 internal-agent rule; REQ-006, AC-008) and `Design Impact` (AR-002: link rows listed but not openable, Option A; REQ-007, AC-006); N-2 comment.
- Approval: Solution Designer within the direction (an existing rule applied; a privacy-tightening detail); user informed 2026-11-19.
- Classification: Large / High (unchanged).
- Next action: architecture re-review.
- ARCH-REV-002 (informational `Pass` on SR-002): AR-001 and AR-002 resolved; package delivered to `/implementation_engineer`. Implementation note N-4: the listing skips non-regular, non-link entries (FIFOs, sockets), so `kind: "file"` always means a regular file safe to open.

### SR-003 — The Memory page UI goes to the Product Team (Requirement Gap)

- Classification: `Requirement Gap`. The visible Memory page UI (REQ-005…008) was never designed or confirmed by the user, so the SR-001/SR-002 approval of those REQs no longer counts for the UI. That approval was the Solution Designer's own, within the direction, and the founder now wants to see the UI first.
- Trigger: the founder in the Solution Designer's conversation, 2026-11-19: "you haven't even designed the UI, how will the UI look like"; then "ask the implementation engineer to stop for now … dedicate a task to the product team to work on the UI … the product team to build UI is a better".
- Actions:
  - the implementation engineer was told to stop all work on 554 for now and to report the commit it stopped at;
  - Product Design was requested from `/product_team` (team run `product_team_bdce5841d1544a25acc04701049bcba6`, coordinator `product_ui_ux_designer_739b35efd1914f8e961b2cb34b3b5f19`), purpose `New Request`, with the brief of REQ-004…008.
- Design impact: design-spec DS-002 and the web file list wait for the approved UI/UX specification. The server listing (AgentSemanticMemoryBrowser) is unchanged unless the UI needs more.
- Lesson: a visible UI is the user's product decision. It should have been brought to him (or to Product Design) before the requirements were approved.
- Next action: integrate the Product Team's approved UI/UX spec; renew the approval; revise the design; resume implementation.
- Implementation paused (2026-11-19, `/implementation_engineer`): nothing committed (branch at base `8430d9ef12`). The work in progress is uncommitted in the worktree and saved as `wip-uncommitted.patch`.
  - Done: the gate, the server field removal, `AgentSemanticMemoryBrowser` and its queries (untested), the core tests.
  - Not done: the remaining server tests, web steps 4 and 5, docs and checks.
  - See `implementation-progress.md`.

### SR-004 — Read-only Skills-style folder view (the founder's round-1 review)

- Classification: `Requirement Gap` (the user changed intended UI behavior) + `Design Impact`.
- Trigger: the Product UI/UX Designer relayed the founder's round-1 feedback in his words: "Since the semantic memory is simply just a folder … in the skill area … we implement it to view the content of a folder why don't you use that approach directly it's much simpler … then you just file explorer I can just click and look at any file I want"; and, after being told the Skills view is editable and follows links, "Yes go ahead with the reader only style view".
- Requirements:
  - REQ-005 is browsed as the Skills folder view;
  - REQ-007 is read-only, enforced by the node, with links not followed;
  - AC-005 and AC-006 are revised;
  - DEC-010 is new.
  - The requirements stay `Ready for Approval` until the founder approves the round-2 UI.
- Design: the design-spec "SR-004 Revision" section:
  - `SemanticMemoryWorkspace`;
  - a node-side read-only refusal;
  - a link-aware explorer option for that workspace;
  - a web `readOnly` explorer mode;
  - `semanticMemoryFiles` and `listFiles` removed; `semanticMemoryFolders` kept with `exists`.
- Constraints that affect what the founder sees were sent to the Product UI/UX Designer (2026-11-19): link rows, no edit affordances, the missing-folder state, not in the workspace lists, search scoped to the folder.
- Next action: integrate the final UI/UX package; record the founder's approval; architecture review; resume implementation from `wip-uncommitted.patch` minus `listFiles`.
- Round 2 (Product UI/UX Designer, 2026-11-19, commit `c050f518` in the design repository): the five engineering points are designed in. When the final package is integrated, note two changes:
  - an empty folder shows a message (like the missing folder), not the explorer's empty state, so REQ-005's wording follows the UI spec;
  - the layout stacks the list above the file below 768 px.
  The founder is reviewing on his phone.

### SR-005 — The Memory page follows the ownership hierarchy (the founder)

- Classification: `Requirement Gap` (the user changed the intended navigation).
- Trigger: the founder in the Solution Designer's conversation, 2026-11-19: "the navigation has some problem"; "why do I feel like the memory is hierarchy … agent team consists of agents … organization maybe consists of agent and agent team … for each agent, they have a lot of episodic memory"; then "Give your suggestion to the product UI designer to implement your suggestion".
- Requirements:
  - REQ-006 is rewritten: Browse mirrors Global (hidden until 555) ⊃ Orgs ⊃ Teams ⊃ Agents; one agent page with Episodic and Semantic tabs; the Semantic Memory tab is removed.
  - DEC-011 is new.
- Design impact, recorded in the design spec when round 3 is integrated:
  - a GraphQL query exposing one agent's runs across all places from the per-agent episodic catalog (autobyteus-493's `EpisodicCatalog` keeps the entries per definition in memory), for the Episodic tab;
  - the team and org pages reuse today's member and run data.
  - The feasibility of the cross-place run list is marked as unproven to the Product Team until the design confirms it.
- Product: the direction was sent to the Product UI/UX Designer for round 3 (2026-11-19), with the founder's words and the feasibility note.
- autobyteus-555 is informed by DEC-011: global, team and org shared facts become tabs or nodes in this tree.
- Next action: integrate round 3's final package; renew the approval; design revision; architecture review; resume implementation.
- Round 4 (Product UI/UX Designer, commit `91b561ce`, 2026-11-20): at the founder's word, Browse is back to the Agents / Agent Teams / Agent Orgs tabs with cards (no tree, no list filter; Global later as a tab, semantic memory only). The owner pages are as in round 3. REQ-006 was revised to match. The founder is reviewing.

### SR-006 — Global semantic memory merged in (autobyteus-555 → 554)

- Classification: `Requirement Gap` (scope change by the user) + `Design Impact`.
- Trigger:
  - the founder via the Product UI/UX Designer, 2026-11-20: "Here we don't have the global tab, let's add this global tab" (round 5);
  - "let's ask the solution designer to tell the project task manager to merge this 555 into this one, because the global memory is just like other semantic memory, it's just a folder."
  - The PM confirmed: 555 is CANCELLED (merged), and 554's title and board entry carry the combined scope.
- Requirements:
  - BEH-005 is new;
  - REQ-006 now has the Global tab;
  - REQ-010 (folder), REQ-011 (prompt section and access) and REQ-012 (Global tab) are new;
  - AC-009 and AC-010 are new;
  - DEC-012 (node-wide, `semantic-global/`), DEC-013 (exact prompt text) and DEC-014 (every agent reads and writes; privacy can wait, as the founder said earlier) are new.
  - 555's investigation is kept as `global-semantic-memory-investigation.md` (a supplement).
- Design: the design-spec "SR-006 Revision" section.
- 555's empty worktree and local branch were removed (no commits, never pushed).
- Next action:
  - send the folder location and states to the Product UI/UX Designer;
  - integrate the final package and record the founder's approval;
  - architecture review;
  - resume implementation.
- Product Team continuity (2026-11-20):
  - The first Product Team run (`product_team_bdce5841…`, designer `product_ui_ux_designer_739b35ef…`) was delegated while autobyteus-555 was the Solution Designer's latest Task, so it belonged to 555. It closed when 555 was cancelled after the merge, and reopening 555 did not reopen it.
  - A new Product Team delegation was made under 554: team `product_team_269e43bfff5d44a8a3c66d60d3cd3bb3`, designer `product_ui_ux_designer_5c6fc64581614dff914695ac0ddc7601`, purpose Result Correction (continuation). It continues the same Product ticket `semantic-memory-view-554` (round-5 commit `4556903b`) and carries SR-006's global-folder decisions.
  - The PM was told it can cancel 555 again.
  - Lesson: delegate long-running work only under the Task it serves. Before delegating, check which Task is the current one.

### SR-007 — The approved UI/UX spec integrated

- Trigger: the Product UI/UX Designer's Design Completed package (2026-11-20).
  - UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md`, VIS-001…VIS-019, runnable reference `personal@437bad9a` in `/Users/normy/autobyteus_org/autobyteus-web-design`.
  - The founder's approval, in his words: "the navigation follows the hierarchy seems to be good … when I click a global memory it's just a file Explorer which is good …"; on the Global line: "a global memory is shared by every agent and also every agent team and every agent organization"; "Approved".
- Verified:
  - the spec records the confirmation, the repository and revision, the ticket and final references;
  - its behavior matches REQ-004…008 and REQ-010…012;
  - its illustrative parts are marked.
- Requirements: `Approved`.
  - REQ-005: an empty folder shows a message, as the spec says.
  - REQ-006: the spec's owner navigation.
  - REQ-012: the approved Global line.
  - The spec is linked as the normative supplement.
- Design: the design-spec "SR-007 Revision" section adds the explorer's owner queries (agents, an agent's episodes from every place, group members, the semantic folder states) and the web split, and lists what is removed.
- Follow-up: FU-002 (F-2, relative Markdown links).
- The Product Team delegation (`product_team_269e43bf…`) is complete. As a task agent, the Solution Designer has no Task of its own to close for it.
- Classification: `Large` / `High`.
- Next action: architecture review; then implementation resumes from `wip-uncommitted.patch` (minus `listFiles`).

### SR-008 — Design consolidated; workspace listing/running, links and cost (ARCH-REV-003)

- AR-003: `design-spec.md` was rewritten as one current design; the overlays are folded in.
  - Decided:
    - spines DS-002 (owner browse) and DS-003 (the read-only workspace);
    - `AgentSemanticMemory` owns the folder states; `AgentSemanticMemoryBrowser` is dropped;
    - the `listAgentEpisodes` selector reuses `AgentWithMemorySelectorInput` (UNATTRIBUTED = today's standalone unattributed runs);
    - `TreeNode.isSymbolicLink` is a boolean;
    - `listAgentRunsWithMemory` is replaced (its callers are the web store and a doc only);
    - the `wip-uncommitted.patch` survivors are listed (Change Sequence step 1).
  - Requirements: AC-008 now says "Agents cards"; DEC-004 is superseded; DEC-010 and DEC-011 are Decided (UI approved).
- AR-004: `listVisibleWorkspaces` excludes kind `semantic_memory`. A new `WorkspaceManager.getOrCreateRunWorkspace` refuses read-only workspaces (`WORKSPACE_NOT_RUNNABLE`), and the run-bound resolvers use it. Every caller has a decision (design DS-003 table). REQ-007 is extended; AC-011 is new.
- AR-005:
  - (a) the watcher uses `followSymlinks: false` for this kind;
  - (b) `rg --files` does not follow links; a fallback honours the option;
  - (c) the upload citation is corrected (not a workspace write);
  - (d) the known caller list has a decision each.
- AR-006: local owners and episodes come from the `EpisodicCatalog`'s in-memory entries (a read API plus the process binding `getProcessEpisodicCatalog`, a recorded Principle 16 choice). Imported sources use one discovery per request, filtered and paged in memory. AC-012 measures it, with an escalation at 3 s on the founder's 474-run import.
- Intended behavior: unchanged except the AR-004 hardening, which is a privacy and safety detail within REQ-007 (Solution Designer within the direction).
- Classification: Large / High.
- ARCH-REV-004 (informational `Pass` on SR-008): AR-003…AR-006 resolved. Delivered to `/implementation_engineer`, which resumes from `wip-uncommitted.patch` per Change Sequence step 1. The implementation notes N-8…N-11 (filter text; the cards await the start pass; ACP and Antigravity resolve through `ClaudeWorkspaceResolver`; provisioning by path unaffected) are in the review report.
