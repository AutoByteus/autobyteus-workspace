# Docs Sync Report — mention-candidates-in-run

## Scope

- Ticket: `mention-candidates-in-run`. Classification: `task_size=Medium`, `architectural_risk=Low`, direct low-risk route (architecture, source and test-code review `N/A — not applicable`).
- Trigger: API-REV-001 Pass handoff from `/api_e2e_engineer`.
- Bootstrap base reference: `origin/personal@f48dbfbf3`.
- Integrated base reference used for docs sync: `origin/personal@f48dbfbf3`. The branch was already current.
- Post-integration verification reference: `delivery-evidence/delivery-{contracts,server-unit,server-e2e,web}.log`.

## Why Docs Were Updated

- Summary:
  - `@` candidates now include eligible shared Agents and Teams that are already in the run; only the run's own definition is excluded.
  - An in-run `@` resolves to the in-run address, and the note marks it "already in this run" with `send_message_to` guidance.
  - New chat drafts follow the same rule.
  - The menu copy is updated in en and zh-CN.
- Why this should live in long-lived project docs: the candidate policy and the mention note are contracts that agents, runtimes and the UI rely on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `@` resolution, admission, In the run, Candidates | Updated (implementation `e08c4a8c5`) | Accurate |
| `autobyteus-web/docs/chat.md` | New chat draft, `@` in a live run, failure notice | Updated (implementation) | Accurate |
| `TESTING.md` | New coverage; inheritance of `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` | Updated (API/E2E) | Accurate |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Collaborator definition used by `delegate_task` placement | **Updated (delivery)** | It said collaborators are "brought in with `@`"; `@` adds nothing since v1.4.95-beta.6 |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Serialization wording | **Updated (delivery)** | "`@` admissions" became "`@` mention resolutions" |
| `autobyteus-web/docs/agent_orgs.md` | Org collaborators | **Updated (delivery)** | It said collaborators are "brought in with `@`" and mentioned "the pending mention send keeps its acknowledgement" (both obsolete) |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`, `agent_team_execution.md`; web `agent_teams.md` | Mention statements | No change | Already accurate (`@` adds nothing; candidates via GraphQL) |
| `autobyteus-agent-presentation-contracts` (src and committed `dist/`) | The note contract | No change | A rebuild produced 0 `dist/` drift, so the committed `dist` matches `src` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| server `agent_tools.md` | Stale-statement correction (delivery) | Collaborators are brought in by an agent's first message, or with `@` in runs saved by earlier releases | Truth since mention-delegation-dismissal; it matters more now that `@` addresses in-run agents |
| server `agent_orgs.md` | Wording (delivery) | "`@` mention resolutions" | `@` no longer admits |
| web `agent_orgs.md` | Stale-statement correction (delivery) | Same collaborator wording; removed the pending-send acknowledgement clause | Same |
| server `agent_communication.md`, web `chat.md` | Behavior (implementation) | Candidates include in-run definitions; in-run note form | Final behavior |
| `TESTING.md` | Coverage (API/E2E) | Step 6b, probe assertions, `env -u` prefix | Durable coverage |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Candidate policy | `@` lists every eligible shared Agent and Team, including in-run ones; only the run's own definition is excluded | requirements-doc.md REQ-001/005 | server `agent_communication.md` § Candidates; web `chat.md` |
| In-run note form | `- Name (Kind) at /address, already in this run`, plus `send_message_to` guidance; notes without in-run mentions are unchanged | design-spec.md | server `agent_communication.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `@` excludes definitions already in the run ("is already in this run" rejection) | Accepted and resolved to the in-run address | server `agent_communication.md` |
| Menu copy "Bring into this run" | "Delegate to an agent or team" and the related strings (en, zh-CN) | web `chat.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, then hold for user verification.
