# Design Review Report — dependency-security-and-unused-cleanup

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/requirements-doc.md` (SR-002: SR-001 with DEC-005/DEC-006/AC-004 corrected after ARCH-REV-001; approved by the Solution Designer within the Task's direction; user informed; no change of intended behavior)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed: `evidence/SD-00…SD-08`, `probes/` (`update-inrange-loop.sh`, `fixability.mjs`, `apply-manifest-changes.mjs`, `import-provider-check.mjs`), `follow-ups.md`, `handoff-sr-001.md`, `handoff-sr-002.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-002 re-review of AR-001 and the new import-provider check
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/dependency-security-and-unused-cleanup` @ `3b2c86ca9e`, installed and clean.
  - Read: the web, `autobyteus-ts` and server manifests; the root `pnpm-lock.yaml` (importer and snapshot sections); the trial evidence `SD-02`/`SD-03`/`SD-05`/`SD-06`; the loop and fixability probes.
  - For each removal candidate, I grepped the name across the package, excluding build output and tickets.
  - A reviewer script, `/tmp/arch-review-scripts/undeclared.mjs`, lists the bare imports in a package's source that its manifest does not declare. I ran it on `autobyteus-web` and `autobyteus-ts`.
  - For each undeclared import, I searched the lockfile snapshots for the packages that provide it.
  - Shared references re-read after the 2026-10-20 update to `handoff.md`.
  - Round 2 read: `handoff-sr-002.md`; `probes/import-provider-check.mjs`; `evidence/SD-07` (136 lines over the 8 changed packages) and `SD-08` (the corrected trial: import-provider diff empty, dedupe check 0, prod 0 critical / 13 high, all explained). Round 2 grepped the revised DEC-005/AC-004, the Removal Plan, the file mapping, Change Sequence steps 3-4, Risks, FU-005 and `apply-manifest-changes.mjs` (it no longer removes `@nuxtjs/apollo`).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: the payload is manifests plus the lockfile, with no source change. That would normally be Medium/Low. But runtime library versions move under every shipped runtime: Electron, `vue`/`nuxt`, `axios`/`undici`, and the server's transitive packages. That is a blast-radius and deployment surface, so `High` is justified.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - Fix high/critical advisories within DEC-001 (in-range refresh or a same-major raise of a direct specifier; no overrides, no source change).
  - Bump Electron within 42.
  - Explain the remainder.
  - Remove clearly unused dependencies and report doubtful ones.
  - Dedupe.
  - Preserve all product behavior.
- Relevant existing behavior and evidence confirmed: Yes. The `@nuxtjs/apollo` row is corrected (kept as the only provider, reproduced in SD-08).
- Scope guardrail confirmed: Yes. Majors, `xlsx`, the gateway lockfile and Monaco are out of scope as follow-ups.
- Every prospective blocking `Design Impact` finding is traceable: Yes. AR-001 → REQ-004 ("clearly unused"), REQ-007, AC-005/AC-006/AC-007, and the Preserved Behavior Boundary.
- Remaining material ambiguity: none

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational/Security | Pass | Pass | Pass | Confirmed | RR-002 taken: step 3 parent pass |
| BEH-002 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Operational | Pass | Pass | Pass | Confirmed | AR-001 resolved: `@nuxtjs/apollo` kept; step 4 import-provider check |
| BEH-004 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-00…SD-06` | Pass | Pass | Pass | Pass | Pass | The trial measured the audit and the dedupe, not builds. Builds are left to step 7 validation. |
| `probes/` | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/SD-03` (unused scans) + `SD-07`/`SD-08` (import providers) | Pass | Pass | Pass | Pass | Pass | The name scans are now complemented by the provider check, which covers the gap behind AR-001. |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Cleanup / security maintenance | — |
| Root-cause classification is explicit and evidence-backed | Pass | Stale resolutions; declarations left behind after their users moved on | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No code refactor; removals now; majors deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, Dependency Rules, Findings Table | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001…DS-004 | Existing runtime paths, versions only | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Manifests → install → builds → packaging → runtime | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

N/A: no code owner or boundary changes.

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace manifests / root lockfile | Pass | Pass | Pass | Pass | No overrides, no `--latest`, no `audit --fix`, same-major only, exact pins stay exact |

## Interface Boundary Verdict

N/A: no interface changes.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Packaged smoke, Docker, suites | Pass | Pass | N/A | Pass | Reuses `verify-packaged-server-startup.mjs`, the packaged harness and `Dockerfile.monorepo` |

## Subsystem / Capability-Area Allocation Verdict

N/A: manifests and lockfile only.

## Reusable Owned Structures Verdict

N/A.

## Shared Structure / Data Model Tightness Verdict

N/A.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/package.json` | Pass | Pass | N/A | Pass | 7 dependencies + 4 devDependencies removed; `@nuxtjs/apollo` kept |
| `autobyteus-ts/package.json` | Pass | Pass | N/A | Pass | `dotenv`/`ts-node`: grep finds only a test label and a regex. No script or config loads them. Web declares its own `dotenv` for `codegen`. |
| 4 small packages | Pass | Pass | N/A | Pass | `@types/node` (measured) |
| Other manifests, `pnpm-lock.yaml` | Pass | Pass | N/A | Pass | Specifier raises by `pnpm update` within range only |

## Subsystem / Folder / File Placement Verdict

N/A.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web `chart.js`, `vue-chartjs`, `diff-match-patch`, `html2canvas`, `jsonrepair`, `markdown-it-katex`, `markdown-it-prism`, `xmldom`, `concurrently`, `nuxt-electron`, `@vitejs/plugin-vue` | Pass | N/A | Pass | Pass | My grep finds no reference in source or config (only docs and tickets for `concurrently`). None of them is the only lockfile provider of an undeclared import: `vite` and `vue-bundle-renderer` stay provided by `nuxt`'s builders and `vitest`. |
| web `@nuxtjs/apollo` | N/A | N/A | Pass | Pass | Kept (AR-001): only provider of `@apollo/client`/`@vue/apollo-composable`; FU-005 covers declaring them and then dropping it |
| `autobyteus-ts` `dotenv`, `ts-node` | Pass | N/A | Pass | Pass | — |
| `@types/node` ×4 | Pass | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Overrides / resolutions | No | Pass | Pass | Explicitly rejected; mercurius' `undici` is explained (reproduced as never loaded) |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| None | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Baseline → manifest edits → in-range loop + parent pass → dedupe → review (incl. import providers) → audit → validation | Pass | Pass (none) | Pass | Pass |

The one-name-per-update loop is well argued by the trial: a single multi-name update left `protobufjs`, `fast-uri` and `linkify-it` behind. The lockfile-review step and the escalation triggers are concrete.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Update loop, manifest editing, mercurius handling | Yes | Pass | Pass | Pass | The minimal-text manifest edit vs the `JSON.stringify` rewrite is a useful catch (`SD-06` shows the expansion) |

## Material Premise Validation (Only When Needed)

None. AR-001 needs no assumed scenario: it follows from today's lockfile and source, and every build and web start goes through it (SCN-003, SCN-004).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. AR-001 is resolved (see `ARCH-REV-002`).

- AR-001 (High) is resolved by option (a), reproduced in `SD-08`. `@nuxtjs/apollo` is kept and recorded as "not unused: the only provider" in DEC-005/DEC-006, the Removal Plan, the file mapping and `apply-manifest-changes.mjs`. FU-005 is extended to cover the web's undeclared imports.
- The class-level guard is in step 4 and AC-004: `import-provider-check.mjs` over all 8 changed packages, which must match `SD-07`. The corrected trial's diff is empty.

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- **RR-001 (R-001…R-004).** Semver slips, Electron 42.4 → 42.11, new advisories, and hidden removal paths remain validation items under step 7. The matrix is complete for the surfaces touched.
- **RR-002 (resolved).** Step 3 has an explicit parent pass (`electron-updater`, `vue`, `express-rate-limit`, `mermaid`, `@mermaid-js/parser`, plus the parent of any remaining runtime row). The corrected trial shows it was needed: without it, `lodash-es` 4.17.23 remained.
- **Note on the step-4 rule.** The rule is "identical to SD-07, otherwise stop". Only a change *to* `MISSING` means a lost provider. A line that moves between `package`, `root` and `hidden-hoist-only` after a refresh is harmless, so the implementer may judge it rather than escalate. Non-blocking: in the trial the diff was empty.
- **Audit baseline (non-blocking).** Step 5 compares with `SD-05`; `SD-08` is the corrected trial. Their high/critical totals and sets match, so either works.
- **RR-003 (FYI).** `generated/graphql.ts` L3 imports `@vue/composition-api`, which nothing declares or provides today. This predates the ticket and is unaffected by it. Noted so it isn't mistaken for a regression during validation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (no premise needed)
- Notes: Ready for implementation per `design-spec.md` SR-002. Classification `Medium`/`High` is preserved.
