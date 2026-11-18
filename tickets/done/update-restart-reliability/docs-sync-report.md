# Docs Sync Report — update-restart-reliability (autobyteus-339)

## Scope

- Ticket: `update-restart-reliability`, Project Task `autobyteus-339` (a client connection no longer holds the server's shutdown; "Install update and restart" proceeds after an incomplete stop when the server is confirmed gone). `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Trigger: CRR-004 (test-code review Not Applicable) from the code reviewer, after API-REV-002 Pass.
- Bootstrap base reference: `origin/personal` @ `a977b2c1bc`.
- Integrated base reference used for docs sync: `origin/personal` @ `0ab3f4a6d7`, merged into the ticket branch as `6160f551aa`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh (DEL-01).

## Why Docs Were Updated

- Summary: the change already documented both decisions (D1 client-connection close, D2 install after a confirmed-gone server) and added a design case. Delivery checked them against the integrated code and tests, found them accurate, and only reflowed one overlong line.
- Why this should live in long-lived project docs: the close rule ("last `preClose` hook", 2 s grace, 503 / destroyed-on-arrival, cut after the grace) is a rule every future Fastify server and HTTP stream owner must follow; the install rule is the contract autobyteus-285's unattended update relies on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Server shutdown; new close rule | Updated (by the change) | Matches `client-connection-close.ts` (`IN_FLIGHT_REQUEST_GRACE_MS`), the four installers (studio, standalone application, Agent Tools MCP, credential proxy) and the IMP-08/IMP-09 tests. 284's 14.25 s worst case still holds: the grace runs inside the 10 s bound |
| `autobyteus-web/docs/electron_packaging.md` | Desktop quit and "Install update and restart" | Updated (by the change; delivery reflowed one line) | Matches `prepareForInstall`, `isServerProcessGone()`, `acceptIncompleteStopForInstall()` and IMP-02 |
| `docs/design-cases.md` | Case 5 entry from CRR-002 F-API-001 | Updated (by the change) | — |
| `autobyteus-web/docs/settings.md` | Update notifications "Install and restart" | No change | Describes the UI flow only; failure text unchanged for the unconfirmed case (AC-005) |
| `autobyteus-web/docs/github-actions-tag-build.md` | Updater operations | No change | No claim about incomplete shutdowns |
| `autobyteus-server-ts/docker/README.md` | Docker stop/update | No change | Out of scope (BEH-003 preserved); Docker stop timeouts are 284's FU-004 |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior (change) | "Closing never waits on a client beyond a short grace" | D1 |
| `autobyteus-web/docs/electron_packaging.md` | Behavior (change); formatting (delivery) | Client connections do not hold the close; install after an incomplete stop when the server is confirmed gone | D1, D2 |
| `docs/design-cases.md` | Design lesson (change) | Case 5: trace a state-changing caller before accepting a dropped guarantee | CRR-002 F-API-001 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Client connection close | Last `preClose` hook in every Fastify server; never-used connections destroyed, in-progress requests get 2 s, then all closed; HTTP streams must be closed by their owner first | design-spec D1 (SR-004/SR-005), ARCH-REV-003 | `agent_execution.md` |
| Install after an incomplete stop | Install proceeds only when the server process is confirmed gone; otherwise the existing error | design-spec D2, DEC-001 = A, DEC-005 | `electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| IR-001's `SERVER_CLOSE_OPTIONS` (`forceCloseConnections`), never released | `installClientConnectionClose` (grace drain) | `agent_execution.md` |
| "An incomplete stop always aborts Install update and restart" (backend-port-conflict policy) | Install when the server is confirmed gone | `electron_packaging.md` |

## No-Impact Decision

Not applicable (docs updated by the change, checked by delivery).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, archive, finalization (no release by default).
