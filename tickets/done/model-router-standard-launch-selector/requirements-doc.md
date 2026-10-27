# Requirements Document — Model Router: standard launch selector (autobyteus-313)

## Document Status

- Status: `Approved` (SR-001)
- Current solution revision ID: `SR-001`
- Package identifier: `model-router-standard-launch-selector`
- Request / ticket: Project Task **autobyteus-313** "Model Router: choose its runtime, model and launch options with the app's standard selector" (follow-up FU-012 of autobyteus-32; the user's finding of 2026-10-27 on beta v1.5.9-beta.11)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-27
- Approved by and reference: the Solution Designer within the Task's direction (the user's own finding and words, quoted in the Task); user informed in the Solution Designer conversation, 2026-10-27. No `Needs user` decision.
- Exact approved requirements baseline: this document at SR-001.
- Behavior-defining supplements: none. The autobyteus-32 UI/UX specification stays normative for everything this ticket does not change (its § Visual Language permits "the product's existing model menu").

## Direction (Task autobyteus-313)

The Model Router is a normal internal agent, so its runtime, model and configuration use the **same component** and are stored as the **same launch configuration** as any other agent's: same names, same search, same thinking level, same options. Reuse the existing selector and launch-configuration model; no parallel dropdowns. The router starts with the stored launch configuration, including the thinking level. Names match the rest of the app on all four tabs (project vocabulary). The user's router configuration must not be lost; stored-setting changes follow DESIGN.md rule 10. Prove from a clean clone; no release unless asked.

## Problem And Desired Outcome

- Current (B-01, B-04, B-05, B-11, B-12): Configuration has two plain dropdowns (Runtime "Claude", Model "Sonnet 5.5"); only runtime and model are stored; the router runs on the model's default settings; the page uses its own runtime names ("Claude", "Codex") and the Runtimes tab the server's names, while the rest of the app says "Claude Agent SDK" and "claude-sonnet-5-5 Claude SDK".
- Desired: Configuration uses the app's model menu, thinking control and model-option controls; the router's launch configuration (runtime, model, model settings) is stored and used to start it; every runtime and model name on the page is the app's.

## Scope Guardrail

- In scope: the Configuration tab's router controls; the stored router launch (adding model settings); the router run's start/reuse with model settings; runtime and model names on Configuration, Decisions, Overview and Runtimes, and in the page's problem line.
- Out of scope: the router's workspace and auto-approve (fixed by autobyteus-32 REQ-003: its own internal workspace, auto-approve on), so the workspace and approval controls of the composer are not offered; names in agent-facing server texts (launch notes, tool output, English `reasonText`) — FU-001; the reviewers' optional Product notes on the Task comment (not requested by the user); learning from outcomes (autobyteus-314).
- Preserved: the user's current router runtime and model; the router's run and `knowledge.md` when the launch does not change; the switch, statuses and every other behavior of autobyteus-32.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Configuration chooses the router's runtime and model with the app's **model menu** (runtimes grouped with model counts, model search, the same model labels "<model> <runtime>"), its **thinking control** and its **model-option controls** (e.g. Codex Fast mode) — the same components as starting an agent and as run Settings. No native selects remain. Enabled only while Model Routing is on (as today). | BEH-001 | Must | User's finding; Task direction | N/A (existing components, B-02) | Task autobyteus-313 |
| REQ-002 | The router's **launch configuration** is runtime, model and model settings (`llmConfig`), the same fields as any agent's default launch configuration. Choosing a model makes its settings explicit as the composer does; thinking and option changes replace the settings. A save is validated with the same check as any agent launch (model offered, settings valid for the model) and refused with its message otherwise. | BEH-002 | Must | Same stored launch configuration | N/A (B-07, B-08) | Task; DEC-001 |
| REQ-003 | The router's run **starts with the stored launch configuration, including its model settings** (thinking level). The run is reused only while runtime, model and model settings all equal the stored launch; any change starts a new run (the previous run stays in history; `knowledge.md` carries over). A run recorded before this change (no settings recorded) counts as "no settings". | BEH-002 | Must | Router starts with the thinking level | N/A (B-05, B-09) | Task; DEC-002 |
| REQ-004 | **Names**: wherever the Model Routing page names a runtime it uses the app's runtime name (e.g. "Claude Agent SDK", "Codex App Server"); wherever it names a model with its runtime it uses the model menu's label (e.g. "claude-sonnet-5-5 Claude SDK"). Applies to Configuration, Decisions, Overview, Runtimes and the problem line, in English and Simplified Chinese. | BEH-003 | Must | "the names match the rest of the app on all four tabs" | N/A | Task; DEC-003 |
| REQ-005 | **Continuity**: the user's existing router runtime and model keep working unchanged after the update, with no migration step; until the user changes it, the router runs with no explicit model settings, as before. | BEH-002 | Must | "the user's own router configuration must not be lost" | N/A (B-14) | Task; DEC-001 |

## Acceptance Criteria

| AC ID | Related REQ | Trigger | Observable Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Open Configuration with Model Routing on | The model menu (grouped runtimes, counts, search), the thinking control and the option controls appear; choosing works; no native select | Web test; screenshot |
| AC-002 | REQ-002 | Choose Claude Agent SDK / claude-sonnet-5-5, thinking High | Stored launch has runtime, model and `llmConfig` with the thinking level; reload shows it; an invalid settings value is refused with the validator's message | Server + web tests |
| AC-003 | REQ-003 | Route a delegation after AC-002; then change only the thinking level and route again | The router run's config carries the thinking level; after the change a new run starts with the new level; `knowledge.md` unchanged; with no change the same run is reused | Server test; live routing on one runtime |
| AC-004 | REQ-004 | Open all four tabs with decisions recorded on several runtimes (en, zh-CN) | No "Claude"/"Codex"/"Grok"/"Antigravity" short page names; runtime names and model labels equal the composer's | Web tests per tab |
| AC-005 | REQ-005 | Start the new server on data written by v1.5.9-beta.11 (runtime + model set, router run recorded) | Status, Configuration and routing work; the existing run is reused; no migration ran | Server test with a fixture from the old shape |

## Decisions

| ID | Question | Reasoning And Decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | How to store the model settings | Add one setting for the router's model settings (JSON) next to the existing runtime and model keys. The three keys together carry exactly the launch-configuration fields (REQ-002); nothing is renamed, so DESIGN.md rule 10 needs no migration, and the user's runtime and model stay as they are (REQ-005). Folding the three into one new key would rename stored settings and need the first-ever server-settings migration (B-14) for no gain the user sees. | Solution Designer | Decided |
| DEC-002 | A change of model settings for a live router run | Existing runs change model or settings only while stopped (B-09); the router run is long-lived. Starting a new run on any launch change keeps one simple rule (the autobyteus-32 rule extended from runtime+model to the settings); its knowledge is in `knowledge.md`, so nothing learned is lost. | Solution Designer | Decided |
| DEC-003 | Which names | The app's two existing name functions in their existing roles (B-10): full runtime name where a runtime stands alone, the model menu's label where a model is named. The page's own name map is removed. The Runtimes tab shows the app's names too, instead of the server report's. | Solution Designer | Decided |
| DEC-004 | "Blocked until" in the model list | The app's model menu has no blocked marker (it is the same for every agent). A blocked router model keeps being reported by the problem line under the title (unchanged). | Solution Designer | Decided |

## Prerequisites

None.
