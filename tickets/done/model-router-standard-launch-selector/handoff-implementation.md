# Handoff — Architecture Design Complete (autobyteus-313), direct implementation

- Package: `model-router-standard-launch-selector`, Project Task **autobyteus-313** in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` ("Model Router: choose its runtime, model and launch options with the app's standard selector"); follow-up FU-012 of autobyteus-32
- From: Solution Designer (run `solution_designer_ab383b2a28394f6ba52dde1f7083f5bd`); To: Implementation Engineer
- Date: 2026-10-27; Solution revision SR-001
- Classification: `Architecture Design Complete`, task_size **Medium**, architectural_risk **Low** → direct implementation (no independent architecture review); implementation self-checks, code review and API/E2E still apply per the team's route

## Request (the user's finding, 2026-10-27, on beta v1.5.9-beta.11)

On Settings → Model Routing → Configuration the Model Router's Runtime ("Claude") and Model ("Sonnet 5.5") are plain dropdowns; starting any other agent uses the app's grouped selector (runtimes with model counts, search, "claude-sonnet-5-5 Claude SDK", thinking level "High", other options). The router is a normal internal agent: same component, same stored launch configuration, same names on all four tabs.

**Task Done-when (carry forward):** "The Configuration tab uses the standard selector; the router starts with the stored launch configuration, including the thinking level; the names match the rest of the app on all four tabs; covered by tests; merged to personal." Constraints: the user's router configuration must not be lost (DESIGN.md rule 10); prove from a clean clone; no release unless asked.

## Approval basis

`requirements-doc.md` SR-001, Approved by the Solution Designer within the Task's direction (user informed 2026-10-27). No `Needs user` decision. Decisions DEC-001…DEC-004 are in the requirements.

## What to build (design-spec.md § Change Scope)

1. Server: added setting `AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG`; `ModelRouterLaunch.llmConfig`; validation on save through `RunModelSelectionService`; GraphQL `setModelRouterLaunch(…, llmConfig)` (clean cut); `ModelRouterAgent` creates the run with the settings and reuses it only when runtime, model and settings are equal (`model-router-agent.json` + `llmConfig`, absent = null).
2. Web: Configuration with `ChatModelMenu`, `ChatThinkingControl`, `ChatModelOptionControl` through a small `modelRouterLaunchControls` composable (model choice makes settings explicit like `chatDraftStore.setModel`; share `explicitChatModelConfig`, don't copy); remove the page's `RUNTIME_NAMES`; runtime names `runtimeKindToLabel`, model labels the menu's label pair, on Configuration, Decisions, Overview, Runtimes and the problem line (en, zh-CN).
3. Docs (`docs/model_routing.md`, `settings.md`) and a design case in `docs/design-cases.md`.

## Testing

Normal tests only (the user's standing direction): component tests per tab and state; server unit tests (settings read/write/validation, run reuse incl. a beta.11-shaped fixture for REQ-005); one live routing on one runtime with a thinking level set; a screenshot of Configuration beside the composer's model menu. Real keys only from the test vault (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`); never the user's running AutoByteus or `~/.autobyteus`.

## Artifacts (absolute paths)

- /Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector/tickets/in-progress/model-router-standard-launch-selector/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector/tickets/in-progress/model-router-standard-launch-selector/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector/tickets/in-progress/model-router-standard-launch-selector/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector/tickets/in-progress/model-router-standard-launch-selector/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector/tickets/in-progress/model-router-standard-launch-selector/follow-ups.md (FU-001)
- Normative UI context (autobyteus-32, Product-owned): /Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md

## Workspace

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector`, branch `codex/model-router-standard-launch-selector`, base `origin/personal` `1c54ffec6a`; ticket documents uncommitted; finalization target `origin/personal`.

## Route taken

- 2026-10-27: rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
