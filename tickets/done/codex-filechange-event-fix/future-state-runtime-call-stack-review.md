# Future-State Runtime Call Stack Review

## Round 1
- Result: `Candidate Go`
- Findings: none blocking
- Notes:
  - The `fileChange` item converter is the correct authoritative boundary for this fix.
  - Emitting multiple normalized events from one raw item is justified because the raw item simultaneously owns segment, lifecycle, and artifact state transitions.

## Round 2
- Result: `Go Confirmed`
- Findings: none blocking
- Notes:
  - The design keeps raw Codex interpretation inside the Codex backend and avoids a frontend workaround.
  - The changed scope removes malformed Codex raw-name assumptions instead of preserving them beside the fix.
