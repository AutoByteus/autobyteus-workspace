# IR-001 local implementation evidence

These are implementation checks, not API/E2E acceptance. All fixtures are synthetic and temporary. No external definitions or user server/data were edited. No provider was started for package reads. The mounted-context regression substitutes only execution-plane materialization, not definition reads; actual Send remains downstream.

## Results
- Frozen dependency install, shared build and Prisma client generation: successful (`install.log`, `dependencies.log`). No database reset was needed.
- Baseline red regression: `baseline-regressions.log`, 8 failed / 7 passed before production changes. Earlier `before.log` additionally includes initial newline-expectation errors; do not treat every initial assertion as the source defect.
- First fix: `after-first.log`, 15 passed. Intermediate expanded focused suite: `focused.log`, 24 passed.
- Final source: `adjacent-final.log`, **169 passed / 15 files**, exit 0. Includes 18 real-source integration cases and 7 Team-cache cases, existing admission/avatar/authoring controls and lazy scope restoration.
- `build.log`: normal server build including sanitized built-module/bootstrap smoke passed, exit 0.
- `scoped-test-typecheck.log`: empty output, exit 0, using the checked-in build's compiler policy and the two changed test files. This is not full strict typecheck.
- `typecheck.log`: default `tsc -p tsconfig.json --noEmit` exit 2, TS6059 because included tests are outside rootDir=src.
- Diagnostic only `typecheck-expanded-root.log`: `--rootDir ..` exit 2, 7,395 broader repository diagnostics. This run preceded the final mounted-context test; no diagnostics named the changed files at that point. No strict repository success is claimed. No compiler policy changes shipped.
- `git diff --check`: passed. Five production files, 28 added / 10 removed lines; largest file 425 nonempty lines, no changed source exceeds 500 or has >220 delta.
- `implementation-source-manifest.json`: final source/test hashes; source HEAD remains the bootstrap base.

## Reproduce local checks
From this worktree root, after the frozen install and shared build:

```sh
pnpm -C autobyteus-server-ts prepare:shared
pnpm -C autobyteus-server-ts exec prisma generate
cp tickets/in-progress/org-owned-team-local-agent-loading/validation/vitest.org-local.config.ts autobyteus-server-ts/
cp tickets/in-progress/org-owned-team-local-agent-loading/validation/tsconfig.org-local-check.json autobyteus-server-ts/
pnpm -C autobyteus-server-ts exec vitest run --no-watch --config vitest.org-local.config.ts
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.org-local-check.json
pnpm -C autobyteus-server-ts build
rm autobyteus-server-ts/vitest.org-local.config.ts autobyteus-server-ts/tsconfig.org-local-check.json
```

The scoped Vitest config deliberately omits unrelated global database reset setup. The durable test files are inside the normal repository suite paths. Generated SDK `dist/` directories remain local build prerequisites, not application source changes. Browser/import/reload and actual mounted Send are not run here; the API/E2E owner must perform them in an isolated environment and preserve user servers/private packages.


## IR-002 — selected-Org launch reference gate
SR-003/DS-REV-002 recovery for CRR-001/API-REV-001 F-001. IR-001 evidence above remains history; all seven original source/test hashes are unchanged (`ir002-backend-hash-check.json`).

- `ir002-baseline.log`: new direct-config regression run against original HEAD panel fails because no exact queries occur; current panel restored byte-for-byte afterward.
- `ir002-adjacent.log`: **81 passed / 11 files**, including16 new owned launch cases, original10 panel cases, old authoring/detail/avatar and catalog/projector controls. Real panel, Pinia draft/run/catalog stores, pure projector and exact-reference reader; only Apollo transport/model-field/workspace I/O dependencies substituted. Ordinary Create mutation is asserted at the real run store's Apollo boundary, not via a stubbed launch action.
- `ir002-backend-preservation.log`: fresh **169 passed /15files** with original backend suite. Seven original hashes unchanged.
- `ir002-build.log`: standard frontend `pnpm build` passed, exit0, prerender16 routes. Initial IR-001/server API build remains carried evidence, not newly rebuilt in IR-002.
- `ir002-typecheck.log`: attempted `pnpm exec vue-tsc --noEmit` cannot run (vue-tsc is not installed in this worktree), exit254. No frontend strict-typecheck Pass claimed; no dependency/compiler changes made. Prior server strict limitations remain.
- `ir002-focused.log`: intermediate51/6 pass. `ir002-owned.log` is initial15pass/1fail due test model-field stub not re-emitting schema state on model changes after route switch; corrected stub watches its model input, final suite passes. Do not treat exploratory harness errors as accepted product behavior.
- `ir002-render/`: real renderer self-validation using explicit synthetic transport, pending/ready/error/disclosure at1280x900 and900x800, model/workspace/approval retention. No live Create/provider/Send; independent API must retest F-001/B02 first for both placements. Processes/browser stopped.
- `ir002-source-manifest.json`: cumulative source/test hashes and removed old module name. `git diff --check` passed. Source files <=435 nonempty lines; no >220 changed-line pressure.

Replay durable frontend checks from autobyteus-web:
```
pnpm test:nuxt components/workspace/config/__tests__/AgentOrgOwnedLaunch.spec.ts components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts components/agentOrgs/__tests__ components/agentTeams/__tests__/AgentTeamDetail.spec.ts utils/__tests__/editableAgentOrgRunFormModel.spec.ts localization/messages/__tests__/agentOrgTicketSurfaceCatalog.spec.ts localization/messages/__tests__/flatTeamAgentOrgCatalog.spec.ts --run
pnpm build
```
Independent API result remains API-REV-001 Fail77.9%confidence until new execution; the renderer fixture and local green tests do not supersede that report.


## IR-003 — catalog-versus-exact contract refinement
SR-006/DS-REV-003 user-requested naming refinement, no catalog/ownership/runtime semantics change. Original15 IR-002 hashes exact at intake (`ir003-intake-hash-check.json`); seven IR-001 backend hashes remain exact (`ir003-preservation-check.json`). Current source/test manifest ir003-source-manifest.json; old live Team getter names zero matches, pure projector unchanged (`ir003-symbol-audit.txt`).

- ir003-consumers.log:263 tests/35filesPass; two new store contract cases and strengthened real-panel invariant. Same-name shared/application/catalog-miss/exact-read/owner guards and migrated consumer mocks remain covered.
- ir003-build.log:standard frontend buildPass,16prerender routes.
- ir003-render/:new real Nuxt renderer preservation check with explicit synthetic replay, pending/ready/error/disclosure/draft choices at1280x900/900x800; current screenshot inspected; no backend/Create/Send/provider. No visual change needed. All owned processes/browser stopped, cleanup.json verifies ports. Original IR-002 artifacts untouched.
- git diff --checkPass. Source <=499nonempty lines, no >220delta. Backend169/15 and full strict check limitations carried from prior rounds, not rerun/invented.
- API-REV-001 still Fail77.9%confidence pending F-001/B02 actual Create/Send for both placements. No global cache, shared extraction, writer/schema/policy or external-data change.
Commands and cumulative limits are in current implementation-handoff.md. Maintained Team/Org docs updated; historical docs not mass-renamed.

## API-REV-003 actual provider completion
See api-live-r4/README.md and canonical API report: Pass95.0%, both ordinary browser continuations return exact owner markers; official user-authorized credential import9/nooverwrite, all owned services closed. Source35/authored30 unchanged, no secrets in evidence. No API-owned durable edits.
