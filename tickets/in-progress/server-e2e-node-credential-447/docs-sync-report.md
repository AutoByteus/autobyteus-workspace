# Docs Sync Report

## Scope

- Ticket: `server-e2e-node-credential-447` (Project Task `autobyteus-447`)
- Trigger: API/E2E Pass `API-REV-002` (direct route, `task_size: Medium`, `architectural_risk: Low`; test-code review `Not Required — direct low-risk route`)
- Bootstrap base reference: `origin/personal` @ `310fc27452`
- Integrated base reference used for docs sync: `origin/personal` @ `f78b60dddd` (merged into the ticket branch as `5c29d6fca2`, no conflicts)
- Post-integration verification reference: `evidence/delivery/DEL-01…DEL-04` (release-deployment-report.md, Initial Delivery Integration Refresh). DEL-01 has one failure caused by a base change (E-002, see the release/deployment report). It does not change any doc this ticket touches.

## Why Docs Were Updated

- Summary: the change is test harness only. Implementation already updated the two long-lived documents it changes: `TESTING.md` "Node credentials" (one path for each way a test reaches its node, the early attachment, the guard, the fixture child rule from IR-002) and its "Choosing the path" row (a whole-suite run for node gate, credential, gateway token or shared-harness changes, REQ-008); `docs/design-cases.md` Case 2 (autobyteus-437 occurrence). Docs sync checked them against the integrated final state; no further edit was needed.
- Why this should live in long-lived project docs: future test authors and every role that runs the server E2E suite need the rule, not this ticket's story; both edits are written as rules (AC-007, AC-008, checked by API-13 and again here).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` (Node credentials, Choosing the path, Rerun by impact) | testing guideline; changed by this ticket | No change (already updated in `9721caf187`, `44ee19f3b8`) | Matches the final code: `tests/setup/test-launch-credential.ts` installs the attachment; `startStudioE2eRuntimeServer`, `startBuiltTestServer`, `builtServerLaunchEnvironment()`, `attachOwnerCredentialToLoopback`, explicit inject header, `connectMcpGatewayClient`, guard `tests/architecture/e2e-node-credential-paths.test.ts` all exist under those names. The new base suites (autobyteus-455) need no new path (DEL-03 guard clean, DEL-04 pass) |
| `DESIGN.md` | project design rules | No change | Rule 11 (server E2E protects releases) still accurate; no new principle |
| `docs/design-cases.md` Case 2 | design case added by this ticket | No change (already updated in `a20e7a822f`) | States the shape and fix, kept to what a future design needs |
| `RELEASE.md` | release guide | No change | Its "delivery audits; it does not redo … reruns only when … the ticket asks delivery for it by name" covers this ticket's whole-suite rerun (AC-001/REQ-006). No gap found |
| `autobyteus-server-ts/docs/modules/mcp_gateway.md` | describes `MCP_GATEWAY_TOKEN_REQUIRED` and the owner token route | No change | Product behavior unchanged (REQ-004); no test-harness content there |
| `autobyteus-server-ts/docs/design/node_access_model.md` | node gate NA-1, NA-12 | No change | Product contract unchanged (AC-004) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| None in docs sync | — | — | Implementation's updates already match the final state |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| How a server test reaches its node | One path per form; the attachment is installed before test code; the gateway needs its own token; a guard flags a directly composed node or bare gateway client | `design-spec.md`, `implementation-handoff.md` | `TESTING.md` Node credentials (implementation) |
| When to run the whole server E2E suite | A change to the node gate, credentials, gateway token or shared server test harness runs `pnpm test:e2e` in full | `requirements-doc.md` REQ-008 | `TESTING.md` Choosing the path (implementation) |
| The design shape that let it happen | One entry form traced, others left open | `investigation-notes.md` | `docs/design-cases.md` Case 2 (implementation) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Private `install` in `owner-credential-attachment.mjs`, installed on the first attach | Exported `installOwnerCredentialAttachment`, called by the server test setup before test code | `TESTING.md` Node credentials |
| Bare `StreamableHTTPClientTransport` gateway clients in E2E files | `tests/e2e/helpers/mcp-gateway-client.ts` `connectMcpGatewayClient` | `TESTING.md` Node credentials |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: none until the E2E prerequisite is resolved (release-deployment-report.md, Escalation). Then the handoff summary, the remaining verification and finalization under `RELEASE.md`.
- Notes: no new follow-up from docs sync.
