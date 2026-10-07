# Docs Sync Report — `project-manager-ux`

## Scope

- Ticket: `project-manager-ux`. Requirements SR-003 and design SR-005, both approved. Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (ARCH-REV-002 → IR-001/IR-002 → CRR-001..003 → API-REV-001/002 → CRR-004).
- Trigger: CRR-004 Pass from `/code_reviewer`.
- Bootstrap base reference: `origin/personal@7d130309e`.
- Integrated base reference used for docs sync: `origin/personal@88fad73cb`.
  - 14 new commits: chat Draft rows, Grok Build compaction, and beta `1.4.96-beta.2`.
  - Merged into the ticket branch as `adc8912cb` with no conflicts.
- Post-integration verification reference: `delivery-evidence/dr-001/` (see `release-deployment-report.md`).

## Why Docs Were Updated

- Summary:
  - The implementation commit `4d469b0c5` already rewrote the canonical docs for this change:
    - server `docs/modules/projects.md`: Live Change Feed And Task Roots, `recipientAddress`, `tasksWithoutProject`, and the corrected "never persisted";
    - web `docs/projects.md`: live pages, root line, Temp tasks, F-006, and the probe;
    - the obsolete "No polling…" and "no automatic board synchronization" statements were removed.
  - The API/E2E round updated `TESTING.md`.
  - Delivery found one stale statement. Web `docs/projects.md` still described the probe as PMU-001–007, run through `node`, although API/E2E extended it to PMU-001–012 and added the `test:e2e:project-manager-ux` script and the server feed E2E.
- Why this should live in long-lived project docs: `docs/projects.md` is the web feature's canonical description, including its validation surface.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Feed, roots, persisted `recipientAddress`, `tasksWithoutProject` | No change (updated in `4d469b0c5`) | The `/ws/projects` messages, the `foldTeamAggregateStatus` location and the file-shape row match the code. The Reactivation section (previous ticket) is consistent: a reactivated root reads open and live again. |
| `autobyteus-web/docs/projects.md` | Live pages, root line, Temp tasks, probe | **Updated** | The probe paragraph now uses the package script, describes PMU-001–012, and points to the feed E2E. |
| `TESTING.md` | Feed E2E and probe commands | No change (updated by API/E2E, reviewed in CRR-004) | Merged cleanly with the base's Grok and chat Draft rows sections. |
| `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md` | New WebSocket `/ws/projects` | No change | The policy is stated for `/ws/*` as a whole. `/ws/projects` uses the shared remote-access WebSocket auth, which the feed E2E proves (4401). |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Possible socket list | No change | It covers the agent/team stream contract only. `/ws/projects` is documented in `projects.md`. |
| `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md`, `agent_integration_minimal_bridge.md` | Team status model, `AgentRunTaskRows` | No change | Their binary team activity and closure text is unaffected. The web team fold now delegates to the shared contracts fold with the same ranking. |
| `autobyteus-web/docs/chat.md` | `AgentRunTaskRows` description | No change | It describes rows; F-006 (a click always opens) is documented in `docs/projects.md`. |
| Base-introduced docs (`chat.md` Draft rows, `workspace_layout.md`, Grok and `agent_memory.md`, `run_history.md`) | Integration check | No change | Unrelated to Projects. Merged without conflict. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Validation surface | Probe command via `pnpm -C autobyteus-web test:e2e:project-manager-ux`. PMU-008–012 described: left panel across pages, the Temp task reactivation cycle and chat deletion, "Couldn't start", two windows, and the cold Org root. Pointer to the server feed E2E. | Stale after the API/E2E extension |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Project change feed | One `/ws/projects` per node. Marks only, coalesced flush, strict messages, no replay; `connected` triggers re-read. | design-spec AR-001, implementation-handoff | server `projects.md` (implementation commit) |
| Task root | The latest `assigned` entry, with live status from the hosting root (never wakes anything), the AR-002 openable rule, and Couldn't start / Offline. | design-spec DEC-006, AR-002 | server and web `projects.md` |
| Temp tasks | Tasks with no Project listed via `tasksWithoutProject`; read-only board and page | requirements BEH-006 | server and web `projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "No polling, status push or live subscription" / "no automatic board synchronization" | `/ws/projects` change feed | server and web `projects.md` |
| "Never stores addresses" | Optional `recipientAddress` on `assigned` entries | server `projects.md` (file shape) |
| Web-local team status ranking | `foldTeamAggregateStatus` in `@autobyteus/collaboration-stream-contracts` | server `projects.md` (Task roots) |
| `!props.runSelected` guard in `AgentRunTaskRows` | Always emit `select-run` (F-006) | web `projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and release notes, then hold for explicit user verification.
- Notes: The Server Settings Projects toggle needing a second click is outside scope and is a candidate for a separate ticket. It is not a docs item.
