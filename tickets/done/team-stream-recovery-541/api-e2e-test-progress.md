# API/E2E Test Progress

Ticket autobyteus-541 (team-stream-recovery-541), round 1, code head `9e508b3adf` (review docs `bfd6ab97b5`). Working root `/tmp/api541` (mine).

| Time (2026-11-27) | Case | Event | Note |
| --- | --- | --- | --- |
| 10:16 | — | Checkpoint | server build and `build:mobile-web` in the worktree: both exit 0 |
| 10:17 | API-001, API-002 | Started | whole web suite, then the server unit suite (background); machine load 46–92 from other work |
| 10:20 | API-012 | Checkpoint | SDD-15: assertion added (the member keeps its last status while recovering) |
| 10:21 | API-016 | Checkpoint | temporary SDD-91 (C-2) added to `send-delivery-probe.mjs`; the durable file backed up at `/tmp/api541/send-delivery-probe.durable.mjs` |
| 10:22 | API-015 | Completed: Pass (prototype half) | `wire-order-stress.mjs`: base wire 548 / 8000 out of order; branch wire 0 / 8000 |
| 10:39 | API-001, API-002 | Completed | web: 817 passed, 1 failed (the fixed-px font audit, NodeRow.vue line 39: on the base, from autobyteus-581; FU-001), 6369 tests passed; server unit: 1099 files passed, 5 skipped |
| 10:39 | API-010, 012, 014, 016 | Started | desktop probe, branch: SDD-13,SDD-07,SDD-12,SDD-09,SDD-14,SDD-15,SDD-91 |
| 10:43 | API-010, 012, 014, 016 | Completed | SDD-13, 07, 12, 09, 14, 15 Pass (SDD-14 recovered 46 ms after the gap, 0 failed attempts; SDD-15 send 10.03 s → text (a), notice at the 5th failure 15.07 s, member Idle throughout, recovered at 31 s); SDD-91 (C-2): its click-time assertion was wrong — the run-tree click joins the recovery and the chosen member (mate) is selected after the commit: C-2 does not occur on this path. Temporary case removed (file restored) |
| 10:43 | API-011, 013 | Started | phone: mobile-shell-probe --cases=MSP-119,MSP-120 |
| 10:45 | API-011, 013 | Completed: Pass | MSP-119 recovered 354 ms after the gap, 0 failed attempts; MSP-120 text (a) after 10.09 s, notice at the 5th failure (15.1 s), subtitle 'Idle · in Delivery Team' during, recovered at 31 s; 0 unknown errors; cleanup clean. MSP-120 assertion added (kept status) |
| 10:45 | API-015 | Started | SGD-06 ×10 at 150 ms |
| 10:56 | API-015 | Completed: Pass | SGD-06 ×10 at 150 ms: 10 Pass, 0 gap lines |
| 10:56 | API-014 | Started (base) | /tmp/api541/base at 80420a8bf6 with the branch's probe files: SDD-13,SDD-07,SDD-12,SDD-09,SDD-14 |
| 10:58 | API-014 | Completed: Pass (old vs new) | base: SDD-13, 07, 12, 09 and 14 Fail (Initializing at 3.3–3.9 s, Send disabled; SDD-07 Send disabled after the notice; SDD-14 no replacement stream); branch: all Pass |
| 11:01 | API-016b | Started | temporary SDD-92: C-2 by browser Back during a held hydration (durable file backed up at /tmp/api541/send-delivery-probe.durable2.mjs) |
| 11:03 | API-016b | Completed (harness artifact) | SDD-92 with browser Back: Back left the app (member selection adds no history entry): a blank page, no Team stream; not a product result |
| 11:05 | API-016b | Completed: Fail (C-2 reproduced) | SDD-92 with an in-app execution link (router push to the member's `/workspace` execution route, what a Project Task's link does) during the held hydration: mate focused at once, then lead again after the commit |
| 11:07 | API-016, API-016b | Completed | made durable: SDD-16 (the in-app link during a recovery: Fail, reproduces C-2) and SDD-17 (the run-tree reselect joins the recovery, the chosen member focused after the commit: Pass); 0 browser errors, cleanup clean |
| 11:08 | Round 1 | Completed: Fail | F-1 (C-2 reproduced); report and revision record written |
| 11:20 | Round 2 | Started | IR-002 376b4bb9c0 (CR-001); web suite and phone bundle first |
| 11:27 | Round 2 desktop | Started | SDD-13,07,12,09,14,15,93 (temporary residual),16,17; web suite done: 817 passed, the base font audit only |
| 11:30 | Round 2 desktop | Completed | SDD-13, 07, 12, 09, 14, 15, 16, 17 Pass (F-1 fixed); temporary SDD-93 (the held residual) reproduced: commit during the link's member load, link rejected (changed before selection commit, a console error), focus stays lead; probe restored |
| 11:30 | Round 2 phone | Started | MSP-119,MSP-120 |
| 11:32 | Round 2 phone | Completed: Pass | MSP-119 recovered 27 ms after the gap; MSP-120 notice at 15.0 s, send 10.05 s, Idle throughout, recovered at 31 s |
| 11:32 | Round 2 | Completed: Pass | documents updated (API-REV-002); FU-002 recorded |
