# Design Review Report — autobyteus-345 (packaging, dependencies and build)

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-001, `Approved` by the Solution Designer within the direction; item 3 is the user's and excluded)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-10, U-1, U-2)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001)
- Reviewed Design Spec: `design-spec.md` (status `Ready`; user design approval `Not required`, not `Pending`)
- Supplemental Task Artifacts Reviewed: `evidence/measurements.md` (M-1…M-10), `probes/*`, `follow-ups.md`, `solution-designer-handoff.md`; inputs `task-bundle-packaging.md` and `task-follow-ups-305.md` (context only)
- Relevant Solution Revision IDs: SR-001
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `task_size=Medium`, `architectural_risk=High`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build`, branch `codex/packaging-dependencies-build`, base `origin/personal` @ `efd28d5c4a`, documents `f97c194e87`. I re-read the principles file in full (Principles 1–15, triggers, health assessment) and opened the code behind each claim: `autobyteus-server-ts/docker/Dockerfile.monorepo` (whole), `autobyteus-web/scripts/prepare-server.sh` (install/deploy/prisma sections) and `prepare-server.mjs` (whole), `.github/workflows/release-desktop.yml` (install steps), `autobyteus-server-ts/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` header and importers, `.dockerignore`, `src/config/app-config.ts` (app-root detection, `.env` loading), `src/startup/migrations.ts` (prisma resolution), `src/secret-management/provisioning/writable-vault-target.ts`, the Docker starter (`package-store.mjs`, `package-verifier.mjs`, `server-process.mjs`), `scripts/server-package/describe-server-package.mjs`, `scripts/tests/test_docker_build_context_sources.py`, the four manifests the Dockerfile does not copy, the workspace dependencies' manifests, `verify-packaged-server-startup.mjs` (head), `codegen.ts` and the schema probe, `RELEASE.md` (lockfile lines). Experiments (scratch copies under `/tmp`, removed afterwards; nothing written in the worktree): `npm pack --dry-run` with the proposed `files` list; `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts --offline` on a manifests-only copy with 8 and with 12 importers; the planned manifest edits followed by `pnpm install --lockfile-only` and a lockfile diff; `npm install` + `npm prune --omit=dev` with `@prisma/client` and `prisma`; `npm install --before=<ISO time with offset>` including a bound that excludes the newest `tslib` and a bound with no available version. **Not re-run by me:** the full build + deploy (827 MB → 674 MB, M-1/M-3) and the packaged startup check; the Docker image build; anything on Windows.

## Routing Classification Review

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architectural risk (`Low`/`High`): `High`
- Classification rationale reviewed: about 20 files within existing owners (Medium); High because every desktop and Docker release changes what it ships and how it installs, and the Windows path cannot run on the development machine. Content volume is not the reason (Content-Heavy guardrail respected: the structural surfaces are the release scripts, the Dockerfile, the workflow and the dependency classes).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: release artifacts carry only what runs (REQ-001, 002), every release install follows the lockfile (REQ-003) and the one npm install is bounded by the commit time (REQ-004), no stray folder (REQ-005), dead workflow gone (REQ-006), generated GraphQL current with a command and a drift check (REQ-007), imports declared with a check (REQ-008). Nothing a user sees changes.
- Relevant existing behavior and evidence confirmed: all claims in the table below.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): yes; item 3 (smaller Docker release, `RELEASE.md`), proxies (FU-002) and the standalone-era files (FU-001) are out of scope and treated as non-blocking.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: not applicable; no blocking finding. The four non-blocking findings cite REQ-002/008 (F-001), REQ-003 (F-002), REQ-007 (F-003), REQ-001/003/004 (F-004).
- Remaining material ambiguity, if any: none.
- Statements about existing code the design relies on, opened at their cited lines (an unsourced or false one is a finding; Principle 1):

| Design statement | Opened | Result |
| --- | --- | --- |
| The running server reads only `dist`, `prisma`, `application-packages`, `package.json` from its package folder (M-2) | `app-config.ts:152-188` (app root = a folder with `package.json` and `prisma/schema.prisma` or `dist/app.js`; config is `<dataDir>/.env`, not the package's `.env.*`), `startup/migrations.ts:17-30,91` (`node_modules/prisma/build/index.js`), `built-in-agent-bootstrapper.ts:12` (templates inside `dist`), `writable-vault-target.ts:15` (server root by `..` from `dist`), the starter (`server-package.json`, `dist/app.js` only), `describe-server-package.mjs` (`prisma/migrations`, `dist/app-data-migrations/migrations`) | Holds. The package's root `.env.*`, `docker/`, `scripts/`, `tsconfig*.json` are read by nothing at run time (`.env.development` is read only by the repository's development runner) |
| `npm pack` with the `files` list carries only runtime content | Scratch copy | 5,851 files: `dist` 5,818, `prisma` 29 (schema + migrations), `application-packages/.gitkeep`, `package.json`, `LICENSE`, `README.md`; includes `dist/index.js` and `dist/app.js`; nothing under `src/ tests/ docs/ docker/ scripts/ tickets/` |
| No runtime source imports a development dependency of the server | grep of `src` (non-test) for `@modelcontextprotocol/*`, `ws`, `@vue/compiler-sfc`, `typescript`, `vitest`, `vite-tsconfig-paths` | None. The MCP client is declared by `autobyteus-ts` itself (`dependencies`), which deploys with its own production dependencies. `@autobyteus/application-backend-sdk` is imported by 5 test files only |
| `prisma` is a production need | `migrations.ts` and the packaging scripts (`node_modules/.bin/prisma generate` in the deployed package) | Holds. On Windows today `npm prune --omit=dev` keeps `prisma` (experiment: npm retains it as the satisfied optional peer of `@prisma/client`), so moving it to `dependencies` and dropping the prune ships the same Windows content |
| The scripts' lockfile test looks in the wrong folder | `prepare-server.sh:160-164`, `prepare-server.mjs:171-175`; no `pnpm-lock.yaml` in `autobyteus-server-ts/` | Holds: the lockfile is at the root; the `else` branch always runs |
| Five `--no-frozen-lockfile` installs in `release-desktop.yml`; the Dockerfile copies 8 of 12 importers | grep; lockfile importers | Holds (lines 139, 269, 404, 488, 564; Dockerfile lines 20-27). No other workflow installs; no step edits a manifest before an install |
| `--before` bounds an npm install | Experiment | Accepts the ISO commit time with offset; with a bound earlier than `tslib@2.9.1`'s publish time (2026-10-30T20:20Z) it installs 2.8.1; with a bound that leaves no version it fails with `ENOVERSIONS` |
| Planned lockfile effect: three prisma lines plus declarations | Planned edits on a manifests-only copy, `pnpm install --lockfile-only` | Only `@nuxtjs/apollo`, `@rollup/plugin-graphql`, `@vue/apollo-option` leave; no retained package changes version; the `@apollo/client` and `graphql-ws` snapshots are unchanged; `vue` 3.5.44, `vue-router` 4.6.4, `graphql-tag` 2.12.6 keep their versions (my ranges `^3.5.44`, `^4.6.4`, `^2.12.6`) |
| The nested workflow is referenced by nothing | grep | Only planning notes under `autobyteus-web/tickets/` mention it |
| Existing Dockerfile test stays valid | `test_docker_build_context_sources.py:97` | `startswith("RUN pnpm --filter … deploy /out/server-package --legacy")` still matches with `--prod` appended; its COPY-source existence check covers added COPY lines |

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | ARCH-F-001 (guard for the new dependency-class invariant) |
| BEH-002 | Operational | Pass | Pass (Windows runtime proof is by the planned build-only run) | Pass | Confirmed | ARCH-F-002, ARCH-F-004 |
| BEH-003 | Operational | Pass | Pass | Pass | Confirmed | None |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | ARCH-F-003 (schema source freshness) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/measurements.md`, `probes/*` | Pass | Pass (design cites M-1…M-10) | Pass | Pass (my experiments agree with M-2, M-3 contents, M-4, M-5, M-8) | Pass (evidence) | None |
| `task-bundle-packaging.md`, `task-follow-ups-305.md` | Pass | Pass | Pass | Pass | Pass (input) | None |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Section present (Cleanup) | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` with four invariants listed; the dead lockfile branch verified | None; ARCH-F-001 adds the one invariant the list does not yet enforce |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Yes, small"; the three-scripts repetition is judged and left, with a reason | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, D-1…D-9, residual risk for Windows | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | One Owner Per Node, In Call Order? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 (shell and Docker) | Release build of the server package | Pass | Pass | N/A | Pass | Pass: workflow job → script → install → build → deploy → clean → generate → verify | Pass | Pass |
| DS-002 | Windows staging | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Developer regeneration and import check | Pass | Pass | N/A | Pass | Fail until the build step of `codegen:local` has an owner (ARCH-F-003) | Pass | Pass with ARCH-F-003 |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `package.json` as the one statement of what ships and what runs | Pass | Pass: no second post-deploy prune (rejected in the log) | Pass | Pass | The dependency class needs a guard (ARCH-F-001) |
| Build scripts, workflow, Dockerfile | Pass: each owns its steps | Pass | Pass | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Scripts → pnpm/npm/git/node; checks read files only | Pass | Pass | Pass | Pass | `codegen:local` in the web package runs a script in the server package against the server's built output; the direction already exists (`prepare-server.*` reaches into the server) |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `files` list; `deploy --legacy --prod`; `AUTOBYTEUS_NPM_BEFORE`; `codegen:local` / `codegen:check`; `check-declared-imports.mjs <pkgDir>…`; `print-graphql-schema.mjs <outFile>` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup proof, Python source checks, web script specs, `buildGraphqlSchema`, probe promotion | Pass (all verified to exist) | Pass | Pass | Pass | `logical_instructions` / `direct_copy_sources` of the existing Python test are reusable helpers for the new Dockerfile checks |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| server package manifest, web prepare scripts, Dockerfile, workflow, repo `scripts/` | Pass | Pass | Pass | Pass | |

A mechanism that gets a function reaching another collaborator (the owner should call each mechanism itself), a compound owner ("A + B"), or a kind or entry form the spine does not trace fails the row (Principles 1, 2, 13). None found. The three entry forms of the same job (macOS/Linux script, Windows script, Docker) are each traced.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| The "install, deploy, prepare" sequence in bash, Node and a Dockerfile | Pass: judged and left (platform languages differ; no honest common owner) | N/A | N/A | Pass | Agreed. The onnxruntime pruning is already the shared piece |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Dependency classes of the server manifest (`dependencies` = what runs, `devDependencies` = what builds/tests) | Pass after the change (`prisma` moves; the special case goes) | Pass | Pass | N/A | Pass | The guard for the class is ARCH-F-001 |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Checked: the Docker starter (reads `server-package.json`, `dist/app.js`), `describe-server-package.mjs`, the Electron builder copy, `verify-packaged-server-startup.mjs`, the lockfile importers (three lines; verified), the existing Dockerfile test, `autobyteus-application-devkit` (links the server by workspace; unaffected by `files`).

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI, and docs (Principle 15): `Pass` (no new word; `AUTOBYTEUS_NPM_BEFORE` follows the existing `AUTOBYTEUS_*` pattern).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| All rows of the mapping | Pass | Pass | N/A | Pass | `npm-before.mjs` is a small pure-plus-one-`git`-call helper with a spec |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| New files beside their siblings | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Dead lockfile branches (both scripts), Prisma-only `devDependencies` + `npm prune`, `canuse-ok.txt`, nested workflow, `@nuxtjs/apollo`, five `--no-frozen-lockfile` | Pass, each with evidence (`canuse-ok.txt` referenced only in old build logs; the workflow only in planning notes) | Pass | Pass | Pass | Also in the touched scripts: the `prepare-server.sh` "Prisma CLI not found … skipping generate" warning branch becomes unreachable once `prisma` is a production dependency; keep it only if something else can make the CLI absent (ARCH-F-004 item 5) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| All | No | Pass | Pass | The `AUTOBYTEUS_NPM_BEFORE` override is a supported edge scenario (SCN-004), not compatibility |

## Persisted-Data Transition Verdict (When Applicable)

N/A — `Not Affected`: build inputs and outputs only; no stored user data, schema or migration. The lockfile is regenerated by pnpm, and I reproduced its effect (above).

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Server package → scripts/Dockerfile/workflow → web → docs → real proofs | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Package contents, Windows command | Yes | Pass | Pass (two owners of "what ships" avoided) | Pass | |

## Material Premise Validation (Only When Needed)

### `MP-1` — A future change imports a development-only package from runtime server code

- Related approved requirement or established contract: REQ-002, AC-002; REQ-008.
- Relevant behavior ID(s): BEH-001, BEH-004.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a developer adds an import in `autobyteus-server-ts/src` of a package the server lists under `devDependencies` (for example `ws`, which is also a dependency of `@fastify/websocket`), the normal development workflow.
- Support evidence: exposed surface and action: the repository's ordinary edit/test/build loop. `vitest`, `pnpm build` and the tests all install development packages, so none fails.
- Forward current or approved target production caller/event path: edit → tests/build pass → release job `pnpm deploy --legacy --prod` → package without that package (or reachable only through the hidden `.pnpm/node_modules` hoist) → the server loads that module only when the code path runs → the startup check passes if boot does not touch it → failure at the user.
- Lifecycle preconditions and material consequence at the claimed point: a release that boots but fails a feature at run time, on a desktop or in the image.
- Reachability: `Reachable` (normal development), consequence High for a release.
- Review consequence / proportionate response: ARCH-F-001.

### `MP-2` — `codegen:check` runs against a stale server build

- Related approved requirement or established contract: REQ-007, AC-009.
- Relevant behavior ID(s): BEH-004.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a developer changes a GraphQL type in server `src`, then runs `codegen:check` (or `codegen:local`) without rebuilding the server first.
- Support evidence: the supported commands are the design's own interface (SCN-005); the probe loads `<server>/dist/api/graphql/schema.js`.
- Forward current or approved target production caller/event path: schema printed from the old `dist` → equals the stale generated file → the check passes.
- Lifecycle preconditions and material consequence at the claimed point: the drift the check exists to catch stays hidden (a false pass).
- Reachability: `Reachable`, consequence Medium (type drift returns silently).
- Review consequence / proportionate response: ARCH-F-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None blocking. The Windows behavior of the changed staging flow and the Docker stage with `--prod` are unproven by design until the build-only run and the Docker stage build (U-1, U-2); the design plans both.

## Review Decision

`Pass`

## Findings

All four are `Design Impact`, scope `Within Approved Scope`, non-blocking, changes to approved behavior: `No`, recommended recipient: Solution Designer. They may be folded into the documents while the implementation engineer starts; none needs re-review.

### ARCH-F-001 — The new invariant "runtime code imports only production dependencies" has no guard

- Severity: Medium (non-blocking; fold into D-9 and the implementation scope)
- Approved requirement protected: REQ-002, AC-002, REQ-008, AC-010; design health assessment (`Missing Invariant`: "each invariant gets an automated check").
- Evidence: `MP-1`. Today it holds (no runtime import of `@modelcontextprotocol/*`, `ws`, `typescript`, `@vue/compiler-sfc`, `vite-tsconfig-paths`, `vitest`; verified). D-9's `check-declared-imports.mjs` fails only on a hidden-hoist-only (undeclared) import; an import of a package declared under `devDependencies` is declared, so it passes. The packaged startup check proves boot only.
- Required update: make the check class-aware for packages that are deployed with `--prod`: for `autobyteus-server-ts`, an import from non-test, non-script source under `src/` must resolve to `dependencies`, `optionalDependencies` or `peerDependencies`; tests and scripts may use `devDependencies`. Add the fixture case (a runtime import of a dev-only package fails). Add one line to AC-010 and the test list; state which source roots count as runtime (`src/` excluding `**/*.test.ts`). Lazy `import()` and `import type` are handled as the probe does (type-only imports are erased and exempt).
- Why proportionate: one rule in an existing check, protecting the single new failure mode that the move to `--prod` introduces.

### ARCH-F-002 — Copying all 12 importer manifests in the Docker builder is not shown to be needed

- Severity: Low (non-blocking)
- Approved requirement protected: REQ-003 (last clause), AC-004, AC-005; DESIGN rule 5 ("remove unnecessary work before adding complexity").
- Evidence: the Dockerfile copies 8 importers; their workspace links are closed within those 8 (lockfile check: no copied importer links to a non-copied one; the four missing ones are `autobyteus-application-devkit`, `autobyteus-application-frontend-sdk` and the two `applications/*`, which link into the 8, not the reverse). `pnpm install --frozen-lockfile --lockfile-only --ignore-scripts --offline` passes with the current 8 manifests and with all 12 (reproduced on manifests-only copies). So the frozen flag fixes reproducibility by itself. Copying the four others makes the builder install the two applications' and the devkit's dependencies for nothing the image builds, and the proposed Python check ("every lockfile importer is copied") would fail, forcing a Dockerfile edit, whenever someone adds an importer (for example a new `applications/*`) that the image never builds.
- Required update: decide with this evidence. Either keep the 8 and flip the flag, with a check that every `workspace:` link target of a copied importer is itself copied (the closure); or keep all 12 and state the reason and the measured builder cost (the Docker stage build in AC-005 is the place to measure). Update REQ-003's last clause and the Python check to match.
- Why proportionate: it removes an unproven requirement or states its reason; both are small.

### ARCH-F-003 — `codegen:local` / `codegen:check` read the built server; nobody owns the build, and the check has no runner

- Severity: Medium (non-blocking)
- Approved requirement protected: REQ-007, AC-009 (and the Task's wish that drift cannot return).
- Evidence: `MP-2`; the probe imports `<server>/dist/api/graphql/schema.js`, and the design's `print-graphql-schema.mjs` is the same kind of script. DS-003 names no build step. The design also says every invariant gets an automated check, but `codegen:check` is only a command: the repository has no test workflow (DEC-5) and the Python/unit suites cannot run it cheaply.
- Required update: name who drives the sequence and in what order: `codegen:local` runs the server build first (`pnpm -C ../autobyteus-server-ts build`) and then the schema print and codegen, so one command is always current; `codegen:check` does the same into a temporary copy. Say where `codegen:check` runs routinely (for example the `prepare-release` job next to the hygiene guard, or the documented pre-merge list in the TESTING/docs page), or state explicitly that it is a developer command. Keep the mutation proof (a stale file fails).
- Why proportionate: one ordering sentence and one placement decision; without them the check can pass on stale input.

### ARCH-F-004 — Tighten the proof and test details

- Severity: Low (non-blocking)
- Approved requirement protected: REQ-001, REQ-003, REQ-004, REQ-005, AC-001, AC-006.
- Items:
  1. AC-001's `npm pack` test should also assert presence of what the server needs (`dist/app.js`, `dist/index.js`, `prisma/schema.prisma`, at least one `prisma/migrations/*/migration.sql`, `package.json`), not only absence; and compare `pnpm deploy` output against the same list in the clean-clone proof (the two use the same packlist, verified for `npm pack`, but the deploy is the real consumer).
  2. The Python check should reject both `--no-frozen-lockfile` and `--frozen-lockfile=false` in the listed files. State that `scripts/android-bootstrap-termux.sh:163` (`--frozen-lockfile=false`, a user-side Termux install, not a release build) is deliberately left alone (add to Change Scope).
  3. `npm-before.spec.ts`: add an invalid override value (not an ISO date) → clear error; do not fall through to the commit time. Document the accepted format.
  4. D-6: state that the cleanup path `autobyteus-server-ts/autobyteus-web` is the mirror of both targets (`autobyteus-web/resources/server`, `autobyteus-web/.server-packaging-stage`); the Docker deploy target `/out/server-package` lies outside the workspace, so its mirror stays in the builder filesystem and never reaches the image (confirm in the Docker stage build).
  5. Remove or justify the unreachable "Prisma CLI not found; skipping generate" warning branch in `prepare-server.sh` (and its silent skip) once `prisma` is a production dependency, so a missing CLI fails the build instead of shipping without a generated client (Principle 7 and 13: a required step must not be skipped by absence).
  6. The proof list is macOS-only for size and startup; add the Linux x64/arm64 engine validation of `prepare-server.sh` (it already exists) to the build-only run's checked outputs, since `--prod` changes the Linux package too.

## Classification

`Design Impact` (Low/Medium, non-blocking). Result classification: `Pass`.

## Recommended Recipient

Pass: `/software_engineering_team/implementation_engineer` (primary), then the informational notice to `/software_engineering_team/solution_designer`.

## Residual Risks

- Windows is a bound, not an identity (DEC-3, accepted, stated by the design). The Windows tree can differ from the macOS/Linux lockfile tree for packages published before the commit that the lockfile does not pin; the build-only Windows run proves that it installs and starts, not that it equals the lockfile.
- The full-size reduction (827 → 674 MB), the packaged startup, the Docker stage build and the whole Windows path are the designer's measurements or planned proofs; I did not re-run them. My independent checks support them (allowlist contents, no dev imports, lockfile effect, prisma retention), but a missing package would still surface only at those proofs.
- The startup check covers boot, migrations and `/rest/health`, not every lazily loaded module; that is why ARCH-F-001 matters.
- Frozen installs make a release build fail when a manifest and the lockfile disagree. That is the intent; maintainers should know it (a one-line mention in the release notes or `RELEASE.md` would help, but `RELEASE.md` is outside this work).
- Other teams are changing packages in parallel (318, 357, 358, 285, 337, 355). A manifest change on the base branch between design and merge must come with its lockfile; the lockfile regeneration should be the last step before merge.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` (MP-1 and MP-2 are reachable and drive recommended guards, not unsupported machinery)
- Notes: Sound, proportionate design. The ownership is right (one place states what ships, the scripts own their order), the evidence is real, and my checks agree with it: the allowlist covers everything the server and the starter read, no development package is imported by runtime code, the lockfile effect is exactly as stated, `--before` behaves as designed, and Windows keeps `prisma` today as it will after the change. The findings are guard coverage (F-001, F-003), one over-specified Docker requirement (F-002) and details (F-004).
