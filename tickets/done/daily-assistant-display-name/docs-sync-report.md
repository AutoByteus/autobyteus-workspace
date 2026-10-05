# Docs Sync Report — daily-assistant-display-name

## Scope

- Ticket: `daily-assistant-display-name`. The built-in default Chat agent (`autobyteus-daily-assistant`) is displayed as **Daily Assistant** again; its role stays **General Agent**.
- Trigger: API/E2E Pass (API-REV-001, round 1, 96%) from `/api_e2e_engineer` on the direct low-risk route (`task_size=Small`, `architectural_risk=Low`). Architecture review, code review and test-code review are `N/A — not applicable`.
- Bootstrap base reference: `origin/personal` @ `6d4f16ef2ff653397f4dd389ade473bfa2695285`.
- Integrated base reference used for docs sync: `origin/personal` @ `6d4f16ef2ff653397f4dd389ade473bfa2695285`. It was fetched again on 2026-10-05 and is unchanged. The ticket branch `codex/daily-assistant-display-name` @ `edeb5db9a` is already current, so no merge was needed.
- Post-integration verification reference: there were no new base commits, so the API-REV-001 evidence applies to this exact state (`api-e2e-execution-coverage-report.md`, `api-e2e-evidence/`).

## Why Docs Were Updated

- Summary: the implementation (IR-001) already updated the current-state docs to the new display name. Delivery reviewed each doc against the final template, registry and validated behavior. The docs are accurate, and delivery made no further edits.
- Why this should live in long-lived project docs: the built-in's displayed name, its unchanged id and role, and the fact that older history keeps its captured label are durable product facts. Readers of the agent-definition and chat docs need them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Canonical built-in agent description | Updated (IR-001; verified) | It now reads: display name **Daily Assistant** and role **General Agent**; same id, directory and constant; no migration; older history may still show the earlier label General Agent. These match the template, the registry and U-02/U-04 |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Example built-in excluded from collaborator candidates | Updated (IR-001; verified) | Wording only |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Example `ALL_INSTALLED` agent | Updated (IR-001; verified) | Wording only; C01 confirms the `ALL_INSTALLED` scope |
| `autobyteus-web/docs/chat.md` | Default chat draft, `@` menu, mention candidates | Updated (IR-001; verified) | It says the draft defaults to Daily Assistant and that older captured names may show General Agent. This matches U-03/U-04 and OBS-1 |
| `autobyteus-web/docs/agent_management.md` | Featured catalog and built-in ownership note | Updated (IR-001; verified) | Wording only; the platform-owned refresh behavior is unchanged |
| `autobyteus-web/docs/skills.md` | Skill copy shared with the default agent | Updated (IR-001; verified) | Wording only |
| Remaining non-test files containing `General Agent` (`git grep`, excluding `tickets/`) | Check for stale identity text | No change | Only intentional occurrences remain: the template `role: General Agent`, the role mention in `agent_definition.md:120`, and the two "older history" notes |
| Historical `tickets/done/**` and earlier release notes (e.g. v1.4.92) | Historical records | No change | Historical records stay as written; they are not current-state docs |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Current-state correction (IR-001) | Display name changed to Daily Assistant, role General Agent stated, and the historical-label note reversed | REQ-001, REQ-003, REQ-004 |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Wording (IR-001) | Example built-in name | REQ-004 |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Wording (IR-001) | Example agent name | REQ-004 |
| `autobyteus-web/docs/chat.md` | Current-state correction (IR-001) | Default draft agent name and historical-label note | REQ-001, REQ-003 |
| `autobyteus-web/docs/agent_management.md` | Wording (IR-001) | Built-in name in the featured and ownership notes | REQ-004 |
| `autobyteus-web/docs/skills.md` | Wording (IR-001) | Built-in name | REQ-004 |

Delivery made no further doc edits.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Display name and role are separate | The display name is Daily Assistant and the role is General Agent; neither changes the id `autobyteus-daily-assistant` | requirements-doc.md, design-spec.md | `agent_definition.md` |
| Captured history labels | Runs keep the `agentName` captured at creation, so history created on releases that shipped the General Agent label (v1.4.92 through v1.4.94, including their betas) may show General Agent | design-spec.md "Persisted Data", API U-04, OBS-1 | `agent_definition.md`, web `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Display name/self-introduction "General Agent" (prompt v1, SHA `d410e6f6…`) | "Daily Assistant" (SHA `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7`); role still General Agent | `agent_definition.md`; the template is the source of truth |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then hold for explicit user verification.
- Notes: OBS-2 (the run-id prefix follows the name at creation) is existing cosmetic behavior. It is not documented as a contract, and no docs change is needed.
