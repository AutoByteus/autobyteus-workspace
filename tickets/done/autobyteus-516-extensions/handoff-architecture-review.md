# Handoff — autobyteus-516 Stage 1: Architecture Design Complete (Large / High)

- Package: `autobyteus-516-extensions`, Task autobyteus-516 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the founder.
- Classification: **Architecture Design Complete**, `task_size = Large`, `architectural_risk = High` (design-spec.md, Task Size And Architectural Risk). Route: `/architecture_reviewer` (handoff rule: Large or High).
- Solution revision: SR-007 (design) on requirements SR-006 (+ DEC-017…DEC-019, AC-003 wording of the final check).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions`, branch `codex/autobyteus-516-extensions`, base `origin/personal` @ b768c503f9 (fetched 2026-11-21); finalization target `origin/personal` (RELEASE.md). Uncommitted: the ticket folder and the DESIGN.md rule 13 addition.

## Original request and goal

The founder's proposal "AutoByteus Extensions" (Task description and comments): optional, independent, headless-capable extensions, staged, design approved by the founder before building. Stage 1 = the extension foundation on every node, proven by migrating Voice Input (founder 2026-11-21).

## Approval basis

- Requirements: approved by the founder (SR-001/002, 2026-11-21); contract approved (SR-005, 2026-11-22); DEC-015 delegated by the founder; DEC-016 (delete the old Voice Input install instead of moving it), DEC-018 (one public repository `AutoByteus/autobyteus-extensions` for every extension's package and the signed catalog), DEC-019 (name "Shared File System") decided by the founder on 2026-11-26.
- Design: **approved by the founder**, 2026-11-26: "Did you update your contract and then validate yourself if you think like the data flow spine works for every use case then it's approved". The final self-validation passed after three fixes (use-case-spines.md, "Final check of Stage 1").
- UI: Product final package (founder approved), design repository `personal` @ 825434bc; its REQ-007 row and VIS-V3-01 are superseded by DEC-016.
- Prerequisite PRE-001 → autobyteus-655: delivered and closed; pin voice runtime **0.3.2**.

## Documents (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/requirements-doc.md`
- Investigation notes: `…/investigation-notes.md`
- Design spec: `…/design-spec.md`
- Solution revision record: `…/solution-revision-record.md`
- Data contract (behavior-defining, approved): `…/extension-contract.md`
- Use cases → spines → validation, incl. the final check: `…/use-case-spines.md` (Part V is Stage 1; Parts N/T belong to the Private Network stage, not in this review)
- Probes (evidence, not product code): `…/probes/contract-probe/README.md`, `…/probes/spine-probes/README.md`
- Product UI spec (Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/extensions-ui-516/ui-ux-spec.md` (Stage 1: VIS-V*)
- Project rules: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/DESIGN.md` (rule 13 added in this ticket), `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `autobyteus-server-ts/docs/design/node_access_model.md`

## Scope reminder

In scope: UC-001…UC-006 (requirements Scope Guardrail). Out: Private Network, Shared File System, payments (DEC-013), voice engine changes beyond 0.3.2, the Product spec's Manage Nodes changes (Private Network stage).

## Points worth the reviewer's attention

- Server parts run inside the node process (deliberate deviation, design-spec Task Design Health Assessment).
- The extension manager reaches GraphQL resolvers through the per-request context, not a process binding (Principle 16).
- Install/update into `package.new/`, swapped at the end; installed = valid `package/extension.json`; `enabled` the only stored fact.
- Owner-only routes (`/rest/extensions` in the route table; resolver owner check); page CSP limits loads to its own `ui/` path because the desktop attaches the owner credential by origin.
- One-time background deletion of `<base data folder>/extensions` as a sealed desktop client-data step.
- Catalog URL/public key built in, with development overrides by environment (extension developers' own catalog), not test-only code.

## Open items (not blocking review or implementation)

- Release-time, the founder: create the catalog signing key himself (only a secret of `autobyteus-extensions`; never through chat) and the repository; releases only on his word.
- Follow-ups FU-001, FU-002 (`follow-ups.md`), sent to the PM when the result leaves the team.

## Expected output

Independent architecture review of the Stage 1 design against the approved requirements and contract; findings with the requirement or principle they protect.

## Route record

Handoff rules applied 2026-11-26: rule 1 (Large or High) → `/architecture_reviewer`.

## Round 2 (2026-11-26): ARCH-REV-001 findings resolved

- SR-008 in solution-revision-record.md lists each finding and the change.
- design-spec.md: AR-001 (voiceInputStore reads the embedded node's item; DS-004, Ownership Map, Dependency Rules), AR-002 (Extension Catalog fetch policy; `extensions(refreshCatalog)`; DS-001/DS-002), AR-003 (page CSP; evidence row; AC-002 real-node page check), AR-004 (Removal plan rows; real-release test home), AR-005 (catalog URL in the file table and release row), residual notes decided (end of Guidance).
- extension-contract.md: §2 page loads, §3 fixed catalog URL (release tag `catalog`), §5 reference to §2.
- Base: worktree fast-forwarded to `origin/personal` @ fdde5406fa; citations refreshed.
- Route record: handoff rule 1 → `/architecture_reviewer` (round 2).

