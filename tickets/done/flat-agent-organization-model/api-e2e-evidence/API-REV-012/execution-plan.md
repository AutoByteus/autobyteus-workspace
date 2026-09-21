# API-REV-012 User-Requested Focused Recheck

- Authority/artifact unchanged from API-REV-011: RER-025 / AD-REV-016 / ARCH-REV-014 / IR-029 / CRR-038; source `0d7b6e7e7bc1050a43d3681eb83b09a342537ef7`; artifact `54716ad0ffd4c4be7aab389a84d3d7e41f72ecb5`.
- Trigger: user asked to test again in case the earlier server crash was environmental/transient.
- RETRY-001: start a fresh isolated copy of the same data on a new owned port, send a qualifying message with an intact history index, and prove ACK, durable summary, and continued HTTP availability.
- RETRY-002 / reused `LIVE-003B`: on the same successfully running server, create another fresh Org, force only the derived index atomic rename to fail, and retain ACK/socket/process/health facts. Restore the exact index and clean all owned resources.
- No source change is assumed. This is a focused prior-failure recheck, not a cumulative pass attempt.
