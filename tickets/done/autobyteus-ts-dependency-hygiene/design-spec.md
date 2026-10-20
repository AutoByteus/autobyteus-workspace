# Design Spec — autobyteus-ts dependency hygiene

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction of Task `autobyteus-224` (user informed 2026-10-20)
- Behavior-defining supplements: none
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene/tickets/in-progress/autobyteus-ts-dependency-hygiene/investigation-notes.md`
- Authorities read (2026-10-20): `references/architecture-design.md`, `references/design-principles.md` (current shared version), `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene/DESIGN.md`, `TESTING.md`. `design-examples.md` not needed.
- Conflicts or discrepancies: none

## Current-State Read

`autobyteus-ts` is a pnpm workspace package. Every install, including one run inside `autobyteus-ts/`, resolves through the root `pnpm-lock.yaml` (probe). `autobyteus-ts/pnpm-lock.yaml` and `autobyteus-ts/.github/` are left over from the standalone repository, archived since 2026-02-25. `hono` in `autobyteus-ts` `dependencies` is imported nowhere. Its only consumer in the tree is `@hono/node-server`'s peer, which the packages that use `@hono/node-server` satisfy with their own `hono` dependency.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. The change is 1 manifest line, the root lockfile regenerated, and 2 deleted files (the stale lockfile and one nested workflow) with their empty folders. No source, test or doc change.
- Architectural risk: `Low`. No runtime owner, contract, persistence, security or concurrency change. The only deployment effect is that the packaged server stops receiving a direct `hono` from `autobyteus-ts`, and nothing imports it. Validation covers the build, `verify:runtime-deps` and the packaged smoke check.
- Escalation trigger: the build, `verify:runtime-deps`, the packaged smoke check, or anything else reports a missing `hono` or a changed install. That makes it a Design Impact.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| `probes/standalone-install-probe.txt` | Inside `autobyteus-ts/`, pnpm scopes all 13 workspace projects; neither lockfile changes; standalone repos archived | Delete the lockfile (DEC-001) |
| `grep hono` (investigation Source Log) | Only the manifest line | Remove it |
| Root lockfile | `@hono/node-server` peer satisfied by `@modelcontextprotocol/node@2.1.1` and `@modelcontextprotocol/sdk@1.32.1` | No other change needed |
| `verify-runtime-dependencies.mjs` | Checks missing imports only | Removing an unused entry cannot fail it |

## Intended Change

Delete the stale lockfile and the dead nested workflow, remove `hono`, regenerate the root lockfile, and validate the build and the packaged server.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Files: `autobyteus-ts/package.json`, `pnpm-lock.yaml` (root), `autobyteus-ts/pnpm-lock.yaml` (delete), `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` (delete).
- Deliberately left alone:
  - `autobyteus-ts/examples/README.md`: its `cd autobyteus-ts && pnpm install` still works on the root lockfile;
  - `autobyteus-web/.github` (FU-001);
  - packaging scripts;
  - other dependencies.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Outcome | Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001; AC-001 | `pnpm install` | Root lockfile only | DS-001 |
| BEH-002 | REQ-002, REQ-004; AC-002, AC-004 | `autobyteus-ts` build | Pass without `hono` | DS-001 |
| BEH-003 | REQ-002, REQ-004; AC-005, AC-006 | Desktop/Docker packaging | Server starts | DS-002 |
| BEH-004 | REQ-003; AC-003 | — | Dead workflow removed | — |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `probes/standalone-install-probe.txt` | Evidence for the lockfile decision |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `Yes` (local leftovers)
- Structural triggers:
  - Legacy cleanup: fires (split-repo leftovers kept after the flatten; investigation Source Log).
  - Others: none apply. No coordination, boundary, shared-structure or persisted-data change.
- Root cause classification: `Legacy Or Compatibility Pressure`
- Refactor needed now: `Yes`, the removals themselves
- Evidence: investigation notes
- Design response: delete the leftovers; no replacement needed
- Deferrals: FU-001

## Terminology

N/A.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the standalone lockfile, the nested workflow, the unused `hono` entry.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`. No stored data.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `pnpm install` / `pnpm -C autobyteus-ts build` | `node_modules`, `dist`, verifier OK | pnpm workspace / `autobyteus-ts` build script | Install and build must be unchanged |
| DS-002 | Primary End-to-End | Desktop/Docker release build | Packaged server starts | `prepare-server.*` / Dockerfile | `autobyteus-ts`'s runtime dependencies reach the packaged server |

## Primary Execution Spine(s)

- DS-001: `pnpm install (root lockfile) → autobyteus-ts tsc → verify:runtime-deps → autobyteus-server-ts build`
- DS-002: `prepare-server (pnpm pack autobyteus-ts → install deps) → packaged server/node_modules → verify-packaged-server-startup`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Unchanged except that the `autobyteus-ts` importer loses `hono` | pnpm / build script |
| DS-002 | The `autobyteus-ts` tarball no longer pulls `hono` directly; packages that need `hono` bring their own | packaging |

## Spine Actors / Main-Line Nodes

pnpm, the `autobyteus-ts` build script and verifier, the packaging scripts.

## Ownership Map

Unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/pnpm-lock.yaml` | Dead: no install reads it (probe); standalone repo archived; no reference (grep) | Root `pnpm-lock.yaml` | — |
| `"hono": "^4.0.0"` in `autobyteus-ts/package.json` | Dead: no import in `autobyteus-ts` src/scripts/tests or `dist`; peers satisfied elsewhere | — | Root lockfile importer updated by `pnpm install` |
| `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` (+ empty `.github/workflows`, `.github`) | Dead: GitHub runs only the root `.github`; it dispatches to the archived `AutoByteus/autobyteus-server-ts`; no reference | Root `.github/workflows/release-server-docker.yml` | DEC-002 |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

None.

## Ownership Boundaries

Unchanged.

## Boundary Encapsulation Map

N/A. No boundary changes.

## Dependency Rules

`autobyteus-ts` lists only the runtime packages its built code imports (enforced for missing imports by `verify:runtime-deps`).

## Interface Boundary Mapping

N/A.

## Interface Boundary Check

N/A.

## Main Domain Subject Naming Check

N/A.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Packaged smoke check | `verify-packaged-server-startup.mjs` (CI) | Reuse |

## Subsystem / Capability-Area Allocation

`autobyteus-ts` package configuration; root lockfile.

## Draft File Responsibility Mapping

See final.

## Reusable Owned Structures Check

N/A.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/package.json` | Remove the `"hono": "^4.0.0"` line |
| `pnpm-lock.yaml` | Regenerate with `pnpm install` at the root. Expected diff: `hono` disappears from `importers.autobyteus-ts`, nothing else. Any other diff → stop and report |
| `autobyteus-ts/pnpm-lock.yaml` | Delete |
| `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` | Delete (with the empty folders) |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

Covered above.

## Folder Boundary Check

N/A.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Lockfile | `git rm autobyteus-ts/pnpm-lock.yaml`; root `pnpm install` | Regenerating a standalone lockfile with `--ignore-workspace` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep a regenerated standalone lockfile "for standalone use" | Rejected | Root lockfile; standalone repo archived |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Delete the two files; remove `hono`; run `pnpm install` at the root; check the lockfile diff (only the `autobyteus-ts` importer's `hono`).
2. AC-001: `(cd autobyteus-ts && pnpm install --frozen-lockfile)` reports all 13 workspace projects.
3. AC-004: `pnpm -C autobyteus-ts build` (shows `[verify:runtime-deps] OK`), `pnpm -C autobyteus-ts test`, `pnpm -C autobyteus-server-ts build` and `typecheck`.
4. AC-005/AC-006:
   - Build the packaged macOS desktop app of the branch (the isolated-app `--build` path or the `autobyteus-web` desktop build).
   - Run `node autobyteus-web/scripts/verify-packaged-server-startup.mjs --server-root <AutoByteus.app>/Contents/Resources/server --runtime-executable <AutoByteus.app>/Contents/MacOS/AutoByteus`, as in `release-desktop.yml`.
   - Run the core MCP integration (`env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp`).
   - Note whether `hono` is still present in the packaged `node_modules`: it is expected there through other packages, which is fine.

## Key Tradeoffs

Delete instead of regenerate: nothing reads the file, so a regenerated copy would only drift again.

## Risks

R-002: a packaged path needs `hono`. The packaged smoke check settles it.

## Guidance For Implementation

- Stage paths explicitly (TESTING.md: never `git add -A`).
- Dummy values only.
- The packaged build follows TESTING.md (worktree build, never the installed app).
