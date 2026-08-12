# User Verification Handoff — Carpenter Model

## Current Status

`Completed — finalized and released as v1.4.50.`

The reviewed implementation, durable coverage, requested live DeepSeek and
Codex validations, latest-base refresh, `AC-006` documentation sync, and the
README-guided local Electron verification package are complete. No unresolved
source, test-code, API/E2E, documentation, or local packaging finding remains.
The user accepted the hands-on verification state on 2026-08-12. The ticket is
archived, merged into `personal`, published as `v1.4.50`, and cleaned up. All
five documented tag-triggered workflows completed successfully; the initial
iOS UI-smoke attempt was recovered by one failed-job rerun without source or tag
changes.

## Delivered Behavior

- One server-owned Carpenter composer builds the stable semantic foundation for
  native AutoByteus, Codex, and Claude from the selected agent definition,
  exact absolute workspace, and optional validated team context.
- The ordered sections are Agent Identity; optional Team Instruction and Team
  Runtime; Working Environment; Bash Operating Practice; File And Directory
  Practice; and optional ordinary configured Skills.
- Agent Identity uses the selected definition name and optional description/body;
  the persisted role is not rendered, blank bodies do not duplicate description,
  and authored headings are contained beneath their owning section.
- Working Environment distinguishes the task workspace from skill package roots.
  Bash is the primary deterministic operating interface, with bounded,
  format-aware file/directory practice as its own fixed section.
- Native AutoByteus appends one terminal configured Skills metadata/path catalog
  and validates the final payload. Configured skill bodies remain lazy and tools
  remain separately authorized. Codex/Claude retain provider-specific skill
  discovery/materialization.
- Native uses `AgentConfig.systemPrompt`; Codex uses thread
  `baseInstructions`; Claude uses SDK query `options.systemPrompt` while user
  `prompt` remains user/context-file content.
- Valid team contexts automatically add exactly `send_message_to` and
  `delegate_task` to the deduplicated effective provider-native tool set, even if
  omitted from the agent definition. Other tools remain explicitly configured
  and availability/roster/context-gated.
- The generic core prompt-mutator list/default/pipeline/registry/public API,
  runtime-specific member prompt strategies, Claude turn-input instruction
  wrapper, and `systemPromptProcessorNames` server/API/web surface are removed
  without aliases or compatibility execution.
- Historical JSON supersets remain directly readable through normal current-field
  projection; current writes omit the retired field. No migration is required.

## Integrated State

- Recorded base/finalization target: `origin/personal`
- Bootstrap and latest fetched base:
  `023f4f550b07f27dbf388d55234a10b8eae0e0c7`
- Implementation commit: `cc8817fee1047504fea5c87bd69bb48ede287d88`
- Local reviewed-candidate safety checkpoint:
  `7d7574ae3b300ae21ef337cf9c671916d4b0d9bc`
- Divergence after refresh: ticket branch 3 ahead / 0 behind
- Integration method: already current; no merge/rebase and no conflicts
- Refresh evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-integrated-state-refresh.log`
- Delivery re-entry refreshes after `API-REV-002` and `API-REV-003`:
  `origin/personal` remained at the same base; no re-integration was required.

## Validation Evidence

- Source review: `CRR-002 Pass`, no findings.
- API/E2E baseline: `API-REV-001 Pass`, 97% confidence.
  - 23 deterministic files / 165 tests passed
  - updated durable boundary subset: 17 passed
  - 8 live Claude session cases and 1 live WebSocket subcase were explicitly
    provider-gated and are not reported as passes
  - server source-only TypeScript, core production build/runtime dependency
    verification, retired-source search, and `git diff --check` passed
- Proportional durable-test review: `CRR-003 Pass`, no findings.
- Requested real-provider validation: `API-REV-002 Pass`; final confidence 98%.
  - repository-supported built-server `deepseek.agent-flow`
  - real native AutoByteus backend and real `deepseek-v4-flash` transport
  - complete Carpenter prompt, assistant completion, turn completion,
    termination, and cleanup observed
  - 1 file / 2 tests passed
  - recognized credentials were imported through the value-safe dedicated test
    vault path; no secret values were logged
- Round-2 proportional test review: `CRR-004 Not Applicable`; no durable test
  file changed, and `CRR-003` remains authoritative for the five round-1 edits.
- Live evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-live-execution.log`
- Requested real Codex validation: `API-REV-003 Pass`; final confidence remains
  98%.
  - built production catalog confirmed exact `gpt-5.6-luna` availability
  - real GraphQL/backend/Codex App Server/WebSocket two-turn history and
    projection lifecycle passed
  - real configured-runtime-skill materialization and linked-guidance lifecycle
    passed
  - 2 files / 2 selected tests passed; the filtered skill file reported 19
    nonmatching cases skipped
  - the initial unavailable `tsx` probe was corrected to use already-built
    production JavaScript and is not a product failure
- Round-3 proportional test review: `CRR-005 Not Applicable`; no durable test
  file changed, and `CRR-003` remains authoritative for the five round-1 edits.
- Codex live evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-codex-live-execution.log`
- Latest base did not advance, so no redundant delivery rerun was required.
- Delivery docs/source validation: passed; evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-post-integration-check.log`

## Electron Verification Build

- README source: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-web/README.md`, section **macOS Build With Logs (No Notarization)**.
- Build command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac`
- Result: `Pass` (`delivery_electron_build_exit=0`)
- Flavor/version/architecture: enterprise / `1.4.49` / macOS arm64
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.49.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.49.zip`
- DMG SHA-256: `04012318bd93eb45b0d20c06690a9716a66f92563c1f2578239de46673a08845`
- ZIP SHA-256: `7ae9b6c942e165c26240d06aefa7021a6804afc25c9fec80f4c5b1e153708d14`
- Integrity: packaged executable is Mach-O arm64; bundle short/build version is `1.4.49`; `hdiutil verify` passed; `unzip -tq` passed.
- Build evidence: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-electron-build.log`
- Distribution boundary: this local verification package intentionally has no Developer ID signing or Apple notarization. It has only an ad-hoc/linker signature and must not be treated as a published release.

## Documentation Sync

`AC-006` is satisfied. Durable documentation now includes concrete examples of
agent-foundation authoring/runtime composition, exact Bash-first policy,
ordinary lazy skills, and provider-native tool contracts.

Primary updated docs:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/prompt_engineering.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_definition.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_execution.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_tools.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_communication.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/agent_team_execution.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-server-ts/docs/modules/codex_integration.md`

Canonical report:
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/docs-sync-report.md`.

## Suggested Hands-On Verification

1. Open/create/edit an agent definition and confirm the obsolete system-prompt
   processor control/detail is absent while name, description, body, skills,
   tools, and launch defaults still work.
2. Launch a standalone native run with a distinct workspace and configured skill;
   exercise a task that reads the lazy skill and uses Bash. Confirm task files
   stay in the workspace and skill-relative assets resolve from the skill package.
3. If Codex/Claude are available, launch the same definition and confirm stable
   identity/workspace semantics while normal user input is not wrapped with
   framework XML/runtime prose.
4. Launch a team whose member definition omits `send_message_to` and
   `delegate_task`; verify the member can still message an allowed recipient and
   delegate to an allowed target, while invalid selector/target calls remain
   rejected.

These checks exercise the user-visible contract. Model prose compliance is
stochastic; runtime payload, exposure, persistence, and filesystem invariants
are covered deterministically by retained evidence.

## Preserved Residuals

- Real native AutoByteus/DeepSeek and Codex/GPT-5.6 Luna runtime paths passed.
  Live Claude execution remains optional/gated; exact Claude provider-bound
  request payloads are covered deterministically.
- Live evidence remains limited to one macOS arm64 host; provider failure/retry
  was not deliberately induced.
- Full server and Nuxt typechecks retain the pre-existing documented
  repository/toolchain limitations; source-only server checking and affected
  mounted Nuxt tests passed.
- Historical prompts/sessions remain exact historical state rather than being
  rewritten into the Carpenter shape.
- Missing provider/materialization values fail through their owning bootstrap
  boundary; there is no eager-skill/text-manifest compatibility fallback.
- A pre-existing 529-effective-line migration utility remains a recorded
  non-blocking size risk; this ticket only removes three lines from it.

## Finalization Authorization

- Explicit acceptance: User message on 2026-08-12 — “now finalize and release a new version”.
- Finalization refresh: `origin/personal` remained at `023f4f550b07f27dbf388d55234a10b8eae0e0c7`; the ticket branch remains 3 ahead / 0 behind, so the accepted behavior state did not change and renewed verification is not required.
- Release version selection: `v1.4.49` is the current product release and remote `v1.4.50` is absent, so the documented normal next patch release is `v1.4.50`.
- Finalization result: ticket commit `b59cca99a66fd602f4e1c77439e50f3c02317457`; target merge `9f1f0afe3cb5bb536f305e777a4c0b9f6fdbb9a3`; release commit/tag target `8ddaad588c51c61eab31a86b782064c8b8ea0090` / `v1.4.50`.
- Publication: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.50
- Rollout: Desktop, Android APK, iOS App Store Connect, messaging-gateway, and server-Docker workflows all completed successfully.
- Cleanup: dedicated ticket worktree plus local and remote ticket branches removed; user-owned primary-checkout `.article-work/` preserved.

## Release Evidence

- Release helper: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/release-command-v1.4.50.log`
- Workflow status: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/release-workflow-status-v1.4.50.json`
- Workflow monitor: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/release-workflow-monitor-v1.4.50.log`
- Publication metadata: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/release-publication-v1.4.50.json`
- iOS retry record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/release-ios-recovery-v1.4.50.log`
- Cleanup: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/post-finalization-cleanup.log`

## Cumulative Artifact Package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/requirements.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-spec.md`
- Prompt supplements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/system-prompt-contract.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/agent-identity-prompt-spec.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/working-environment-prompt-spec.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/bash-operating-practice-prompt-spec.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/file-and-directory-practice-prompt-spec.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/team-and-runtime-prompt-spec.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/prompt-value-binding-spec.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/system-skill-decision.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/classroom-simulation-composed-system-prompt.md`
- Solution/design revisions: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/solution-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/architecture-review-revision-record.md`
- Implementation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/implementation-handoff.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/implementation-revision-record.md`
- Code review: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-report.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-revision-record.md`
- API/E2E: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-coverage-investigation.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution-coverage-report.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution.log`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-live-execution.log`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-codex-live-execution.log`
- Proportional test review: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-test-review-report.md`
- Delivery revision/reporting: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/docs-sync-report.md`, `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/release-deployment-report.md`
- Electron verification build: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-electron-build.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.49.dmg`, `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.49.zip`
