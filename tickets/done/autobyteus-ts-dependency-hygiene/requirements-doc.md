# Requirements Document — autobyteus-ts dependency hygiene

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `autobyteus-ts-dependency-hygiene`
- Request / ticket: Project Task `autobyteus-224` (FU-003, FU-006 of `autobyteus-182`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: Solution Designer within the direction of Task `autobyteus-224` (user informed in the Solution Designer conversation, 2026-10-20)
- Exact approved requirements baseline: SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: `autobyteus-ts` carries two leftovers of the archived standalone repository: a stale lockfile nobody reads and an unused runtime dependency `hono`, which the packaged app installs.
- Desired outcome: the stale lockfile and the unused dependency are gone; the build and the packaged server still work.
- Observable definition of success: no `autobyteus-ts/pnpm-lock.yaml`; no `hono` in `autobyteus-ts/package.json` or in the root lockfile's `autobyteus-ts` importer; `autobyteus-ts` build (with `verify:runtime-deps`) passes; the packaged smoke check passes.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | Every install uses the root lockfile; the standalone file is stale and unread | File deleted | Installs unchanged | probe |
| BEH-002 | Operational | SCN-002 | Build passes; `hono` listed but unused | `hono` removed; build passes | Build, `verify:runtime-deps` | script, grep |
| BEH-003 | Operational | SCN-003 | Packaged server/Docker install `autobyteus-ts` deps incl. `hono` | Without the direct `hono` | Server starts; MCP works | packaging scripts |
| BEH-004 | Operational | SCN-001 | `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` exists, never runs | Deleted (DEC-002) | Root workflows unchanged | investigation |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Maintainer installs and builds the workspace | SCN-001, SCN-002 |
| UC-002 | Release packages the desktop server and Docker image | SCN-003 |

### Out Of Scope

- Other packages' dependencies; the `autobyteus-web/.github` leftover (FU-001); pruning devDependencies from the packaged macOS/Linux server (autobyteus-182 FU-007); the wechaty sidecar's own lockfile.

### Non-Goals

- None.

### Preserved Behavior Boundary

- Installs, builds, the packaged server start and MCP in the packaged app (BEH-001…003).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `autobyteus-ts/pnpm-lock.yaml` is deleted; no standalone install is supported or documented | BEH-001 | Must | Unread, stale, misleading | Task item 1; DEC-001 |
| REQ-002 | `hono` is removed from `autobyteus-ts` `dependencies`, and the root lockfile's `autobyteus-ts` importer no longer lists it | BEH-002, BEH-003 | Must | Unused runtime dependency | Task item 2 |
| REQ-003 | The dead nested workflow `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` (and its empty folders) is deleted | BEH-004 | Should | Dead config in the touched package (Principle 7) | DEC-002 |
| REQ-004 | Build and packaged runtime keep working: `autobyteus-ts` build incl. `verify:runtime-deps`, `autobyteus-ts` tests, server build/typecheck, and the packaged smoke check | BEH-002, BEH-003 | Must | Task Done-when | Task |

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected Outcome | Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `git ls-files autobyteus-ts/pnpm-lock.yaml`; `(cd autobyteus-ts && pnpm install --frozen-lockfile)` | Not tracked; install from inside `autobyteus-ts` succeeds on the root lockfile ("all 13 workspace projects") | — | Commands |
| AC-002 | REQ-002 | `grep hono autobyteus-ts/package.json`; root lockfile `importers.autobyteus-ts` | No `hono` | — | grep |
| AC-003 | REQ-003 | `ls autobyteus-ts/.github` | Absent | — | ls |
| AC-004 | REQ-004 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-ts test`; `pnpm -C autobyteus-server-ts build` and `typecheck` | Pass; `[verify:runtime-deps] OK` | — | Logs |
| AC-005 | REQ-004 | Packaged desktop build of the branch; `verify-packaged-server-startup.mjs --server-root <app>/Contents/Resources/server --runtime-executable <app executable>` | Pass | — | Log |
| AC-006 | REQ-002, REQ-004 | In the packaged server: no `node_modules` package fails to load because `hono` is missing; MCP works (the core MCP integration suite on the branch) | Pass | — | Suite log |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Outcome | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Maintainer, CI | Install | `pnpm install` (root or inside a package) | Root lockfile used | Supported Normal Scenario | probe; workflows | REQ-001, REQ-003; AC-001, AC-003 |
| SCN-002 | Operational | Maintainer, CI | Build | `pnpm -C autobyteus-ts build` | Build + verifier pass | Supported Normal Scenario | package.json | REQ-002, REQ-004; AC-002, AC-004 |
| SCN-003 | Operational | Release | Package and start | desktop build, Docker build | Server starts | Supported Normal Scenario | release-desktop.yml | REQ-004; AC-005, AC-006 |
| SCN-004 | Operational | — | Standalone install of `autobyteus-ts` from its own lockfile (`--ignore-workspace`) | — | — | Technically Possible but Unsupported/Contrived: the standalone repo is archived, nothing documents or runs it | gh, grep | — |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

None beyond AC-004…AC-006.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`.

## External Contracts And Dependencies

| Contract | Constraint | Evidence |
| --- | --- | --- |
| pnpm 10 workspace | A single root lockfile serves every workspace package | probe |
| `@hono/node-server` peer `hono ^4` | Satisfied by `@modelcontextprotocol/node` and `@modelcontextprotocol/sdk`, which depend on `hono` | root lockfile |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `probes/standalone-install-probe.txt` | Evidence for DEC-001 | Final |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | No developer runs `pnpm install --ignore-workspace` in `autobyteus-ts` | Nothing documents it; the standalone repo is archived | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Delete or regenerate the standalone lockfile? | A regenerated file would be read by nothing and drift again | pnpm uses the root lockfile even inside `autobyteus-ts`; standalone repos archived; no `--ignore-workspace` use | Delete. No supported standalone install exists, and the Task says to delete in that case. | Solution Designer | Decided |
| DEC-002 | Also delete the dead `autobyteus-ts/.github` workflow? | Same split-repo leftover in the package this ticket touches | GitHub runs only root workflows; it targets an archived repo; nothing references it | Delete it here: Principle 7 removes dead code in a touched module, and it's one file with the same evidence. The `autobyteus-web/.github` leftover is in an untouched package, so it's a follow-up (FU-001). | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001, UC-002 | BEH-002, BEH-003 | AC-002, AC-006 | SCN-002, SCN-003 |
| REQ-003 | UC-001 | BEH-004 | AC-003 | SCN-001 |
| REQ-004 | UC-001, UC-002 | BEH-002, BEH-003 | AC-004…AC-006 | SCN-002, SCN-003 |

## Architecture Phase Input

- Constraints: root lockfile regenerated with `pnpm install`; no other dependency changes.
- Facts verified: see investigation notes.

## Readiness Check

### Content Ready For Approval

- All items: `Yes`; Product design: `N/A`. Content ready: `Yes`. Blocker: none.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Approved basis recorded: `Yes`
- Ready for design: `Yes`
