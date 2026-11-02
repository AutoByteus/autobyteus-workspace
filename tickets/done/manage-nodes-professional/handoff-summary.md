# Handoff Summary — manage-nodes-professional (autobyteus-363)

## What Changed

The Manage Nodes tab now has the look the user approved in the Product review. Functions, requests, confirmations and copy meaning are unchanged; the change is presentation only.

- Two cards in one frame: "This node" and "Nodes". Each row lays out by the card's width: one line on wide cards, two tiers on medium ones, stacked at phone width.
- One collaboration capsule (icon and switch) in every row and in the add band. One notice shape (a tone icon, text and at most one button) for every line under a row.
- A server cell per remote row, with the update chip and the progress steps. Results, refusals (with Copy command) and blockers appear as a notice under the row.
- An offer summary ("7 Agents · 2 Agent Teams") that opens one framed panel under the row with the offer list and the connection details. It replaces `RemoteCollaborationOfferDisclosure`.
- Open, capsule and trash each line up in one column.

## Classification

- `task_size` `Medium`, `architectural_risk` `Low` (SR-002); direct route. Architecture, source and test-code reviews: `Not Applicable`.

## Validation

- API/E2E API-REV-002 Pass (95%) on `35e5853a22`, the merge of `84ea944ac5`. Every case was rerun because the merge changed shared foundations:
  - the Electron build;
  - the desktop journey EL-01…EL-10 on an isolated instance (every update state, tiers, 390 px en/zh-CN, keyboard and live regions, Open);
  - visual inspection against VIS-016/019/033/036/037;
  - a presentation-only diff;
  - the implementation's reruns: typecheck, guards, web suite (5020 tests), NP-01…12, ND-01…05.

## Integration

- Delivery merged `origin/personal` `38ee8877e2` (autobyteus-366, focused-agent Settings) at `7b62745afa`, with no conflicts.
- Rerun by impact: the base change is run settings only, with no shared foundation (its `package.json` adds a probe script). These passed:
  - the web typecheck (production 0; tests 99 in 43 files = baseline);
  - the guards;
  - `components/settings` specs (58 files / 362 tests).
- The probes and the desktop journey stay valid: nothing they drive changed.

## Docs

- `autobyteus-web/docs/settings.md` § Nodes: Manage Nodes (one list). See `docs-sync-report.md`.

## Verification

- Verified from the evidence, with no user check: DEC-904 makes the user's approval of the design the acceptance basis, and AC-901…905 are proven.

## Known Residuals

- The update states were driven with a test-owned starter (contract C2); the real starter was proven in 305.
- The visual comparison is by inspection, not a pixel diff.
- Environment note: the released `beta` Docker image predates autobyteus-358, so a mounted merged `dist` cannot start in it. Docker probes need a test-owned image of this branch until a release carries 358 (IMP-14/15).
- FU-001 (a peer-only row leaves the list on turn-off) is in `follow-ups.md` for the Solution Designer.

## Release

- None. The user did not ask, and RELEASE.md's default is no release. The change ships with the next release; a beta is available on request.
