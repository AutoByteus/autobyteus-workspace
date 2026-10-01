# Implementation Handoff

## Upstream Artifact Package
- Package: server-docker-preinstalled-clis; worktree /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis; branch `codex/server-docker-preinstalled-clis`; base `fcdfcd2ca4200dff27ef766e477c38d0969e55f6`, intended eventual target `origin/personal`. No push/release/integration performed.
- Approved requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/requirements-doc.md (SR-004).
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-notes.md (E-001–017).
- Completed design: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/design-spec.md (Ready).
- Solution history: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/solution-revision-record.md (SR-001–004).
- Solution packet: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/solution-handoff.md.
- Historical evidence supplement: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/investigation-result.md; not current behavior authority.
- Product/UI supplements, design review report, architecture-review record: N/A — not applicable. Small/Low direct implementation route; no independent pass asserted.
- Triggering rework: N/A.

## Current Implementation Summary
Initial implementation; current revision IR-001, record /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/implementation-revision-record.md. Related solution SR-004; ARCH-REV/CRR/API-REV/DR and triggering findings N/A.

The existing cache-busted production CLI layer now acquires official latest Grok through npm with optional native dependencies/lifecycle enabled and build-only GROK_HOME. AGY uses a downloaded official installer, fresh staging directory and isolated HOME; executable/version validation precedes system publication. After scratch cleanup Grok must resolve to its native global ELF payload, not the home-preferring JS bootstrap. Both commands must return successful semantic-version-like output within 30 seconds using temporary HOME; resolved versions are logged. No runtime installer, credential, HOME override, wrapper or volume reset added. README covers install/auth/integration distinctions and build/recreate freshness.

## Routing Classification
- task_size: Small; architectural_risk: Low. Confirmed against design classification section.
- Three planned source/test/doc files only; no base tag, Node major, runtime adapter, service, identity, schema, mount, browser bridge or deployment topology changes.
- Selected route: Direct API/E2E. Completed-result get_handoff_rules matched Small/Low + checks/self-review complete; exact recipient `/api_e2e_engineer`. Lightweight implementation self-review: Yes.
- New design impact/escalation: None. Real full-image matrix validation remains a downstream gate, not a claimed pass.

## Reviewed Behavior Implementation Trace
| Behavior | Approved outcome | Actual implementation path | Result |
|---|---|---|---|
| BEH-001 / REQ-001,005 | Commands preinstalled, no new integration | Existing build scripts → Dockerfile.monorepo cache-busted RUN → official distributions → system executables; README; latest-default tests | Implemented; local arm64 packaging build and offline root login-shell versions pass. Runtime selectors untouched. |
| BEH-002 / REQ-002 | Image binaries not masked by ordinary persisted home, state retained | AGY /usr/local/bin; Grok /usr/lib/node_modules native target through global bin (prefix resolved dynamically); scratch removed | Implemented isolation, no mount/data changes; reused-home/full-image scenario still required. |
| BEH-003 / REQ-003 | Runtime/operator-owned auth | Build-only HOME/GROK_HOME; README root versus vncuser and provider links; existing bridge unchanged | No account login/credentials/inference used. Keyring durability unverified and explicitly not promised. |
| BEH-004 / REQ-004,006 | Existing matrix and latest at build | Same CLI_INSTALL_CACHE_BUSTER RUN, official latest channels; existing scripts/release matrix unchanged | Source regression passes; local arm64/latest layer only executed. Full amd64/arm64 × default/zh matrix and cache reexecution remain required. |

## Key Files Or Areas
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/autobyteus-server-ts/docker/Dockerfile.monorepo — 27 added / 2 removed lines, explicit curl/CA dependencies and fail-fast installation.
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/scripts/tests/test_server_docker_cli_latest_defaults.py — five added source contract tests (eight total).
- /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/autobyteus-server-ts/docker/README.md — four CLI inventory, root auth/config, freshness and state caveats.

## Important Assumptions / Known Risks
Latest is intentionally mutable. Changes to upstream native layout, missing target artifacts/dependencies, or latest incompatibility fail the build rather than pin/fallback. Native path assertion intentionally detects changed Grok installer contract. Raw builds with fixed cache inputs can reuse existing layers; docs explain forcing acquisition. User-custom PATH can intentionally override image tools. Provider-managed self-updates are not a new image updater. No live authentication or keyring persistence validated.

## Task Design Health Assessment Implementation Check
Feature; No Design Issue Found; No Refactor Needed; matches design: Yes. Existing packaging owner absorbed bounded install logic, no new manager/framework or mixed-level runtime dependency. Design Impact routing N/A.

## Legacy / Compatibility Removal Check
- Backward compatibility mechanisms: None; legacy old behavior retained in scope: No. Existing Codex/Claude preserved as required.
- Dead/obsolete removal: N/A, additive feature has no replaced source paths. Task-created scratch removed in same RUN.
- Shared structures tight: Yes; no new schemas/models.
- Shared design guidance reapplied: Yes; no unresolved file-level weakness.
- Size guardrails: Yes; changed implementation Dockerfile 113 nonempty lines and 29-line total delta, below 500/220 thresholds. Docs/test files not source implementation expansion.

## Persisted Data Transition Check
Approved decision Not Affected (design persisted-data section); followed: Yes. No migrations, runtime readers, formats, root-home mount or credential locations changed. No destructive reset. Disposable build homes removed; normal provider runtime state remains provider-owned. Transition deviation None.

## Environment Or Dependency Notes
Docker Desktop 4.52.0, engine 29.0.1 linux/arm64. Local packaging test used existing `autobyteus/chrome-vnc:latest` digest `sha256:b2fde77f3bd7c73d412ea59d42e3b65290bae9f39d1ce85b5aaaac5d869596f4`; apt output is Ubuntu noble (24.04), Node v22.23.3. This differs from upstream source-only base observation but requires no base change; actual image evidence is in the log. No host CLI install or host private data accessed.

Local test image `autobyteus-cli-ir001-local:arm64` is retained for downstream inspection/cleanup. It contains only the extracted runtime prefix through CLI install, NOT server application COPY/setup. Do not use it as a production image. No containers/volumes retained by local probe.

## Local Implementation Checks Run
Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/implementation-local-checks.log.
- Latest-default regression: 8 passed; browser bridge: 6 passed; build-context sources: 2 passed.
- Shell syntax for every Dockerfile RUN and git diff --check: passed.
- Exact Dockerfile runtime prefix (through CLI install) built on linux/arm64, default latest base, cache-buster `implementation-IR-001`: exit 0. AGY 1.2.12; Grok 1.0.41 (4220f3b224a6). Native/path/version checks passed after scratch removal. Vendor AGY setup printed an early logging warning but independent version checks succeeded.
- Ephemeral packaging-image root `/bin/bash -lc` probe with HOME=/root, network disabled, no mounts: exit 0; no GROK_HOME override; agy /usr/local/bin/agy, grok /usr/bin/grok → /usr/lib/node_modules/@xai-official/grok/bin/grok-native; versions match. Node v22.23.3.
- This is implementation validation only, NOT API/E2E sign-off or full production startup evidence.

## Frontend Rendered-Result Check
Not Applicable — packaging/docs/tests only, no rendered frontend or interaction changed.

## Lightweight Self-Review
Confirmed approved scope, unchanged Codex/Claude argument/install behavior, official endpoints, one cache-busted acquisition boundary, explicit checks for vendor soft failures, Grok ELF/link after cleanup, staged AGY validation before copy, command-local environment isolation and no permanent credentials. Compared complete three-file diff; base/personal-stack/runtime/auth/browser/Compose/CI unchanged. Existing regression checks all pass.

## Downstream Coverage / Executable Validation Still Required
API/E2E owns independent executable coverage and pass/fail classification:
1. Full production image build/start and CLI meaningful help/version on linux/amd64 and linux/arm64, default and zh; record actual base/runtime versions.
2. Default process plus supervisor-equivalent root login shell, clean image without auth, global/native command resolution, no runtime acquisition/download requirement.
3. Disposable representative nonempty root-home including older tool copies and config markers; recreate preserving home/app/browser markers and expected packaged versions. No real user volumes/credentials.
4. Existing server/Codex/Claude/browser bridge smoke checks and unchanged runtime selectors. Use isolated backend data.
5. Change cache-buster and demonstrate both acquisitions execute again; version equality alone is not a failure when upstream is unchanged.
6. No live account login, inference, image push or deployment without separate authorization. Report platform/provider blockers; do not silently pin, add runtime fallback or alter base/auth boundary.
