# API/E2E Revision Record — autobyteus-267 (Nodes → Remote Collaboration page)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | IR-001, direct route (Medium / Low) | `3a21bcae44` (handoff `f684e1e368`) | 1 | **Fail**: F-001 (Low; AC-505): a peer whose query is in flight is not asked again on tab return or switch on (Apollo query deduplication). Confidence 93% final. Server E2E 29/29; browser probe 8/9 cases | new browser probe `remote-nodes-page-probe.mjs` (+ script); `peerNodeOffer` checks in RC-16, RC-26, RC-27 | `F-001-in-flight-peer-not-asked-again.log`, `API-02-run4/`, `API-02-diagnostic-dedup-off/`, `API-01-run1/` | Code reviewer: failure-origin review (preliminary Local Fix, Implementation Engineer) |

## API-REV-001 notes

- Probe runs 1 and 2 stopped on my own comparison: the window's entries carry Apollo's `__typename`, which I hadn't accounted for. Fixed.
- Run 3 found F-001 on tab return. Run 4 added the switch-off-and-on variant (TR-009) and reproduced it.
- The diagnostic run patched the web store temporarily (`context: { queryDeduplication: false }`). The patch was reverted with `git checkout`; the source validated is `3a21bcae44`.
