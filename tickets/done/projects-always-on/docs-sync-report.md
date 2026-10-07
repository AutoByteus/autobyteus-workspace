# Docs Sync Report — `projects-always-on`

## Scope

- Ticket: `projects-always-on` (SR-002 approved by the user; SR-003 adds the tab at the user's direction). Classification: `task_size=Medium`, `architectural_risk=Low`, direct route. Architecture review, source code review and test-code review are `Not Applicable — direct low-risk route`.
- Trigger: API-REV-001 Pass (95%) from `/api_e2e_engineer`.
- Bootstrap base reference: `origin/personal@93d1b18b4`.
- Integrated base reference used for docs sync: `origin/personal@93d1b18b4`. It was re-fetched at the start of delivery and had not advanced.
- Post-integration verification reference: no new base commits. Delivery smoke:
  - `node --check` passes on both probes;
  - `pnpm -C autobyteus-web test:nuxt components/projects stores utils/projects components/settings components/layout composables/projects --run` → 149 files / 1294 tests pass;
  - the hygiene check passes.

## Why Docs Were Updated

- Summary:
  - The implementation (`0fd265652`) updated:
    - server `docs/modules/projects.md`;
    - web `docs/projects.md`, `docs/settings.md` and `docs/workspace_layout.md`;
    - `autobyteus-web/AGENTS.md` and `TESTING.md`.
  - Delivery found two remaining gaps:
    1. `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` still described Project Task tool adapters as "available independently of the default-off Projects UI visibility flag". That flag is removed.
    2. The probe's PMU-015 (implementation) and PMU-016 (API/E2E) were not listed. `TESTING.md` still said PMU-001..PMU-014, and web `docs/projects.md` described cases only up to PMU-014.
- Why this should live in long-lived project docs: the MCP doc is the canonical tool-exposure contract. `TESTING.md` and `docs/projects.md` are the canonical validation descriptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Capability removal | No change (updated in `0fd265652`) | — |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Stale "default-off Projects UI visibility flag" | **Updated** | — |
| `autobyteus-web/docs/projects.md` | Always-on wording; probe cases | **Updated** (PMU-015–016) | The flag removal and PT-E2E-015 wording are already correct |
| `autobyteus-web/docs/settings.md`, `docs/workspace_layout.md`, `AGENTS.md` | Toggle card removed; Projects tab | No change (updated in `0fd265652`) | Other "global capability" mentions concern unrelated features |
| `autobyteus-web/README.md` | Feature-flag env list | No change | Lists only `ENABLE_APPLICATIONS` |
| `TESTING.md` | Rule 9 (baseline fixes), probe case list | **Updated** (PMU-001..PMU-016 plus 2 bullets) | Rule 9 itself came with the branch (`a28264b7f`) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Contract wording | The adapters do not depend on the Projects UI, which is always available on desktop and has no visibility flag | The flag is removed |
| `TESTING.md` | Validation | PMU range up to 016; PMU-015 and PMU-016 bullets | Coverage list current |
| `autobyteus-web/docs/projects.md` | Validation | PMU-015–016 paragraph (tab journey, Team/Org, constrained width) | Coverage list current |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Projects always on | No capability, setting or switch. A stored `ENABLE_PROJECTS` is ignored and deletable. Mobile runtime still hides Projects. | requirements DEC-001, design-spec | server/web `projects.md`, `settings.md` (implementation commit) |
| Projects tab | First right-panel tool on desktop, never a contextual default, kept across scope changes. Per-node remembered picker; compact boards; same stores and feed. | design-spec SR-003 | `workspace_layout.md`, `projects.md` |
| Baseline fixes | TESTING.md rule 9: fix test-side or small local baseline failures as labelled commits; report larger ones | `a28264b7f` | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `ENABLE_PROJECTS` / `projectsCapability` / `setProjectsEnabled` / `ProjectsFeatureToggleCard` / `/projects` capability middleware | Always available on desktop; runtime availability gate only | server and web `projects.md`, `settings.md`, MCP doc |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for user verification. The user must also decide on the product baseline fix `82960e903`.
