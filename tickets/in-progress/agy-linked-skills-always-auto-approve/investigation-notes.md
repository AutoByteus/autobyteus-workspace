# Investigation Notes

## Investigation Meta

- Package identifier: `agy-linked-skills-always-auto-approve`
- Request / ticket: Critical — Chat (Daily Assistant, Antigravity runtime) fails on send with "Failed to prepare agent run 'daily_assistant_…'".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve` / `codex/agy-linked-skills-always-auto-approve`
- Resolved base remote / branch / revision: `origin/personal` @ `84224a58d8975d0b016af340e6b48e51d715af78` (fetched 2026-10-01; equals released `v1.4.92-beta.6` + delivery docs)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-002`
- Investigation status: Requirements (SR-001, approved 2026-10-01) and architecture investigation (SR-002) complete.

## Initial Request And Clarifications

- Original request: "I clicked chat, attached one image, sent, but got errors. Look at the logs and find out why. This is a critical error." Screenshots: Chat page with model `Gemini 3.8 Flash (Medium) · Antigravity`, `Temp workspace`, `Auto-approve`; resulting run `daily_assistant_9eca3e05c30d4558bf7ddc28ae5cfdae` shows "Failed to prepare agent run".
- Clarifications received (2026-10-01 conversation):
  1. User suspected beta.6 regression; evidence showed the check is older (v1.4.81/v1.4.86) and the trigger is a `.venv` created on 2026-09-29 19:17 (see Source Log).
  2. User asked why AGY copies whole skill folders instead of linking like Codex/Claude Code. Probe showed AGY accepts a symlinked skill folder.
  3. User stated: "for antigravity it's always auto approve on." Code showed it is a default, not enforced; the user agreed to make it always on.
  4. User agreed to the recommended direction: link skills, Antigravity always auto-approve, ALL_INSTALLED skips bad skills, explicit skills fail with a clear message.
  5. User confirmed old runs with copied skills need no special care ("we just don't care about them anymore").
- User-supplied facts and constraints: Antigravity should behave as always auto-approve.
- Initial ambiguity: Whether the attached image was causal — resolved: not causal (failure occurs in backend creation before message content is read).

## Product And Domain Understanding

- Product area: Agent runtime execution — Antigravity CLI (`antigravity_cli`) backend; skill exposure; launch configuration (auto-approve).
- Affected actors or systems: Desktop/web user starting Chat or any AGY agent/team/org run; built-in Daily Assistant (`skillScope: ALL_INSTALLED`); skill authors whose skills create local environments.
- Existing user or operational purpose: Chat lets the user talk to the Daily Assistant with "all your skills available" on a chosen runtime/model.
- Relevant terminology:
  - **Capsule**: per-run private AGY project folder under run memory (`<memoryDir>/agy-project`), containing `.agents/agents/<agent>/agent.md`, `.agents/mcp_config.json`, `.agents/skills/<name>`.
  - **ALL_INSTALLED / CONFIGURED skill scope**: agent definition `skillScope`; ALL_INSTALLED exposes every enabled catalog skill (weak request), CONFIGURED exposes the named `skillNames` (explicit request).
  - **Auto-approve** (`autoExecuteTools`): launch flag; for AGY maps to `--dangerously-skip-permissions`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-01 | Runtime | `~/.autobyteus/server-data/logs/server.log` grep `daily_assistant_9eca3e05…` | Locate failure | Only `SEND_MESSAGE command not accepted … [ACTIVATION_FAILED] Failed to prepare agent run …`; no cause | Look in Electron log |
| 2026-10-01 | Runtime | `~/.autobyteus/logs/app.log` lines ~4262–4330 (excerpt in `probes/app-log-excerpt-2026-10-01.txt`) | Full stderr | `Unexpected failure while preparing agent run … for runtime 'antigravity_cli'. Error: AGY_SKILL_SOURCE_PROVENANCE_INVALID` at `configured-agent-skill-resolver.js:161` ← `SkillService.resolveConfiguredSkillBindingsForAgentDetailed` ← `AgyAgentRunBackendFactory.createBackend` ← `AgentRunManager.prepareCandidateOnce`. Same for `daily_assistant_921fb25b…` seconds earlier. | Map line 161 |
| 2026-10-01 | Code | `/Applications/AutoByteus.app/Contents/Resources/server/dist/skills/services/configured-agent-skill-resolver.js:155-161` | Exact throw | Line 161 is the rethrow after `assertConfiguredSkillSourceSafety` fails with a non-TOO_LARGE error | Read safety walk |
| 2026-10-01 | Code | `autobyteus-server-ts/src/skills/services/configured-skill-source-fingerprint.ts` | Safety walk rules | Walk follows every file/symlink; any entry whose realpath leaves the trusted root, is not a regular file, is broken, or >32 MiB throws | Find offending skill |
| 2026-10-01 | Code | `autobyteus-server-ts/src/skills/services/skill-discovery.ts:184-232` | Trusted root for global skills | Global skill `trustedRoot = skill.rootPath` (the skill folder itself) | — |
| 2026-10-01 | Data | `~/.autobyteus/server-data/agents/autobyteus-daily-assistant/agent-config.json` | Daily Assistant scope | `"skillNames": []`, `"skillScope": "ALL_INSTALLED"` (template `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent-config.json`; replaced on every startup since `f85525ce5`/v1.4.92-beta.4) | — |
| 2026-10-01 | Command | `node probes/agy-skill-scan.mjs <AUTOBYTEUS_SKILLS_PATHS…>` | Find failing skill | Only `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation` fails: `.venv/bin/python{,3,3.13}` → `~/.local/share/uv/python/cpython-3.13.12-macos-aarch64-none/bin/python3.13` (outside), and `.venv/.../playwright/driver/node` > 32 MiB. 14 other global skills pass. | — |
| 2026-10-01 | Code | `~/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser` | Origin of `.venv` | Launcher runs `uv` against the skill's own `pyproject.toml`/`uv.lock` in `PROJECT_ROOT` (the skill folder), creating `.venv` there on first use. `.venv/` is git-ignored. `.venv` mtime 2026-09-29 19:17:51. | — |
| 2026-10-01 | Command | `git tag --contains` for AGY/skill commits | Which release introduced what | AGY baseline `03bf9a370`/`42ec93de0` → v1.4.81; snapshot/fingerprint `84f8fa569`, `33a926187`, `dd9efb39b` → v1.4.86; `skillScope`/ALL_INSTALLED + Daily Assistant `770b14651`, `da1033860`, `ec31ff371`, `b7336203a` → v1.4.91-beta.10; beta.5→beta.6 only `cb7688c4e` (AGY MCP tool presentation) in these areas | Not a beta.6 regression |
| 2026-10-01 | Data | `~/.autobyteus/server-data/memory/agents/daily_assistant_*/run_metadata.json` | Run history by runtime | Last AGY Daily Assistant runs before failure: 2026-09-29 18:07 and 18:10 (before `.venv` existed at 19:17). Subsequent Chat runs used `claude_agent_sdk`. Next AGY Chat runs: 2026-10-01 20:30 (both failed). `professor`/`student` AGY runs succeeded on beta.6 today (CONFIGURED scope, no browser-automation). | — |
| 2026-10-01 | Doc | `tickets/done/antigravity-cli-runtime-redesign-20260924/design-spec.md` (lines 42, 156, 175, 272) | Why AGY copies | Copy chosen to: not write links into the user project; not preserve broken/escaping links in the capsule; support team-private skills with file links into team `shared/`. No probe of a symlinked skill folder was recorded. | Probe |
| 2026-10-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts`; `codex/codex-workspace-skill-materializer.ts` (`[".codex","skills"]`), `claude/claude-workspace-skill-materializer.ts` (`[".claude","skills"]`) | How Codex/Claude expose skills | One directory symlink `<workspace>/<.codex|.claude>/skills/<name>` → skill source folder; checks only `SKILL.md` presence, link state and collisions; no per-file walk. | — |
| 2026-10-01 | Command | `python3 probes/agy-symlink-skill-probe.py` (agy CLI, `gemini-3.8-flash-low`) | Does AGY follow a symlinked skill folder | See Runtime findings PRB-001..003 | — |
| 2026-10-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts:29`; `backend/agy-agent-run-backend-factory.ts:77` | Auto-approve mapping | `--dangerously-skip-permissions` only when `autoExecuteTools`; init check requires `permission_mode: always-proceed` only when on | — |
| 2026-10-01 | Code | `autobyteus-web/utils/agentRunRuntimeDraftPolicy.ts`; consumers `agentRunConfigStore.ts`, `agentOrgRunConfigStore.ts`, `teamRunLaunchConfigEdit.ts`, `useDefinitionLaunchDefaults.ts`, `AgentRunConfigForm.vue`, `TeamScopeConfigEditor.vue` | Is AGY auto-approve forced | Only defaults to `true` on new runtime selection; toggle remains editable. Help text (`agy_auto_approve_tools_help`, mobile card): "When off, denied actions cannot be approved in chat." | — |
| 2026-10-01 | Code | Toggle surfaces: `components/chat/ChatNewSurface.vue:65` (`ChatApprovalToggle`), `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue`, `AgentOrgRunConfigPanel.vue`, `ExistingRunConfigEditor.vue`, `mobile/MobileLaunchRunOptionsCard.vue` | UI scope | All places where AGY auto-approve can currently be turned off | Architecture to confirm complete list |
| 2026-10-01 | Code | `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-run-capsule.ts:70-90` (`restoreAgyRunCapsule`) | Old-run continuity | Restore checks `manifest.skills[*].relativePath === .agents/skills/<name>` and `fs.stat(<capsule>/<relativePath>/SKILL.md).isFile()`; no fingerprint check. Old copied capsules pass unchanged. A linked skill whose source was removed would throw `AGY_CAPSULE_INVALID: configured skill missing.` | Design must decide restore tolerance (REQ-005) |
| 2026-10-01 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:370-387` | Error surfacing | Non-`AgentCreationError` causes are logged to stderr and wrapped as generic `Failed to prepare agent run '<id>'.`; cause not in UI | REQ-006 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Chat page → Antigravity model → send | Run created → AGY backend resolves every installed skill with per-file safety walk → copies each into capsule → starts `agy` | Any single installed skill with an outside link / non-regular file / >32 MiB file makes every AGY Chat send fail with generic "Failed to prepare agent run" | app.log trace; skill scan | High |
| BEH-002 | User | Start AGY agent/team/org run whose definition names skills (CONFIGURED) | Same detailed resolution for named skills; semantic problems (missing/malformed manifest, name mismatch) are skipped with warning; safety problems throw | Run fails generically on a safety problem | `configured-agent-skill-resolver.ts`, `agy-configured-skill-materializer.ts:145-152` | High |
| BEH-003 | System | Codex / Claude runs | One directory symlink per skill into workspace runtime folder | `.venv`, `node_modules`, large files inside skills are irrelevant | shared materializer | High |
| BEH-004 | User | Pick Antigravity in any launch form | Auto-approve defaults on; user may turn it off; server passes `--dangerously-skip-permissions` only when on | With off, headless AGY auto-denies permission-requiring actions; chat cannot approve | `agentRunRuntimeDraftPolicy.ts`, `agy-stream-process.ts:29`, help text | High |
| BEH-005 | User | Reopen/continue an existing AGY run | Restore reuses existing capsule; checks `SKILL.md` exists per manifest skill | Old copied capsules restore | `agy-run-capsule.ts:70-90` | High |
| BEH-006 | User | Any AGY preparation failure | Manager wraps unexpected errors into generic message; detail only in app.log/stderr | User cannot see which skill/rule failed | `agent-run-manager.ts:370-387`; screenshot | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `skills/services/configured-agent-skill-resolver.ts` (`resolveForAgentDetailed`, `resolveInstalledRecordDetailed`, `resolveDetailedCandidates`, `assertDetailedCandidateProvenance`) | AGY-only detailed resolution with provenance, safety walk, fingerprint | Source of the failure | Remove AGY-only path; reuse regular `resolveForAgent` / `bindInstalledRecord` used by Codex/Claude? |
| `skills/services/configured-skill-source-fingerprint.ts` | Safety walk + SHA-256 tree fingerprint | Only used by AGY resolver + materializer | Delete if no other consumers (grep shows none) |
| `skills/services/skill-service.ts:262-275` | `resolveConfiguredSkillBindingsForAgentDetailed` (ALL_INSTALLED maps every record through detailed resolution) | Weak scope currently fails hard | Replace with regular bindings |
| `skills/domain/configured-agent-skill-binding.ts` | `DetailedConfiguredSkillResolution` type | AGY-only type | Remove or reduce |
| `agent-execution/backends/antigravity/capsule/agy-configured-skill-materializer.ts` | Snapshot copier (~150 lines), workspace collision policy, skip logging | Replace copy with link | Keep collision/skip logic; link target = skill root |
| `agent-execution/backends/antigravity/capsule/agy-run-capsule.ts` | Capsule create/restore; manifest `skills[{name, relativePath}]` | Manifest shape can remain | Restore tolerance for missing linked skill |
| `agent-execution/backends/shared/workspace-skill-collision-policy.ts` | `ALL_INSTALLED → prefer_workspace`, else `fail` | Existing weak/strong precedent | Same scope → skip vs fail policy for unusable skills |
| `agent-execution/backends/antigravity/stream/agy-stream-process.ts`, `backend/agy-agent-run-backend-factory.ts` | Flag mapping + init permission check | Always pass flag for AGY | Always require `always-proceed` |
| `autobyteus-web` launch/config stores and components (see Source Log) | AGY auto-approve default/toggle | Lock on for AGY | Single policy helper for "AGY ⇒ on, locked" |
| `agent-execution/services/agent-run-manager.ts:370-387` | Generic wrapping | Specific user-visible message | AGY factory throws `AgentCreationError` with skill/rule detail? |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: capsule `.agents/skills/<name>` (today copied directory; proposed symlink); capsule `manifest.json` `skills` list; installed skill folders (read-only to us).
- Readers/writers: `createAgyRunCapsule` (writer), `restoreAgyRunCapsule` (reader), `agy` CLI (reader).
- Evidence paths: `agy-run-capsule.ts`, `agy-configured-skill-materializer.ts`.

### Structural Surfaces

- Runtime modules: AGY backend factory, capsule, stream process; shared skill resolver/service; agent run manager error wrapping; web launch config stores/components (agent, team, member override, org, chat new surface, existing run editor, mobile card).
- Existing structural surfaces that can support the approved behavior: regular `ConfiguredAgentSkillResolver.resolveForAgent` / `bindInstalledRecord`; shared `WorkspaceSkillLinks` link helpers; `workspaceCollisionPolicyForScope`; `agentRunRuntimeDraftPolicy.ts`.

### Potential Structural Impacts To Investigate

- API or external-contract change: Launch config `autoExecuteTools` semantics for `antigravity_cli` (server ignores `false`). GraphQL shape unchanged.
- Persistence schema or invariant change: None to schema; capsule skill entries become symlinks for new runs.
- Security or privacy boundary change: Yes — AGY no longer copies/validates skill files; AGY always runs with skip-permissions. User approved.
- Concurrency or lifecycle change: Restore behavior with missing linked skill.
- Deployment/migration/refactor: Removal of AGY-only detailed resolution and copier.
- Confirmed: present (security-boundary relaxation, AGY permission mode); absent (schema/migration).

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| PRB-001: `agy --new-project --agent capsule-probe --model gemini-3.8-flash-low --output-format stream-json --print …` with `.agents/skills/probe-answer` → symlink to folder outside capsule; **no** skip-permissions | Linked skill, auto-approve off | Skill discovered (2× `view_file`), reads **auto-denied**: "a tool required the read_file permission that headless mode cannot prompt for" | Linking requires auto-approve on | `probes/agy-symlink-skill-probe.py` (first variant) |
| PRB-002: same with `--dangerously-skip-permissions` | Linked skill, auto-approve on | `SUCCESS`, response contains SKILL.md marker **and** sibling `details.md` marker | Linking works for SKILL.md and sibling files | `probes/agy-symlink-skill-probe.py` |
| PRB-003: same, copied regular folder (control) | Copied skill, auto-approve on | Identical result to PRB-002 | Linking is behaviorally equivalent with auto-approve on | same |
| PRB-004 (historical): `tickets/done/antigravity-cli-runtime-redesign-20260924/agy-skill-discovery-probe/capsule_skill_present.*` | Copied skill, no skip-permissions | `SUCCESS`, marker found | Copied-in-capsule skills were readable with auto-approve off; linked ones are not → auto-approve-on is a prerequisite of linking | historical artifact |
| SCAN-001: `node probes/agy-skill-scan.mjs …` | All global skills vs current safety rules | Only `browser-automation` fails (`.venv`) | Real-world skill folders contain environments | `probes/agy-skill-scan.mjs` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-10-01) | Chat on Antigravity must not break; critical | Direct | REQ-001/003 | — |
| User | "Why not learn from Codex and Claude Code … link by symbolic link" | Direct decision | REQ-002 | — |
| User | "For antigravity it's always auto approve on" | Direct decision | REQ-004 | — |
| User | Agreed to recommended package incl. skip-in-Chat / fail-for-explicit | Direct decision | REQ-003 | — |
| User | Old copied-skill runs: "we just don't care about them anymore" | Direct decision | Data continuity: no dedicated compatibility work | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Antigravity CLI `agy` | Installed at `~/.local/bin/agy` (version as installed 2026-10-01) | Discovers `.agents/skills/<name>` including symlinked folders; headless denies out-of-project reads without skip-permissions | PRB-001..003 | Future CLI versions could change symlink handling — covered by live AGY test in validation |
| `--dangerously-skip-permissions` / `permission_mode: always-proceed` | AGY CLI | Required for linked skills to be readable | PRB-001/002; factory check | — |

## Persisted Data And State Facts

- Affected stored subject: AGY run capsules under `<memoryDir>/agy-project`.
- Location and representative shape: `.agents/skills/<name>/…` (copied dirs) + `manifest.json` `skills[{name, relativePath}]`.
- Approximate volume: User's run memory has a handful of AGY runs since v1.4.81.
- Current readers and writers: `createAgyRunCapsule`, `restoreAgyRunCapsule`, `agy`.
- Required semantics to preserve: none beyond what restore already does (user decision).
- Acceptable loss: Old runs need no dedicated support; they happen to keep restoring because restore only checks `SKILL.md` presence.
- Saved run configs with `autoExecuteTools: false` for AGY: will run with auto-approve on (user accepted).
- Remaining evidence gap: None material.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.
- UI change is limited to locking an existing toggle with an explanatory note; no Product Team request.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/agy-symlink-skill-probe.py` | Solution Designer | Reproducible AGY linked-vs-copied skill probe | REQ-002/004 | AC-002, AC-004 | Current | Evidence only |
| `probes/agy-skill-scan.mjs` | Solution Designer | Scan installed skills against current AGY safety rules | REQ-001 | AC-001 | Current | Evidence only |
| `probes/app-log-excerpt-2026-10-01.txt` | Solution Designer | Failure stack trace | BEH-001 | AC-001 | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Removing per-file checks and enforcing skip-permissions relaxes the AGY security posture defined in the 2026-09-24 AGY design | Deliberate reversal | User approved direction; architecture review to confirm | Open (accepted) |
| RSK-002 | Risk | Linked skill content can change during a run / between resume | Run-start immutability lost | Same as Codex/Claude; user accepted | Accepted |
| UNK-001 | Unknown | Complete list of web surfaces that expose the AGY toggle | REQ-004 completeness | Architecture investigation | Resolved (see Architecture Investigation Findings) |
| UNK-002 | Unknown | Whether any non-AGY code consumes the detailed resolver / fingerprint | Clean removal | Architecture | Resolved: none |

## Architecture Investigation Findings

Recorded 2026-10-01 after SR-001 approval.

| Path / Command | Observation | Design Use |
| --- | --- | --- |
| `capsule/agy-configured-skill-materializer.ts:139-173` | Loop: `certified_absent`/`invalid_candidate` → warn-skip; name dedupe (case-insensitive) → `AGY_SKILL_NAME_COLLISION`; workspace `.agents/skills/<name>` exists → `fail` policy throws / `prefer_workspace` warn-skip; then `snapshotSkill` copy | Linker keeps dedupe + workspace-collision policy; replaces copy |
| `capsule/agy-run-capsule.ts` | `createAgyRunCapsule` cleans with `fs.rm(root,{recursive,force})` on error; manifest `skills` read only by restore | Restore tolerance; cleanup does not follow dir symlinks |
| `backends/claude/backend/claude-session-bootstrapper.ts:68-84`, `backends/acp/backend/acp-agent-run-backend-factory.ts:114-120`, `backends/codex/backend/codex-thread-bootstrapper.ts:241,387-402` | Regular bindings → `expose-resolved` / `reconcile-unresolved` | AGY adopts regular bindings |
| `skills/services/skill-service.ts:246-275` | ALL_INSTALLED filters disabled skills for both regular and detailed paths; CONFIGURED does not filter disabled in either | Regular path preserves disabled semantics |
| grep consumers (detailed path, fingerprint, `AGY_SKILL_SOURCE`) | `src`: AGY factory/capsule/materializer, skill-service, resolver, binding type; tests: `agy-agent-run-backend-factory`, `agy-production-live`, `agy-run-capsule`, `agy-configured-skill-materializer`, `skill-service*`, `skill-catalog-*`, e2e `agy-native-image-codex-skill`; docs `skills.md`, `antigravity_cli_runtime.md` | Removal set (UNK-002 resolved: no non-AGY runtime consumer) |
| grep `trustedRoot\|configuredRoot\|ConfiguredSkillSource` | Only skill-discovery (producer), installed-skill-record, binding type, resolver | Remove provenance fields |
| `agent-execution/errors.ts`; `agent-run-manager.ts:383-384`; `agent-run-command-coordinator.ts:118-121` | `AgentCreationError` rethrown unchanged; message → chat `ACTIVATION_FAILED` and server log line | REQ-006 via `AgentCreationError` |
| grep `permission\|autoExecute` in `backends/antigravity` | Only argv flag + init check; converter maps denials to TOOL_DENIED | Enforce in process/factory only |
| web grep `autoExecuteTools` components | `ChatNewSurface`/`ChatApprovalToggle`, `AgentRunConfigForm`, `TeamRunConfigForm`, `TeamScopeConfigEditor`, `MemberOverrideItem`, `AgentOrgRunConfigPanel`, `ExistingRunConfigEditor`, `MobileLaunchRunOptionsCard`, `MobileRunSetup`; i18n keys `*.agy_auto_approve_tools_help` (en, zh-CN) | UNK-001 resolved: surface list |

## Requirement Implications

- The failure is caused by AGY-only per-file copying/validation of skill folders, combined with ALL_INSTALLED treating every installed skill as a hard requirement → REQ-001, REQ-002, REQ-003.
- Linking works only with auto-approve on (PRB-001 vs PRB-002), and the user wants AGY always auto-approve → REQ-004.
- Generic error hid the cause → REQ-006.
- Restore currently requires each manifest skill's `SKILL.md`; with links, a deleted source would block resume → REQ-005.

## Notes For Architecture Design

- Map SCN-001..SCN-005 to: AGY factory/capsule create; restore; launch config (server + web); error surfacing.
- Prefer reusing regular resolver bindings and shared link helpers over a new AGY-specific mechanism.
- Link target location stays inside the capsule (never the user's selected workspace).
- Keep the existing ALL_INSTALLED/CONFIGURED strength split (`workspaceCollisionPolicyForScope`) as the single source of request strength.
