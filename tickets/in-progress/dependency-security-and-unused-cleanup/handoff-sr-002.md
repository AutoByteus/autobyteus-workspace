# Handoff — dependency-security-and-unused-cleanup, SR-002: design revised after ARCH-REV-001

- Status: **Architecture Design Complete** (revised); `Medium` / `High` (unchanged)
- Package: `dependency-security-and-unused-cleanup`; Project Task `autobyteus-229`; requested by `/project_task_manager`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`, base `origin/personal` @ `3b2c86ca9e`. Installed; trials reverted (clean apart from the ticket folder, which is uncommitted).
- Full context: `handoff-sr-001.md`.

## Corrections

**AR-001 (accepted, option (a), reproduced).**
- Reproduced in `evidence/SD-08`: with only `@nuxtjs/apollo` removed, `@apollo/client` and `@vue/apollo-composable` leave the lockfile and the tree.
- `@nuxtjs/apollo` is kept. It is recorded as "not unused: the only provider" in:
  - `requirements-doc.md` DEC-005 (removal list) and DEC-006;
  - `design-spec.md`: Removal Plan, Final File Responsibility Mapping ("7 dependencies and 4 devDependencies, **not** `@nuxtjs/apollo`") and the evidence table;
  - `probes/apply-manifest-changes.mjs`.
- FU-005 now covers the undeclared web imports (`@apollo/client`, `@vue/apollo-composable`, `graphql`, `graphql-tag`) and says to drop `@nuxtjs/apollo` once they are declared.

**New check (design Change Sequence step 4, AC-004).**
- `node probes/import-provider-check.mjs <repo> <8 changed packages>` lists every bare import in each changed package and where it resolves: the package, the root, the hidden hoist only, or MISSING.
- After the change, its output must be identical to the base output `evidence/SD-07`.
- On the corrected trial (`evidence/SD-08`) the diff is empty.

**RR-002 (accepted).** Step 3 adds a parent pass, one name per update: `electron-updater`, `vue`, `express-rate-limit`, `mermaid`, `@mermaid-js/parser`, plus the parent of any remaining runtime row. Without it, the corrected trial left `lodash-es` 4.17.23; with it, prod is 0 critical / 13 high, all explained.

**RR-003 (accepted).** The pre-existing unresolved `@vue/composition-api` import is noted in the design Risks.

## Route record

- 2026-10-20: `get_handoff_rules` → architecture review rule (High risk) → `/software_engineering_team/architecture_reviewer`.
