# Design Spec: clean-checkout-build-fix (autobyteus-282)

## Solution And Approval Basis

- Revision: SR-002 (D-1 method corrected after the implementation's Design Impact). Requirements approved within the Task's direction (urgent fix; goal fully stated).
- Design status: `Ready`
- Investigation: `investigation-notes.md` (C-01..C-07)
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `RELEASE.md`, the data migration guideline ("Sealed migration area")

## Current-State Read

- The bare `memory` rule (`autobyteus-server-ts/.gitignore:43`) ignores source folders named `memory` (C-01).
- 280's frozen memory modules exist only as untracked files that were deleted with its worktree (C-02, C-03).
- Their library sources are unchanged (C-04).
- No check compares imports with tracked files (C-07).

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Medium`. About 17 frozen copy files (content), one ignore line, one new check in an existing script, and one test.
- `architectural_risk`: `Low`. No runtime behavior, contract or persistence change: the frozen copies are the same code the migrations used in 280's tests, and the check is build hygiene.
- Escalation trigger: return to the Solution Designer if restoring needs a change to any migration's code or tests, or a library file whose source changed after 280's freeze.

## Change Scope (Mandatory)

- **In scope:**
  - `autobyteus-server-ts/src/app-data-migrations/frozen/autobyteus-ts/memory/**` (restore);
  - `autobyteus-server-ts/.gitignore` (anchor the rule);
  - `scripts/check_repository_artifact_hygiene.py` (tracked-import check);
  - `autobyteus-server-ts/tests/architecture/tracked-imports.test.ts` (new);
  - `TESTING.md` (one line).
- **Derived consumers:** the release workflows (`release-desktop.yml:91` and the others that run the hygiene script) start enforcing the new check. That is intended.
- **Left alone:** migration code; the dead prompt-engineering tests (FU-001); the tracked-file-only frozen tree outside `memory/`.
- **Follow-ups:** FU-001.

## Design

- **D-1 Restore** (REQ-001):
  - Copy from `autobyteus-ts/src/` at commit `9b013fcc09` (280's freeze; the sources are unchanged since, C-04) into `frozen/autobyteus-ts/<same path>`:
    - the 9 files of C-03;
    - their library dependencies not already frozen: `memory/store/{base-store, durable-file-replace, jsonl-log-file, raw-trace-archive-manager}`, `memory/models/{memory-types, system-instruction-trace}`, `memory/{working-context-snapshot-serializer, working-context-finalization-validation}`;
    - any further file `tsc` reports.
  - Imports that already resolve to tracked frozen files (`llm/utils/messages`, `agent/message/context-file-*`) are kept, because the relative layout matches.
  - Whole files, no trimming: the trimmed 280 versions are unrecoverable, and the same code gives the same behavior.
  - The 280 boundary test must still pass: the copies import only frozen siblings, node and third-party code.
- **D-2 Ignore rule** (REQ-002): replace line 43 `memory` with `/memory/`. Keep the `!/tests/e2e/memory/` re-includes or drop them as redundant; they become harmless either way.
- **D-3 Tracked-import check** (REQ-003): one owner, `scripts/check_repository_artifact_hygiene.py`, gets a new violation group, "relative import resolves to an untracked file".
  - **Scope:** `.ts`, `.mts`, `.vue` files tracked under `autobyteus-server-ts/src`, `autobyteus-server-ts/tests`, `autobyteus-ts/src` and `autobyteus-web` (excluding `node_modules`, `dist`, `.nuxt`, `.output`, `electron-dist`).
  - **Resolution:** the same as the probe (`.js`→`.ts`/`.vue`/`.mts`, `index.ts`), checked against the `git ls-files` set, not the disk.
  - **Excluded:** import strings inside test fixtures, i.e. the architecture tests' own fixture text. Read them only from real `import`/`export … from` statements and dynamic `import(` at the start of a statement, and skip those two files' fixture literals by an explicit allow-list of files with a reason.
  - `--only tracked-imports` runs just this group.
- **D-4 Run it in normal validation:** `tests/architecture/tracked-imports.test.ts` spawns `python3 scripts/check_repository_artifact_hygiene.py --only tracked-imports` and expects exit 0, so every server test run catches the problem, including in a worktree with ignored files on disk. `TESTING.md` gets one line under build hygiene.

## Removal / Decommission Plan (Mandatory)

None in scope. FU-001 records the dead prompt-engineering tests.

## Guidance For Implementation

- **Prove AC-001 in a fresh clone** (`git clone` of the pushed branch into a temporary folder, then `pnpm install`): server `tsc`, `pnpm -C autobyteus-server-ts test:integration:prepare`, the migration suites, the architecture tests, and that server unit and e2e files load.
- **AC-003:** add a negative case to the test, a temporary untracked file imported by a temporary tracked fixture in a temporary git repo, or a unit test of the resolver function.
- Do not change migration code or tests. If `tsc` needs anything beyond library copies, escalate.


## SR-002: D-1 method corrected (implementation Design Impact, 2026-10-24)

- **Two premises of D-1 were wrong** (Principle 1; neither was checked):
  1. Whole files: following their imports pulls in 68 library files (most of `llm/*`, `memory/compaction/*`, all of `secrets/vault/*`). `tsc` still fails, because 280 had pruned members from **tracked** frozen siblings (`Message.toDict` and `leadingSystemMessages` in `frozen/autobyteus-ts/llm/utils/messages.ts`; `ToolCallDelta` in `llm/utils/tool-call-delta.ts`).
  2. "Trimmed versions are unrecoverable": 280's pruner is deterministic and still exists (`/tmp/ab280/prune2.mjs`). It removes only unreferenced top-level declarations, class members and imports, repeated to a fixpoint, so its output is a line subset of its source; 280's code review checked that property.
- **D-1 (revised):**
  1. Restore the needed files whole from `autobyteus-ts/src` at `9b013fcc09`.
  2. Run the same pruner over `frozen/server` and `frozen/autobyteus-ts`. The tracked files are already at their fixpoint and stay byte-identical.
  3. The restored files shrink to the members used, which reproduces 280's reviewed frozen layer, with no vault or LLM base code in the migration area.
  4. Evidence per restored file: it is a line subset of its `9b013fcc09` source.
  5. The 280 boundary test, its unused-frozen-files report and the migration suites decide.
- **Commit the pruner** as a migration-area tool so the frozen layer can be rebuilt reproducibly, for example `autobyteus-server-ts/scripts/prune-frozen-layer.mjs`, with a one-line note in the guideline's "Copy what you use" bullet. A pruner only in `/tmp` is the same kind of untracked dependency this ticket fixes.
- Classification unchanged: Medium / Low (no migration code or tests change; no runtime behavior change).
