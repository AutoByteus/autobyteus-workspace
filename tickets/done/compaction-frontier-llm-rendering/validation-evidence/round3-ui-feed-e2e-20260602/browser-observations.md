# Round 3 UI Compaction Feed Browser Observations

## Live center feed row order

1. User prompt row.
2. Assistant/tool-call row: `run_bash · printf 'TOOL_RESULT_BEFORE_COMPACTION\n'`.
3. Center compaction execution card: `Memory compacted`, `Completed`, `Turn: turn_0001 · 1 raw traces · 4 facts`.
4. Post-compaction assistant continuation row containing `UI-COMPACTION-CONTINUED`.

Requested/queued phases were not present in the center feed; only the completed execution-phase card was center-rendered.

The Activity panel showed two live events: `run_bash #call_0` success with stdout `TOOL_RESULT_BEFORE_COMPACTION`, and one `Memory compaction #8ejc_1` lifecycle card completed for `compaction_operation_mpwo8ejc_1`.

## Historical replay after reopening

A separate browser tab selected the persisted historical run from the left workspace run tree. The center feed replay contained the user prompt plus actual assistant/tool-call/continuation trace content, with no center compaction cards and no requested/queued text.

The historical Activity panel showed the `run_bash #call_0` tool event; expanding `Result` showed stdout `TOOL_RESULT_BEFORE_COMPACTION`.

## Screenshots

- Live UI feed order: `live-ui-feed-order.png`
- Historical replay: `historical-replay.png`
