# Solution Revision Record — dependency-security-and-unused-cleanup

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-229 (FU-004 of autobyteus-224 + the user's Part 2) | N/A | N/A | Requirements Approved (within direction); Design Ready; `Medium` / `High` | BEH-001…005; REQ-001…007; AC-001…008 | Architecture Design Complete → architecture review |
| SR-002 | Mixed (Design Impact) | ARCH-REV-001 (Fail) | AR-001; RR-002, RR-003 | Design Ready (SR-001) | Requirements Approved SR-002 (DEC-005/DEC-006/AC-004 corrected; intended behavior unchanged); Design Ready; `Medium` / `High` | BEH-003; REQ-004; AC-004; DEC-005, DEC-006 | Corrected → architecture re-review |

## Revision Entries

### SR-001 — Baseline: in-range security updates, Electron 42 patch, unused removals

- Phase and classification: Mixed (requirements + design), `Initial Baseline`
- Trigger: Task `autobyteus-229` from `/project_task_manager`, 2026-10-20; investigation and a full trial of the design, reverted (`investigation-notes.md`, `evidence/SD-00…SD-06`, `probes/`)
- Current status:
  - requirements `Approved` by the Solution Designer within the Task's direction: the Task sets the rules for "small and safe", explained remainders and doubtful removals; the user is informed in the Solution Designer conversation, 2026-10-20;
  - design `Ready`.
- IDs:
  - BEH-001…005, REQ-001…007, AC-001…008, SCN-001…004;
  - DEC-001: the small-and-safe rule;
  - DEC-002: Electron within 42;
  - DEC-003: mercurius' `undici` explained (reproduced never loaded);
  - DEC-004: Fastify 5 → urgent follow-up;
  - DEC-005: removal list, plus `monaco-editor` doubtful;
  - DEC-006: undeclared test dependencies → follow-up.
- Intended behavior changed: No (dependency versions/declarations only)
- Key evidence:
  - base audit: prod 3 critical / 91 high, all 18 critical / 217 high;
  - trial after: prod 0 critical / 13 high, all in the explained set; all 6 critical / 46 high (dev majors and no-fix); `pnpm dedupe --check` 0.
- Classification: `task_size=Medium`, `architectural_risk=High`. No code, but runtime library versions change under every packaged runtime (Electron, `vue`/`nuxt`, `axios`/`undici`, server transitives), so the blast radius is wide and only the validation matrix settles it.
- Follow-ups: FU-001 (Fastify 5, urgent), FU-002 (`xlsx`, urgent), FU-003…FU-007
- Handoff: `get_handoff_rules` → "Large or High" → `/software_engineering_team/architecture_reviewer` (`handoff-sr-001.md`)
- Next action: architecture review

### SR-002 — `@nuxtjs/apollo` kept; import-provider check; parent pass

- Phase and classification: `Design Impact` with a requirements-text correction. The removal list is part of DEC-005. The intended behavior ("remove clearly unused") is unchanged; one item was wrongly classified as unused.
- Trigger: `/software_engineering_team/architecture_reviewer` ARCH-REV-001 = Fail (`design-review-report.md`, `architecture-review-revision-record.md`): AR-001 (High); non-blocking RR-002, RR-003
- AR-001 (accepted, reproduced in `evidence/SD-08`):
  - removing only `@nuxtjs/apollo` drops `@apollo/client` and `@vue/apollo-composable` from the lockfile and tree, and web code imports both undeclared.
  - Chosen option (a): keep it; FU-005 is extended to declare the imported packages and then drop the module. Reason: adding dependencies is not removal (the same rule as DEC-006), and moving the web's Apollo setup off the alpha module deserves its own validation.
  - New check: `probes/import-provider-check.mjs` (baseline `evidence/SD-07`), required identical after the change (design step 4, AC-004). The corrected trial gives an empty diff.
- RR-002 (accepted): a parent pass in step 3 (`electron-updater`, `vue`, `express-rate-limit`, `mermaid`, `@mermaid-js/parser`, plus any parent of a remaining runtime row). The SR-002 trial showed the loop alone left `lodash-es` 4.17.23.
- RR-003 (accepted): noted in the design Risks.
- Corrected trial result: prod 0 critical / 13 high, all in the explained set; all 6 / 46; dedupe check 0; 1 dev-only in-range straggler.
- Approval impact: the Solution Designer within the Task's direction; the correction narrows the removal list and adds a verification; the user is informed in the conversation.
- Classification: unchanged, `Medium` / `High`
- Handoff: `get_handoff_rules` → architecture review rule → `/software_engineering_team/architecture_reviewer` (`handoff-sr-002.md`)
- Next action: architecture re-review of AR-001 and the new check

#### Review outcome for SR-002 (informational)

- 2026-10-20: ARCH-REV-002 = **Pass** (`design-review-report.md`). AR-001 is resolved. The reviewer delivered the implementation handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer does not repeat it.
- The reviewer's non-blocking note was applied as a wording clarification of `design-spec.md` Change Sequence step 4: only a change to `MISSING` escalates; a provider-location move is noted in the handoff. This is evidence-level; no requirement or design decision changed.

#### Incident and estimate, 2026-10-20 (not a solution round)

- **Incident (Solution Designer's error).** While measuring the effect of the removals for the user, I ran `git checkout -- .` and `pnpm install --frozen-lockfile` in the ticket worktree after the implementation engineer had started there. That discarded its uncommitted manifest and lockfile edits (7 files) and reset `node_modules` to the base. The ticket folder, including `evidence/IMP-01-baseline.txt`, was untouched. The implementation engineer was told right away. From now on, the Solution Designer measures only in separate read-only copies.
- **Estimate (read-only, `probes/removal-reach-estimate.py` on the base lockfile `3b2c86ca9e`):**
  - The removals are 17 manifest entries of 14 distinct libraries: 13 libraries, plus `@types/node` in 4 packages.
  - They take 33 of 1,853 installed package versions out of the tree. `dotenv`, `@vitejs/plugin-vue` and `@types/node` stay installed through other packages; only their declarations go.
  - With `monaco-editor` (doubtful) it would be 18 entries / 34 packages.
- No requirement or design change.
