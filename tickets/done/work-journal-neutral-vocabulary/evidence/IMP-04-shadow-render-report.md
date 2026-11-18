# IMP-04 Shadow render report (REQ-013, AC-013)

- Check: shadow render of the neutral vocabulary on an isolated copy of the node's memory folder, then the memory-search evaluation (known-answer questions) before and after.
- Commit tested: `32cb0034e4` code (renderer revision 2); "before" = base commit `987af589f0` built to a separate dist (renderer revision 1).
- Environment: macOS (Darwin 25.5.0), Apple silicon, CPU embedding (granite-embedding-small-english-r2), clean environment (`env -i`, throwaway HOME). The machine was shared and busy during the baseline build (load average 30–114) and quieter during the upgrade (about 10), so the two embedding times are not a like-for-like comparison.
- Date: 2026-10-30.
- Privacy: counts, skill names and question IDs only. No journal text, run ID or user tool name is quoted. The copy (raw traces and run metadata, `rsync` read-only from the node's memory folder, 9.2 GB without `work_journal` and `imports`) was made under `/tmp` and deleted after the measurements. Nothing was written to the user's data. TESTING.md ("Data") forbids running a conversion on real data or a copy of it; REQ-013 and the design (Guidance For Implementation) require this isolated-copy method, and the earlier memory-search ticket used the same method. The conflict is recorded in the handoff.
- Method: (1) `rsync` the copy; (2) build the index with the base build (`scripts/evaluate-memory-search.mjs --build`) = **before**; (3) clone the result (`cp -c`) as the baseline for comparison; (4) run the same command with the new build **on the same paths and the same index folder** = the real upgrade path (journals rendered again by the Journals step, files re-chunked, changed cards re-embedded); (5) compare the journal trees with `analyze.py`-style counts; (6) time the renderer alone on 374 runs, old and new, twice each.
  - A first upgrade attempt on a clone at a different path emptied the run list (the store keys runs by their folder path and removed all runs of the old path). That is the shadow setup, not the product (an upgrade keeps its paths); it was discarded and redone in place.

## Journals

| Measure | Result |
| --- | --- |
| Runs with a journal | 3,734 (copy of the node's memory) |
| Journal files | 7,527 before and after |
| Files that change | **6,171 (82.0%)** in 3,084 runs (the design's count on the live node: 6,159 of 7,509, 82%) |
| Size of all journal files | 1,789,511,687 B before, 1,768,052,713 B after (−1.2%) |
| Entries | 647,649 before and after (one entry per record, none added or lost); 47,676 entries change |
| Entries changed, by rule | browser 16,617; message sent 13,629; skill load 4,853; handoff rules 4,838; Codex-only tools (`js`, `speak`…) 4,434; project board 1,723; media 1,132; task handed over 309; Claude-only 86; discovery/memory/artifacts 27; AutoByteus-only 23; other 5 |
| Generic `Tool:` lines | 47,200 before, 3,696 after (92.2% converted). Of the 3,696: 2,378 name a tool the tables know, in runs with no recorded runtime (FU-001: `Bash`, `run_bash`, `Read`, `js`…); 1,318 are the user's own installed tools (52 distinct names); 0 server-qualified (`via`) |
| Entry-count mismatches / files differing without an entry change | 0 / 0 |
| Regeneration time (Journals step, 3,734 runs) | 123 s (new code, over existing journals) against 149 s (base code, from nothing) in the same tool. Renderer alone, 374 runs, from scratch: old 13.5 s and 13.8 s, new 14.4 s and 13.4 s: no change |

## Messages (AC-004)

13,629 `Message to` lines: `delivered` 6,283, `ok` 7,213, `failed` 126, no result 6, rejected 1. The 126 refused messages printed `ok` before. **Finding for the Solution Designer:** 5,782 of the `ok` lines are older AutoByteus-native results recorded as plain text (`Delivered message to <name>…`), plus 61 `Message dispatch for…` texts. They carry no `accepted` field, so the converter prints `ok` (the call ran), not `delivered`. Recognizing the recorded text would make old and new native runs read alike; the design reads acceptance from `accepted` only, so this is routed upstream (follow-ups.md FU-003), not added.

## Skill rule (U-3)

- Skill loads: 4,853 lines; 681 from Claude's `Skill` tool and 4,172 from plain reads of a `SKILL.md` (converted from `Command:` lines).
- Lines still naming a `SKILL.md` as a `Command:` (not converted): 7,623, of which 6,304 (83%) are chained commands (`cd … && cat …`), 915 read a file in an `agents` folder (not a skills folder: by design), 157 pipes, 28 `ls`/`find`/`grep`, the rest redirects, several files at once or other folders.
- Labels, most common: the team's role skills (api-e2e-engineer 877, solution-designer 800, delivery-engineer 678, code-reviewer 667, implementation-engineer 555, architecture-reviewer 396), then browser and workflow skills (control-in-app-browser 136, browser 101, software-engineering-workflow-skill 68, shell-first-operating-practice 66). These are genuine loads of the agent's own skill. A reading of a skill file only to review it cannot be told apart by the rule (the line stays true: the text was in the agent's context).

## Memory search (U-1, U-2)

| Measure | Before (base build, from nothing) | After (new build, upgrade over the before index) |
| --- | --- | --- |
| Time to journals + text index done | 285 s | 338 s |
| Time of the meaning index (card embedding) | about 65 min for all 7,527 cards | about 22 min for the changed cards (shared machine, quieter) |
| Whole command, with the 31-question evaluation | about 71 min | about 28 min |
| Text chunks | 1,093,297 | 1,080,992 (−1.1%) |
| Index database, live pages | 624 MB | 627 MB (+0.5%) |
| Index database file | 626 MB | 840 MB: the replaced chunks leave about 213 MB of free pages in the file (reused later; the product does not vacuum) |
| Embedding database | 17.0 MB | 17.0 MB |

Known-answer questions (31 answerable + 3 off-topic + 2 partial, same questions, same copy, asking as the run that wrote the file):

| | Before | After |
| --- | --- | --- |
| Gate 1: found within 3 searches / in the first search | 31 of 31 / 30 | 31 of 31 / 30 |
| Gate 2: #1 / top 3 / MRR | 12 / 26 (0.839) / 0.625 | 12 / 25 (0.806) / 0.616 |
| Latency p90 / max (ms) | 992 / 1,157 | 779 / 1,294 |
| Meaning pointers (total) / empty snippets | 73 / 0 | 76 / 0 |
| Text matches / without words | 610 / 0 | 605 / 0 |
| Unmasked secrets | 0 | 0 |
| Words-not-found mismatches | 0 | 0 |

Two questions moved down (Q14: rank 2 to 4; Q27: rank 9 to 10, both still found in the first search); none moved up. Gate 1 stays at 100%. Gate 2's top-3 count is one lower (26 to 25) and the MRR 0.009 lower; the evaluation's rule for search changes is that gate 2 must not get worse, so this is reported as measured, for the Solution Designer to judge (the change is a wording change of the journal, not a search change).
