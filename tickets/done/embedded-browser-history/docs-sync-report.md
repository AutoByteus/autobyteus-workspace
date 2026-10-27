# Docs Sync Report — embedded-browser-history

## Scope / authority
DR-001, Medium / High / Reviewed. R1/SR-001 approved, design SR-002,
ARCH-REV-001 Pass, IR-001, CRR-001/002 Pass, API-REV-001 Pass.
Bootstrap and freshly fetched integrated base both
`ec92b3c02aa3f949e9bfbf0deb7449ae653fee53` (`origin/personal`).
`git merge --no-edit origin/personal` returned Already up to date at `d1d594ee4`.
No checkpoint needed: tracked candidate clean; no new base commits or conflicts.
Delivery edits began only after this refresh.

## Long-lived docs reviewed / changed
| Path | Result | Reason |
|---|---|---|
| autobyteus-web/docs/browser_sessions.md | Updated | Existing implementation section already documents native history, sender/lease/active checks, snapshot-not-completion and address draft preservation. Complete ownership and shell UX lists, add durable probe discovery and settlement assertion guidance. |
| TESTING.md | No change | Global impact-driven reuse and isolation policy still accurate; ticket-specific probe belongs in its header/package script and Browser doc. |
| RELEASE.md | No change | No release requested; finalization/secret/hygiene rules apply without changing policy. |
| docs/isolated-app-instances.md | No change | Current canonical launch/stop contract is reused, not redesigned. |

## Durable knowledge promoted / removed concepts
The extracted observer adapter owns native event notifications, not popup adoption;
BrowserTabNavigation dispatches native traversal without adding load waiters.
Capability updates are native state, not a renderer URL stack. The broad address
snapshot watcher was replaced by tab/URL synchronization so history-only updates
preserve drafts. Implementation's Desktop Back / Forward section already captured
this behavior; delivery completes the module and control inventories rather than
duplicating ticket reports. Probe settlement guidance incorporates API-06's
observed network-failure-versus-error-document distinction.
No persistence, agent-facing API, website behavior or release policy change.
FU-001/002 remain deferred, unchanged. Docs sync **Pass / Updated**.
