# Agent-memory trace trees not committed

The live runs copied each test agent's memory tree (raw traces and context snapshots) into `round2/traces/`, `round3/traces/`, `round4/traces/`, `round5/traces/` and `round5/haiku-and-codex-not-used/`. By the user's decision at delivery (2026-10-16), these trees are not committed. Their paths were also longer than the 200 characters a Windows checkout allows.

What the committed reports rest on is kept: the per-run analysis outputs (`round5/LE-A1-analysis.txt`, `round5/journeys-analysis.txt`), the run logs, the analysis scripts, `j2-team-trace.txt` and the screenshots. The API/E2E report explains every failing sample in text (the three DeepSeek provider failures).

Kept locally, outside the repository, for the Codex rerun after 2026-10-22. These are byte-identical archives, checked with `diff -r` against the folders:

| Local archive | Folder | Files | Why kept |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/_delivery-reports/collaboration-prompt-wording-traces/round5-traces.tar.gz` | `round5/traces/` | 599 | The judging runs (Sonnet, DeepSeek flash) behind the final pass, including the failing samples |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/_delivery-reports/collaboration-prompt-wording-traces/round4-traces.tar.gz` | `round4/traces/` | 510 | Round 3, with the Codex echo-loop traces (F-5) the Codex rerun compares with |

Deleted: `round2/traces/` and `round3/traces/` (earlier, superseded wording; mostly information-only LM Studio runs) and `round5/haiku-and-codex-not-used/` (not judging runs; the Codex runs failed before any prompt reached the model). Citations of these folders in the round 1–3 reports are historical.
