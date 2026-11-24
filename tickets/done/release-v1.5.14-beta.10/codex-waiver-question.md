# Codex waiver question — v1.5.14-beta.10 (autobyteus-629), 2026-11-23

- Blocker from `/delivery_engineer`: the release smoke on `e5d878832b` exited 1, 10/13 PASS; Codex 0/3, each with "You've hit your usage limit … try again at Nov 27th, 2026 7:43 AM" (checked in `evidence/delivery/pretag-release-smoke-run1.log`). No other failure. No tag, commit or push made.
- Waiver authority: the standing rule covers Grok only; a Codex waiver needs the founder's explicit words (asked by the Solution Designer in its own conversation).
- Facts: no file since `v1.5.14-beta.9` has `codex` in its path (`git log --name-only v1.5.14-beta.9..HEAD`); autobyteus-53 changes shared run-model-selection code that every runtime's run start passes through, exercised live by Claude and Grok (6/6).
- Options: (a) waive Codex for beta.10 only; (b) wait for the reset (Nov 27, 7:43 AM); (c) free Codex earlier (credits / another signed-in account).
- Solution Designer's recommendation: (a), on the condition that stable `v1.5.14` is not cut without a passing Codex smoke.
- Founder's answer, 2026-11-24, verbatim, in the Solution Designer's conversation: "Waive codex please I'm confident it's working"
- Decision: Codex waived for v1.5.14-beta.10 only, on the founder's word; reason: Codex usage limit until Nov 27, 7:43 AM (quota refusal only), no Codex file changed since beta.9. The founder did not comment on the condition for stable; the Solution Designer's recommendation that stable v1.5.14 needs a passing Codex smoke stays a recommendation, not a recorded decision.
- Status: answered; relayed to `/delivery_engineer` 2026-11-24.
