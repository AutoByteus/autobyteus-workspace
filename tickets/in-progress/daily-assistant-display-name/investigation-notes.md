# Daily Assistant display name — investigation notes

## Bootstrap
- Package: `daily-assistant-display-name`; owner: Solution Designer; date 2026-10-05.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-display-name`, branch `codex/daily-assistant-display-name`.
- Base: `origin/personal` @ `6d4f16ef2` (fetched 2026-10-05). Finalization target: `origin/personal`.
- Predecessor: `tickets/done/general-agent-identity` (approved SR-002, 2026-10-03), shipped by commit `8a4177f5b` and included in tags `v1.4.94-beta.3`, `beta.4`, `beta.5`.

## Request
User (2026-10-05, with a screenshot of the Agents page): keep the platform default agent's displayed name as **Daily Assistant** rather than **General Agent**. Non-technical users do not understand what "General Agent" means. The rest of `agent.md` (prompt, discovery behavior) does not have to change. The voice transcription said "data assistant"; the screenshot and the agent's previous name show this means **Daily Assistant**. The user will confirm this.

## Current state (origin/personal)
- `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md`: front matter `name: General Agent`, `description: General-purpose agent for practical tasks, with awareness of available specialist agents and teams.`, `role: General Agent`. Prompt line 7: `You are General Agent, a general-purpose agent for practical tasks and requests.`
- `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts:35`: `displayName: "General Agent"`.
- Stable id stays `autobyteus-daily-assistant` (`DAILY_ASSISTANT_AGENT_DEFINITION_ID`); the template dir is still `daily-assistant`.
- Before `8a4177f5b`: `name: Daily Assistant`, `role: General Agent`, prompt `You are Daily Assistant, a general-purpose assistant.`
- Lifecycle: the platform-owned built-in `agent.md`/`agent-config.json` are rewritten from the template on every server startup (`autobyteus-server-ts/docs/modules/agent_definition.md:139`). A rename therefore takes effect at the next startup without a migration. Historical run snapshots keep whatever name they captured (the predecessor package documents the same thing).
- Tests and docs that assert the display name "General Agent" (they would follow the name):
  - server: `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`, `tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts`, `tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts` (fixture name only)
  - web: `chatLaunchService.spec.ts`, `chatDraftStore.spec.ts`, `AgentWorkspaceView.spec.ts` (`New - General Agent` title), `ExistingRunConfigEditor.workspace.spec.ts`, `AgentDefinitionForm.spec.ts`, `AgentList.spec.ts`, `tests/e2e/chat-entry-live-probe.mjs` (also asserts the prompt SHA-256 `d410e6f6…`)
  - docs/comments: server `docs/modules/agent_definition.md`, `agent_communication.md`, `antigravity_cli_runtime.md`, `collaborator-candidate-policy.ts:63`; web `docs/chat.md`, `docs/agent_management.md`, `docs/skills.md`, `stores/chatDraftStore.ts` comments.
- Role is displayed on `AgentDetail.vue` (under the name) and on the running/remote cards.

## Open decisions for the user
- D-1: Is the exact name "Daily Assistant"? (Recommended yes.)
- D-2: Should the prompt's self-introduction line also say Daily Assistant? Recommended yes, otherwise the agent would tell users "I am General Agent" while the UI says Daily Assistant. This changes one line of the approved prompt and its hash.
- D-3: Description and role: recommend keeping `role: General Agent` (as in the user's screenshot) and the current description unchanged.

## Architecture investigation (post-approval, 2026-10-05)
- `grep "General Agent"` in server/web src: only template lines 2/4/7, registry `displayName`, and comments (`collaborator-candidate-policy.ts:63`, `chatDraftStore.ts`). No logic keyed on the name.
- `built-in-agent-bootstrapper.ts:126`: `displayName` only appears in the bootstrap result.
- The prompt hash `d410e6f6…` is asserted in `built-in-agent-bootstrapper.test.ts:324`, `general-agent-identity.e2e.test.ts:21` and `chat-entry-live-probe.mjs:210`.
- Template with the two approved edits (sed into /tmp/da-agent.md): diff is exactly lines 2 and 7; SHA-256 `49ed6e909ef92a470fb8b3fce84f471334cd125ff50adf2f5e6aff60389d07b7`.
- Decisions D-1–D-3 approved (see requirements-doc.md Status).
