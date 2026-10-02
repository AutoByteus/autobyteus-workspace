# Release Notes — Embedded Browser opening with Antigravity

## Fix
- Corrected successful AutoByteus `open_tab` results from Antigravity so eligible local desktop windows can automatically select Browser and display the returned session instead of only showing tool success in Activity.

## Preserved behavior and limits
- Remote-node isolation, browser-window ownership, unrelated tools and failed calls retain their existing behavior.
- Existing history, browser sessions and cookies require no migration or reset. Saved history does not reopen old tabs automatically.
- This addresses the confirmed result-format defect, not every possible intermittent browser/focus failure or collapsed-panel recovery scenario.

## Delivery status
Prepared before user verification; user UV-001 subsequently accepted finalization and requested a new beta. Publication is in progress; see release-deployment-report.md for the authoritative outcome. Beta publication uses generated notes under repository policy. No installed-app replacement is performed.
