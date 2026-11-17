# Investigation Notes — phone-run-model-runtime-458 (autobyteus-458)

## Meta

- Package `phone-run-model-runtime-458`; Project Task `autobyteus-458` (with the founder's comments of 2026-11-17: analysis by the SD first, then the Product team's screen, then his approval, then implementation by this team)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458`, `codex/phone-run-model-runtime-458`; base `origin/personal` @ `a8ac226e65` (2026-11-17)
- Authorities read: requirements-engineering, ticket-scope (re-read after the 2026-11-16 update), finding-the-cause, handoff; `node_access_model.md`
- Evidence: the founder's screenshot (7:09): `marketing_content_creator`, "Stopped · in Marketing Team", his "Continue please"; no model/runtime entry anywhere

## What the phone can do today (Read)

| Source | Finding |
| --- | --- |
| `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue:2,46-50` | The ⋮ menu: Artifacts, Files, Activity, Messages (Team/Org members), VNC Viewer (Docker node with a node desktop). No run settings |
| `components/agentInput/MessagePrimaryActionButton.vue:11-41` (shared composer) | The phone can stop the current generation (interrupt), not stop the run |
| (no phone code reads `agentRunModelOptions`, `teamRunModelOptions` or the stopped-run mutations) | The phone shows neither the run's model nor its runtime |

## How the desktop changes a run's model and runtime (Read)

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-run.ts:304-340` | `agentRunModelOptions(agentRunId)`, `updateStoppedAgentRunSelection({ agentRunId, runtimeKind, llmModelIdentifier, llmConfig })` |
| `api/graphql/types/agent-team-run.ts:207-240` | `teamRunModelOptions(teamRunId)` per member scope; `updateStoppedTeamRunSelections({ teamRunId, selectionPatches[{ scopeAddress, runtimeKind, llmModelIdentifier, llmConfig }] })` |
| `api/graphql/types/agent-org-run.ts:140-143` | `updateStoppedAgentOrgRunConfig` for Org runs |
| `run-history/services/studio-run-model-config-service.ts:22,104-107,144-147`; `run-history/domain/run-model-config.ts` | **The node's rule: only a stopped run can change.** A running run answers `RUN_ACTIVE` (not editable); other outcomes: `RUN_ARCHIVED`, `NOT_FOUND`, `MODEL_UNAVAILABLE`, `MODEL_LIST_UNAVAILABLE`, `SCHEMA_UNAVAILABLE`, `VALIDATION_FAILED`, `PERSISTENCE_*` |
| `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue:25,44,81,169-176,234-240`; `composables/runSettings/useRunStopAction` | The desktop editor offers Stop for a running run (`useRunStopAction`), then the choices; delegated copies can change while the run is stopped or while it runs (only its copies then, SR-007) |
| `autobyteus-web/services/runConfigEditing/*` (drafts, options and mutation clients; about 1,250 lines) | The desktop's whole existing-run editing model lives in shared services the phone can reuse |
| `llm-management/services/run-model-selection-refusal.ts` | A chosen model that is not offered now is refused with plain words ("… is not offered by <runtime> now. Refresh the model list and choose again.") |
| autobyteus-316 / 348 (desktop) | The change applies when the run continues (the next message restores it with the new selection; a runtime change resumes from the Work Journal) |

## Usage limits (Read)

- `agent-tools/agent-runtimes/list-available-agent-runtimes-contract.ts:12`: the node knows each runtime's models and live usage limits (remaining percent, reset time; a model that cannot run now is `blocked: {by, until}`). The chooser can mark them (autobyteus-498 owns the limit stop).

## The phone key (Read)

- `autobyteus-server-ts/src/api/security/node-route-permissions.ts:49,94`: GraphQL is open to owner and phone credentials; autobyteus-441 (what a phone key may do) is not built. So a phone key can already call these queries and mutations today; the phone page just has no screen for them. When 441 limits phone keys, "stop a run and change its model and runtime" must be on the phone's allowed list: the founder's decision (DEC-001).

## autobyteus-53 (stopped run whose model is no longer offered)

- Today's code refuses only the *chosen* model when it is not offered (above); whether a stopped run whose *current* model vanished can switch is not proven by reading: `Unclear`, to be reproduced in the design. The founder's case (a model whose usage limit ran out) is a different case: that model is still offered.
