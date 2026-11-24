# Codex waiver question — STABLE v1.5.14 (autobyteus-635), 2026-11-24

- Blocker from `/delivery_engineer`: the release smoke on `fab18b2068` exited 1, 10/13 PASS. Codex was 0/3, each "You've hit your usage limit … try again at Nov 27th, 2026 7:43 AM" (checked in `evidence/delivery/pretag-release-smoke-run1.log`). No other failure. No tag, commit or push made.
- Waiver authority: the Task's strict gate — Codex is not pre-waived; the founder's explicit verbatim words are required (asked by the Solution Designer in its own conversation).
- Facts:
  - Codex last passed the smoke on beta.9 (`13575c21f8`); beta.10 shipped with Codex waived.
  - Since beta.9, shared run paths every runtime uses changed: 53 (run-model selection, runtime switch) and 628 (conversation order, node-stamped times in streaming, run events, history). Claude, Grok, Antigravity and AutoByteus passed on this state.
  - One Codex file changed since beta.10: `codex-agent-runtime-strategy.ts` (the latest-version check gets the GitHub token reader, 627) — not the run path.
- Options: (a) waive Codex for stable v1.5.14; (b) wait for the reset (Nov 27, 7:43 AM) and rerun the smoke; (c) free Codex earlier (credits or another signed-in Codex account).
- Solution Designer's recommendation: (b), or (c) if Codex can be freed sooner; (a) only if stable cannot wait three days.
- Status: waiting for the founder's answer.
