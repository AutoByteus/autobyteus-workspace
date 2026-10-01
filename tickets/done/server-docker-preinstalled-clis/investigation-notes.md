# Investigation Notes

- Package: server-docker-preinstalled-clis
- Date: 2026-09-28
- Repository mode: Git; isolated authoring workspace.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis
- Branch: codex/server-docker-preinstalled-clis
- Base: origin/personal at fcdfcd2ca4200dff27ef766e477c38d0969e55f6 after successful git fetch origin.
- Candidate finalization target: origin/personal, not authorized for integration.
- Original shared checkout has unrelated modifications; untouched.
- Browser base repository read-only; no source modifications.
- Bootstrap successful. Draft requirements begun before deeper investigation.
- Request: user asks analysis of preinstalling agy, grok, zcode and dsh in server Docker.
- Initial evidence: docker/Dockerfile.allinone inherits autobyteus/chrome-vnc:${CHROME_VNC_TAG}, default zh; Dockerfile.remote-server uses node:22-bookworm-slim, not browser base. Browser base is Ubuntu 22.04, Node 22, vncuser; no requested CLI installation in Dockerfile.

## Source Log and Findings (2026-09-28)

| ID | Exact source / probe | Observation | Limit / implication |
|---|---|---|---|
| E-001 | `git fetch origin`; `git symbolic-ref refs/remotes/origin/HEAD`; `git worktree add ../autobyteus-worktrees/server-docker-preinstalled-clis -b codex/server-docker-preinstalled-clis origin/personal` | Refreshed tracked integration branch; isolated task workspace established at base above. Shared checkout HEAD a35060c58 differs from fetched branch. | Analysis of current integration branch, not a deployed-image inspection. |
| E-002 | `/Users/normy/autobyteus_org/browser_docker/Dockerfile`, `VERSION`, `build-multi-arch.sh`, `entrypoint.sh`, `base.conf`, `supervisord.conf`; git HEAD fb0f59372254b853e85c69046aa921f1d59d96c7 | Ubuntu 22.04; NodeSource Node 22; build-essential/Python/curl/git; browser/VNC services as vncuser; supervisor root; build targets linux/amd64 and linux/arm64. No requested CLI install. User npm PATH only in vncuser .bashrc. | Base source does not prove registry image digest/content. Browser repository has unrelated untracked .codex/; untouched. |
| E-003 | `autobyteus-server-ts/docker/Dockerfile.monorepo` lines 3–58, 95–106; `.github/workflows/release-server-docker.yml` build-and-push | **Production release image** inherits chrome-vnc latest/default or zh and already globally installs Codex and Claude Code, using latest defaults and cache-buster. CI publishes both Linux architectures. | Main existing owner for additional server-specific CLIs; not merely docker/Dockerfile.allinone. |
| E-004 | `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf`, `docker-compose.yml`, `README.md` CLI Auth Model / Data and Persistence | Production backend runs root, HOME=/root, browser bridge routes URL opening to vncuser; /root persisted per instance. | Installing binaries into /root at image-build time risks old mounted home volumes masking image versions on recreation. Login in a vncuser terminal does not automatically authenticate root processes. AGY keyring-specific persistence still requires verification. |
| E-005 | `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server`, `docker/compose.personal-test.yml` | Separate personal test images: all-in-one inherits chrome-vnc:zh; remote uses node:22-bookworm-slim. No requested installs. Personal volumes are not production root-home persistence. | Changing browser base alone would miss slim remote image. Do not silently expand production task to personal-stack parity. |
| E-006 | `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts`, `runtime-availability-service.ts`, `antigravity-cli-capability.ts`, `grok/grok-build-{capability,launch-profile}.ts` | Fetched origin/personal contains Antigravity and Grok Build runtime integration, no ZCode/DSH kinds. AGY command override ANTIGRAVITY_CLI_COMMAND; Grok override GROK_BUILD_COMMAND; default agy/grok. Grok capability requires >=1.0.41 and agent stdio help contract; AGY probes help/models. | Preinstallation != authentication or new runtime integration. Grok not in initial shared HEAD enum; deployed release unknown. |
| E-007 | https://antigravity.google/docs/cli/install/ ; read-only fetch https://antigravity.google/cli/install.sh | Official native Linux installer; default ~/.local/bin; downloaded script accepts --dir, maps Linux amd64/arm64, verifies SHA512 from platform manifest. It resolves latest manifest and describes background self-updates. | No installation executed; immutable pinning/update policy needs design investigation. Do not assume version flag or --skip-path supported by fetched script. |
| E-008 | https://docs.x.ai/build/overview ; read-only GET https://registry.npmjs.org/@xai-official/grok/latest | Official native install at https://x.ai/cli/install.sh; browser auth or XAI_API_KEY documented. Registry current 1.0.41, bin grok, Node >=20, optional native Linux x64 and arm64 packages. | Pin-able npm delivery appears viable; no Linux execution tested. |
| E-009 | https://github.com/deepseek-ai/deepseek-harness ; https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/development.md ; GET https://registry.npmjs.org/@deepseek-ai/dsh/latest | Official DSH package 0.1.7-rc.2, bin lib/bin.js, no top-level engines field. Development docs state Node 22.19+ and 24+. Many bundled dependencies; commander 15 requires >=22.12. | Need concrete Node patch version, native dependency install, meaningful help/version output and selected launch-profile smoke test on both architectures. DSH assumed to mean DeepSeek Harness pending confirmation. |
| E-010 | https://github.com/zai-org/ZCode/blob/main/README.en.md ; raw apps/zcode-cli/packages/cli/package.json | Official source supports standalone CLI distribution (TUI/Web/Agent, no Electron needed). Build via pnpm build:zcode, specifies Node 24.14.0 and pnpm 10.33.2; runtime requires Node, recommends same pinned version. CLI workspace package is private. Packaging emits installer, archives, sha256.txt. README hosting URL is a placeholder. | No verified ready-to-install official hosted CLI archive yet. Source build is a feasible candidate, not a tested delivery path. Do not substitute similarly named npm package or unofficial wrapper. ZCode identity assumed Z.ai. |
| E-011 | `command -v agy grok zcode dsh` | Host has agy and grok; no zcode/dsh on current PATH. | macOS presence is not Linux-container proof; no host credentials read. |
| E-012 | `tickets/done/grok-build-runtime-support/investigation-notes.md` ACP Ecosystem Evidence | Earlier DSH ACP package evidence and ZCode discussion exist. | Historical ACP limits must not be promoted to current install requirements or re-investigated as new-runtime scope. |

## Behavior and Scenario Basis
- BEH-001 / SCN-001: operator starts production Docker server and invokes provider CLI from server terminal. Existing Codex/Claude preinstallation and auth workflow documented; four new CLI additions are user-requested proposed extension.
- BEH-002 / SCN-002: operator recreates/upgrades same instance, preserving per-node home/app data/browser state. Existing production supported path; installed executables must remain usable despite old home volumes.
- BEH-003 / SCN-003: operator authenticates after startup; root CLI uses VNC browser bridge when supported. Existing workflow; requested new providers need individual verification.
- BEH-004 / SCN-004: release pipeline builds default/zh images for amd64/arm64. Existing operational contract.
- ZCode/DSH selection as AutoByteus runtime: not currently supported; excluded from proposed installation-only scope.

## Surfaces, State, and Risks
- Payload: Linux CLI distributions/npm/native dependencies; version metadata and smoke-check output.
- Structure: image runtime layers, PATH/Node version, root versus vncuser HOME, browser bridge, existing persisted root-home, CI architecture matrix. No proposed API/schema migration.
- Preserve server app data, browser profile, existing Codex/Claude credentials/configuration, workspaces; volume deletion not an acceptable upgrade mechanism. No credentials to be baked into image.
- Recommend (not authoritative design): install server-specific CLIs in production child image, outside mounted home, using global executable paths and versioned artifacts. Keep generic browser base unchanged unless approved need emerges. Investigate isolated Node 24 for ZCode versus broader Node upgrade; do not silently change server Node ABI.
- Runtime auth for AGY may depend on keyring/DBus as well as files: /root mount alone does not prove full new-provider auth persistence.
- No Docker build, running container inspection, CLI install, paid prompt, runtime capability probe or login performed. Source and public distribution evidence only.
- Product Design not requested; all Product artifacts N/A — not applicable.
- Supplemental inventory: investigation-result.md (Solution Designer; analysis/result context; evidence-only). Requirements and revision record are canonical, not supplements. Architecture investigation/design deferred until approval; independent review artifacts N/A — not applicable.

## Open Decisions / Next Investigation
1. Confirm production released server image only, or also personal all-in-one/slim remote.
2. Confirm ZCode=official Z.ai and DSH=DeepSeek Harness, installation only (no new AutoByteus runtime adapters).
3. Confirm runtime login + existing per-node persistence is desired, and whether vncuser direct usage needs supported/shared auth (recommend do not share implicitly).
4. Choose verified ZCode distribution/pinned source path; verify real Linux dependencies/Node requirements/architecture artifacts and provider auth persistence.
5. Existing latest-at-build/cache-buster policy versus pinned versions with explicit update procedure remains an approval-visible operational choice; do not replace existing Codex/Claude policy implicitly.

## SR-002 — User Scope Clarification
- User: “or for now, just integrate antigravity and grok?” followed by “sorry, i meant preinstall in the docker just like codex, and claude code”.
- Current scope is preinstallation of agy/grok only, not runtime integration. Prior ZCode/DSH installation questions and Node 24 investigation are deferred and no longer active blockers. Historical findings above retained as evidence.
- Proposed consolidated baseline SR-002 uses the same production image, effective user and build-time freshness model as existing bundled CLIs. No changes to generic browser base, personal images, auth identity or Node major proposed.
- No new code/build/runtime probes required for this wording clarification. Requirements Ready for Approval; no approval or design fabricated.

## SR-003 — Latest Version Requirement
- User requests always installing latest version. Proposed precise semantics: latest upstream AGY/Grok release at each supported image build; do not pin a fixed default.
- Existing source evidence E-003: latest build arguments and changing CLI_INSTALL_CACHE_BUSTER in scripts/CI already support this freshness model for Codex/Claude. Docker layer reuse must be accounted for; @latest text alone is insufficient.
- Existing image contents do not continually refresh when upstream releases change. Rebuild and recreate to pick up packaged updates; provider self-update behavior is separate and must not be confused with an added container-start updater.
- No implementation or new public-source claim; current installers/distribution evidence remains E-007/E-008.

## SR-004 — Architecture Investigation After Approval
Approval reference: user 2026-09-28 confirmed the same experience as Codex/Claude for Antigravity/Grok; subsequently instructed “continue”. Requirements approved before these design decisions.

| ID | Exact evidence | Finding / implication |
|---|---|---|
| E-013 | Re-read build.sh, build-multi-arch.sh, Dockerfile.monorepo, docker-start.sh (line 267), release-server-docker.yml | Source helper invokes build.sh; supported scripts pass timestamp cache-buster, both release variants pass github.run_id. Place both new acquisitions in the existing cache-busted layer. Raw docker/Compose builds with unchanged arguments can reuse cache, same as existing tools; document explicit cache-buster/no-cache rather than promise magic freshness. |
| E-014 | scripts/tests/test_server_docker_cli_latest_defaults.py; scripts/tests/test_server_docker_browser_bridge.py | Existing unittest suite owns latest-default/cache-buster source assertions and separate browser-bridge regression coverage; extend first, reuse second. No new test framework needed. |
| E-015 | Read-only urllib fetch https://antigravity.google/cli/install.sh ; SHA256 ee1ea43ce4e9e56356c4ab6dad907ef357ae4bdfcaadb682735909fb57c9c640 | Installer --dir supported; native Linux amd64/arm64 manifest and SHA512 verification. Final native `agy install --dir ...` failure is swallowed by vendor script, so explicit nonempty successful --version/--help checks required. Custom dir allows /usr/local/bin. Existing target causes early no-op; install into fresh staging directory and publish the verified binary, not an existing target. No vendor script executed in investigation. |
| E-016 | GET https://registry.npmjs.org/@xai-official/grok/latest ; read tarball package.json, bin/postinstall.js and bin/grok-bootstrap.js in memory, no execution | Observed 1.0.41; npm Unix postinstall extracts adjacent bin/grok-native and symlinks package bin/grok to it. ALSO writes home binaries/config/completions into GROK_HOME (default ~/.grok). Several install failures log and exit 0. Fallback JS launcher prefers home binary. Therefore isolate build-only GROK_HOME in scratch and require global command resolves to native binary outside home/scratch, plus meaningful executable probe; never persist GROK_HOME override into runtime. Optional platform dependencies must be included. |
| E-017 | Production compose mounts /root, server supervisor user=root HOME=/root; open-vnc-browser-url.sh; runtime-availability-service.ts | Preserve state mounts and existing bridge/identity. AGY availability currently depends on help/models; Grok depends on version/agent help. Do not modify those semantics to make an unauthenticated build appear authenticated. |

Design scope is bounded packaging, tests, docs. No runtime code, persistent schema, user identity, ports, services or base-image change. No credentials read, no CLI installed or executed, no image built during solution work. Exact future latest Linux binaries require implementation/API validation; external regressions fail packaging rather than silently pin/fallback. Home-volume fixtures need only representative directory/config markers, not real credentials or private production data. Authentication/keyring limitations remain provider behavior, not a new cross-user auth/persistence guarantee. Current approval resolves prior scope/update questions; ZCode/DSH findings are historical only.

Supplement inventory update: design-spec.md is canonical design authority, solution-handoff.md is cumulative routing result; investigation-result.md retains historical analysis. No behavior-defining supplements. Independent reviews N/A — direct route if configured rule matches completed Small/Low design.
