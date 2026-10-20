# Design Spec — Dependency security advisories and unused dependencies

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (design correction after ARCH-REV-001)
- Approved requirements: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction of Task `autobyteus-229` (user informed 2026-10-20)
- Behavior-defining supplements: none
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/investigation-notes.md`
- Authorities read (2026-10-20): `references/architecture-design.md` (updated today), `references/design-principles.md`, `references/finding-the-cause.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/DESIGN.md`, `TESTING.md`, `RELEASE.md`, `templates/design-spec-template.md` (updated today)
- Conflicts or discrepancies: none
- Reproduction to start from:
  - "Red" is today's audit: `pnpm audit --prod --json` and `node probes/fixability.mjs <audit.json> <repo>`, which list 23 in-range runtime rows (`evidence/SD-01`, `SD-02`).
  - "Green" is the trial's result (`evidence/SD-05`):
    - runtime high/critical only from the explained set;
    - no `IN-RANGE` row except the one dev-only straggler, `undici` 6.27.0 under `node-gyp`;
    - `pnpm dedupe --check` exit 0.

## Current-State Read

Every workspace package resolves through the root `pnpm-lock.yaml` (pnpm 10.28.2, `autoInstallPeers`). Many locked versions predate published fixes that their dependents' ranges already allow. A few of our direct specifiers sit below the fix: `tar` in web, `undici` in `autobyteus-ts`, and the exact Electron pin. Several manifests declare packages nothing uses (investigation). `autobyteus-message-gateway` is outside the workspace. The design touches no source owner.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`.
  - Payload: 8 manifests (web, `autobyteus-ts`, 4 small packages; the server's and backend SDK's manifests change only where `pnpm update` raises a direct specifier) plus the root lockfile. The trial diff was about 3.4k insertions / 3.5k deletions, mostly lockfile (`evidence/SD-06`).
  - Structural surfaces: none; no source change.
- Architectural risk: `High`. No code, contract or persistence changes, but the blast radius is wide:
  - Runtime library versions change under every packaged runtime: Electron 42.4.1 → 42.11.16 (the desktop shell); `vue` 3.5.28 → 3.5.44 and `nuxt` 3.21.1 → 3.21.11 (the UI build); `axios` 1.13 → 1.20 and `undici` 7.22 → 7.30 (`autobyteus-ts` provider calls); `protobufjs`, `ws`, `@fastify/busboy` and `fast-uri` (server); `express` and `hono` (the Claude SDK's MCP peer).
  - All of them are semver-compatible, and only the full validation matrix shows that nothing regressed.
- Escalation trigger (→ Design Impact):
  - a suite, build, packaged app or Docker image fails because of an update and the cause is not a local test fix;
  - an update needs a source change or an override;
  - `pnpm update` cannot reach a runtime row listed as in-range.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision | Uncertainty |
| --- | --- | --- | --- | --- |
| Audit at base | `evidence/SD-00`, `SD-01` (Measured) | Runtime: 3 critical / 91 high in 30 packages | Scope | New advisories may appear (R-003) |
| Fixability | `probes/fixability.mjs`, `evidence/SD-02` (Measured) | Prod: 23 in-range + 3 via parent update; 7 not | DEC-001 split | — |
| Mercurius | `probes/mercurius-load-probe.mjs`, `evidence/SD-04` (Reproduced) | `undici` never loaded | DEC-003 explain | — |
| Trial of this design | `probes/apply-manifest-changes.mjs`, `update-inrange-loop.sh`, `evidence/SD-05`, `SD-06` (Measured; reverted) | Prod after: 0 critical / 13 high, all explained; all: 6 critical / 46 high (dev majors and no-fix); dedupe check 0. A single `pnpm update` with many names leaves transitive packages behind; **one name per command** works | Update mechanism (below) | Real run may differ slightly (newer patches); AC-001/002 handle it |
| Peers | trial install log | New optional-peer notice: `@nuxt/cli` 3.37.0 (shipped by `nuxt` 3.21.11) wants `@nuxt/schema ^4.4.6` (optional) | Accept; prove with `nuxt build` and web tests | — |
| Unused | `evidence/SD-03` + hand checks (Measured / Read) | DEC-005 list | Removals | — |
| Import providers | `probes/import-provider-check.mjs`, `evidence/SD-07`, `SD-08` (Reproduced / Measured) | `@nuxtjs/apollo` is the only provider of 2 imported packages; the corrected removals leave every provider in place | Keep `@nuxtjs/apollo`; step 4 check | — |

## Intended Change

- Raise three direct specifiers: web `tar`, `autobyteus-ts` `undici`, web `electron`.
- Remove the clearly unused dependencies.
- Move every in-range vulnerable package (and needed parents) to its newest in-range version, one package per `pnpm update`, looping until no in-range row is left.
- Dedupe.
- Prove nothing regressed.
- Record the explained remainder and the follow-ups.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003.
  - Files: `autobyteus-web/package.json`, `autobyteus-ts/package.json`, the `package.json` of `autobyteus-application-frontend-sdk`, `autobyteus-team-stream-contracts`, `autobyteus-agent-presentation-contracts` and `autobyteus-collaboration-stream-contracts`, any manifest whose direct specifier `pnpm update` raises, and the root `pnpm-lock.yaml`.
  - The ticket folder's findings (`follow-ups.md`).
- Deliberately left alone:
  - all source code;
  - Fastify / `mercurius` / `@fastify/*` majors (FU-001);
  - `xlsx` (FU-002);
  - the web build-tool majors and `to-ico`/`sharp` (FU-003, FU-004);
  - `monaco-editor` (doubtful, FU-006);
  - the server's `@anthropic-ai/sdk` (required peer);
  - the message gateway (FU-007; it has no lockfile in this repo);
  - packaging scripts and the Dockerfile;
  - `pnpm.overrides`.
- Follow-ups: FU-001…FU-007 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Outcome | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-003; AC-001 | Runtime use of updated libraries | Same behavior on patched versions | DS-001…DS-004 |
| BEH-002 | REQ-001, REQ-003; AC-002 | Build/test tooling | Same | DS-005 |
| BEH-003 | REQ-004; AC-004 | — | Unused packages gone | DS-005 |
| BEH-004 | REQ-005; AC-003 | `pnpm dedupe --check` | Exit 0 | DS-005 |
| BEH-005 | REQ-002; AC-007 | Desktop start | Electron 42.11.x | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `evidence/SD-00…SD-06`, `probes/` | Baseline, method and the trial this design repeats |
| `follow-ups.md` | Explained remainder and doubtful dependencies |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (security maintenance)
- Current design issue found: `Yes`. Outdated lockfile resolutions and unused declarations; no code-structure issue.
- Structural triggers:
  - Legacy cleanup: fires for the unused declarations.
  - Persisted-data: does not fire.
  - Others: not applicable (no code).
- Root cause classification: `Legacy Or Compatibility Pressure`. Stale resolutions, and declarations left after their users went (e.g. `markdown-it-katex` after the move to `@mdit/plugin-katex`).
- Refactor needed now: `No` code refactor; removals `Yes`.
- Design response: an in-place version refresh within declared ranges, plus removals. No overrides.
- Deferrals: FU-001…FU-007, each with its risk.

## Terminology

- **In-range:** the newest version that every dependent's declared range allows is patched (`probes/fixability.mjs`).
- **Explained set:** the remaining high/critical advisories, each with a reason and a follow-up (`follow-ups.md` and the findings table below).

## Legacy Removal Policy (Mandatory)

- Obsolete declarations: DEC-005 list.
- Compatibility mechanisms kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Desktop app start | Electron main (voice-input `tar.x`, updater) + renderer | Electron / `autobyteus-web` | Electron, `tar`, `electron-updater`, `vue` versions |
| DS-002 | Primary | Server start / API calls | Fastify routes, GraphQL (`mercurius`), WebSocket (`ws`), uploads (`@fastify/busboy`), embeddings (`onnxruntime-web` → `protobufjs`) | `autobyteus-server-ts` | Server-side runtime updates |
| DS-003 | Primary | Agent LLM call | Provider via `axios` / local LLM via `undici` | `autobyteus-ts` | Provider transport updates |
| DS-004 | Primary | Claude runtime | Claude Agent SDK + its MCP SDK peer (`express`, `hono`, …) | server | Peer updates |
| DS-005 | Primary | `pnpm install` / build / package | Lockfile → `node_modules` → builds → packaged app / Docker image | pnpm + build scripts | The change itself |

## Primary Execution Spine(s)

- DS-005: `manifests + lockfile → pnpm install → builds (ts, server, contracts, SDKs, web) → packaging (prepare-server, electron-builder) / Docker build → runtime`
- DS-001…DS-004 are the existing runtime paths, unchanged in code; only their library versions move.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-005 | The implementer edits the manifests, installs, runs the in-range loop, dedupes and audits. Builds and packaging then consume the new lockfile as today | pnpm / build scripts |
| DS-001…004 | The code path is unchanged; the validation matrix exercises each with the new versions | their existing owners |

## Spine Actors / Main-Line Nodes

pnpm, the build scripts, packaging; the runtime owners as today.

## Ownership Map

Unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Notes |
| --- | --- | --- |
| web deps `chart.js`, `vue-chartjs`, `diff-match-patch`, `html2canvas`, `jsonrepair`, `markdown-it-prism` | Dead: no reference in any non-generated file of `autobyteus-web` (strict scan `evidence/SD-03`; hand grep) | `chart.js`: the token chart is custom SVG |
| web dep `markdown-it-katex` | Dead: math uses `@mdit/plugin-katex` + `katex` (`useMarkdownSegments.ts` L3-6) | Also removes GHSA-5ff8-jcf9-fw62 (XSS) |
| web devDep `nuxt-electron` | Dead: not in `nuxt.config.ts` `modules` (L111-115), no import | `@nuxtjs/apollo` stays: it is the only provider of `@apollo/client`/`@vue/apollo-composable` (AR-001, `evidence/SD-08`); FU-005 |
| web devDep `@vitejs/plugin-vue` | Dead: no import; `nuxt` brings its own; not a peer of `@nuxt/test-utils` | Web build + tests prove it |
| web devDep `concurrently` | Dead: not in scripts; only docs mention it | — |
| web devDep `xmldom` | Dead: no reference | Removes 13 critical advisories |
| `autobyteus-ts` devDeps `dotenv`, `ts-node` | Dead: knip; grep shows only a test label string and a regex | — |
| `@types/node` in frontend-sdk, team-stream, agent-presentation, collaboration-stream contracts | Dead: each type-checks with 0 errors without it (measured) | Build + tests prove it |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

None.

## Ownership Boundaries

Unchanged.

## Boundary Encapsulation Map

N/A.

## Dependency Rules

- No `pnpm.overrides`, `resolutions` or npm `overrides`.
- No `pnpm update --latest`.
- No major bump: a major bump is a follow-up.
- Direct specifiers may only be raised within their major. For `0.x`, within the minor.
- Exact pins stay exact (Electron).

## Interface Boundary Mapping

N/A.

## Interface Boundary Check

N/A.

## Main Domain Subject Naming Check

N/A.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Packaged smoke | `verify-packaged-server-startup.mjs`, packaged Electron harness, isolated instances | Reuse |
| Docker | `Dockerfile.monorepo` | Reuse |

## Subsystem / Capability-Area Allocation

Workspace dependency manifests and the root lockfile.

## Draft File Responsibility Mapping

See final.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/package.json` | `tar` → `^7.5.22`; `electron` → `42.11.16` (or the newest 42.x at implementation time, exact); remove the 7 dependencies and 4 devDependencies of DEC-005 (**not** `@nuxtjs/apollo`); specifiers raised by `pnpm update` (e.g. `axios`, `electron-updater`, `nuxt`, `postcss`, `vitest`, `ws`) are accepted |
| `autobyteus-ts/package.json` | `undici` → `^7.29.1` or higher in 7.x; remove `dotenv`, `ts-node`; raised specifiers accepted (`axios`, `vitest`) |
| 4 small packages' `package.json` | Remove `@types/node` (minimal text edit; keep their compact one-line formatting) |
| Other manifests | Only specifier raises made by `pnpm update` |
| `pnpm-lock.yaml` | Result of install + in-range loop + dedupe |
| `tickets/.../follow-ups.md` | Already written; the implementation handoff updates the expected-vs-actual remaining set |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

Covered above.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Transitive update | `for n in $IN_RANGE; do pnpm update -r --depth Infinity "$n"; done; pnpm dedupe` (`probes/update-inrange-loop.sh`) | One `pnpm update` with 40 names: the trial left `protobufjs`, `fast-uri`, `linkify-it` behind; `pnpm update --latest`; `pnpm audit --fix` (writes overrides) |
| Manifest edit | Delete the one dependency line (fix the trailing comma), keep formatting | `JSON.stringify` rewrite that expands `"files": [...]` and `"exports"` (seen in the trial with `probes/apply-manifest-changes.mjs`, which is a list of the edits, not the tool to use) |
| Mercurius' `undici` | Explain (never loaded, `evidence/SD-04`); FU-001 | `"pnpm": { "overrides": { "mercurius>undici": … } }` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Override vulnerable transitive versions | Rejected | In-range updates; out-of-range go to follow-ups |
| Keep "maybe useful later" unused packages | Rejected | Remove; `monaco-editor` reported as doubtful |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Baseline:** on the untouched branch, record `pnpm audit --json`, `pnpm audit --prod --json` and the suite counts. The investigation's `SD-00`/`SD-01` can be reused if the base is unchanged.
2. **Manifest edits (minimal text):** the specifier bumps and the removals. Then `pnpm install`.
3. **In-range loop:** `bash probes/update-inrange-loop.sh <repo> probes/fixability.mjs`, until no `IN-RANGE` row is left, or a round leaves the lockfile unchanged.
   - **Parent pass (RR-002):** some rows clear only when a parent moves, and the loop never names parents. So also `pnpm update -r --depth Infinity <name>`, one at a time, for `electron-updater` (→ `builder-util-runtime` 9.7.0), `vue` (→ `@vue/server-renderer`), `express-rate-limit` (→ `ip-address`), `mermaid` and `@mermaid-js/parser` (→ `lodash-es` ≥ 4.18). Do the same for the direct parent of any other runtime row that remains outside the explained set.
   - Then `pnpm dedupe`; `pnpm dedupe --check` must exit 0.
4. **Review:**
   - `git diff -- '*package.json'`: only the intended removals and same-major raises;
   - the lockfile diff summary: list the major version changes of any package; there should be none, and any would be a finding;
   - unmet peer warnings vs base: the `@nuxt/cli` optional-peer notice is expected;
   - **import providers (AR-001):** `node probes/import-provider-check.mjs <repo> autobyteus-web autobyteus-ts autobyteus-server-ts autobyteus-application-frontend-sdk autobyteus-team-stream-contracts autobyteus-agent-presentation-contracts autobyteus-collaboration-stream-contracts autobyteus-application-backend-sdk` is compared with `evidence/SD-07`. An import that turns `MISSING` has lost its only provider, so stop: that's a Design Impact. A provider moving between locations (package, root, hidden hoist) is harmless; note it in the implementation handoff (ARCH-REV-002 note).
5. **Audit:** compare `pnpm audit --prod` and `--json` with `evidence/SD-05`. Every remaining high/critical must be in the findings table. A newly published one that is in-range is fixed; any other is added to the table with evidence.
6. **Remaining in-range rows:** any that the loop can't move are listed with the reason. In the trial that was only the dev-only `undici` 6.27.0 under `node-gyp`.
7. **Validation (API/E2E):**
   - every build;
   - TESTING.md "Rerun" all, because the lockfile changed: `autobyteus-ts` test; server `typecheck`, `test:unit`, `test:integration:prepare` + `test:integration`, `pnpm test:e2e`; web `test:nuxt`, `test:electron`, guards, `nuxt build`; contract/SDK tests; applications' typecheck/build;
   - `voice-input-extension.integration.test.ts` (`tar` extraction);
   - the gated LM Studio suite if available (`undici` local fetch; one local-model run at a time);
   - a packaged macOS build: `verify-packaged-server-startup.mjs`, `test:e2e:electron`, and an isolated instance that starts and shows `process.versions.electron` 42.11.x and a working conversation view;
   - a Docker image build and start (health + GraphQL query + GraphiQL page).
   - Before/after counts in the report.

## Key Tradeoffs

- **One name per update** instead of a full in-range refresh (`pnpm update -r` without names): this moves only the vulnerable packages and the neighbours they need. The trial still moved about 7k lockfile lines, mostly because of the `nuxt`/`vite`/`vitest` toolchain rows. A full refresh would move everything.
- **Explain instead of override** for the never-loaded mercurius `undici`.

## Findings Table (expected remainder after this change; from the trial `evidence/SD-05`)

| Package@version | Runtime? | Severity | Why not fixed here | Follow-up |
| --- | --- | --- | --- | --- |
| `fastify@4.29.1`, `find-my-way@8.2.2` | Yes (server) | high | Fixed only in Fastify 5 (major); v4 end-of-life | FU-001 (urgent) |
| `@fastify/static@7.0.4` | Yes (mercurius GraphiQL route) | high | Needs `mercurius` ≥ 14 → Fastify 5 | FU-001 |
| `undici@5.28.3`, `@fastify/busboy@2.1.1` (under mercurius) | Installed, never loaded (`SD-04`) | high | Same | FU-001 |
| `xlsx@0.18.5` | Yes (spreadsheet viewer parses user files) | high | No npm release with a fix | FU-002 (urgent) |
| `happy-dom@15`, `tinypool@1` (vitest), `@graphql-tools/utils` 9/10/11, `immutable`, `lodash`, `braces`, `minimatch@9.0.1`, `node-forge` | No (test/codegen/nuxt CLI) | critical/high | Majors or no fix | FU-003 |
| `electron-builder` chain: `tar@6.2.1`, `app-builder-lib@25`, `builder-util-runtime@9.2.10`, `http-cache-semantics` | No (packaging) | critical/high | `electron-builder` 26 major | FU-003 |
| `undici@6.27.0` (node-gyp) | No (native rebuild) | high | In range, but pnpm keeps it | FU-003 |
| `to-ico` chain: `minimist@0.0.8`, `form-data@2.3.3`, `jpeg-js`, `url-regex`; `sharp@0.33.5` | No (manual icon generator) | critical/high | Replacement / 0.x minor | FU-004 |

## Risks

- RR-003 (from ARCH-REV-001): `generated/graphql.ts` imports `@vue/composition-api`, which nothing provides, today or after this change. It is pre-existing; don't count it as a regression.

R-001…R-004 (investigation notes). Also: Electron minor changes (R-002); the optional `@nuxt/cli` peer notice.

## Guidance For Implementation

- Work in `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`.
- The probes in `probes/` are rerunnable: `fixability.mjs` needs an installed tree; `update-inrange-loop.sh` uses `/tmp/loop-audit.json`.
- If a suite fails, find the cause first (TESTING.md Rule 9). A failure caused by an update is a defect of this ticket. Fix it within the rule (e.g. hold that one package at the newest version that works, only if that version is still patched); otherwise return a Design Impact.
- Stage paths explicitly; don't commit untracked `dist/` folders.
- Recommend in the delivery report whether a beta is warranted: the runtime fixes in Electron, `tar`, `undici`, `protobufjs` and `axios` argue for one.
