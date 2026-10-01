# Design Spec — Server Docker AGY/Grok Preinstallation

## Solution And Approval Basis

- Package: server-docker-preinstalled-clis; current revision SR-004; design status Ready.
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/requirements-doc.md, Approved SR-004 capturing SR-003 intent unchanged.
- Approval: user 2026-09-28 “yesss. i know. currently the behavior for codex and claude code is the same experience i want to have for antigravity and grok”; user then “continue”.
- Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-notes.md (E-001–017). Behavior supplements: none; Product and independent review artifacts N/A — not applicable.
- Workspace / branch: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis / codex/server-docker-preinstalled-clis. Base origin/personal fcdfcd2ca4200dff27ef766e477c38d0969e55f6. Finalization target origin/personal; implementation is not release authorization.

## Current-State Read

Production server Dockerfile inherits browser/VNC and owns globally installed Codex/Claude. Scripted builds invalidate the CLI layer; release CI uses the same owner for default/zh and amd64/arm64. Root backend launches providers by PATH; /root is persisted, browser runs vncuser through existing URL bridge. No packaging of agy/grok yet. Personal docker/ images are separate and excluded. E-003/004/013/017.

## Task Size And Architectural Risk (Mandatory)

- task_size: Small. Three planned changed files: Dockerfile.monorepo, Docker README, existing latest-default tests. Existing build scripts/workflow and browser bridge reused unchanged.
- architectural_risk: Low. Additive packaging in existing owner, no API/runtime adapter, schema, service, credentials, privilege or deployment topology change. Native distributions verified structurally for target platforms. Live build compatibility is a validation gate, not a claim of completed execution.
- Payload: two upstream CLI packages plus docs/test assertions. Structural delta: one existing image-install layer. No material ownership or persistence boundary change.
- Escalate if latest requires Node/OS change, extra service/keyring setup, credential relocation, runtime adapters, cross-user sharing, unsupported architecture, or a new delivery mechanism outside this design. Do not silently pin an older release or weaken tests.

## Architecture Investigation Evidence

E-013 establishes freshness boundary; E-014 existing test owners; E-015 AGY staging/native validation; E-016 Grok side effects/native path requirement; E-017 unchanged runtime identity/auth. Exact commands, URLs and observations are in canonical investigation notes. No Docker execution evidence claimed.

## Intended Change

Extend the existing cache-busted CLI RUN layer (after apt dependencies, before application COPY) with official agy and grok acquisition. Keep existing Codex/Claude arguments/install behavior intact.
1. Grok: `npm install -g @xai-official/grok@latest`, with normal optional dependencies and lifecycle scripts enabled. Apply a temporary `GROK_HOME` only to this install command, so vendor binary/config/completion writes do not seed /root. The existing global npm prefix remains authoritative. Verify `command -v grok` resolves through links to an executable native payload within the global package tree, not /root, scratch, or a JS home-preferring fallback. Current upstream layout provides this natively; fail build if install failed or contract changed.
2. AGY: download the official HTTPS installer to a temporary file using curl -f (no unchecked pipe); run bash with `--dir` pointing to an empty scratch bin directory. This avoids the installer's already-installed no-op and ensures latest is acquired. Use temporary HOME for installer shell-setup writes; do not change image runtime HOME. Require resulting agy executable and meaningful successful `--version`; publish it using `install -m 0755` to `/usr/local/bin/agy`. Retain vendor SHA512 verification. Do not invent an unsupported version flag.
3. After cleaning scratch, probe both globally resolved commands with timeout (e.g. 30 seconds) using an empty temporary HOME; require success AND nonempty expected version/help output, print installed versions. This catches vendor installer soft failures and missing native libraries. Do not call models, login, agent session creation, or inference during build.
4. Remove only task-created scratch directories/installer in same RUN. No deletion of existing persistent homes; no persistent GROK_HOME override, startup installer or periodic updater. Explicitly include curl/ca-certificates in runtime apt dependency list if desired for clear direct dependencies (already in base).
5. Document same latest-at-build semantics. Existing cache-buster must govern BOTH installs. Raw Docker/Compose invocations with fixed cache inputs retain existing cache behavior; use documented scripts or explicit changed CLI_INSTALL_CACHE_BUSTER/--no-cache. Do not extend scope to redesigning CI retries or existing cache controls.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior/scenario | Approved requirement/AC | Target path / preserved lifecycle |
|---|---|---|
| BEH-001 / SCN-001 | REQ/AC-001,005 | DS-001 builds official commands; DS-002 root terminal/backend PATH resolves them. No runtime selector changes. |
| BEH-002 / SCN-002 | REQ/AC-002 | DS-002 image executables outside /root remain visible with reused home; normal mounts/reader state unchanged. |
| BEH-003 / SCN-003 | REQ/AC-003 | DS-002 user-authenticates after startup as root; existing bridge and provider-owned state behavior preserved, no baked secrets. |
| BEH-004 / SCN-004 | REQ/AC-004,006 | DS-001 same default/zh and architecture matrix, fresh acquisition via cache-buster; no silent unsupported target omission. |

## Relevant Supplemental Task Artifacts

Historical investigation-result.md is analysis context only. solution-handoff.md is current routing packet. No extra normative supplements, no Product artifacts. Requirements/design/investigation/history are canonical authorities.

## Task Design Health Assessment (Mandatory)

Change posture Feature; current design issue No; root cause No Design Issue Found; refactor needed now No. E-003/013/014 show the existing Docker owner and freshness layer can absorb two packages. Provider installer quirks are contained at image build, not leaked into runtime managers. No shared installer framework, runtime wrapper or base-image fork warranted. Residual latest-upstream drift is user-selected and handled by fail-fast validation; no broad refactor deferred.

## Terminology

Latest = official channel resolved when cache-busted install layer executes, not a runtime polling guarantee. Preinstalled = executable payload usable without first-launch acquisition; authentication remains separate.

## Design Reading Order

Approval/current evidence → behavior map/health/state → spines and boundaries → file changes → validation/risk.

## Legacy Removal Policy (Mandatory)

No backward-compatibility path is introduced. Existing Codex/Claude are preserved, not legacy. No replaced source files to remove. Do not retain home-preferring launch fallback as a second authority or add fallback-to-old-version behavior.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

Not Affected by authored schema/state transformations. Existing /root, server data, Chromium profile mounts and reader/writer code are unchanged; no migration or reset. New provider commands use normal provider-owned runtime state. Build installers run against disposable temporary home/Grok directories; executables live outside persisted home. This preserves existing data without needing to inspect private contents or invent a schema. Test with synthetic representative home/config markers. Provider-owned upgrades/keyring auth not a promise of universal credential compatibility. Supports AC-002/003.

## Migration Plan (Only When Decision Is `Migration Required`)

N/A — no stored format/location is changed.

## Data-Flow Spine Inventory

DS-001 Primary build/release: SCN-004/001, script/CI → image with installed executables; owner server Docker packaging. DS-002 Primary use/recreate: SCN-001–003, operator starts/recreates node → CLI use under existing root lifecycle; owner existing launcher/container runtime.

## Primary Execution Spine(s)

DS-001: developer/release event → existing build.sh/build-multi-arch.sh/CI → cache-busted Docker runtime layer → official registry/installer → verified system executables → produced server image.

DS-002: operator start/upgrade → existing launcher/Compose mounts → supervisor root backend/default terminal → PATH system executable → provider login/use as operator chooses.

## Spine Narratives (Mandatory)

DS-001 resolves packages only at image build, isolates vendor setup writes, verifies executability and produces the same server image variant. DS-002 preserves existing data mounts on recreation while obtaining tools from immutable image paths; invoking a CLI uses existing process identity/auth flow. Provider authentication can still be required; packaging does not fake availability.

## Spine Actors / Main-Line Nodes

Build entrypoints, Dockerfile runtime layer, upstream distribution endpoints, system executable paths; existing launcher/mounts, root supervisor/backend, provider commands. No new service/node.

## Ownership Map

Scripts/CI own build invocation/cache-buster; Dockerfile owns acquisition/layout/build checks; vendor owns distribution and CLI auth semantics; launcher/Compose own mounts; runtime managers own existing capability checks. Documentation describes these, not a second executable policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

No new wrappers. Existing grok npm bin link and /usr/local/bin/agy are command entrypoints; installer internals stay build-only. Do not add shell wrappers to change runtime HOME or impersonate vncuser.

## Removal / Decommission Plan (Mandatory)

Remove task-created temporary installers/build-only homes after verified publication. No production source removal, no obsolete replaced subsystem. Never delete /root provider directories or volumes as cleanup.

## Return Or Event Spine(s) (If Applicable)

N/A — ordinary build exit/log/version output and CLI exit codes; no new asynchronous event contract.

## Bounded Local / Internal Spines (If Applicable)

Docker installation sequence: scratch setup → official acquisition → native/path checks → publish → scratch cleanup → final empty-home probe. No application event loop/state machine introduced.

## Off-Spine Concerns Around The Spine

Cache-buster serves Docker layer freshness; vendor integrity checks serve binary acquisition; timeouts/version output serve build validation; browser bridge serves existing user login. They do not become runtime orchestration or a new update daemon.

## Ownership Boundaries

Only server packaging installs the tools; base remains generic. Build-owned scratch state must not become runtime user configuration. Runtime-owned authentication remains outside image layers and outside build validation.

## Boundary Encapsulation Map

Upstream scripts/CI → production Dockerfile boundary → vendor installers. Forbidden bypass: install tools in runtime supervisor/entrypoint or mutate runtime-manager capability results to hide installation failure. Existing app commands consume executables, not installer internals.

## Dependency Rules

Dockerfile may use existing OS utilities and official upstream npm/HTTPS endpoints. No dependency on host CLI binaries, credentials, personal home, or architecture-specific macOS files. No new runtime adapter dependency. Both installs depend on existing cache-busting layer, not separate stale layer.

## Interface Boundary Mapping

`grok` and `agy` are provider command identities on root PATH. Build arg CLI_INSTALL_CACHE_BUSTER controls cache invalidation only. Existing CODEX_CLI_VERSION/CLAUDE_CODE_VERSION kept intact; new tools always use latest channel by default with no fixed pin. Runtime HOME remains /root; build-only HOME/GROK_HOME do not leak.

## Interface Boundary Check

All interfaces have singular purposes and explicit command/path identity; ambiguity Low. No new generic selector or API.

## Main Domain Subject Naming Check

Existing server Dockerfile and provider names remain natural; no new manager/service names.

## Existing Capability / Subsystem Reuse Check

Extend existing Docker install layer, latest-default unittest, Docker README; reuse build scripts, CI and browser bridge unchanged. Do not create a generic installer subsystem for a bounded two-package extension.

## Subsystem / Capability-Area Allocation

Server Docker packaging owns source change; scripts/tests owns regression assertions; existing deployment and runtime-management areas are preserved consumers. No new subsystem.

## Draft File Responsibility Mapping

Dockerfile.monorepo: build-time installation and validation. test_server_docker_cli_latest_defaults.py: latest/cache/path contract regression. Docker README: installed tools, latest semantics, root login and troubleshooting.

## Reusable Owned Structures Check

No repeated data models introduced. Reuse CLI_INSTALL_CACHE_BUSTER; no duplicate cache-buster per tool. Temporary path shell variables local to RUN suffice.

## Shared Structure / Data Model Tightness Check

N/A — no new shared data structure or schema. Version logs are evidence, not an application metadata registry.

## Final File Responsibility Mapping

Same three files as draft; no extraction warranted. Implementation may keep shell formatting concise, but cannot introduce a startup installer or broad provider manager.

## Applied Patterns (If Any)

Existing cache-busted build layer; fail-fast build checks; separation of image executables from mounted user state. No new application pattern.

## Target Subsystem / Folder / File Mapping

| Path | Change / responsibility | Exclusions |
|---|---|---|
| autobyteus-server-ts/docker/Dockerfile.monorepo | Extend native CLI installation/checks after existing cache-buster; system paths, scratch cleanup | No server runtime/auth policy |
| scripts/tests/test_server_docker_cli_latest_defaults.py | Extend latest/acquisition/cache/path/no-startup-install assertions; preserve old expectations | No real account secrets/network required for unit tests |
| autobyteus-server-ts/docker/README.md | Four installed tools, latest builds, root shell login, image recreation, private state caveats | No promise ZCode/DSH adapters or automatic background Docker updater |
| Existing build scripts / workflow / bridge / Compose | Reuse, verify unchanged contracts | No change unless implementation uncovers evidence requiring design revision |

## Folder Boundary Check

Compact Docker folder remains coherent image-packaging owner; existing scripts/tests cross-repository regression home reused. Mixed-layer risk Low because runtime/provider code untouched.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

Good: temporary GROK_HOME used only for npm install, global grok resolves to packaged native binary after scratch removal. Bad: ENV GROK_HOME=/opt/tool-state changes runtime credentials or a global wrapper chooses /root/.grok/bin. Good: AGY fresh staging directory then publish /usr/local/bin/agy. Bad: default installer creates /root/.local/bin/agy hidden by reused home volume.

## Backward-Compatibility Rejection Log (Mandatory)

Home-binary fallback: rejected, one system executable authority. Old-version fallback when latest fails: rejected, fail build/report actual incompatibility. Runtime adapters to compensate for missing installation: rejected, out of scope. No legacy source decommission needed.

## Derived Layering (If Useful)

N/A — single existing packaging boundary plus unchanged runtime consumer.

## Change / Refactor Sequence

1. Extend latest-default regression cases from approved ACs. 2. Extend Dockerfile cache-busted RUN and validate vendor side effects/native paths. 3. Update Docker README. 4. Run focused regression and both-architecture/variant container checks using disposable local images/volumes; do not push/deploy. 5. Report implementation and executable-validation evidence through team rules. No temporary compatibility seams or migrations.

## Key Tradeoffs

Latest builds intentionally trade exact reproducibility for the user-requested existing CLI experience. Record resolved versions rather than freeze them. Official AGY installer avoids maintaining custom manifest/downloader; explicit validation compensates for soft failures. Grok npm aligns with existing packaging, but its build-home side effects require containment. Reuse base/Node and existing updater behavior rather than broaden scope.

## Risks

Upstream latest can change platform/dependency/installer contracts. Fail clearly and return design impact if assumptions break. Both Linux architectures may need emulation; timeout failures under emulation must not be called successful. Native keyring/auth may need user configuration; do not fabricate login validation. Existing private shell PATH overrides can intentionally select other tools; supported default environment and reused ordinary home fixtures must still resolve packaged tools. No public release or multiarch build has been performed by Solution Designer.

## Guidance For Implementation

Keep the change local. Requirements approved; do not ask the user again about latest-at-build. Mandatory verification intent:
- Extend/run `python3 -m unittest discover -s scripts/tests -p test_server_docker_cli_latest_defaults.py`; run existing browser-bridge and build-context regression tests as applicable.
- Inspect/run image command resolution, readlink/native checks and meaningful versions/help after build without credentials or inference. Verify no persistent temporary HOME/GROK_HOME.
- Test root default noninteractive process and `/bin/bash -lc` supervisor-equivalent environment. Check both amd64/arm64 and default/zh release variants; truthfully record missing execution coverage.
- Recreate with disposable pre-populated root-home/config-marker volume (not user's real volumes); binaries still resolve outside /root/scratch, fixture state preserved, prior server/browser/Codex/Claude smoke checks pass.
- Verify changing cache-buster reexecutes both new acquisitions; version can remain equal when upstream has not changed. Read source checks are not a substitute for executable coverage.
- Installer exit 0 alone is insufficient; verify native resolution and outputs. Existing login/runtime model discovery remains unchanged. No paid prompts, host production database, account login or published image pushes without separately authorized validation/delivery context.
- If blocked by latest/provider platform support, return precise evidence rather than pinning an older release, skipping a target, adding runtime downloads, or modifying auth behavior.
