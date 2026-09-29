# Docs Sync Report

## Scope

- Ticket: `task-team-row-collapse-chevron`
- Trigger: API/E2E Pass (API-REV-001, for IR-001 / SR-003) on the direct low-risk route (`task_size=Small`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal@cd4ad898b`
- Integrated base reference used for docs sync: `origin/personal@0bd7975be`, merged into the ticket branch as `98d5daa5f`
- Post-integration verification reference: `delivery-evidence/vitest-focused-integrated.log` (8 files, 146/146) and `delivery-evidence/browser-probe-integrated.log` + `delivery-evidence/browser-probe/evidence.json` (7/7 scenarios, Pass)

## Why Docs Were Updated

- Summary: The web docs described delegated task-Team rows (name, "Started by" line, status) but not their disclosure. The Org tree now gives delegated task-Team rows the mounted-Team chevron. Its state is keyed by execution (`teamRunId`), not by address.
- Why this should live in long-lived project docs: The execution-keyed state is a lasting identity rule. The same Team can be mounted and delegated repeatedly under one address. Future work on the tree (for example, auto-reveal) must keep this rule.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_orgs.md` | Owns the Org Workspaces rows, delegated-row presentation and the Org run disclosure contract | Updated | Behavior paragraph plus the file-responsibility list |
| `autobyteus-web/docs/agent_execution_architecture.md` | Describes transient task-Team rows and tree disclosure | Updated | Short Org-specific paragraph after the task-row presentation |
| `autobyteus-web/docs/agent_teams.md` | Standalone Team tree disclosure (task-Team containers) | No change | The standalone Team tree already collapses task Teams. This change is out of scope for it. |
| `TESTING.md` | Browser dev-path probe catalog | No change | Documents the generic `test:e2e:<name>` pattern. The new script follows it. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_orgs.md` | Behavior + ownership | New paragraph covering the chevron, default expanded, row activation toggle plus coordinator inspection, and `aria-expanded` only when children exist. It also covers `rootRunId`+`teamRunId` keying and independence from the mounted Team and sibling delegations, persistence across live updates, local-only state and no auto-reveal. The `agentOrgHistoryRows.ts` entry was extended, and `useWorkspaceHistoryTreeState.ts` was added. | Final implemented behavior (REQ-001..006) |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture note | New paragraph: the Org task-Team disclosure owner (`useWorkspaceHistoryTreeState`), the key, and that `projectAgentOrgHistoryRows` omits collapsed descendants | Records where the state and projection live |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Delegated Team disclosure identity | State is keyed per execution (`rootRunId::agent-org-task-team::teamRunId`), not per address | design-spec.md, investigation-notes.md (E-005) | agent_orgs.md, agent_execution_architecture.md |
| Approved non-goals | No auto-reveal of a user-collapsed task Team; state resets on reload | requirements-doc.md, design-spec.md | agent_orgs.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Delegated task-Team row: blank chevron slot, row click only inspects | Chevron + toggle-and-inspect row activation | agent_orgs.md |

## No-Impact Decision

- N/A (docs updated)

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold
- Notes: Docs were written only after the integration refresh and the post-integration checks passed.
