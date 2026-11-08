# Handoff — Architecture Design Complete (round 1) — small-follow-ups-batch-426

- Package: `small-follow-ups-batch-426` (Project Task `autobyteus-426`, project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- From: Solution Designer (`solution_designer_46519d6c265f4b23825027f460f14c1b`), 2026-11-07
- Classification: `Architecture Design Complete`, round 1; `task_size = Medium`, `architectural_risk = High`
- Route (handoff rules): Large or High → `/software_engineering_team/architecture_reviewer`
- Current solution revision: `SR-003`

## Original request and goals

Task autobyteus-426 (from `/project_task_manager`, at the user's word 2026-11-07): one batch of 18 small follow-ups from 277, 407, 415, 403 and 395. The team orders and groups them and may drop an item with evidence. Constraints: no new Android permission without the user's approval; no change to stored data; existing paired phones and saved nodes keep working; tests on isolated nodes; DESIGN.md and TESTING.md; the overlap with autobyteus-416 (HTML preview, WebView) is resolved by the teams at merge; release only on the user's word. Done when each item is done or dropped with evidence, tested, and finalized on `personal` (rounds allowed, each merged and verified).

## This round

- **Round 1 (this package):** items 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18 → REQ-001…003, 005…008, 010…014, 016…018; design D-01…D-18 (no D-04, D-09, D-15).
- **Dropped:** item 4 (DEC-001: the path no longer exists since 395, E-04); item 15 (DEC-011: DESIGN.md rule 9; the user left the decision to the Solution Designer: "i trust your judgement").
- **Round 2 (later):** item 9 (a new server read for delegated rows' live states).

## Approval basis

- Requirements: approved by the Solution Designer within the direction, the user informed in its conversation (2026-11-07); DEC-011 at the user's word.
- Supplement: Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (design commit `0341b3af`), user-approved 2026-11-07, for REQ-016.
- Design approval by the user: not required.

## Why High

Item 7 relaxes the Android WebView's navigation containment (`TrustedNavigationPolicy`) for `blob:` subframes of the open node's origin, next to the `AutoByteusShell` bridge; it must keep autobyteus-417's preview isolation (AC-007) and overlaps the open security Task autobyteus-416. Item 2 changes when the phone drops a credential. Everything else is bounded (no persisted data, no migration, no new route/type; additive deltas: address kind `public`, error code `WORKSPACE_PATH_REFUSED`, one log line).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`
- Branch: `codex/small-follow-ups-batch-426`
- Base: `origin/personal` at `6225a734a3`; finalization target `origin/personal` (RELEASE.md)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/`
- No source changes yet; the ticket documents are in the worktree, not yet committed (the implementation engineer commits them with its work).

## Documents

- `requirements-doc.md`, `investigation-notes.md` (E-01…E-18, A-01…A-06), `design-spec.md`, `solution-revision-record.md` (SR-001…SR-003), `follow-ups.md` (FU-001), `product-design-request.md`; the Product spec above.

## Open risks and uncertainty

- R-01: AR-14's cause is read, not reproduced (no `node_modules` in the worktree); implementation reproduces first; a re-check that never ends is a Design Impact.
- U-01: programmatic copy in the Android WebView on an `http://` node is unmeasured; the design's selectable fallback always works.
- R-02: autobyteus-416 overlap on the WebView policy (teams resolve at merge).
- E-11: the 277 row's premise (proxy without an error handler) is contradicted; item 11 fixes the probes instead.

## Expected next action

Independent architecture review of round 1. On Pass, the reviewer hands to implementation per its rules; findings return to the Solution Designer.

## Route

- 2026-11-07: sent to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_d40b29b15ce84a0290edd732f58a7e5e`), rule "Large or High".

## Revision after ARCH-REV-001 (SR-004)

- AR-001 → D-02 `recordCheckOutcome` (one outcome per check); AC-003 alternate extended.
- AR-002 → D-16 explicit `REMOTE_WORDED_PATHS` + catalog spec for both locales.
- AR-003 → status lines in the requirements doc and investigation notes brought to SR-004.
- RR-01…RR-03 → design spec § Review Residual Notes.
- 2026-11-07: sent back to `/software_engineering_team/architecture_reviewer` for the focused re-review it proposed (D-02, D-16, status lines).

- 2026-11-07: ARCH-REV-002 Pass; the reviewer routed round 1 to implementation.

## Revision SR-005 (Design Impact from implementation, D-02)

- Premise corrected by measurement (`evidence/IMP-02-apollo-403-error-shape.txt`, investigation A-07): the refusal code reaches the phone check only if the history store keeps the thrown error. D-02 revised (design spec D-02, file map, DS-002); D-14 and D-13 updated; E-14 corrected (`checkedAt`).
- Implementation continues on the other items; D-02 waits for this re-review.
- 2026-11-07: sent to `/software_engineering_team/architecture_reviewer` for a focused re-review of D-02.

- 2026-11-07: ARCH-REV-003 Pass on SR-005; routed to implementation by the reviewer.

## Revision SR-006 (item 19 added)

- Task comment 2026-11-07 (from `/project_task_manager`): item 19, 427 FU-001. REQ-019/AC-019, E-19, D-19: the "file cannot be opened" status line moves out of `AgentEventMonitor.vue`'s `v-if="!readOnly"` composer block.
- The branch must first take in `origin/personal` (`933163361c` or later): 427 changed `AgentEventMonitor.vue` and the phone's navigation path.
- 2026-11-07: sent to `/software_engineering_team/architecture_reviewer` for review of D-19.

- 2026-11-07: ARCH-REV-004 Pass on SR-006 (D-19); routed to implementation by the reviewer (informational). Its repeated DS-002 note is already resolved: `design-spec.md:133` names `recordCheckOutcome`; no `recordPhoneAccessOff` remains in the design spec.

## Revision SR-008 (CRR-003: F-API-001, F-API-002)

- D-02: the phone check reads its own request (`checkCredential`, a `{ __typename }` GraphQL read with the phone credential); SR-005's history-store change removed; desktop history unchanged.
- D-03: a re-delivered share on recreation is not run again; native restore kept; AC-004a this round; AC-004b (run screens) in round 2 pending the user's DEC-013.
- After review: implementation → source review → API/E2E reruns MSP-13, MSP-18, API-08 and the full web suite (CRR-003).
- 2026-11-08: sent to `/software_engineering_team/architecture_reviewer`.

- 2026-11-08: ARCH-REV-005 Pass on SR-008; routed to implementation by the reviewer.
