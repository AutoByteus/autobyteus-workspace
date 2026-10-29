# Investigation Notes — independent review of runtime-lifecycle-usability

## Investigation Meta

- Package identifier: `runtime-lifecycle-review` (independent review and continuation of the predecessor package `runtime-lifecycle-usability`)
- Request / ticket: Project Task "Runtime lifecycle usability (Settings → AI Runtimes …): the Solution Designer of a NEW team reviews the existing design independently, then continues", from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-20.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`
- Repository mode: Git
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`, branch `codex/runtime-lifecycle-design-review`
- Resolved base: `origin/personal` at `3d4d9d0a951d8ce164b7d1fc3528eb6ee90fd247` (fetched 2026-10-20)
- Finalization target: `origin/personal` (only if the user decides to build something)
- Bootstrap result: worktree created; predecessor worktree preserved first (E-R01)
- Bootstrap blocker: none
- Current solution revision ID: SR-001
- Authorities read (2026-10-20): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/handoff-references.md`, `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (base 3d4d9d0a95). Read before judging the design because the review judges a design.
- Investigation status: review complete; waiting for the user's direction.

## Initial Request And Clarifications

- Original request (user, via Project Task Manager, 2026-10-20): "in the ticket worktree we have done one ticket but I have no idea whether it's finished or not … ask the solution designer to review the design … after that I want to continue to review the design. The reason is that it was done by another team. I'm not so sure whether the other team has done it good or bad."
- Direction from the Task: preserve the worktree first; review the requirements and design with fresh eyes against current `origin/personal`; report a plain verdict (sound / needs changes / redesign); continue reviewing with the user; no implementation until he approves requirements and design; never use the user's accounts or put credentials in tests.
- Predecessor goal (its approved requirements SR-012): non-technical users install, sign in, use and update Codex, Claude, Antigravity and Grok in Settings → AI Runtimes without a terminal or package manager.

## Source Log

| Date | Type | Exact source / command | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | Command | `git status`, `git stash list`, `git diff --shortstat` in the predecessor worktree | Record what is there before preserving | HEAD 63aac5939f; 176 status lines; 113 tracked files modified (+1,907/−1,861); 736 untracked non-ignored files; stash@{2} "runtime-lifecycle-reconcile-20261004T032444Z"; backup dir `…/.runtime-lifecycle-reconciliation-backups/20261004T032444Z` | E-R01 |
| 2026-10-20 | Command | temporary-index snapshot commit (see E-R01) | Preserve | branch created, worktree untouched | — |
| 2026-10-20 | Doc | predecessor `requirements-doc.md`, `design-spec.md` (576 lines, 142 KB), `analysis-result.md`, `authentication-feasibility.md` | The subject of the review | see E-R16 | — |
| 2026-10-20 | Code | `autobyteus-server-ts/src/runtime-management/runtime-availability-service.ts`, `claude/client/claude-sdk-executable-path.ts`, `claude-sdk-client.ts` (base 3d4d9d0a95) | How engines are found today | E-R06 | — |
| 2026-10-20 | Runtime | `/Applications/AutoByteus.app` 1.5.7-beta.4 bundle; `…/claude-agent-sdk-darwin-arm64/claude --version` | Does the app already carry an engine? | E-R05 | — |
| 2026-10-20 | Command | `npm view @openai/codex version optionalDependencies` | Can Codex be bundled like Claude? | E-R07 | — |
| 2026-10-20 | Command | `--help` of `claude auth`, `claude update`, `codex login`, `codex update`, `grok login`, `grok update`, `agy`, `agy update`; `--version` of each | What vendors already provide | E-R08 | No login/update was executed |
| 2026-10-20 | Web | https://code.claude.com/docs/en/agent-sdk/overview ; https://learn.chatgpt.com/docs/app-server | Provider sign-in policy | E-R09 | — |
| 2026-10-20 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Is there a real authority boundary to defend? | E-R10 | — |
| 2026-10-20 | Command | `git log 63aac5939f..origin/personal` on runtime/settings paths; `comm` of changed-file lists | Drift since the predecessor base | E-R02, E-R11–E-R13 | — |
| 2026-10-20 | Code | predecessor untracked `runtime-qualified-sources.ts`, `runtime-use-lease-registry.ts`, file search for a release catalog | Would the built feature actually work? | E-R04 | — |

## Evidence (each says how it was established)

- **E-R01 Preservation (done, measured).** Commit `96843635293273109d1d50bdd3e4c513c0c80832` on local branch `preserve/runtime-lifecycle-usability-wip-20261020`, parent `63aac5939f1ebcfb691f796990739a3e94fd5f45`. Created with a temporary `GIT_INDEX_FILE` (`read-tree HEAD`, `add -A`, `write-tree`, `commit-tree`), so the worktree's own index and files were not touched: 176 status lines and HEAD identical before and after. Content: 849 files = 113 modified tracked + 736 untracked non-ignored (ticket docs/evidence, new server/web/core source, a new `autobyteus-runtime-management-contracts` package, and 52 build-output files under `autobyteus-application-sdk-contracts/dist`). Ignored build outputs (`dist/`, `.nuxt/`, `electron-dist/`, build icons) are regenerable and not included. A credential-pattern scan over the untracked files found only false positives (task names such as `task-delegation-api-surface`). Stash@{2} and the backup directory were left as they are. The branch is local only (not pushed).
- **E-R02 Drift (measured).** Current `origin/personal` (3d4d9d0a95) is 1,715 commits after the predecessor base. 78 of the 113 tracked files the predecessor modified have also changed upstream, including `codex-thread-manager.ts`, `claude-session*.ts`, `agy-stream-process.ts`, `agent-provider-factory-builder.ts`, `build-studio-server.ts`, `codex-app-server-launch-config.ts`, `claude-sdk-client.ts`, `runtime-availability-service.ts`.
- **E-R03 Predecessor implementation size (measured).** About 4,500 lines of new non-test TypeScript/Vue source plus tests (≈8,200 lines of untracked ts/vue/mjs/json outside tickets/dist), and 1,907/1,861 lines changed in existing files across server execution backends, composition, Electron server managers, core terminal and web.
- **E-R04 The predecessor feature ships switched off (read).** `createQualifiedRuntimeDeployment` (the only assembly of catalogue, downloader, payload store and auth adapters) is not called from production composition; no release catalogue file exists anywhere in the worktree; the lease registry returns `qualificationUnavailable` when no closure-qualification IDs are configured; the file's own comment says "The product default stays gated until vetted assets exist." The signing key, signed feed and per-provider qualification it depends on do not exist. Its last API/E2E round was Blocked at 67.9 % (predecessor `analysis-result.md`). No real install or sign-in was ever completed (predecessor docs say so repeatedly).
- **E-R05 The app already contains a working Claude engine (reproduced).** `/Applications/AutoByteus.app` (version 1.5.7-beta.4) contains `Contents/Resources/server/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280/…/claude`, 218,523,920 bytes; running it with `--version` prints `2.1.280 (Claude Code)`. The SDK (`@anthropic-ai/claude-agent-sdk` 0.3.280, a server dependency) lists optional platform packages for linux x64/arm64 (+musl), darwin x64/arm64 and win32 x64/arm64, so every desktop build gets its platform's binary.
- **E-R06 …but AutoByteus ignores it (read).** `resolveClaudeCodeExecutablePath()` tries env keys, then `which claude`, then the literal `"claude"`, and `claude-sdk-client.ts` (lines 391, 461) always passes it as `pathToClaudeCodeExecutable`, which overrides the SDK's built-in binary. `RuntimeAvailabilityService` marks Claude unavailable when that PATH lookup fails. A user who never installed Claude in a terminal therefore sees Claude as unavailable although a working engine is inside the app.
- **E-R07 Codex could be carried the same way (measured).** `@openai/codex` 0.163.0 has optional per-platform native packages for darwin/linux/win32 × x64/arm64. Codex is Apache-2.0 (predecessor investigation). Cost: each native engine is large (local binaries: codex 250 MB, claude 268 MB, agy 187 MB, grok 176 MB; installed app is 1.5 GB).
- **E-R08 Every vendor already ships install, update and sign-in (reproduced, help output only).** Local versions: Claude 2.1.302, Codex 0.163.0, AGY 1.4.2, Grok 1.0.62. All four live in the user's home folder without admin rights (`~/.local/share/claude/versions/…`, `~/.codex/packages/standalone/current`, `~/.local/bin/agy`, `~/.grok/bin/grok`), i.e. vendor installers already give a "private user-writable install without a package manager". Commands: `claude auth login [--claudeai|--console]`, `claude auth status --json`, `claude update`; `codex login [--device-auth]`, `codex login status`, `codex update` (plus app-server `account/login/start` with browser, device-code or API-key modes); `grok login [--oauth|--device-auth]`, `grok update [--check --json]`; `agy update`, no login subcommand (sign-in happens in the interactive `agy` session; current product text says "Run `agy` to sign in."). No login, logout or update was executed.
- **E-R09 Provider sign-in policy (fetched 2026-10-20).** Anthropic, Agent SDK overview: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods … instead." OpenAI, app-server docs: "If you've built a local or open-source application using Codex app-server authentication, you can continue using it" (Sign in with ChatGPT recommended); "App-server authentication has never been permitted for commercial or hosted services." AutoByteus is dual-licensed AGPL-3.0 / commercial (`LICENSING.md`).
- **E-R10 No new authority boundary exists to defend (read).** `classifyHttpRoute`: every `/ws/*` path (including the workspace terminal) is `TRUSTED_NETWORK_WEBSOCKET` and GraphQL POST is `TRUSTED_NETWORK_PROTECTED`; both are allowed for trusted-network peers without a credential. Any client that can reach the server can already open a shell on it or run an agent with shell tools. The existing `TRUSTED_NETWORK_OWNER` class already refuses paired-phone credentials.
- **E-R11 Part of the predecessor's latest round already landed (read).** `b5715ea5ba` (2026-10-03, "perf: scope runtime readiness and Org history updates") changed `runtime-availability.ts`, `RuntimeModelConfigFields.vue` and added selected-runtime readiness tests — the substance of predecessor SR-015.
- **E-R12 Sign-in reporting changed upstream (read).** `87b246c7de` (2026-10-12): AGY signed-out is classified (`AGY_SIGN_IN_REQUIRED`), the chat model menu shows "Unavailable" with the server reason and re-checks on open. The predecessor's BEH-001 ("unavailable providers filtered out") is partly outdated.
- **E-R13 Other upstream changes in the same files (read, commit log).** Codex multi-agent features disabled at launch (2026-10-05/06), private runtime skills/NFS refactor (2026-10-13/16), runtime skill exposure fix (2026-10-18), remote AutoByteus LLM provider removed (2026-10-12).
- **E-R14 The app already updates itself (read).** `autobyteus-web/electron/updater/appUpdater.ts`, `appUpdateController.ts`.
- **E-R15 Engines installed through the user's shell are already found (read).** `autobyteus-web/electron/utils/shellEnv.ts` loads the login-shell PATH for the embedded server.
- **E-R16 Predecessor design content (read).** Mechanisms: private parent/child IPC owner channel between Electron and server (replacing an earlier env-token scheme); a second data root beside server-data; exclusive controller lock; persisted per-provider "resource-admission fence"; OS boot-session UUID as proof that old processes are gone, with the user message "Restart this device to safely recover" (design-spec line 196); two execution policies (`boundRoot`/`operatorExternal`); lease registry with closure-qualification IDs; bundled catalogue plus Ed25519-signed AutoByteus recommendation feed and release tooling; suppression of vendor self-updaters; a new executable PTY in core; a new contracts package; refactor of all four execution backends, factories and composition. Process volume: 21 documents, 712 KB, design spec 142 KB, 26 solution-revision headings, 6 architecture reviews.
- **E-R17 Existing UI patterns (read).** Settings has `AgentPackagesManager.vue` (check-on-open + Update pattern the predecessor reused for AP-003) and `ProviderAPIKeyManager.vue`.

- **E-R18 Branch refreshed (measured, 2026-10-20 later).** `origin/personal` moved 9 commits to `9227d61597fd7ef8f6324fc9092be24ed1684c8a`; the task branch had no commits, so it was fast-forwarded (`git merge --ff-only`) and now equals the latest `origin/personal`.
- **E-R19 How each vendor tells us "a newer version exists" (reproduced, no install).**
  - Grok: `grok update --check --json` → `{"currentVersion":"1.0.62","latestVersion":"1.0.62","updateAvailable":false,"installer":"internal","channel":"stable","autoUpdate":true,"error":null}` — a clean check-only answer; Grok also updates itself.
  - Claude: `claude update` has no check-only option; the public npm registry reports `@anthropic-ai/claude-code` latest `2.1.304` while the local install is `2.1.302`. Claude Code also updates itself by default (vendor auto-updater).
  - Codex: `codex update` has no check-only option; npm reports `@openai/codex` latest `0.163.0`, equal to the local install.
  - AGY: `agy update --help` shows no options; no check-only source found yet (U-05).
  - Update itself is the vendor's own command in every case (`claude update`, `codex update`, `grok update`, `agy update`).

- **E-R20 Per-engine "latest version" sources (reproduced 2026-10-20, read-only GETs and binary strings; nothing installed).** Each vendor's own updater reads one of these:
  | Engine | Source | Observed | How found | Stability |
  | --- | --- | --- | --- | --- |
  | Claude | `https://downloads.claude.ai/claude-code-releases/stable` and `/latest` (plain text version) | both `2.1.304`; installed 2.1.302 | URL embedded in the Claude binary; same host the official installer uses | Vendor download host, not a documented API; the user's Claude update channel (stable/latest) picks which file |
  | Codex | `https://api.github.com/repos/openai/codex/releases/latest` | `rust-v0.163.0`, 2026-10-15, not prerelease; installed 0.163.0 | URL embedded in the Codex binary | Public GitHub API (unauthenticated limit 60 requests/hour per IP) |
  | Grok | `grok update --check --json` | `{"currentVersion":"1.0.62","latestVersion":"1.0.62","updateAvailable":false,...,"autoUpdate":true}` | CLI help | Documented CLI option |
  | AGY | `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/<os>_<arch>.json` | `darwin_arm64` → `{"version":"1.4.3","url":".../cli_mac_arm64.tar.gz","sha512":"…"}` | Template `%s/manifests/%s_%s%s.json` and updater symbols (`updater.CheckForUpdate`, `RunBackgroundUpdate`) in the agy binary | Undocumented; may change without notice |
  - The Antigravity website was checked as the user suggested: the install page only points to a Quickstart (404), and the public changelog's CLI list stops at 1.4.0 while 1.4.3 is released, so the website is not a usable version source.
  - **All four engines update themselves:** Grok reports `autoUpdate:true`; the AGY binary on this machine changed from 1.4.2 to 1.4.3 at 06:34 today without any update command (its updater checks at most every 15 minutes and updates in the background); Claude Code's auto-updater is on by default; the Codex binary carries a `checkForUpdateOnStartup` setting. So most of the time the page will show "Up to date"; the Update button matters when auto-update is off or failed.
  - Official installers seen in the Codex binary: `https://chatgpt.com/codex/install.sh`, `install.ps1` (for the "Not installed" link, if wanted).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why it matters | Resolution / owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | Whether Windows has non-interactive official installers for Codex, Grok and AGY | Install button on Windows | Architecture investigation if the user chooses the vendor-installer route | Open |
| U-02 | Unknown | Redistribution terms for AGY and Grok binaries | Rules out bundling them | Treat as "do not bundle"; use vendor installer | Open |
| U-03 | Unknown | Whether the bundled Claude binary shares the user's existing Claude login and settings (`~/.claude`) | Claude "just works" for already-signed-in users | Cheap probe with `auth status` in a later round (no login) | Open |
| U-04 | Unknown | Whether AutoByteus already has Anthropic approval or SIWC registration | Decides in-app sign-in for Claude and Codex | User | Needs user |
| U-05 | Unknown | Where AGY publishes its latest version (no check-only flag) | "Update available" for AGY | Resolved by E-R20 (updater manifest; undocumented) | Resolved |
| U-06 | Unknown | Whether npm "latest" matches what each vendor's native updater installs | Avoid a false "update available" | Resolved by E-R20: use each vendor's own updater source instead of npm | Resolved |
| R-02 | Risk | Claude download host and AGY manifest are undocumented and could change | A check could start failing | Each check fails independently and shows "Check failed"; never blocks use | Accepted in draft |
| R-01 | Risk | Running a vendor install script from the app executes downloaded code | Same trust as following the vendor's docs; still a security decision | User decides the install method | Needs user |
| L-01 | Limit | This review did not run any install, update or sign-in, did not run the predecessor's tests, and did not check Windows | Findings about runtime behaviour are from reading and help output | Stated in the review | — |

## Product Design Request Context

- Product Design request: Present — user, 2026-10-20: "could you ask @Product Team to work on the UI first. so we could first pin down the ui design you know"
- Requirement IDs involved: BEH-001…005, REQ-001…005; open Q-1…Q-3
- Request artifact: `product-design-request.md` (this folder); sent to `/product_team` with `delegate_task` (user-named collaborator)
- Product Design findings: returned and approved (see Product Design result below)

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `product-design-request.md` (this folder) | Solution Designer | Context sent to the Product Team for the AI Runtimes UI | Sent; Product result returned and approved (see below) |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md` + VIS-001…023 | Product UI/UX Designer | Normative UI | Approved by the user 2026-10-20 (revision a74ecd4) |
| `design-review-report.md`, `architecture-review-revision-record.md` (this folder) | Architecture reviewer | ARCH-REV-001 Fail of SR-008 | Resolved in SR-009 except AR-003 (user) |
| `design-review.md` (this folder) | Solution Designer | Independent review of the predecessor requirements/design, verdict and proposed direction | For discussion with the user; not approved behaviour |
| Predecessor package `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-usability/tickets/in-progress/runtime-lifecycle-usability/` (also on branch `preserve/runtime-lifecycle-usability-wip-20261020`) | Predecessor team | Reviewed subject; evidence source | Historical; its approvals AP-001..003 cover its own SR-012 basis |

### Product Design Findings (review candidate, 2026-10-20)

- Product package: design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, worktree `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/runtime-lifecycle-review`, branch `design/runtime-lifecycle-review` @ fcd5d06; ticket record `…/tickets/in-progress/runtime-lifecycle-review/product-ticket.md`.
- Review URL: http://127.0.0.1:4701/settings?section=ai-runtimes (responded HTTP 200 when checked).
- Status: **review candidate, not user-confirmed**; no ui-ux-spec.md or final screenshots yet. All data synthetic.
- Designer's questions for the user: (a) engine names vs model-menu names "Claude SDK"/"Grok Build"; (b) nav placement after API Keys; (c) "Not signed in" as a state; (d) install-instruction URLs to be confirmed by requirements.
- Relevant evidence for (a): Anthropic branding rules for Agent SDK products allow "Claude Agent" or "Claude", and do not permit "Claude Code" (E-R09 source page). For (c): Claude `auth status --json` reports logged-in state, Codex account read reports a missing account, AGY signed-out is classified upstream (E-R12); Grok has no status command found (unknown).

### E-R21 Sign-in: detection, trigger, terms, remote (2026-10-20; answer to the Product designer's questions)

How established: current-version probes ran only in **empty, isolated home folders** (no account, nothing signed in, no browser opened); trigger behaviour comes from the predecessor's Docker run (older versions, Linux, browser intercepted, no account consent; `evidence/docker/auth-probes.jsonl`, `auth-followup.jsonl`, `auth-final.jsonl`, probe scripts show pipes for Claude/Grok/Codex and a pseudo-terminal only for AGY); current code read at 9227d61597.

| Engine | Detect (no credentials read) | Signed-out answer observed | Start sign-in | Finish / cancel | Needs a terminal? |
| --- | --- | --- | --- | --- | --- |
| Codex 0.163.0 | app-server `account/read {refreshToken:false}` (already used by `application-provider-credential-readiness-adapter.ts`) or `codex login status` | `Not logged in` (isolated, today) | app-server `account/login/start` → returns browser URL (or device code); Codex runs the local callback | `account/login/completed` notification; `account/login/cancel` → `canceled` (Docker run); exit code alone is not proof | No |
| Claude 2.1.302 | `claude auth status --json` → `loggedIn` (already used by the same adapter) | `{"loggedIn":false,"authMethod":"none"}` (isolated, today) | `claude auth login --claudeai` opens the browser itself; prints a fallback URL and "Paste code here if prompted" | process ends; confirm with `auth status`; cancel = stop the process | No (pipes worked) |
| Grok 1.0.62 | `grok models` prints "You are not authenticated." when signed out (not used by AutoByteus today; current adapter marks Grok "unsupported") | `You are not authenticated.` exit 0 (isolated, today); positive output not observed (would need an account) | `grok login --oauth` (browser URL, local callback) or `--device-auth` (URL + code to confirm in the browser) | process ends; confirm with `grok models`; cancel = stop the process | No (pipes worked) |
| Antigravity 1.4.3 | `agy models` failure text "Please sign in…" (already classified as `AGY_SIGN_IN_REQUIRED` in `antigravity-cli-capability.ts`) | "Please sign in" exit 1 (Docker run) | **No login command** (1.4.3 has no `auth`/`login` subcommand; a forum answer claiming `agy auth login` is wrong). Sign-in only inside the interactive `agy` screen: choose Google, browser opens, fallback code prompt | only by the interactive session ending; status then via `agy models` | **Yes** — needs a pseudo-terminal with a size |

All vendor login processes wait until the user finishes or the process is stopped (Docker probes timed out by design), so AutoByteus must cancel after a reasonable time.

**Terms (fetched 2026-10-20; not a legal opinion):**
- Anthropic: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." The rule is about the product *offering* subscription login, not about who handles tokens, so a Sign-in button that runs Claude's own login is still covered.
- OpenAI: app-server authentication may continue for "a local or open-source application"; "never been permitted for commercial or hosted services". Applies to Codex's own login started by AutoByteus.
- xAI: the Grok CLI reference documents `grok login` / `--device-auth` and states no restriction on other apps (no terms found either way).
- Google: no official statement found. Community forum answers conflict about third-party apps running `agy` under a consumer login, and users report account suspensions for "violation of Terms of Service" (https://discuss.ai.google.dev/t/is-orchestrating-the-official-antigravity-cli-from-a-local-multi-agent-coding-application-allowed/181088 — community reply only; https://discuss.ai.google.dev/t/appeal-request-agy-this-service-has-been-disabled-in-this-account-for-violation-of-terms-of-service/172309).

**Remote/Docker:** the browser is on the desktop, the engine on the node. Codex and Grok device-code flows work from any browser (URL + code shown in AutoByteus); Claude would need its fallback code pasted back; AGY needs its interactive screen. Technically possible for Codex/Grok, but it adds code display/entry. Status only on remote nodes for the first version.

### Product Design result — Approved (2026-10-20)

- Returned by `product_ui_ux_designer_4db43b9c51344b828ce324df5603206e`. Spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md` Status Approved; user confirmation "yes approved" recorded in the spec; 23 final references VIS-001…023 present; ticket record and spec name the same repo, ticket and revision (a74ecd4, integrated 43d2d7d, local = origin/personal in the design repo). Checked by reading the spec, listing the references and viewing VIS-001 and VIS-010.
- Requirement impacts integrated in requirements-doc SR-006: name "Agent Runtimes"; sign-in in the target feature (REQ-006); install terminal-only; node-level terminal is new work.

### E-R22 Official install pages (fetched 2026-10-20)

- Claude: https://code.claude.com/docs/en/setup ("Advanced setup"; `curl -fsSL https://claude.ai/install.sh | bash`, PowerShell `irm https://claude.ai/install.ps1 | iex`). Same page: native installs auto-update; Homebrew/WinGet/apt do not; `claude update` follows `autoUpdatesChannel` (default `latest`, or `stable`); reports "Successfully updated from <old> to version <new>" or "Claude Code is up to date (<version>)"; Homebrew/WinGet installs report "Claude is up to date!".
- Codex: https://learn.chatgpt.com/docs/codex/cli (developers.openai.com/codex/cli redirects there; `curl -fsSL https://chatgpt.com/codex/install.sh | sh`).
- Antigravity: https://antigravity.google/docs/getting-started?tab=cli (`curl -fsSL https://antigravity.google/cli/install.sh | bash`; `irm https://antigravity.google/cli/install.ps1 | iex`).
- Grok: https://docs.x.ai/build/overview ("Grok Build"; `curl -fsSL https://x.ai/cli/install.sh | bash`; `irm https://x.ai/cli/install.ps1 | iex`).
- The designer's illustrative links for Codex (github.com/openai/codex), Antigravity (antigravity.google) and Grok (docs.x.ai/build → 404) are replaced.

## Architecture Investigation Findings (SR-008, base dc530fdcb0)

Authorities read: architecture-design.md, design-principles.md (updated), design-spec template (updated), DESIGN.md, TESTING.md (changed since 3d4d9d0a95: test vault; clean environments).

- **E-A01 (read)** Resolvers: Codex `resolveLaunchCommand()` = `CODEX_APP_SERVER_COMMAND` or default; Claude `resolveClaudeCodeExecutablePath()` = env keys, then cached `which claude`, then "claude"; Antigravity `COMMAND` constant at import = `ANTIGRAVITY_CLI_COMMAND` or "agy"; Grok `grokBuildCommand()` = `GROK_BUILD_COMMAND` or "grok". Call sites: claude-sdk-client, codex client manager, grok capability, availability service, agy-stream-process, readiness adapter.
- **E-A02 (read install scripts, not run; docs)** Default folders: Codex `${CODEX_INSTALL_DIR:-$HOME/.local/bin}`; Grok `${GROK_BIN_DIR:-$HOME/.grok/bin}`; Claude `~/.local/bin/claude`; Antigravity `~/.local/bin/agy` (Windows `%LOCALAPPDATA%\agy\bin`). Installers add the folder to the shell profile; Electron reads the login-shell PATH once at start (`electron/utils/shellEnv.ts`).
- **E-A03 (read)** `AgentRunManager.listActiveRuns()/getActiveRun().runtimeKind`; collaboration member handles release through the same manager (`configured-agent-execution-handle.ts` 465–473), so counts include team and Org members.
- **E-A04 (read)** `useEmbeddingSettings.ts`: poll 2 s busy / 10 s idle, mutations, node-binding reset.
- **E-A05 (read)** `/ws/terminal/:sessionId` (no cwd → home folder bash PTY); `Terminal.vue` takes `target` (null → server home); `useTerminalSession` exposes `sendInput`.
- **E-A06 (read)** `windowNodeContextStore.isEmbeddedWindow`; the server has no embedded flag.
- **E-A07 (read)** Readiness adapter Codex: `beginAcquire(workspace)` + `account/read {refreshToken:false}`, configured when `requiresOpenaiAuth !== true || account != null`; Claude: `auth status --json` `loggedIn`.
- **E-A08 (read-only GETs)** Antigravity manifests exist for darwin/linux/windows × amd64/arm64; `_x64` names 404.
- **E-A09 (read)** `server-runtime.ts` shutdown closes the Fastify app.
- **E-A10 (read, SR-011)** `application-execution-scope-kernel-builder.ts` 108/131 builds a separate `AgentRunActivationRegistry` and `AgentRunManager` for the application platform's execution scope; `build-application-platform-runtime.ts` 100 creates one `ApplicationExecutionScope` per platform runtime; `hostManagement` (279–282) exposes only `catalogTransition` and `runOwnership`. Reported by the implementation engineer, verified by reading.
