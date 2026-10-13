# IR-002 Integration Local Evidence

2026-10-13. Local implementation checks only; no integrated API/E2E or desktop sign-off.

## Source / Integration
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh`, branch `codex/settings-saved-model-refresh`.

- Initial Delivery candidate `d25b1e74edefe6ce7f310cedb30b67a818d1978e`.
- `git fetch origin personal` confirmed target `0c37f58d88220be3683a15da6e0956d6ab13c4db`.
- Six incoming DR-001 documents/evidence preserved unmodified in `24562de0637ee19fd9751fa96d4e60da6972c14c`. A preliminary whitespace check flagged two raw conflict-patch hunk labels; they were retained as historical bytes. A merge attempt with these additions staged was refused without altering source; committed the preservation checkpoint, then retried.
- `git merge --no-edit origin/personal` reproduced the one-file shared-probe conflict. Resolved both additions semantically, not ours/theirs. Merge commit `b312eaf758bffdaa9db285754e0cd382f499e0c2`; no unresolved index entries.
- Source/custody/check summaries in `evidence/implementation-ir-002/integration-receipt.json`; current shared probe SHA-256 also in that receipt and preservation check.
- Original IR-001 production/tests, SSR case module, desktop adapter and package script remain byte-identical to pre-integration candidate; target Stop source/test byte-identical to target. `preservation-check.json`: 28 static checks pass.

## Semantic Inspection
Compared full probe diffs against both parents. Incoming Stop helper block and DCP-001 complete case are byte-for-byte preserved. DCP-002 combines incoming actual paint/native keyboard/pending request and Task assertions with prior correct manager selection. Prior Team-row disclosure fix, DCP-003 hash parsing, DCP-004 separate restart renderer reload, DCP-005 exact sibling execution/source comparison and friendly-label equivalence retained. Same-view SSR module not modified.

Both browser and desktop use a 1512x952 viewport. `shot` temporarily resizes only on requested width and restores the previous viewport, so incoming hover-leave samples at (1500,940) retain the intended viewport. Both runtime branches keep existing isolated environment/data ownership, cleanup and failure status. No security flag reintroduced; sandbox remains enabled. Real combined rendering still belongs to API/E2E.

One optional `ledgerFile` parser + `checkpoint` handles both platforms. Started includes platform/output; Completed includes outcome/error/evidence path. Result JSON is persisted first, then completion awaited before next case. Removed the dead second case filter and duplicate inline ledger starts/completions. Ordered explicit case selection/unknown-case rejection and failure continuation remain.

## Commands / Results
All from the worktree root; existing worktree dependencies used. Read root TESTING.md, DESIGN.md and package AGENTS.md; no closer testing/agent instruction in the changed test directory.

```bash
node --check autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
node --check autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs
node --check autobyteus-web/tests/e2e/fixtures/settings-refresh-desktop.mjs
node tickets/in-progress/settings-saved-model-refresh/evidence/implementation-ir-002/check-runner.mjs
```
Pass: syntax for all 3 modules (`syntax-check.json`); all 5 local runner variants (`runner-check.json`). The durable local self-check evaluates the actual checkpoint + selected-cases loop source with synthetic callbacks/page/errors and temporary files. It tests absolute/relative/absent ledger, desktop/browser metadata, default/explicit order, unknown-case rejection, normal/exception/browser-error results, failure screenshot rejection, continued later case, one Started/Completed and evidence already on disk before Completed/next Started. It deliberately never imports/starts the real probe environment. Temporary files removed in `finally`.

```bash
pnpm -C autobyteus-web test:nuxt \
  components/workspace/config/__tests__ \
  stores/__tests__/existingRunConfigStore.spec.ts \
  stores/__tests__/delegatedLaunchDraftStore.spec.ts \
  components/run-settings/__tests__ utils/runSettings/__tests__ \
  services/agentCollaboration/__tests__ stores/__tests__/agentRunCollaboration \
  components/workspace/history/__tests__/DelegatedStopButton.spec.ts --run
```
Pass: **26 files / 181 tests**, exit 0; `unit.log`. Includes canonical read/save/retry/ownership/Settings controls plus target Stop tokens, per-copy events, pending state, duplicate prevention and visibility. Component DOM is not actual desktop CSS or native keyboard evidence.

```bash
pnpm -C autobyteus-web guard:web-boundary
pnpm -C autobyteus-web guard:localization-boundary
pnpm -C autobyteus-web audit:localization-literals
pnpm -C autobyteus-web build
```
All pass, exit 0; `build-guards.log`. Build is `isElectronBuild false`, generated web dist. Warnings retained: localization audit module-type, outdated Browserslist data, large chunk. No package/global update to suppress warnings. No standalone vue-tsc pass claimed.

```bash
git add autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs
git diff --cached --check
git diff --name-only --diff-filter=U
git commit -m 'merge: integrate personal preserving Settings and Stop coverage'
```
Whitespace pass (empty `merge-whitespace.log`), no remaining unmerged path, merge commit above. Earlier preserved DR-001 raw patch is historical data with conflict markers and trailing-space hunk labels, not unresolved source; it was not part of this merge diff's additions. No SDK dist staged.

## Boundaries / Pending Work
Implementation-engineer skill owns these local checks; TESTING.md's broader real-product journey requirement is handed to API/E2E, not waived. API-REV-001 remains its original pre-integration result, not a fresh merged-state claim. No runtime environments or provider calls started this round. No fresh manual UI inspection; no newly authored product UI.

API/E2E must rebuild integrated desktop (the old asar lacks target Stop CSS), run combined SSR-001..004/DCP-001..005 against a real owned backend, audit new ledger results, and append API-REV-002 with source identity/screenshots/cleanup. Do not use `--skip-build` on the prior package. Delivery DR-001 history is intact; subsequent verification/docs/finalization is DR-002 after validation. No push, archive, release, dirty-main access or user-data access performed here. SDK dist outputs retained untracked.

## Artifact hygiene
The final artifact-stage whitespace check found a build log `WARN ` trailing space and one extra unit-log EOF blank line. Normalized trailing whitespace/EOF only in these newly produced IR-002 logs; before/after hashes are in `integration-receipt.json`. Command output content and results are unchanged. Historical DR-001 evidence was not normalized. Rechecked the final artifact diff before commit.
