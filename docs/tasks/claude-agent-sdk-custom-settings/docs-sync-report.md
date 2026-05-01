# Docs Sync Report

## Scope

- Ticket: `claude-agent-sdk-custom-settings`
- Trigger: Delivery resumed after independent full code review Round 4 passed and API/E2E validation Round 4 passed for the full enabled Claude live/E2E suite.
- Bootstrap base reference: `origin/personal` at `5995fd8f4e6b6b8c4015e7e474998a47e099e089` (`docs(ticket): finalize Codex lifecycle delivery record`)
- Integrated base reference used for docs sync: `origin/personal` at `2686b6d3141a682f896dccc405c486ce908ad93d`
- Post-integration verification reference: Latest tracked remote base advanced to `2686b6d3141a682f896dccc405c486ce908ad93d` and was merged into the ticket branch after local checkpoint commit `db1e36be`. API/E2E Round 4 remains the latest authoritative validation pass, and post-merge user-test validation passed with `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac`.

## Why Docs Were Updated

- Summary: Docker and user-facing quick-start docs explain that Claude Agent SDK sessions automatically read Claude Code filesystem settings, and that Docker `user` settings resolve to `/root/.claude/settings.json` because the server process runs as `root` in the published image. Run-history module docs record that a supplied local-memory projection can be merged with runtime-native projection rows before fallback, preserving restored Claude team-member history.
- Why this should live in long-lived project docs: The feature changes runtime/operator expectations for Claude-backed sessions and the Local Fix made durable run-history projection behavior more precise. Users configuring DeepSeek/Kimi or other Claude Code gateway/model settings need durable documentation for where to place and persist settings, especially when using Docker. Maintainers need the run-history projection docs to reflect the actual local+runtime merge policy validated by the broad Claude suite.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/autobyteus-server-ts/docker/README.md` | Canonical Docker auth/runtime guide for the server image. | `Updated` | Documents automatic `user/project/local` settings sources and Docker `/root/.claude/settings.json` behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/README.md` | Top-level published Docker quick start that shows the `/root` volume. | `Updated` | Added a concise note that Claude Code auth/gateway/model settings persist through the mounted `/root` volume. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/autobyteus-server-ts/README.md` | Server package README with the same published Docker quick start. | `Updated` | Added the same concise Docker `user` settings note near the published image run command. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/autobyteus-server-ts/docs/modules/run_history.md` | Canonical module doc for run-history projection behavior. | `Updated` | Records local+runtime projection merge behavior that was independently reviewed in code review Round 4 and validated in API/E2E Round 4. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/docs/custom-application-development.md` | General application-development guide. | `No change` | Does not describe Claude Agent SDK runtime configuration, Docker server-user settings, or run-history projection ownership. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/autobyteus-server-ts/docker/README.md` | Runtime/operator behavior documentation | Added that Claude Agent SDK runtime sessions load Claude Code filesystem settings sources (`user`, `project`, `local`), and that Docker `user` settings normally live at `/root/.claude/settings.json`. | Prevents Docker operators from expecting host `~/.claude/settings.json` to be read without mounting/persisting the container server user's home. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/README.md` | Published Docker quick-start clarification | Added a short note after the Docker run command explaining automatic Claude Code filesystem settings and the `/root` volume. | The top-level quick start is likely the first doc users see when running the published image. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/autobyteus-server-ts/README.md` | Server package Docker quick-start clarification | Added the same short note after the Docker run command. | Keeps the package README aligned with the top-level quick start and canonical Docker guide. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-custom-settings/autobyteus-server-ts/docs/modules/run_history.md` | Durable module behavior clarification | Added that `AgentRunViewProjectionService` merges supplied local-memory projection rows before runtime-provider rows, de-duplicates exact row matches, and only then considers fallback. | Local Fix changed/validated restored Claude team-member projections preserving complementary local and runtime-native history. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Automatic Claude Code filesystem settings inheritance | Runtime turns load `user`, `project`, and `local` Claude Code settings sources; model discovery uses user-level settings. No Server Settings selector is introduced. | Requirements, design spec, implementation handoff, API/E2E validation report | `autobyteus-server-ts/docker/README.md` for full source behavior; top-level/server package READMEs for Docker `user` settings persistence. |
| Docker server-user home semantics | In the Docker image, Claude Code `user` settings belong to the OS user running the AutoByteus server process, normally root, so the path is `/root/.claude/settings.json` in the container. | Requirements, implementation handoff, API/E2E validation report | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Run-history local+runtime projection merge | A provided local-memory projection is merged with runtime-provider projection rows before fallback, preserving early local trace history plus later runtime-native history for restored team-member projections. | Implementation handoff, code review Round 4, API/E2E validation Round 4 | `autobyteus-server-ts/docs/modules/run_history.md` |
| Secret safety | Docs describe paths and behavior only; token-like configured values remain absent from long-lived docs and ticket artifacts. | API/E2E validation report secret-safety scan | All updated docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Omitted Claude Agent SDK filesystem `settingSources` for runtime/catalog paths. | Explicit SDK settings-source policy in `ClaudeSdkClient`: runtime `user/project/local`, catalog `user`. | Ticket artifacts and Docker docs; source/tests are the canonical implementation. |
| Project-skill-only `settingSources: ["project"]` branch / obsolete `enableProjectSkillSettings` source-control flag. | Runtime always includes `project` without dropping `user`; project skill behavior remains controlled by allowed `Skill` tool wiring. | Implementation handoff, code review report, API/E2E validation report. |
| Proposed Server Settings selector/card for Claude settings sources. | No UI selector/card; automatic inheritance is the product behavior. | Requirements and design spec; absence confirmed in validation report. |
| Richness-only choice between local and runtime projection rows. | Merge local and runtime projection rows before considering fallback. | `autobyteus-server-ts/docs/modules/run_history.md` and Round 4 ticket artifacts. |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is recorded against the latest merged `origin/personal` state (`2686b6d3141a682f896dccc405c486ce908ad93d`). Post-merge Electron build passed and finalization remains blocked only pending explicit user verification, per delivery workflow.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
