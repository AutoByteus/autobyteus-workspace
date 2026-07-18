# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved; design complete and ready for architecture review
- Investigation Goal: Establish the checked-in noVNC provenance and modifications, verify upstream package viability, trace supported VNC behavior, and produce a safe direct-package replacement basis.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The live import owner is localized, but the change replaces a third-party runtime, removes 57 files, changes package/lock resolution, needs a TypeScript public-contract boundary, and must preserve browser/Electron VNC and clipboard behavior.
- Scope Summary: Frontend noVNC dependency ownership, import/test paths, public API/type boundary, build compatibility, current VNC production behavior, clipboard equivalence, and full vendored-source removal.
- Primary Questions To Resolve:
  - What upstream version/commit matches the checked-in files? **Resolved:** exact upstream commit `f5a4eed`.
  - What local modifications exist and why? **Resolved:** none in the current tree; original vendoring followed a failed unscoped `novnc` import attempt.
  - Does the maintained npm package expose the needed `RFB` API in the current toolchain? **Resolved:** yes, through the official scoped package root.
  - Which upstream package preserves current behavior? **Resolved:** exact `1.7.0-g7c36fab`; stable `1.7.0` omits the snapshot's automatic clipboard owner.
  - Can Nuxt/Vite tests and production generation use it? **Resolved:** yes in a disposable full-project probe.
  - How is the missing TypeScript declaration handled? **Resolved:** a narrow local declaration of the used public root-export contract; current DefinitelyTyped declarations target obsolete paths.

## Request Context

The user wants to stop maintaining a copied noVNC library because it is likely behind upstream. Direct package dependency use is preferred; only if impossible should the source remain and be refreshed. Investigation proves direct official package use is possible, so refresh-in-place is not recommended.

Core artifacts and supporting evidence:

- [requirements.md](./requirements.md)
- [upstream-novnc-evaluation.md](./upstream-novnc-evaluation.md)
- Design spec: [proposed-design.md](./proposed-design.md), produced after user approval.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo / pnpm workspace
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc`
- Current Branch: `codex/replace-vendored-novnc`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc`
- Bootstrap Base Branch: refreshed `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-07-18; `origin/personal` resolved to `dbc83fdb51c1e158b5707c219dd8574dc49fa493` (`chore(release): bump workspace release version to 1.4.17`).
- Task Branch: `codex/replace-vendored-novnc`, created from and tracking `origin/personal`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Use only the dedicated task worktree above. Do not edit the shared superrepo checkout. A disposable detached probe worktree was removed after evidence capture.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/upstream-novnc-evaluation.md` | Retain upstream provenance, official package comparison, clipboard delta, type findings, and full-project package compatibility probe results | Exact snapshot source, absence of local fork changes, correct package/root import, stable-vs-dev decision matrix, commands/results, constructor contract | Requirements, investigation notes, future design spec | `REQ-001`–`REQ-006`; `AC-001`–`AC-010` | Complete | N/A — evidence/context, not intended-behavior authority | Keep aligned with any version-selection requirement change and include downstream while relevant. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-18 | Command | `git fetch origin personal --prune`; `git rev-parse origin/personal` | Refresh the tracked base before worktree creation | Fetch succeeded; base `dbc83fdb5` | No |
| 2026-07-18 | Setup | `git worktree add -b codex/replace-vendored-novnc /Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc origin/personal` | Create isolated task workspace | Clean dedicated branch/worktree created | No |
| 2026-07-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/AGENTS.md` | Read repository-specific guidance | Use pnpm, colocated tests, and `--run`; never stage all files | No |
| 2026-07-18 | Code | `autobyteus-web/lib/novnc/`; `find ...`; `du -sh ...` | Inventory checked-in dependency | 57 tracked files, ~712 KiB; core plus pako source | No |
| 2026-07-18 | Code | `autobyteus-web/composables/useVncSession.ts` | Identify direct runtime owner/API use | Only production import; constructs RFB, owns status, events, credentials, viewport, resize, and view-only policies | No |
| 2026-07-18 | Code | `VncViewer.vue`, `VncHostTile.vue`, `RightSideTabs.vue`, `utils/vncHosts.ts` | Trace supported user entry to RFB runtime | VNC tab -> configured hosts -> tile mount -> auto-connect -> session; maximize/interaction/resize flows identified | No |
| 2026-07-18 | Code | `useVncSession.spec.ts`, `WorkspaceAdaptiveLayout.spec.ts`, `vncHosts.spec.ts` | Inventory durable coverage and import mocks | Two tests mock the local RFB path; session test covers initial resize and fullscreen strategy; host parser coverage exists | API/E2E to investigate broader/live coverage |
| 2026-07-18 | Command | `rg -n "~/lib/novnc|@novnc/novnc|lib/novnc" autobyteus-web ...` | Find all active integration references | One production import and two test mocks; old ticket references are historical docs only | Re-run after implementation |
| 2026-07-18 | Repo | Historical `https://github.com/AutoByteus/autobyteus-web.git`; commits `26cc390`, `d3b7044`; pre-flatten submodule commit | Recover provenance hidden by monorepo flattening | Original commit cites failed `yarn install novnc`; later commit refreshed six core files and added clipboard | No |
| 2026-07-18 | Repo | Official `https://github.com/novnc/noVNC.git`; full-tree comparisons against `f5a4eed`, `v1.7.0`, `master` | Establish exact snapshot/deltas | Current checked-in tree exactly equals `f5a4eed`; no local modifications. Stable 1.7.0 omits async clipboard; master contains it and five later core-file deltas | Preserve via selected package |
| 2026-07-18 | Web | <https://github.com/novnc/noVNC/blob/master/docs/LIBRARY.md> | Verify official integration model | noVNC is an ES module library centered on one `RFB` object | No |
| 2026-07-18 | Web | <https://github.com/novnc/noVNC/blob/master/docs/API.md> | Verify public properties/events/methods | Public contract includes credentials, connection events, clipboard, scale, resize, view-only, and disconnect APIs used by AutoByteus | Use for type boundary/design |
| 2026-07-18 | Web | <https://github.com/novnc/noVNC/releases/tag/v1.7.0> | Verify current stable release/package posture | 1.7.0 is current stable and its npm bundle is ESM | No |
| 2026-07-18 | Web | <https://www.npmjs.com/package/@novnc/novnc> | Verify official package/tags | Latest stable `1.7.0`; current `dev` `1.7.0-g7c36fab` | Pin exact selected build |
| 2026-07-18 | Web | <https://github.com/novnc/noVNC/commit/f5a4eedcea749f82b7cab05cb78a4eb8a92b2c32> | Verify async clipboard provenance/behavior | Commit adds permission-aware automatic browser clipboard read/write and tests | Preserve current behavior |
| 2026-07-18 | Command | `npm view @novnc/novnc ... --json`; `npm pack @novnc/novnc@1.7.0`; `npm pack @novnc/novnc@1.7.0-g7c36fab` | Inspect exact metadata/package content | Official package exports root `./core/rfb.js`, ships ESM/no runtime deps, contains no `.d.ts`; exact git heads recorded | No |
| 2026-07-18 | Command | `npm view novnc ... --json` | Distinguish historical attempted package name | Unscoped `novnc` is a different stale Kasm fork at 1.2.0, not the maintained official scoped package | No |
| 2026-07-18 | Command | `npm view @types/novnc__novnc ...`; package content inspection | Evaluate community typings | Latest types 1.6.0 declare obsolete `@novnc/novnc/lib/...` modules and do not make current package root a module | Do not rely on it alone |
| 2026-07-18 | Probe | Disposable detached AutoByteus worktree; add exact package; replace import/mock paths; `nuxi prepare`; targeted tests; `pnpm generate`; type probes | Prove compatibility in actual toolchain before recommendation | 27 targeted tests pass; production generation passes with 3,552 modules; package root resolves; narrow local declaration restores typecheck to baseline error count | Repeat authoritative validation after implementation |
| 2026-07-18 | Test | Baseline `pnpm -C autobyteus-web test:nuxt ... --run` | Record current targeted behavior baseline | 3 files/30 tests pass | Compare after implementation |
| 2026-07-18 | Test | Baseline `pnpm -C autobyteus-web exec nuxi typecheck` | Record global type baseline | Fails with 242 existing errors; two existing `useVncSession` errors; noVNC declaration probe must add no net/noVNC error | Compare delta only |
| 2026-07-18 | Setup | `git worktree remove --force <disposable probe>` and removal of `/tmp` clone/package directories | Clean investigation-only setup | Temporary worktree and cloned/package probe directories removed; authoritative worktree retained | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | User opens the VNC tool with `AUTOBYTEUS_VNC_SERVER_HOSTS` configured; tile auto-connects or user clicks Connect | `RightSideTabs` -> `VncViewer` loads server settings/parses hosts -> `VncHostTile.onMounted()` sets container and connects -> `useVncSession.connect()` -> vendored `RFB` -> WebSocket/RFB server -> `connect`/`disconnect`/credential/security events -> reactive UI status | One session per host; configured password and shared connection used; remote display mounts in tile; status/error and cleanup remain coherent | `RightSideTabs.vue`, `VncViewer.vue`, `VncHostTile.vue`, `useVncSession.ts`, vendored `core/rfb.js` |
| `BEH-002` | User | Connected user toggles View Only/Interactive, maximizes/restores the tile, presses Escape, or container resizes | `VncHostTile` handlers/`ResizeObserver` -> `useVncSession` policy methods -> `applyViewportStrategy()` -> public `RFB` properties -> noVNC local scaling/remote resize -> remote canvas outcome; initial connect uses temporary interactive resize then restores intended mode | Default view-only and client scaling; fullscreen-fit enables remote resize and interactive mode as required; restore returns prior policy; retry timers cleaned up | `VncHostTile.vue`, `useVncSession.ts`, `useVncSession.spec.ts`, historical fullscreen-fit ticket evidence |
| `BEH-003` | User | Connected user switches to interactive mode and focuses the VNC canvas while browser clipboard APIs/permissions are available; remote sends clipboard text | `toggleViewOnly()` -> `RFB.viewOnly=false` -> vendored `AsyncClipboard.grab()` -> canvas focus -> `navigator.clipboard.readText()` -> `RFB.clipboardPasteFrom()` -> server; reverse server cut text -> `_writeClipboard()` -> `navigator.clipboard.writeText()` | Automatic text clipboard sync is permission-aware; unsupported/denied APIs fall back without preventing the session | Exact vendored snapshot `f5a4eed`; `core/clipboard.js`; `core/rfb.js`; upstream commit/tests |
| `BEH-004` | Operational | Developer installs/builds/tests the frontend or manually refreshes noVNC | pnpm/Nuxt resolves local `~/lib/novnc/core/rfb` -> Vite bundles 57 repository-owned files; updates require copying upstream source and comparing manually | Build works, but dependency provenance/version/update ownership is implicit and stale-prone | `package.json` has no official dependency; local import; `git log`; directory inventory; production package probe |

## Design Health Assessment Evidence

- Change posture: Cleanup / Refactor
- Candidate root cause classification: Legacy Or Compatibility Pressure
- Refactor posture evidence summary: An earlier integration failure led to a copied upstream tree, but the current official scoped ESM package now works directly. The repository owns third-party implementation source without a local delta or valid boundary need. Clean replacement and deletion are required now.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-web/lib/novnc/` vs upstream `f5a4eed` | Exact match | No domain logic or local patch justifies source ownership | Delete entire tree |
| Commit `26cc390` | Failed attempted package import used/referred to `novnc` | Historical blocker was package identity/resolution, not a durable need to fork | Use official scoped root export |
| Current source search | One production integration owner, two mock paths | Replacement boundary is narrow and coherent | Keep `useVncSession` owner; update mocks |
| Actual RFB constructor source | Only connection options are read; current display/viewport constructor keys are ignored | Current call contains misleading dead configuration; public properties are the real policy boundary | Remove ignored keys; preserve effective behavior |
| Disposable Nuxt/Vite probe | Official package passes tests and production generation | No compatibility blocker remains | Proceed after approval |
| Stable/dev upstream comparison | Stable loses current automatic clipboard owner | Blind “latest stable” substitution would cause a reachable regression | Pin exact current master package or revise requirement explicitly |
| Package/type inspection | No upstream root declaration; community declarations target old paths | A small local public-contract declaration is proportionate; importing internals is not | Specify narrow type owner |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/layout/RightSideTabs.vue` | Makes VNC tool reachable from workspace | Mounts `VncViewer`; no noVNC details | Remains upstream caller; no change expected |
| `autobyteus-web/components/workspace/tools/VncViewer.vue` | Resolves VNC hosts/password and renders tiles | No noVNC import | Preserve unchanged |
| `autobyteus-web/components/workspace/tools/VncHostTile.vue` | Owns per-host UI/mount/maximize/observer lifecycle | Calls composable only; no RFB internal coupling | Preserve as user-facing caller |
| `autobyteus-web/composables/useVncSession.ts` | Governing application boundary for one VNC session | Sole production RFB import; owns connection state, credentials, events, timers, view-only/viewport/resize policy | Modify import/constructor only; keep authority here |
| `autobyteus-web/lib/novnc/` | Checked-in third-party implementation | Exact upstream snapshot; no local delta | Remove in full |
| `autobyteus-web/composables/__tests__/useVncSession.spec.ts` | Session policy regression coverage | Mocks local import; covers initial remote resize and fullscreen strategy | Update mock to package root; retain behavior |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Layout integration coverage | Mocks local RFB path | Update mock to package root |
| `autobyteus-web/utils/__tests__/vncHosts.spec.ts` | Host parsing coverage | No direct RFB import; relevant supported entry behavior | Retain/run |
| `autobyteus-web/package.json` | Frontend dependency authority | No noVNC dependency today | Add exact official package |
| `pnpm-lock.yaml` | Workspace resolution/integrity authority | No official noVNC resolution today | Regenerate through pnpm |
| `autobyteus-web/types/` | Existing application ambient/public integration declarations | No noVNC declaration; upstream package lacks one | Add narrow package-root public contract declaration |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-18 | Test | `pnpm -C autobyteus-web test:nuxt composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts utils/__tests__/vncHosts.spec.ts --run` on baseline | Pass: 3 files, 30 tests | Current targeted baseline recorded |
| 2026-07-18 | Setup | Initial package-probe targeted test before `nuxi prepare` | Failed only because fresh detached worktree lacked `.nuxt/tsconfig.json` | Environment/setup failure, not package incompatibility; `nuxi prepare` is required in a fresh worktree |
| 2026-07-18 | Test | `pnpm -C autobyteus-web exec nuxi prepare` then package-probe targeted tests | Pass: 2 files, 27 tests | Updated public import/mock paths are compatible |
| 2026-07-18 | Probe | Package-probe `pnpm -C autobyteus-web generate` | Pass: Nuxt/Vite production client/static build; 3,552 modules transformed | Official package can be bundled in the actual production toolchain |
| 2026-07-18 | Test | Baseline `pnpm -C autobyteus-web exec nuxi typecheck` | Fails with 242 existing errors | Global typecheck is not currently a green gate; compare noVNC delta honestly |
| 2026-07-18 | Probe | Package import with no declaration | Adds `TS7016` for `@novnc/novnc` | Local/public declaration required |
| 2026-07-18 | Probe | Community types package | Root import becomes `TS2306`; declarations use obsolete deep paths and require too-strict credentials | Reject direct reliance on current DefinitelyTyped package |
| 2026-07-18 | Probe | Narrow local package-root declaration plus supported constructor keys | Typecheck returns to same 242-error baseline; no noVNC-specific import error | Proposed type boundary is compatible and proportionate |

## External / Public Source Findings

- Public API / spec / issue / upstream source:
  - <https://github.com/novnc/noVNC>
  - <https://github.com/novnc/noVNC/blob/master/docs/LIBRARY.md>
  - <https://github.com/novnc/noVNC/blob/master/docs/API.md>
  - <https://github.com/novnc/noVNC/releases/tag/v1.7.0>
  - <https://github.com/novnc/noVNC/commit/f5a4eedcea749f82b7cab05cb78a4eb8a92b2c32>
  - <https://www.npmjs.com/package/@novnc/novnc>
- Version / tag / commit / freshness: Observed 2026-07-18; stable `1.7.0` at upstream `63107bd`; current dev build `1.7.0-g7c36fab` at upstream `7c36fab`; current local snapshot `f5a4eed`.
- Relevant contract, behavior, or constraint learned:
  - Official package root is the single RFB export and is compatible with ESM bundlers.
  - Public RFB API covers every property/event/method AutoByteus uses.
  - Current stable package does not contain `f5a4eed` async clipboard behavior; current master/dev package does.
  - Package ships no TypeScript declarations.
- Why it matters: Direct package use is feasible, but version selection and a narrow type boundary are required to avoid a hidden behavior regression and type-resolution regression.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No external service was required for source/package/build compatibility. Existing Vitest mocks exercised composable policy. A real VNC/websockify endpoint is required downstream for live connection/clipboard validation.
- Required config, feature flags, env vars, or accounts: `NUXT_TEST=true` is set by `test:nuxt`; fresh worktree required `pnpm -C autobyteus-web exec nuxi prepare` before tests. Live VNC config uses `AUTOBYTEUS_VNC_SERVER_HOSTS` and password settings.
- External repos, samples, or artifacts cloned/downloaded for investigation: Temporary filtered clones of AutoByteus pre-flatten web history and official noVNC; npm tarballs for stable/dev package and DefinitelyTyped definitions. Material results retained in [upstream-novnc-evaluation.md](./upstream-novnc-evaluation.md).
- Setup commands that materially affected the investigation: npm/pnpm metadata/pack commands; disposable detached git worktree; package add; import/mock substitution; `nuxi prepare`; targeted tests; `nuxt generate`; `nuxi typecheck`.
- Cleanup notes for temporary investigation-only setup: Disposable detached app worktree removed with `git worktree remove --force`; git worktree metadata pruned; `/tmp` clone/package directories removed. Authoritative task worktree and durable artifacts remain.

## Findings From Code / Docs / Data / Logs

1. **No local fork exists.** The checked-in core/vendor tree exactly matches upstream `f5a4eed`; the user's uncertainty about prior modifications is resolved.
2. **The original blocker is obsolete/misidentified.** History refers to `yarn install novnc`; the maintained official package is `@novnc/novnc`, and current package metadata makes the public import simply `@novnc/novnc`.
3. **Direct integration works now.** Actual current Nuxt 3.21.1/Vite 7.3.1 production generation succeeded against the package-root import.
4. **Stable is not behavior-equivalent.** Stable 1.7.0 lacks the snapshot's permission-aware automatic clipboard owner. Because interactive focus is a supported path, this cannot be silently treated as unreachable.
5. **Exact current master package is the proportionate interim dependency.** It removes source maintenance, preserves clipboard behavior, adds later upstream fixes, and is reproducible when pinned exactly.
6. **The application already has a healthy integration owner.** `useVncSession` is the authoritative session-policy boundary; no new wrapper/service layer is necessary.
7. **Constructor cleanup is needed.** Current code passes ignored display/viewport properties as constructor options. Only connection keys should remain there; existing `applyViewportStrategy()` continues to set effective public policy.
8. **Types need a narrow local bridge.** Upstream lacks declarations and community types lag current exports. A small declaration for the used public root API is evidence-backed; copying implementation or depending on deep paths is not.
9. **Current executable coverage is partial.** Unit/layout tests cover resize policy and import seams, not a real RFB handshake or clipboard. Downstream API/E2E owns environment discovery and realistic execution.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Not affected; no persisted model, store, serialization, or schema changes.
- Relevant code-model, serialization, semantic, or physical-store change: Dependency/import/source ownership only.
- Normal readers and writers, including unknown/extra-field behavior: N/A
- Representative direct-read or compatibility evidence: N/A
- Required semantics and invariants preserved by direct use: Yes — package probe and public API/source comparison support the runtime contract; no persisted semantics exist.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: N/A beyond normal dependency install/build.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No migration candidate.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A

## Constraints / Dependencies / Compatibility Facts

- Use official `@novnc/novnc`, not unscoped `novnc` and not obsolete deep paths.
- Exact selected version is `1.7.0-g7c36fab`; automatic dist-tag following is prohibited for reproducibility.
- Package is ESM and root-exports `RFB`; current Nuxt/Vite target supports it.
- `useVncSession` must not depend on noVNC internals.
- Package lacks types; local declaration should contain only the used public surface and optional credentials consistent with upstream docs/runtime.
- Vendored tree is MPL-2.0 source; package replacement must continue normal third-party license handling.
- No backward compatibility or fallback vendored path is allowed.
- Existing global typecheck baseline is 242 errors; do not misreport it as green or expand scope to unrelated fixes.

## Open Unknowns / Risks

- The user approved the proven direct-package basis, including the exact current-master package pin instead of the stable tag.
- No real VNC/websockify service was exercised in this stage. Downstream API/E2E must discover the project setup and execute the strongest realistic session/clipboard validation available.
- Exact dev build risk remains until a stable release includes the required clipboard behavior; package pinning prevents unreviewed drift.
- If upstream changes its root API or publishes official types later, a future package upgrade should delete or update the local declaration rather than letting it become a second authoritative API.

## Notes For Architecture Reviewer

Requirements were approved on 2026-07-18. Review the forthcoming `proposed-design.md` with this evidence. Expected design posture:

- clean-cut dependency replacement, not a refresh-in-place;
- one primary user session spine through existing `useVncSession` owner;
- one operational dependency/build spine;
- exact `1.7.0-g7c36fab` pin justified by `BEH-003` clipboard preservation;
- full `autobyteus-web/lib/novnc/` deletion and no fallback;
- narrow package-root TypeScript declaration;
- update two test mocks and retain targeted/live validation responsibilities.
