# Investigation Notes

## Investigation Meta

- Package identifier: `grok-release-smoke-551`
- Request / ticket: Project Task `autobyteus-551` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551`, `codex/grok-release-smoke-551`
- Base: `origin/personal` @ `df00f97aaa` (fetched 2026-11-22)
- Finalization target: `origin` / `personal`
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md` (re-read after the 2026-11-22 skill update), `SKILL.md` (updated), `templates/requirements-doc-template.md` (update: evidence decisions), `references/finding-the-cause.md`, `references/ticket-scope.md` (this conversation).
- Status: root causes established for all three failure modes.

## Request

Founder (2026-11-22): find out what the problem with Grok is and fix it, so the release smoke passes Grok without a waiver. Three modes: (1) discovery 15 s / initialize 30 s time-outs under load (beta.1, .3, .4); (2) the model list changes mid-run, `RUN_MODEL_NOT_OFFERED` (beta.7 run 1, 563 FU-1); (3) AC-104 same-named skill (beta.7 run 2).

## Evidence (summary; details in `evidence/SD-probes-2026-11-22.md`)

### Mode 1 — time-outs under load

| Source | Finding | Established |
| --- | --- | --- |
| `tickets/done/release-v1.5.14-beta.4/evidence/delivery/pretag-grok-initialize-timing.txt` | direct initialize 3.3–6.0 s at load 45–75 between runs; beta.3: initialize time-outs at 16.5, 34.6, 31.4 s (load ~42) | Read (release evidence) |
| beta.4 smoke summaries | run 1: initialize time-out (restore, team member); run 2: "Grok Build model discovery timed out" (all three skipped) | Read |
| Grok log (P3) | the delay is one silent step inside Grok's own startup (between `startup.settings_get` and `auth.sleep.power_listener_init`): 5.2–22.9 s in the smoke window, 14–24 ms now (P1); not the auth lock, not the model fetch, not concurrency (P2) | Read + Measured |
| `autobyteus-server-ts/src/runtime-management/acp/acp-discovery-handshake.ts:8` (`DISCOVERY_TIMEOUT_MS = 15_000`), `acp-client-connection.ts:28` (`INITIALIZE_TIMEOUT_MS = 30_000`) | our bounds are below Grok's measured startup under load (≥ 34.6 s seen) | Read |
| `tickets/done/e06-delegation-wait-margin` | precedent: Antigravity bounds widened to ~2.5× the worst case seen (90 s for a 34 s worst case; discovery 15 → 30 s) | Read |

Cause: provider-side — Grok's startup has a step that can take tens of seconds on a loaded machine; our ACP bounds are too tight for it. Not reproducible on demand at today's load.

### Mode 2 — `RUN_MODEL_NOT_OFFERED`

| Source | Finding | Established |
| --- | --- | --- |
| P4 / P5 | Grok 1.0.92's built-in catalog is `[grok-4.6, grok-4.5]`; xAI's real catalog is `[grok-4.7]` | Reproduced |
| P6 | when Grok's model cache is stale, a new Grok process starts with the built-in list and fetches the real one ~0.3–0.5 s later; short-lived processes (beta.4 run 1 at 06:36:27Z, beta.7 run 1 at 07:11:46Z) end first | Read |
| `acp-discovery-handshake.ts` `runAcpDiscoveryHandshake` + `runtime-management/grok/grok-build-launch-profile.ts` `normalizeGrokBuildModels` | AutoByteus's Grok model discovery reads `initialize._meta.modelState.availableModels` from a short process it closes right after `initialize` | Read |
| P7 | no field in `initialize` says built-in vs fetched; with a fresh cache no `_x.ai/models/update` follows | Reproduced |
| beta.7 run 1 summary | `grok-4.5 (pinned grok-4.7 not offered)` → runs refused `RUN_MODEL_NOT_OFFERED` | Read |

Cause: our discovery takes Grok's start-up answer, which on a stale cache is Grok's built-in list (no grok-4.7, includes grok-4.5), and stops Grok before its refresh. Users see the same stale list in the model picker. This also answers 563 FU-1's "why does `grok models` change between calls".

### Mode 3 — AC-104 same-named skill

| Source | Finding | Established |
| --- | --- | --- |
| `~/.grok/docs/user-guide/08-skills.md:3` | "Startup discovery skips project skills and commands in untrusted folders." Trust: `--trust` or an interactive grant; it covers MCP, LSP, hooks, project instructions and project skills together (`10-hooks.md:86-88`) | Read (Grok docs) |
| P13 | in all AC-104 sessions the session-start skill list lacks the workspace skill; passing runs found it only by searching | Read |
| P8–P12 | default: not loaded; `GROK_FOLDER_TRUST=0` (process env): loaded, nothing persisted; `--trust`: loaded but a permanent `trusted_folders.toml` entry per folder; `[skills] paths` via `GROK_CONFIG`: not loaded | Reproduced |
| `backends/grok/grok-workspace-skill-materializer.ts` | AutoByteus links skills into `<workspace>/.grok/skills` expecting Grok to discover them; `grok-build-launch-profile.ts` launches without trust | Read |
| `runtime-management/claude/client/claude-sdk-setting-sources.ts` | Claude runs load the project's own settings (`settingSources` includes `project`) | Read |

Cause: Grok ignores the run workspace's `.grok/skills` at start because AutoByteus never marks the workspace trusted for Grok; the agent passes only when its own file search happens to find the workspace copy. A product gap (users' runs in folders they never trusted interactively in Grok), not test flakiness.

## Architecture Investigation (design phase, after approval)

| Source | Finding | Design consequence |
| --- | --- | --- |
| P15 (Grok log) | Grok holds its built-in list exactly while its sign-in token is expired: the first Grok start after ≥ 6 h without Grok use. It refreshes the token, starts the fetch, answers `initialize` (8 ms after the fetch started in beta.7) and announces the real list when the fetch succeeds (same second where logged). Every announcement carries the real list | A short wait after `initialize` for the announcement fixes the first discovery of the day; one stale discovery also refreshes Grok's token on disk, so the next start is fresh |
| P14 | Moving `models_cache.json` away does not reproduce it (Grok keeps the real catalog) | The live stale case cannot be produced on demand without touching Grok's sign-in files (forbidden); the live proof is the first Grok start after ≥ 6 h idle (AC-003) |
| P16 | `_x.ai/models/update` params have the same shape as `initialize._meta.modelState`; no `sessionId`; ~0.2 s after initialize when a session opens | One normalizer serves both; the notification is connection-wide |
| `acp-client-connection.ts:254-260` `routeExt` | connection-wide extension notifications (no `sessionId`) are dropped ("serve no run") | The connection needs a listener for them; runs register none |
| `acp-client-connection.ts:28,148,152,173,178,183` | `INITIALIZE_TIMEOUT_MS` (30 s) bounds `initialize` and also extension requests, `set_config_option`, `session/list`, `session/close` | Split: agent start-up 90 s; the other requests keep 30 s under a name that says what they are |
| `acp-discovery-handshake.ts:8,39` | `DISCOVERY_TIMEOUT_MS` 15 s bounds the whole short process, cut to a step deadline when one is given | Raise to 90 s; the wait for the announcement fits inside it |
| `grok-build-capability.ts:11,87` | `--version` and `agent --help` probes 3 s each; Antigravity's equivalent probes are 10 s (`antigravity-cli-capability.ts:10`, e06) | Raise to 10 s; a probe time-out reports the same `GROK_MODEL_DISCOVERY_TIMEOUT` code, so beta.4 run 2 may have been a probe |
| `run-model-selection-service.ts:93-104`, `read-deadline.ts:9` | G-5's stored-model check and the runtimes report use an 8 s step deadline; on time-out G-5 proceeds (`list_unreadable`) | Unchanged (preserved); run validation and the catalog snapshots (`llm-provider.ts:187`, `model-catalog-service.ts:178-206`) pass no deadline and get the usual bounds |
| `acp-session-launcher.ts:118-140` | run process env = `launch.env` + integration variables; cwd = the run's working directory; `initialize` through the connection | Trust goes into Grok's `runLaunch` env; the start-up bound applies to create, restore and team members alike |
| `tests/unit/runtime-management/acp/acp-layer-neutrality.test.ts` | the shared ACP layer may not name Grok / `_x.ai` | The method name and window come from the Grok capability |
| `acp-discovery-handshake.ts:70` | `runAcpDiscoveryHandshake` has one caller (`grok-build-capability.ts:115`); DeepSeek uses `runAcpSessionOptionsDiscovery` | Its signature can change without other callers |
| `docs/modules/grok_build_runtime.md:64,91-97` | documents the 15 s initialize-only discovery and the per-process switches | Updated in this change |

## Assumptions, Unknowns, Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| UNK-001 | Unknown | What Grok does in its slow startup step | Provider-side; not needed for the fix (bounds); could be raised with xAI |
| RSK-001 | Risk | Grok's catalog refresh taking longer than the discovery's settle window under load | The refresh is a fetch of ~0.2 s plus a token check; window chosen with margin; smoke shows it if not |
| RSK-002 | Risk | Trusting the workspace for Grok also loads the workspace's Grok hooks, MCP/LSP servers and AGENTS.md | DEC-003 (user) |

## Temporary diagnostics / cleanup

None in the repository. `/tmp/sd551` removed; Grok session folders of the probes removed; the `--trust` probe's trust-store entry removed.
