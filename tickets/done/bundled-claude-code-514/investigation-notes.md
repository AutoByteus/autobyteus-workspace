# Investigation Notes

## Investigation Meta

- Package identifier: `bundled-claude-code-514`
- Request / ticket: Project Task `autobyteus-514` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager`; origin: FU-001 of autobyteus-483
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/bundled-claude-code-514`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/bundled-claude-code-514`
- Resolved base: `origin/personal` @ `e16f0b0d55eef513281503788ba1a597381a85e8` (fetched 2026-11-17)
- Finalization target: `origin` / `personal`
- Bootstrap result: OK; ticket folder `tickets/in-progress/bundled-claude-code-514/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-17, this conversation); the 234 provider-terms report `task-results/autobyteus-234-provider-subscription-terms/report.md` §2, §3.2, §4.
- Investigation status: complete for the recommendation; design not started (the founder decides first).

## Initial Request And Clarifications

- Original request: make Claude runs use the Claude Code bundled with the Agent SDK by default; remove PATH discovery and the bare-name fallback; decide on an override; verify builds, sign-in, catalog, availability, resume.
- Clarification (founder, Task comment 2026-11-17): "I'm not sure whether it's worth doing it, but send it to the software engineering team to find out." → investigation first, recommendation DO / DON'T / DO IN PART with a size; build only after he agrees; release only on his word.
- Constraint (PM notes, founder's rule): conform to the provider's terms; credentials stay with the Claude program and are never read or stored by AutoByteus; test on an isolated instance first.

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-11-17 | Code | `runtime-management/claude/client/claude-sdk-executable-path.ts` | env override (`CLAUDE_CODE_EXECUTABLE_PATH`/`CLAUDE_CODE_PATH`/`CLAUDE_CLI_PATH`) → `which claude` → bare `claude` |
| 2026-11-17 | Code | callers: `claude-sdk-client.ts:320`, `claude-sdk-control-query.ts:44` (catalog/usage), `runtime-availability-service.ts:95` (availability), `agent-runtimes/strategies/claude-agent-runtime-strategy.ts:60` (`resolveExecutable` for the Agent Runtimes card) | One resolver feeds runs, the model catalog, availability and the Settings card |
| 2026-11-17 | Code | `claude-agent-runtime-strategy.ts` | The Settings card treats the program as the user's install: `readVersion`, `readLatestVersion` (Anthropic's release feed and the user's `autoUpdatesChannel`), `updateArgv: [executable, "update"]`, `readSignIn` = `<exe> auth status --json`, `signInRoute: "commandLine"` with the comment "Anthropic does not allow third-party products to offer claude.ai login without approval (UD-006)", `installInstructionsUrl` |
| 2026-11-17 | Code | `runtime-availability-service.ts:92-103` | Without `claude` on the PATH the runtime is unavailable: "Claude Agent SDK executable 'claude' is not available." |
| 2026-11-17 | Doc | 234 report §3.2 | Anthropic allows "an end user … signing in to the **unmodified** Claude Code binary with their own Claude subscription"; "sign-in … must complete through Anthropic's own flow"; developers "may not collect, store, or intermediate" credentials; "The Claude Code binary must not be modified" |
| 2026-11-17 | Runtime | `evidence/probes-2026-11-17.md` P1–P9 | see below |
| 2026-11-17 | Code | `autobyteus-web/build/scripts/build.ts:285-300`, `macSigningPolicy.ts:110-124` | macOS packaging re-signs every nested Mach-O with AutoByteus's identity ("non-app nested code must be signed without entitlement payload") |
| 2026-11-17 | Code | `.github/workflows/release-desktop.yml:115-118, 245-300` | macOS x64 is built with `--x64` on `macos-15` (an Apple-silicon runner); pnpm installs only the host platform's optional package |
| 2026-11-17 | Contract | `claude-agent-sdk/package.json` `optionalDependencies` | eight platform packages (linux x64/arm64 glibc and musl, darwin x64/arm64, win32 x64/arm64) |
| 2026-11-17 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo:8,73-88` | The Docker server image installs `@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION:-latest}` globally, i.e. it also uses an installed program |

## Relevant Existing Behavior

| Behavior ID | Kind | Current Behavior | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| BEH-001 | System | Runs, catalog, usage, availability and the Settings card all use the user's installed `claude` | code | High |
| BEH-002 | User | Without an installed `claude`, Claude shows unavailable with install instructions | code | High (Read) |
| BEH-003 | User | Subscription sign-in happens in the user's terminal with their installed `claude` (UD-006); AutoByteus only reads `auth status` | code, 234 report | High |
| BEH-004 | User | The card shows installed vs latest version and offers `claude update` | code | High |
| BEH-005 | Operational | The desktop app ships the SDK's binary for its build host's platform (208 MB on macOS arm64), unused | P9, code | High |

## Runtime, Probe, Or Reproduction Findings

| Method | Observation | Established | Implication |
| --- | --- | --- | --- |
| P5–P7 (APP copy) | The copy inside the shipped macOS app crashes on every command except `--version` (`SharedArrayBuffer is not defined`); it cannot run a turn | Reproduced | Switching today breaks Claude for every macOS user |
| P2–P4 | Cause: packaging re-signed Anthropic's binary with AutoByteus's identity and only `allow-jit`; Anthropic signs it with `allow-unsigned-executable-memory` and `disable-library-validation`, which Bun needs | Read + Measured; cause inferred from the entitlement difference (not bisected) | A switch needs a packaging change (keep Anthropic's signature, or sign with its entitlements); re-signing also arguably makes it not the "unmodified binary" |
| P5, P7 (SDK copy) | Anthropic's copy reads the user's existing login and runs a turn | Reproduced | Login sharing works; AutoByteus reads no credentials |
| P8 | 2.1.280 resumed a session 2.1.325 created | Reproduced (one simple session) | Resume across a newer→older version works in the simple case; older binaries may not understand newer transcript features |
| Release workflow | macOS x64 build on an Apple-silicon runner likely ships the arm64 binary or none for x64 | Read, not run | Needs a check of a real x64 artifact if a switch is chosen |

- Temporary diagnostics: none in the repository; probe folder `/tmp/sd514` removed.
- Reproduction: `evidence/probes-2026-11-17.md` P5/P7 (APP copy crash).

## Stakeholder And User Evidence

| Source | Need / Constraint | Implication |
| --- | --- | --- |
| Founder | unsure it is worth it; wants a recommendation with size | decision is his |
| Founder's rule | provider terms; credentials stay with the Claude program | the bundled binary must stay Anthropic's unmodified binary; no AutoByteus login |

## External Contracts

| Dependency | Version | Constraint | Risk |
| --- | --- | --- | --- |
| Claude Agent SDK | 0.3.280 (CLI 2.1.280) | native binary per platform as optional dependency | packaging per platform |
| Claude Code installed | user's (2.1.325 here; Docker: `latest` at image build) | auto-updates on the user's machine | version varies per user |
| Anthropic terms | legal page (234 §3.2) | unmodified binary; own sign-in flow | re-signing question |

## Which versions users run

Not measurable: AutoByteus has no telemetry. Known: the founder's machine runs 2.1.325 (auto-updated; versions 2.1.319–2.1.325 present in `~/.local/share/claude/versions`); the Docker image runs whatever `latest` was at image build; desktop users without Claude Code installed cannot use the Claude runtime at all today.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| UNK-001 | Unknown | Does the Windows/Linux packaged copy start? (no signing change there, so probably yes) | only if a switch is chosen |
| UNK-002 | Unknown | macOS x64 build: which platform package it contains | only if a switch is chosen |
| UNK-003 | Unknown | Is the Anthropic-signed binary accepted by notarization when packaging leaves its signature? (third-party Developer ID + hardened runtime + timestamp normally is) | only if a switch is chosen |
| RSK-001 | Risk | An older bundled CLI resuming sessions the user's newer CLI wrote | P8 passed once |

## Requirement Implications

- The gain is smaller than the Task assumed: subscription users still need an installed `claude` to sign in (UD-006 keeps login in Anthropic's terminal flow), so "works without an install" helps API-key users only; the 30-minute surprise is already solved for both versions by 483.
- The cost is larger: the shipped macOS copy is broken by our signing, the macOS x64 build probably carries the wrong binary, and the Settings card (version, latest, update, sign-in) is built around the installed program.
- Independently of the decision: every desktop build carries a ~208 MB binary that is never used (and on macOS cannot run).
