# Handoff: architecture review of autobyteus-581, round 3

- **Package:** `sandbox-provider-relay-581`, **SR-007**. It answers ARCH-REV-002 (Fail, narrow: AR-007). Classification: Architecture Design Complete, Large / High (unchanged).
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/sandbox-provider-relay`, branch `codex/sandbox-provider-relay`. Base `9f803aa84d`; origin/personal is 20 commits ahead (web-only, autobyteus-652, per round 2), and nothing in this design's scope changed.

## Changes since round 2

1. **The user revised DEC-111 to option B (2026-11-26):** "the nodes which are paired are able to communicate with each other". A sandbox is a **normal paired peer**.
   - Removed: the C11 gate route rule, the files check, the sandbox refusal wording, and DS-007. So AR-007's subject (the second message rule, the files rule) no longer exists.
   - The risk is accepted and recorded. FU-581-06 keeps the designed restriction as a later optional mode.
   - C11 is now only the lifecycle mark `role: "sandbox"`. It is written atomically by the pairing exchange from the invite (R-H), and read by the start sweep (R-A) and the Nodes page label.
2. **DEC-114 (your R-I):** the user decided any paired peer may use the relay. REQ-002 is unchanged.
3. **Non-blocking items from round 2:**
   - N-1: a C4 row for other unmarked statuses → `RELAY_PEER_FAILED`;
   - N-2: `routeForNativeProvider(provider)`;
   - R-G: the extended shared-folder refusal list;
   - R-H: the invite carries the role;
   - stale text fixed (P-1 to P-14; DEC-111 no longer pending; the investigation inventory; the requirements approval reference).

## Documents

- `requirements-doc.md` (Approved; DEC-111 revised, DEC-114)
- `design-spec.md` (SR-007; C11, C4, interface table)
- `solution-revision-record.md` (SR-006, SR-007)
- `follow-ups.md` (FU-581-06 added)
- Round 1–2 review report and record

## Route

2026-11-26: the handoff rules were applied. The rule for "Architecture Design Complete with task_size=Large or architectural_risk=High" matched, and the package was sent to `/architecture_reviewer` (delivered).
