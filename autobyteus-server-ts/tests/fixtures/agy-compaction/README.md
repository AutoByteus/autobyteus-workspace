# AGY compaction stream fixtures

Verbatim AGY CLI 1.2.16 `--output-format stream-json` stdout lines (the probe's `OUT` records only),
recorded with `gemini-3.8-flash-low` by sending ~90K-token data dumps until AGY compacted automatically.

- `agy-stream-auto-compaction-twice.stdout.jsonl`: 11 turns, two automatic compactions as
  `checkpoint` DONE steps 9 (turn 5) and 18 (turn 9).
- `agy-stream-auto-compaction.stdout.jsonl`: one automatic compaction, checkpoint DONE step 9 (turn 5).

Source: ticket agy-compaction-analysis, probes/agy-stream-auto-compaction{-twice,}-raw.jsonl (investigation A15, A17).
