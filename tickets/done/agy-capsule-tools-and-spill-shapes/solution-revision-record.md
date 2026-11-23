# Solution Revision Record — agy-capsule-tools-and-spill-shapes

| Revision ID | Phase | Trigger | Finding IDs | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-588 (merged follow-ups of 561 and 377) | F-01…F-09 | N/A | Requirements Approved; design Ready | REQ-001…003; AC-001…003; DEC-1…4 | Small / Low; direct route |

### SR-001 — One real change; three follow-ups judged
- Verdicts: 561 FU-1 delivered by 377 (verified in the merged code); 561 FU-2 dropped (false lead; the tool is gone from the current CLI); 561 FU-3 armed, not actionable before a recurrence; 377 FU-1 is the change: the capsule allowlist names the current tools plus the older names.
- Evidence: reproduced on agy 1.5.15 (five capsule variants): the allowlist works, the stale list works only through the CLI's aliases, unknown names are ignored.
- Approval: Solution Designer within the direction; user informed (2026-11-24). Next action: implementation (direct route).

### SR-002 — The premise was wrong: the list stays; a drift warning is added (2026-11-24)
- Trigger: the implementation engineer's Design Impact: the designed list made every start fail (`tool name conflict: multiple tools resolved with name "read_file"`); no source change was committed.
- Cause of my error (owned): SR-001 judged the list stale from the model's own answer and a probe of lists that never mixed a name with its alias; it did not probe the exact final list, and did not read the CLI's registry (`init.tools`), which already showed that the eight names are the CLI's own and the new names are aliases.
- Changed: REQ-001/002, AC-001…003, DEC-1, the design's Intended Change and risks, notes F-06/F-07/F-10/F-11. Unchanged: the verdicts on the other three items.
- Classification unchanged: Small / Low. Next action: implementation (direct route) with the corrected design.
