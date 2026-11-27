# IMP-005 — AC-004 and AC-001 (desktop): base vs this branch

- Date: 2026-11-27. Probe: `autobyteus-web/tests/e2e/send-delivery-probe.mjs --cases SDD-13,SDD-07,SDD-12,SDD-09,SDD-14`.
  It uses its own temp stack: the worktree's server `dist/app.js` (built from this branch) on a temp data root, the scripted
  Antigravity CLI, `nuxt dev` and headless Chrome. Every page socket goes through the probe wire (the new ordered wire).
- **Base run:** the base's (`80420a8bf6`) versions of the changed web production files were swapped in for the run and then
  restored, the same file list as IMP-001 (`git status` clean after). The server is the same in both runs; this ticket's
  server change is only D-D2.
- Excerpts, sanitized (no wire log): `IMP-005-sdd-old-cases.json` and `IMP-005-sdd-new-cases.json`. In both runs the
  frontend and backend were stopped, the data root was removed, and there were 0 browser errors.

| Case | What it checks | Base (`80420a8bf6`) | This branch |
| --- | --- | --- | --- |
| SDD-13 (agent, new control) | Path down 15 s, no send: the status stays the one before the loss; Send stays enabled for a typed draft | **Fail**: Idle → **Initializing at 3.4 s**; Send disabled at 3.4 s | **Pass**: Idle throughout; Send enabled |
| SDD-07 (agent) | Path down, send: text (a) after 10 s, the text back, the status the one before the loss, Send enabled after the notice | **Fail**: the status Initializing; Send **disabled** after the notice | **Pass**: Idle; notice after 10.04 s; Send enabled |
| SDD-12 (team) | Path down 15 s, no send: as SDD-13 | **Fail**: Idle → **Initializing at 3.8 s**; Send disabled at 3.8 s | **Pass**: Idle throughout; Send enabled |
| SDD-09 (team) | Path down, send: text (a) after 10 s; the status the one before the loss throughout; Send enabled right after the loss and after the notice | **Fail**: Initializing from 0.2 s; Send **disabled** after the notice | **Pass**: Idle throughout; notice after 10.05 s; Send enabled before and after |
| SDD-14 (team, AC-001) | Another window's message, and the wire withholds the frame before the idle status: a real gap with the Team finished. The page recovers by itself within one attempt (≤ 3 s), shows Idle and the message, shows no notice, and a send right after goes on the new stream | **Fail**: no replacement Team stream (timed out); the view waits for a reselect | **Pass**: `TURN_COMPLETED` (seq 34) withheld; gap seen; **replacement snapshot 45–54 ms after the gap** (two runs), 0 failed attempts; Idle, the message shown, no notice; the next send on the replacement link and answered |

Run on 2026-11-27. The first run of the new code failed SDD-12, SDD-13 and SDD-09 only on the probe's own Send reading:
it read Send with an empty box, which disables Send whatever the stream does. The probe now types a draft before it reads
Send. The rerun above is the result.
