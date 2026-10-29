# Handoff — Architecture Design Complete, SR-016 (autobyteus-32, Model Router core), re-check after ARCH-REV-002

- Package: `delegated-runtime-model-routing`, Project Task **autobyteus-32** in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- From: Solution Designer (run `solution_designer_ab383b2a28394f6ba52dde1f7083f5bd`); To: Architecture Reviewer (run `architecture_reviewer_0fda00a36595499d940b4fb4017ee06f`); implementation of SR-015 is in progress with `/software_engineering_team/implementation_engineer` (told of this change)
- Date: 2026-10-26; Solution revision **SR-016** (SR-015 passed ARCH-REV-002; everything there holds except what is listed here)
- Classification: `Architecture Design Complete`, task_size **Large**, architectural_risk **High** (unchanged)
- **Done-when** (carry forward): "…covered by tests, and the user has verified it in the desktop app."

## The change (user decision, 2026-10-26)

Evidence A-33: only Codex and Claude append input to a running turn (`inputCapabilities.activeTurnAppend`); AutoByteus, Antigravity and Grok queue it for a later turn, so SR-015's "requests arriving during a turn are answered in that turn" held only on two runtimes. The user decided: **the Model Router agent handles one routing request at a time; a request is sent only when the agent is idle.**

- Requirements SR-016: REQ-004, AC-006, QR-002; supplement § 5 (busy router; failure includes the wait).
- Design SR-016: `RoutingRequestQueue` (`model-routing/services/routing-request-queue.ts`), owned and used only by `ModelRouter`: FIFO; releases the first request when `ModelRouterAgent` reports the run idle (run status events: previous turn ended and no other input running, e.g. the user talking to it); the 40 s budget starts when the request is created and includes the wait; a request whose budget ends while waiting is never sent and fails with "the Model Router was busy" (this node: inherited launch + note; peer: refusal). DS-003 chain/narrative, Ownership Map, File Mapping, A-21/A-33 rows, RSK-010, tradeoff.
- Also cleaned: the two old-wording rows from ARCH-REV-002's residual notes.

## Artifacts (absolute paths)

- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md (SR-016)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/launch-selection-order.md (SR-016)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md (A-33)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-spec.md (SR-016; previous `history/design-spec-sr015.md`)
- /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/solution-revision-record.md (SR-016)

## Next expected action

Re-check of the SR-016 delta; on Pass, the reviewer's route to the implementation engineer (already implementing SR-015).

## Route taken

- 2026-10-26: rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`; heads-up to `/software_engineering_team/implementation_engineer` so the in-progress work does not build the old busy-router behavior.
