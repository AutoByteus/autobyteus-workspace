## Improvements
- Improved external-channel conversations for both agents and agent teams so replies stay tied to the correct inbound message across same-thread follow-up messages.
- Improved team-bound channel conversations so coordinator-default routing and restored team runs continue replying reliably without manual reset.

## Fixes
- Fixed cases where external channels could miss, delay, or misroute replies after tool-using turns, repeated same-thread messages, or restored runs.
- Fixed team channel delivery so the correct coordinator/member turn is preserved instead of falling back to ambiguous run-level correlation.
