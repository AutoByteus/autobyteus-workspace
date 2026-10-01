# Docs Sync Report

## Scope

- Ticket: `memory-team-view-slow-load`. Task size `Large`, architectural risk `High`. The route was reviewed: ARCH-REV-004 → IR-002 → CRR-005 → API-REV-001 → CRR-006.
- Trigger: `code_reviewer` delivery handoff after CRR-006 Pass (test-code review, no findings).
- Bootstrap base reference: `origin/personal` @ `40b1783f4`, per `handoff-result.md`. It was later integrated to `6f7b5e371` by the implementation merge `7c2553f48`.
- Integrated base reference used for docs sync: `origin/personal` @ `a2694ed453e353550d8b345fa82ef489634dcaf2`. The ticket branch HEAD is `fdcadbbb568697c84e4fe9493ac6ab2214895f05` (merge commit).
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh".

## Why Docs Were Updated

- Summary:
  - The Memory explorer gained an Agent Orgs tab, org queries and org member views.
  - Team and org runs now show a structured member tree, including task agents and task teams.
  - A shared catalog owner now reads each execution tree once per root.
  - The Memory sources list refreshes only on the home view.
  - The GraphQL contract gained additive structure fields and a renamed member-target type.
- The long-lived web and server memory docs described two tabs only, and a flat team-only member list. The server doc named a deleted helper (`TeamMemoryMemberTargetBuilder`). It also said "the Org root-memory source adapter is not present in this branch", which is no longer true.
- Why this belongs in long-lived docs: these are the canonical `/memory` UI and agent-memory module references. Future readers need the current tab set, the member-tree rules, the one-read-per-root catalog policy, the sources-refresh policy and the GraphQL contract.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/memory.md` | Canonical Memory page doc | `Updated` | Tabs, org detail and inspector, member tree, sources refresh, one request per navigation, GraphQL contract, storage, testing |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Canonical agent-memory module doc | `Updated` | Catalog owner and family sources, member targets, org storage path, org queries and view, import behavior, key source files |
| `autobyteus-server-ts/docs/features/memory_sync.md` | Import corpus scope | `No change` | Still accurate: sync covers only `agents` and `agent_teams`. The package does not change sync |
| `autobyteus-ts/docs/agent_memory_design*.md` | Native memory layout | `No change` | The native memory writer and file layout are unchanged; all package paths are read-only |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/memory.md` | Behavior and contract update | Covers: the three tabs; the Agent Orgs grouping and imported-source empty state; the shared `CollaborationMemoryDetail`; member tree rules (configured, task agent, task team, nested; group rows without memory; each row's own run; unreferenced folders hidden); org display names and breadcrumb; the REQ-011 sources-refresh policy; one request per navigation and the loading state; `listAgentOrgsWithMemory` and `listAgentOrgRunsWithMemory`; `getAgentOrgMemberRunMemoryView`; the `CollaborationMemberMemoryTargetSummary` fields; the org storage path; test coverage | REQ-002, 003, 006…012 |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Architecture and contract update | Replaced the "Agent Teams" explorer section with "Agent Teams And Agent Orgs": `CollaborationRootMemoryCatalog`, `TeamRootMemorySource`, `AgentOrgRootMemorySource`, one tree read per root, the skip-invalid rule, `buildCollaborationMemberMemoryTargets` with execution kinds and group path, and root-first inspector lookup. Also covers the org storage path, org queries and view, the corrected `getTeamMemberRunMemoryView` argument name (`agentRunId`), imported sources having no org corpus, and the key source files | REQ-001, 005, 006, 008, 012; stale references removed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Linear catalog | Exactly one execution-tree read per root per list request; a corrupt root is skipped with a warning | `design-spec.md`, `investigation-notes.md` | `agent_memory.md` |
| Family split | The shared catalog policy owner is fed by family sources. Orgs use the pure `listCatalogRows()` and a stored-only history manager | `design-spec.md` | `agent_memory.md` |
| Member structure | `executionKind` + `groupPath`; each target is its own run; groups have no memory; unreferenced folders are not shown (DEC-004) | `requirements-doc.md` REQ-010/012 | both |
| Sources refresh | Background refresh on the home view only; one awaited refresh for an unknown imported source; never on detail or inspector navigation | REQ-011 / DEC-002 | `memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `AgentTeamMemoryDetail.vue` | `CollaborationMemoryDetail.vue` + `collaborationMemberTree.ts` | `autobyteus-web/docs/memory.md` |
| `team-memory-member-target-builder.ts` (`TeamMemoryMemberTargetBuilder`) | `collaboration-member-memory-targets.ts` | `agent_memory.md` |
| Per-root O(N²) team rescan in `TeamMemoryExplorerService` | `CollaborationRootMemoryCatalog` + `TeamRootMemorySource` | `agent_memory.md` |
| Team-only member target GraphQL type | `CollaborationMemberMemoryTargetSummary` (shared by teams and orgs) | both |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for explicit user verification.
- Notes: `git diff --check` is clean. C-14 (the AC-014 example rows in `requirements-doc.md`) is a ticket-artifact wording item owned by the Solution Designer. It does not affect the long-lived docs, which describe the implemented REQ-012 rule rather than those example rows.
