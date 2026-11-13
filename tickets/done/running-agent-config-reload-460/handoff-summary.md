# Handoff Summary — running-agent-config-reload-460 (autobyteus-460)

## What changed for the user

A running agent now takes skills that you add to its definition, and is told about skills added and removed. Before, a skill added on the agents page (or by editing the agent's package files) reached a run only the next time the run was created.

- **Added skill.** The run's runtime sets the skill up, as at run start, before the next thing the agent reads: a link in the workspace skill folder on Claude, Codex, Grok and DeepSeek (`.claude/skills`, `.codex/skills`, `.grok/skills`, `.dsh/skills`), a link in the run's own capsule on Antigravity. The agent then gets one platform notice with the skill's description and the path of its `SKILL.md`. It follows the skill without a restart. A busy run is told at once; an idle or stopped run is told with its next message (it is never woken). A stopped run that is started again hears about everything that changed while it was stopped, in one notice.
- **Removed skill.** The agent is told once that it is no longer available. Nothing is unlinked; that is a follow-up (FU-007).
- **GitHub added to a running agent.** The notice says its GitHub access starts when the run is restarted (stop it, then send a message). Nothing is granted to the running process; after the restart the access works.
- **Team members and delegated copies** of the agent hear it, each once.
- **Not changed:** a save that changes no skill, or a skill added and removed again before the next message, says nothing. Edits to an added skill's files are announced as before. AutoByteus native runs get the notice only; its system prompt is not changed mid-run (FU-006).
- **Claude detail.** Claude only watches its skills folder if it existed when the CLI process started, so Claude runs now make sure `<workspace>/.claude/skills` exists when they start. The folder was already created for every Claude run that had a skill; it now also appears in workspaces that never had one.

## Classification and route

- `task_size`: `Large`; `architectural_risk`: `High`; route: `Reviewed` (independent architecture review, then code review, API/E2E, post-API/E2E test-code review).
- Revisions: solution `SR-001`…`SR-004`; architecture review `ARCH-REV-001`…`ARCH-REV-003` (Pass); implementation `IR-001`, `IR-002`; code review `CRR-001` (Pass, 9.5/10), `CRR-002` (Pass); API/E2E `API-REV-001` (Pass, final confidence 95%); delivery `DR-001`.

## Code

- Server (`autobyteus-server-ts`, 39 production files changed, 2 new):
  - `agent-execution/backends/shared/run-workspace-skills.ts` (`RunWorkspaceSkills`): the single holder of a run's workspace skill links, preparation to release.
  - `AgentRunBackend.applyDefinitionSkills` and `AgentRun.applyDefinitionSkills`; Claude, Codex, ACP (Grok, DeepSeek) through the holder; Antigravity through `addAgyRunCapsuleSkills`; native a no-op.
  - `codex/codex-workspace-skill-request-planner.ts` (the `skills/list` rule, once).
  - `skill-update-notices/`: the `added` change kind and notice block, the tracker's current-definition handling and `applyDefinition`, the coalesced definition-change pass in `SkillUpdateNoticeService`.
  - Claude preparation ensures `<workspace>/.claude/skills` exists (SR-004).
  - Credential proxy: `RunPassRegistry.grantedIntegrationIds`, `IntegrationRunAccess.integrationsStartingOnRestart` (read only).
- Tests: unit and integration suites for each piece; new `tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts` (scripted AGY CLI, real server, team member and delegated copy, GitHub through the credential proxy); updated `tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` (live Claude, native, Codex, Grok, DeepSeek; stop between save and message; Claude without auto-execute).
- Docs: `autobyteus-server-ts/docs/modules/` `skill_update_notices.md`, `agent_execution.md`, `tool_list_updates.md`, `codex_integration.md`, `grok_build_runtime.md`, `deepseek_harness_runtime.md`, `antigravity_cli_runtime.md`, `credential_proxy.md` (implementation), `skills.md`, `agent_package_definitions.md` (delivery); `docs/design-cases.md` Cases 21 and 22.
- No data migration: `seen_skill_versions.json` is read as before.

## Integration and verification

- Base `origin/personal` moved from `7b8bcf932f` (bootstrap) to `ca0a8c0b5b` (8 commits of autobyteus-24, web only, none touching this ticket's files). Checkpoint commit `1e9a7a185d` (the reviewer's CRR-002 artifacts), then a merge of the base into the ticket branch (`dbd7462dc2`), clean. On the merged state: the three focused suites (30 tests), the whole `agent-execution` and `skill-update-notices` unit trees (1731 passed, 6 skipped) and the web notice card spec (9 passed) pass (`evidence/delivery/DEL-01-post-integration-checks.log`).
- Verified from the evidence (`release-deployment-report.md`, Verification): AC-001…AC-012 proven; live runs passed on Claude, native, Codex, Grok and DeepSeek (the agent answered the new skill's codeword, and again after stop and resume); AGY on the scripted CLI; the GitHub restart path against real GitHub through the credential proxy. No user check needed.

## Release

No release requested; the release guide's default is no release. This ships with the next beta or stable release. The change needs no action from users, so no `release-notes.md` was written.

## Not run / residual risk

- AGY was not run against a live `agy`: it would use the user's host login and write into their `agy` history. The scripted CLI reads the capsule as AGY does. Whether a real AGY model follows a skill linked mid-run is untested; the notice gives the path either way.
- The new notice text was not rendered in a browser; the card's label path is unchanged and its spec passes.
- On Claude without auto-execute, the CLI asked no approval for the first `Skill` call after a mid-run add (the design expected it might). The skill loaded.
- A skill added while an Antigravity run is stopped is not linked at its resume (FU-002, as designed); its notice gives the path.

## Follow-ups

`follow-ups.md`: FU-001 (runs sharing a workspace see each other's skills), FU-002 (AGY resume keeps first-start instructions and skills), FU-003 (GitHub skill wording), FU-004 (catalog changes for an agent with all installed skills), FU-005 (instruction and semantic-memory edits), FU-007 (unlink on removal) are not sent yet; FU-006 (native prompt-cache cost of updating the skill list) was sent to `/project_task_manager` on 2026-11-13. Delivery added none.
