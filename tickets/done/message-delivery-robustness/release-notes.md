## Improvements
- Improved delivery of messaging replies by keeping server-to-gateway callbacks queued until the gateway can accept them.
- Improved managed gateway reliability by automatically restarting the gateway after crashes, stale heartbeats, or lost worker ownership.

## Fixes
- Fixed cases where messaging replies could be missed when the gateway became stuck, unavailable, or restarted during delivery.
