# Handoff — Architecture Design Complete (direct implementation)

- Classification: `Architecture Design Complete`
- Package identifier: `skill-sources-dialog-redesign`
- Current SR: `SR-003` (SR-003 makes the row chips text-only; see `requirements-doc.md` UI section)
- task_size: `Medium` · architectural_risk: `Low` (evidence in `design-spec.md` §Task Size And Architectural Risk)
- Route: direct implementation (no independent architecture review). The matching rule is "Small or Medium and Low risk → `/software_engineering_team/implementation_engineer`".
- Origin: Project Task `project_task_957c30cd-001d-4766-9bbe-47ee71700ef1` (delegator `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)

## Original request

Redesign the "Manage Skill Sources" popup (Skills page → Sources), which the user finds ugly. The new popup should fit the app's visual language. Get the user's approval of the design before implementing, then implement it in `autobyteus-web` with the same functionality, covered by component tests and verified by the user in the desktop app.

## Approval basis

- Requirements: `requirements-doc.md` SR-002, `Approved`. The user approved them on 2026-10-10 through the Product design review (round 3 decisions; round 4 "approved").
- Normative UI: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/ui-ux-spec.md` (Approved) and `visual-references/VIS-001..VIS-023.png`.
- Every visible detail in those references is normative unless the spec marks it as illustrative (fixture names, paths, counts, revisions, dates, error text, native tooltip appearance).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign`
- Branch: `codex/skill-sources-dialog-redesign`
- Base: `origin/personal` @ `d28c56d5d`
- Finalization target: `origin/personal`
- Package (app): `autobyteus-web/`

## Artifacts (absolute paths)

All of these are in `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/`:
- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `product-design-request.md` (completed request record)
- `design-reference/00-current-user-screenshot.png` (before state)

External Product artifacts (owned by the Product Team; treat as read-only) are in `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/`:
- `ui-ux-spec.md`
- `visual-references/`
- `product-ticket.md`
- `review-round-1..4.md`
- `review-evidence/final/`

Independent review artifacts: `N/A — not applicable` (direct route).

## Scope summary (see design-spec for detail)

- Port `components/skills/SkillSourcesModal.vue`, `components/skills/SkillSourceRow.vue` and `utils/skills/skillSourceDisplay.ts`, plus the new en/zh-CN strings, from the design repo commit `6810fc8`. Use `git -C /Users/normy/autobyteus_org/autobyteus-web-design show 6810fc8:<path>`. Do **not** port `prototype/**` or the design repo's `utils/apolloClient.ts` changes.
- Store, GraphQL and server stay unchanged. Store calls must stay identical.
- Remove the localization keys this change makes unused, and the already-dead keys in the touched catalogs. Re-grep before deleting, and keep the dynamic `skills.sources.status.*` keys still used (design-spec §Removal plan).
- Tests:
  - update `components/skills/SkillSourcesModal.spec.ts`;
  - add row tests and `utils/skills/__tests__/skillSourceDisplay.spec.ts`;
  - cover AC-001..AC-007, asserting outcomes rather than class strings.
- Update `autobyteus-web/docs/skills.md` to describe the new UI.
- Render-check the popup against VIS-001..023 per `TESTING.md`, including many-sources scrolling and Browse… in the desktop context.

## Open risks

- New icon names (`mdi:github`, `heroicons:arrow-up-circle`, `heroicons:shield-exclamation`) load through Iconify online, like every other icon in the app.
- `gitlab.com/x` without a scheme is treated as a folder path; the user accepted this.
- The tooltip is pointer-only; its details are also shown in the Update confirmation.

## Next expected action

Implementation Engineer implements, then runs its self-checks and the downstream route. Delivery ends with the user's verification in the desktop app (AC-008).

## Applied handoff route

- `get_handoff_rules` (2026-10-10): the rule for "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" matches. Recipient: `/software_engineering_team/implementation_engineer`.
