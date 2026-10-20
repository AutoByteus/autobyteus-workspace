# Requirements Document — Dependency security advisories and unused dependencies

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `dependency-security-and-unused-cleanup`
- Request / ticket: Project Task `autobyteus-229` (FU-004 of `autobyteus-224`, plus Part 2 added by the user on 2026-10-20)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: Solution Designer within the direction of Task `autobyteus-229` (user informed in the Solution Designer conversation, 2026-10-20). The Task already sets the rule for out-of-rule items (list them, don't widen silently) and for doubtful removals (report to the user).
- Exact approved requirements baseline: SR-003. SR-002 corrected DEC-005/AC-004 after ARCH-REV-001 AR-001 (`@nuxtjs/apollo` kept). SR-003 revised REQ-006 and added DEC-007 after IMP-DI-001 (a type-level source adaptation for axios 1.20.0). Intended behavior unchanged; approved by the Solution Designer within the Task's direction, user informed
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:**
  - The root lockfile pins dependency versions with published security advisories. `pnpm audit` on `origin/personal` @ `3b2c86ca9e`:
    - whole workspace: 18 critical, 217 high;
    - `--prod`: 3 critical, 91 high, in 30 packages.
  - Some run inside the shipped app or server. Examples:
    - `tar` in Electron main extracts the voice-input runtime;
    - `undici` in `autobyteus-ts` serves the local LLM fetch;
    - `axios` makes the LLM calls;
    - `protobufjs` ships via `onnxruntime-web`;
    - `ws` serves the server WebSocket;
    - Electron itself.
  - Several packages also declare dependencies that nothing uses, which ship, add advisories and slow installs.
- **Desired outcome:**
  - Every high/critical advisory that the "small and safe" rule (DEC-001) can fix is fixed.
  - Every remaining one is explained, with evidence and a follow-up.
  - Clearly unused dependencies are removed; doubtful ones are reported.
  - The lockfile has no pending dedupe.
  - Builds, suites, the packaged app and the Docker image work as before.
- **Observable definition of success:** the post-change `pnpm audit` (all and `--prod`) has high/critical findings only from the explained set (AC-001, AC-002); `pnpm dedupe --check` passes; the removed dependencies are gone, with evidence; every validation in AC-005…AC-008 passes.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational/Security | SCN-001 | 30 runtime packages with high/critical advisories (`evidence/SD-01`) | All in-rule ones on patched versions; the rest explained | Runtime behavior of every feature | SD-01, SD-02 |
| BEH-002 | Operational | SCN-001 | Dev/build-only high/critical advisories (`evidence/SD-00`) | In-rule ones patched; the rest explained | Build, test, packaging | SD-00, SD-02 |
| BEH-003 | Operational | SCN-002 | 13 clearly unused declared dependencies (plus 4 unused `@types/node`) | Removed | Everything they don't serve | SD-03, investigation |
| BEH-004 | Operational | SCN-001 | `pnpm dedupe --check` fails (pending `tar`, `undici`, `tslib`, `eventsource-parser`, `extsprintf`) | Passes | — | autobyteus-224 API-01 |
| BEH-005 | System | SCN-003 | Desktop app on Electron 42.4.1 (5 high advisories) | Electron 42 latest patch (42.11.16 on 2026-10-20) | Desktop behavior, native modules (same major/ABI) | SD-00, DEC-002 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User / desktop and Docker users | Run AutoByteus safely | Fewer exploitable dependencies at run time | No feature regresses |
| Maintainers | Know the dependency risk | An explained list of what stays and why, as follow-ups | No silent widening (Task) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Update vulnerable dependencies under the small-and-safe rule (DEC-001), incl. the Task's named `tar`, `undici`, mercurius' `undici` (DEC-003) and Electron within 42 (DEC-002) | SCN-001, SCN-003 |
| UC-002 | Remove clearly unused dependencies across the workspace packages and `autobyteus-message-gateway` | SCN-002 |
| UC-003 | Keep install, build, tests, packaged app and Docker image working | SCN-004 |

### Out Of Scope

Major upgrades and replacements, listed as follow-ups:
- Fastify 4 → 5, with `mercurius` 16 and the `@fastify/*` majors (server and gateway);
- the `xlsx` replacement;
- `happy-dom` 20, `electron-builder` 26, the graphql-codegen tool majors, `sharp` 0.35 and `to-ico`;
- the devDependencies in the packaged server (autobyteus-227);
- adding undeclared test dependencies;
- the gateway's workspace membership and audit coverage;
- Monaco's CDN loading.

### Non-Goals

- No `pnpm.overrides` / `resolutions` / npm `overrides`. No source code changes, except a type-level adaptation with no runtime change that a patched version's stricter types require (REQ-006; DEC-007, `download-media-tool.ts` L118). A removal never needs code, by definition of unused.
- Moderate/low advisories are not targeted, though in-range refreshes may fix some.

### Preserved Behavior Boundary

- All product behavior. BEH-001…005 change only dependency versions and declarations.
- AC-005…AC-008 protect: builds, the server, `autobyteus-ts`, web, contracts, packaged app and Docker.

### Prerequisites

None. Checked: `pnpm` targeted update works (probe, investigation), Electron 42.11.16 exists, every removal candidate verified (investigation).

| Prerequisite ID | Finding | Blocks | Sent To | Status |
| --- | --- | --- | --- | --- |
| — | None | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every high/critical advisory (prod and dev) whose fix fits DEC-001 is fixed: `autobyteus-web` `tar` → `^7.5.22`, `autobyteus-ts` `undici` → `^7.29.1` (both direct), and every in-range transitive/parent update in `evidence/SD-02` | BEH-001, BEH-002 | Must | Security, the Task | Task Part 1 |
| REQ-002 | `autobyteus-web` `electron` → the latest 42.x (42.11.16 or newer patch at implementation time, exact pin as today) | BEH-005 | Must | 5 high advisories in the shipped runtime | DEC-002 |
| REQ-003 | Every remaining high/critical advisory is explained in the ticket's findings table, with evidence (version, why not in-rule, reachability) and a follow-up ID | BEH-001, BEH-002 | Must | Task Done-when | Task |
| REQ-004 | The clearly unused dependencies listed in DEC-005 are removed from their manifests; doubtful ones are kept and reported to the user | BEH-003 | Must | Task Part 2 | User 2026-10-20 |
| REQ-005 | `pnpm dedupe --check` passes on the final lockfile; the dedupe's version changes are reviewed in the implementation handoff | BEH-004 | Must | Task | Task |
| REQ-006 | No new override/resolution mechanism. Source changes only where a patched version's stricter **types** require a type-level adaptation with no runtime behavior change, each one listed with its cause and covered by a test. Today the only one is `autobyteus-ts/src/tools/multimedia/download-media-tool.ts` L118 (DEC-007) | — | Must | Clean-cut, smallest change; keeps the axios fix | DESIGN.md; DEC-007 |
| REQ-007 | Install, builds, suites, packaged app and Docker image keep working (AC-005…AC-008) | all | Must | Task Done-when | Task |

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected Outcome | Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | `pnpm audit --prod --json` on the final tree | High/critical only from the explained set: `fastify` 4, `find-my-way` 8, `@fastify/static` 7 and `@fastify/busboy` 2.x (via `mercurius`), mercurius' `undici` 5.28.3, `xlsx` (and their transitive dependents, if any). Each is in the findings table | Any other high/critical → defect of this ticket (or a new advisory: add it to the findings with evidence) | Command output diff vs `evidence/SD-01` |
| AC-002 | REQ-001, REQ-003 | `pnpm audit --json` (all) | High/critical only from the explained set (AC-001 plus the dev-only majors/no-fix list in the findings table) | Same | Command output |
| AC-003 | REQ-005 | `pnpm dedupe --check` | Exit 0 | — | Command |
| AC-004 | REQ-004 | grep each removed name in its manifest and in the root lockfile importer; `probes/import-provider-check.mjs` for every changed package, before vs after | Absent; each doubtful one still present and reported; the import-provider output is identical to the base (`evidence/SD-07`): no bare import loses its provider | An import that turns `MISSING` → the removal is wrong (Design Impact) | grep, diff |
| AC-005 | REQ-007 | `pnpm install --frozen-lockfile`; builds: `autobyteus-ts`, `autobyteus-server-ts` (build, typecheck), contract packages, SDKs, `autobyteus-web` (`nuxt build`), applications' typecheck/build | Pass | — | Logs |
| AC-006 | REQ-007 | Suites: `autobyteus-ts` test; server `test:unit`, `test:integration`; server MCP/HTTP e2e; web `test:nuxt`, `test:electron`; contract/SDK tests; `voice-input-extension.integration.test.ts` (tar extraction) | Pass (same as base, or failures diagnosed per TESTING.md Rule 9) | — | Logs, before/after counts |
| AC-007 | REQ-002, REQ-007 | Packaged macOS desktop build of the branch: `verify-packaged-server-startup.mjs`, the packaged Electron harness and an isolated instance that starts, opens a conversation surface, and reports Electron 42.11.x | Pass | — | Logs |
| AC-008 | REQ-007 | Docker image build from `Dockerfile.monorepo` and start (health + GraphQL) | Pass | — | Log |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Outcome | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Maintainer | Patch vulnerable dependencies | Lockfile/manifests update | Audit reduced as AC-001/002 | Supported Normal Scenario | SD-00…02 | REQ-001, REQ-003, REQ-005 |
| SCN-002 | Operational | Maintainer | Remove unused dependencies | Manifest edit | Smaller tree | Supported Normal Scenario | SD-03 | REQ-004 |
| SCN-003 | System | Desktop user | Run the app on a patched Electron | App start | Same behavior | Supported Normal Scenario | DEC-002 | REQ-002 |
| SCN-004 | Operational | Release | Build, package, run | Release build | Works | Supported Normal Scenario | RELEASE.md, TESTING.md | REQ-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001…003; AC-001, AC-002 | Security | Runtime high/critical reduced to the explained set | Audit |
| QR-002 | REQ-007; AC-005…008 | Compatibility | No regression in builds, suites, packaged app, Docker | Logs |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| GitHub/npm advisory database (via `pnpm audit`) | Point-in-time; new advisories may appear before delivery | SD-00 dated 2026-10-20 |
| Electron 42.x | Same major keeps the Node ABI for `node-pty` | Electron release policy |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `evidence/SD-00…SD-04`, `probes/` | Audit baseline, fixability, unused scans, mercurius reproduction | Final; evidence only |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | In-range updates keep API compatibility (semver) | AC-005…AC-008 | Validation |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What counts as "small and safe" (the Task's words)? | Draws the line between this ticket and follow-ups | (a) only the 3 named; (b) any patched version reachable without code change; (c) also majors | **(b), precisely:** a fix is in-rule when the vulnerable package reaches a patched version (1) inside every declared range of its dependents (a lockfile refresh, possibly of its parent within the parent's range), or (2) by raising one of our own direct specifiers within the same major (same minor for `0.x`). No overrides; source changes only as REQ-006 allows (type-level, no runtime change; DEC-007). Applies to prod and dev alike, because both use the same mechanism and validation. 23 prod rows and 28 dev rows qualify (SD-02). | Solution Designer | Decided |
| DEC-002 | Include Electron 42.4.1 → 42.x latest? | The shipped desktop runtime has 5 high advisories (fixed by 42.10.0) | An exact-pin bump within major 42 keeps the Node ABI; Chromium/Electron security patches | Include it: it fits DEC-001 (2), the risk is in the runtime users run, and AC-007 validates the packaged app | Solution Designer | Decided |
| DEC-003 | Mercurius' `undici` 5.28.3 (17 advisories, 3 high): override, upgrade or explain? | Task asks for a fix or an explained remainder | Reproduced (`evidence/SD-04`): mercurius 13.4.1, registered as the server registers it (GraphiQL + subscriptions), loads 535 modules and **no** `undici`; `lib/` never requires it. Fixed versions need `mercurius` ≥ 14 → Fastify 5. An override would add a second resolution mechanism and would not reach the Windows packaging path (`npm install`) | Explain, don't override: the vulnerable code never runs. The real fix is the Fastify 5 migration follow-up (FU-001), which also clears `fastify`, `find-my-way`, `@fastify/static` and `@fastify/busboy` 2.x | Solution Designer | Decided |
| DEC-004 | Fastify 4 → 5 here? | `fastify` 4.29.1 (newest 4.x) has 6 high advisories (e.g. auth bypass via malformed URLs, validation bypasses), fixed only in 5.x; v4 is end-of-life | A framework-major migration of the server (and gateway) with `mercurius` 16 and `@fastify/*` majors | Not here: the Task forbids silent widening, and it's a code migration. Follow-up FU-001, **urgent** | Solution Designer | Decided |
| DEC-005 | Which dependencies are clearly unused? | Task Part 2 | Scans (SD-03) + hand checks (investigation) | **Remove:** see the list below. **Keep and report as doubtful:** `monaco-editor` (unused because `@monaco-editor/loader` fetches Monaco from its CDN; whether the app should bundle it for offline use is FU-006). **Keep, used:** `@anthropic-ai/sdk` in the server (required peer of the Claude Agent SDK, pinned on purpose); the codegen plugins, `postcss`, `autoprefixer` (config use); `typescript` in the gateway (`tsc` in scripts); `@types/node` where removing it breaks type checks (backend SDK, brief-studio) | Solution Designer | Decided |
| DEC-006 | Undeclared imports: server tests (`jsdom`, `@autobyteus/application-backend-sdk`); web code (`@apollo/client`, `@vue/apollo-composable`, `graphql`, `graphql-tag`, provided only through other packages; ARCH-REV-001) | Found by knip and the review | The opposite of unused; adding them is not removal | Follow-up FU-005 | Solution Designer | Decided |
| DEC-007 | axios 1.20.0 (the only release that fixes GHSA-3pq3-5fj3-cg6v and GHSA-542g-h47m-68v8, both high, `>=1.13.0 <1.20.0`; verified 2026-10-20) types the lower-case `'content-type'` response header as `AxiosHeaderValue`, so `download-media-tool.ts` L118 `contentType.split(';')` stops compiling (IMP-DI-001, `evidence/IMP-07`) | Without a fix, the `autobyteus-ts` and server builds fail; holding axios back keeps two high runtime advisories | (a) a one-line type adaptation `String(contentType).split(';')` plus a unit assertion of the content-type → extension mapping; (b) hold axios at 1.13.x and explain | **(a).** For the string header Node delivers, `String()` is the identity, so runtime behavior is unchanged; the change is local and covered by a test. (b) would keep two high advisories in the agents' download tool path | Solution Designer | Decided |

**DEC-005 removal list:**
- `autobyteus-web` dependencies: `chart.js`, `vue-chartjs`, `diff-match-patch`, `html2canvas`, `jsonrepair`, `markdown-it-katex` (also removes its XSS advisory), `markdown-it-prism`.
- `autobyteus-web` devDependencies: `nuxt-electron`, `@vitejs/plugin-vue`, `concurrently`, `xmldom` (also removes 13 critical advisories).
- **Kept, not unused (SR-002, ARCH-REV-001 AR-001, reproduced):** `@nuxtjs/apollo` in `autobyteus-web`. Web code imports `@apollo/client` and `@vue/apollo-composable` without declaring them, and `@nuxtjs/apollo` is their only provider in the lockfile. Removing it drops both (`evidence/SD-08`). Declaring them directly and then dropping the module is FU-005.
- `autobyteus-ts` devDependencies: `dotenv`, `ts-node`.
- `@types/node` in `autobyteus-application-frontend-sdk`, `autobyteus-team-stream-contracts`, `autobyteus-agent-presentation-contracts` and `autobyteus-collaboration-stream-contracts` (each type-checks with 0 errors without it, measured).

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-005 | AC-007 | SCN-003 |
| REQ-003 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001 |
| REQ-004 | UC-002 | BEH-003 | AC-004 | SCN-002 |
| REQ-005 | UC-001 | BEH-004 | AC-003 | SCN-001 |
| REQ-006 | UC-001, UC-002 | — | AC-001…004 | SCN-001, SCN-002 |
| REQ-007 | UC-003 | all | AC-005…AC-008 | SCN-004 |

## Architecture Phase Input

- Approved scenarios: SCN-001…SCN-004.
- Constraints: DEC-001 rule; no overrides; source changes only per REQ-006 (DEC-007); TESTING.md rules (worktree build, isolated instances).
- Deferred to design: the exact update commands and order; how to review the lockfile churn; the validation matrix.

## Readiness Check

### Content Ready For Approval

- All items `Yes`; Product design `N/A`. Content ready: `Yes`.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Basis recorded: `Yes`
- Ready for design: `Yes`
