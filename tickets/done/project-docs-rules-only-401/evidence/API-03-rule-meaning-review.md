# API-03 — AC-001, AC-003, BEH-002: reading review of every rewritten rule

- Commit: `10a6967442` (document changes in `277660ed19`, `5b6ae4805b`); read with `git diff -U3 6324fb056d 5b6ae4805b -- RELEASE.md DESIGN.md`
- Date: 2026-11-06
- Look for: each row's verdict "same meaning"; the "rules added from" check

| Place | Before (substance) | After (substance) | Verdict |
| --- | --- | --- | --- |
| RELEASE.md, evidence file names (F-03 / E-3) | Ticket evidence is the usual source; a `:` log name broke the `v1.5.2-beta.1` Windows build at checkout; name with `-` | A `:` in a file name breaks a Windows checkout; ticket evidence is the usual source (logs named after a script); name with `-` | Same meaning; the reason is kept, the version dropped (DEC-001) |
| RELEASE.md, release smoke check (F-04 / E-4) | `v1.5.6-beta.2` shipped twice with new runs failing to start; no check before tagging started a run | No other check before tagging starts a run, so a change that stops new runs from starting would otherwise ship unnoticed | Same meaning; the story is gone, the reason stays |
| RELEASE.md, build-only release run (F-05 / E-5) | No build-only run before a tag (the user's decision, 2026-11-06); fresh-start build replaces it | The same, without the date; one-line pointer to the beta.2 record | Same meaning; pointer is one line (REQ-005) |
| RELEASE.md, watching the rollout (E-6 pointer) | Watch the four runs together; desktop can fail within minutes | The same, plus "(watching them one after another once let a partial release go unseen: <294 record>)" | Same meaning. The parenthesis is a one-clause reason plus pointer, not a story |
| RELEASE.md, recovery: an escape is fixed at the earliest stage (F-02) | …not at the stage that noticed it. "Fixing the stage that noticed it is how the per-tag build-only run came about (Case Studies)." | …not at the stage that noticed it: a check added where a problem was noticed catches it late and slowly. Example: the per-tag build-only run, removed on the user's decision (<beta.2 record>) | Same rule. The reason ("late and slowly") restates the moved story's own reason ("caught the problem at the last stage", "about 30 minutes per tag"); no new rule |
| DESIGN.md rule 12 example (F-06 / E-7) | Two releases with what each did, "(RELEASE.md, Case Studies)" | "Two releases failed this way: `v1.5.9-beta.14` and `v1.5.11-beta.11` (records: <294 record>, <20261102 record>)" | Rule 12 unchanged; the detail lives in the records (DEC-002) |

## Rules the removed Case Studies listed as "added from it"

| Rule named in the story | Still a standing rule in RELEASE.md | Where |
| --- | --- | --- |
| Watch the four runs together; report a release only when complete | Yes | Watching The Rollout: "A release is done only when all four have succeeded. Watch the four runs together…"; "report it as "tagged, workflows running", never as released" |
| Read this guide from `origin/personal` | Yes | L9: "Read the copy on `origin/personal` … not the one in the main checkout" |
| The tag stays; the fix ships as the next beta | Yes | Recovery: "Never move or delete a published tag"; Acting on it: "Fix the problem on `personal` and cut the next version (the next beta …)" |
| Build-only run before every tag (later removed) | Correctly absent; its replacement is the Build-only release run section | L168-172 |
| DESIGN.md rule 12 (from `v1.5.11-beta.11`) | Yes | DESIGN.md rule 12, unchanged |

- TESTING.md: unchanged by this ticket (REQ-004; F-07 kept on purpose).
- RESULT: PASS. No rule changed meaning; no rule was lost with the removed section.
