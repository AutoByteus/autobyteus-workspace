# Investigation Notes

## Investigation Meta

- Package identifier: `skill-sources-dialog-redesign`
- Request / ticket: Project Task `project_task_957c30cd-001d-4766-9bbe-47ee71700ef1` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign` / `codex/skill-sources-dialog-redesign`
- Resolved base remote / branch / revision: `origin/personal` @ `d28c56d5d` (fetched 2026-10-10; `origin/HEAD -> origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-10); repo `AGENTS.md`; `autobyteus-web/AGENTS.md`
- Authorities read (architecture gate, 2026-10-10): `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md`
- Investigation status: Requirements-level investigation complete; visual design delegated to Product Team at the user's explicit request (2026-10-10).

## Initial Request And Clarifications

- Original request: Redesign the "Manage Skill Sources" popup on the Skills page; the user finds it ugly. Design an improved popup matching the app's visual language, get the user's approval of the design (visual reference/screenshots) before implementing, then implement in `autobyteus-web` without changing behaviour, with component tests, verified by the user in the desktop app.
- Clarifications received: 2026-10-10 — user: "@Product Team here is can delegate a task to product team" → the visual/UI design work goes to `/product_team` via `delegate_task`.
- User-supplied facts: screenshot `design-reference/00-current-user-screenshot.png` (copy of the task context file).
- Initial ambiguity: whether lightweight additions (e.g. native "Browse…" folder picker) count as "changing behaviour" — recorded as DEC-002.

## Product And Domain Understanding

- Product area: Skills page → "Sources" button (`SkillsList.vue`) → `SkillSourcesModal.vue`.
- Actors: desktop/web user managing where skills are loaded from.
- Purpose: list skill sources (Default, local folders, GitHub repositories), see their skill counts, add a local folder or import a public GitHub repo, check/update GitHub sources, remove non-default sources.
- Terminology: *Default* source (built-in `~/.autobyteus/server-data/skills`, not removable); *Local folder* (`LOCAL_PATH`, removal only unlinks); *GitHub* (`GITHUB_REPOSITORY`, app-managed copy; removal deletes the managed copy).

## Source Log

| Date | Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-10-10 | Code | `autobyteus-web/components/skills/SkillSourcesModal.vue` | Current popup | Custom overlay/dialog (scoped CSS), header/title/×, scrolling content with alerts, `SkillSourceRow` list, add section (Local/GitHub toggle, input, Add/Import), hint, footer "Done". Uses `ConfirmationModal` (danger) for remove/update confirmation. Esc closes when no confirmation. Sources sorted Default first, then path. |
| 2026-10-10 | Code | `autobyteus-web/components/skills/SkillSourceRow.vue` | Row | Grey card per source: badge (Default/Local folder/GitHub), "N skills", full path in monospace (wraps), GitHub status + metadata (installed/latest revision, branch, checked time) + last error; actions Check again / Update / Remove (Retry removal when REMOVING); no actions on Default. |
| 2026-10-10 | Code | `autobyteus-web/stores/skillSourcesStore.ts` | Behaviour owner | `fetchSkillSources`, `addSkillSource`, `removeSkillSource`, `githubOperation(import/check/update/remove)`, `checkGitHubSources`, `pending` per source, `warnings`, `registryError`. UI redesign need not touch the store. |
| 2026-10-10 | Code | `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` (164 lines) | Existing tests | Covers remove+refresh, add via name checks, keep path on conflict, GitHub check-on-open/import, update confirmation/cancel, row failure + retry removal + disabled during ops. Selectors like `.remove`, `.input-group input`, `.input-modes button`, `.source-row` will need updating. |
| 2026-10-10 | Code | `autobyteus-web/components/settings/AgentPackagesManager.vue` | Closest in-app analogue (package sources list in Settings) | Uses one bordered `divide-y` list, compact rows: bold name, xs metadata line, truncated mono path with `title`, small right-side badge + xs buttons; add form in a grey panel below. Tailwind utility styling. |
| 2026-10-10 | Code | `components/common/ConfirmationModal.vue`, `components/skills/SkillsList.vue` dialog styles | App dialog language | Confirmation: white rounded-lg, max-w-md, Tailwind, `danger` variant (red confirm). SkillsList dialogs: 12px radius, header border, `btn-primary` blue `#3b82f6`, `btn-secondary` white/grey border. Icons: `@iconify/vue` heroicons (`heroicons:trash`, `folder`, `plus`, `arrow-path`, `cog-6-tooth`). |
| 2026-10-10 | Code | `components/common/CopyButton.vue` | Copy path affordance | Existing copy-to-clipboard icon button component. |
| 2026-10-10 | Code | `electron/application/electronApplication.ts:318`, `electron/preload.ts:120`, `components/chat/ChatWorkspaceMenu.vue:281` | Native folder picker | `window.electronAPI.showFolderDialog()` exists and is already used for workspaces. Not used by the skill-sources dialog today. |
| 2026-10-10 | Code | `grep -rln "dark:" components` (14 files), `tailwind.config.js` | Dark mode | No app-wide dark theme/toggle; only a few renderer components carry `dark:`/`prefers-color-scheme` styles. The app is effectively light-only. |
| 2026-10-10 | Doc | `autobyteus-web/docs/skills.md` §Local and GitHub Sources | Contract | Modal checks GitHub on open; Check again; Update replaces managed copy after confirmation; Remove deletes GitHub managed copy / unlinks local folder after confirmation; Default not removable; Removal incomplete → Retry removal. |
| 2026-10-10 | User | Screenshot (desktop app) | Current pain | 4 sources fill the dialog; path text dominates; full-width "Remove" per row; big blue Done; add section is below the fold. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Skills page → Sources | Modal opens, fetches sources, then checks GitHub sources | List: Default first, then sorted by path; shows kind badge, skill count, path/URL | Modal/Row source |
| BEH-002 | User | Add local folder | Type absolute path → Add folder → name-conflict checks → source added → catalog refresh → success message | Typed path kept on failure/conflict | Modal + spec |
| BEH-003 | User | Import GitHub repo | Switch to GitHub → paste URL → Import repository | Trust hint shown; same conflict boundary | Modal + spec |
| BEH-004 | User | Remove source | Remove → confirmation (danger) → unlink local / delete GitHub managed copy → refresh | Default has no Remove; cancel does nothing | Modal + Row |
| BEH-005 | User | GitHub check/update | Check again; Update when UPDATE_AVAILABLE/UPDATE_FAILED → confirmation | Status text, revisions, last error, Retry removal for REMOVING | Row + spec |
| BEH-006 | User | Busy/feedback | Buttons disabled while any operation pending; error/registry error/success/warning alerts | — | Modal |
| BEH-007 | User | Close | ×, Done, overlay click, Esc (not while confirming) | — | Modal |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication |
| --- | --- | --- |
| `components/skills/SkillSourcesModal.vue` | Dialog shell, add form, alerts, confirmation orchestration | Primary redesign target |
| `components/skills/SkillSourceRow.vue` | One source row | Primary redesign target |
| `components/skills/SkillSourcesModal.spec.ts` | Component tests | Update + extend |
| `localization/messages/{en,zh-CN}/skills*.ts` | Strings | New strings (e.g. tooltips, aria-labels, "No skills") need en + zh-CN |
| `stores/skillSourcesStore.ts` | Behaviour | Expected unchanged |

## Structural And Payload Surface Inventory

- No API, persistence, security, concurrency or deployment surface involved. Presentation-only change in two Vue components + localization + tests. Possible optional use of existing `showFolderDialog` IPC (DEC-002).

## Persisted Data And State Facts

- None affected.

## Product Design Request Context

- Product Design request in the current input: `Present` (user, 2026-10-10: delegate to Product Team).
- User's requested outcome: "the user finds it really ugly and wants a better UI" — an improved popup that fits the app's existing visual language, approved by the user via visual reference/screenshots before implementation.
- Requirement IDs: REQ-001..REQ-009, BEH-001..BEH-007.
- Critical journey/states: see requirements-doc §Relevant Scenarios and §UI.
- Known constraints/non-goals: behaviour unchanged; Default not removable; confirmation before remove/update retained; light-only app.
- Request artifact: `product-design-request.md`.

## Product Design Findings

- Product Design package path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/` (design repo `personal` @ `dd89b84`, local = origin; validated design commit `6810fc8`; round commits `e6d71fc`, `74537a3`, `7e666fb`, `4bee880`)
- UI reference source: the design repo's `components/skills/SkillSourcesModal.vue`, `components/skills/SkillSourceRow.vue`, `utils/skills/skillSourceDisplay.ts` and `localization/messages/{en,zh-CN}/skills.ts` @ `6810fc8`. The fixture is `prototype/skill-sources/skillSourcesDesignFixture.ts`, hooked in through the design repo's `utils/apolloClient.ts`; these hooks are design-only.
- Approved UI/UX specification: `ui-ux-spec.md` (Status `Approved`)
- Review URL: `http://127.0.0.1:4731/skills` (server stopped)
- Explicit user-confirmation reference: 2026-10-10. Round 3: "what is your suggestion, as long as its still clear. i think clean ui is the goal" → "lets go then". Round 4: "approved". See `review-round-3.md` and `review-round-4.md`. `/project_task_manager` relayed the package because Product's direct replies failed.
- Journeys validated: UXJ-001..006; validate V01–V20 20/20; capture 23/23; typecheck/lint 0; test 15/15; 0 browser errors.
- Final visual references: VIS-001–VIS-023 in `visual-references/`
- Product decisions supported: DEC-001 (this design), DEC-002 (Browse… included), ASM-001 (light only). Approved behaviour changes:
  - no visible kind word;
  - a single add input with URL detection (DC-017);
  - manual check only after Check failed ("Try again");
  - revision details only in the status tooltip and the Update confirmation.
- Rejected alternatives: row ⋯ menu, collapsible add form, bordered list box, Local/GitHub switch, ↻ check icon, Check again on Up-to-date rows, hiding Up to date.
- Mocked boundaries: GraphQL answered by fixture; folder picker returns a synthetic path. Production uses the existing store/IPC.
- Requirements sections affected: AC-001, REQ-002, REQ-005/AC-004, REQ-007/AC-006; new REQ-010 (strings) → SR-002.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `design-reference/00-current-user-screenshot.png` | User | Current-state evidence | BEH-001 | Final | N/A (evidence) |
| `product-design-request.md` | Solution Designer | Product Team request context | REQ-001..009 | Sent | N/A |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/ui-ux-spec.md` + `visual-references/VIS-001..023` | Product Team | Approved visual design | REQ-001..010 | Approved | User-approved 2026-10-10 |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether to add a native "Browse…" folder picker (behaviour addition) | DEC-002, user | Resolved: included |
| R-001 | Risk | Existing spec selectors depend on current class names | Update spec during implementation | Known |

## Implementation-Phase User Feedback (SR-003)

| Date | Source | Finding | Implication |
| --- | --- | --- | --- |
| 2026-10-10 | User, via the Implementation Engineer (`implementation_engineer_c7077409346f4aac95d34fbe9de073ac`) while reviewing the rendered popup | "Just remove the icon. I think the icon, because with the words, it's already clear. The icon makes it look not so clean. Yeah, you decide." This was said about the Update chip; the implementer applied it to Update and Retry removal | Row chips are text-only; Product visual detail superseded in our requirements. Rendered evidence: `/Users/normy/.autobyteus/browser-artifacts/ddc4f6-1791606511366.png` (checked 2026-10-10: Update chip is text-only, Add keeps `+`) |

## Architecture Investigation Findings

| Source / Command | Observation | Design implication |
| --- | --- | --- |
| `git -C autobyteus-web-design show 6810fc8:components/skills/SkillSourcesModal.vue` / `SkillSourceRow.vue` | Production-shaped. Imports only production modules: stores, `utils/mobileFeatureGates`, `composables/useNativeFolderDialog`, `stores/windowNodeContextStore`, `utils/skills/skillSourceDisplay`, `ConfirmationModal`, `@iconify/vue`. No `prototype/` imports | Port directly |
| `git -C autobyteus-web-design diff e6d71fc~1 6810fc8 -- utils/apolloClient.ts` | Fixture hooks live only in the design repo's Apollo client | Do not port |
| `autobyteus-web/utils/mobileFeatureGates.ts:72`, `composables/useNativeFolderDialog.ts:3`, `stores/windowNodeContextStore.ts:55` | Picker gating and helper exist in production | Reuse for Browse… |
| `grep -rln '<key>'` for old string keys (2026-10-10) | `skills.sources.sourceType`/`repositoryUrl` are used only by the modal. `skills.sources.import`/`check`/`status.REMOVING` are referenced literally only in the catalogs. `SkillSourcesModal.add_new_source_folder`/`absolute_path_to_skills_folder`/`add_folder`/`enter_the_absolute_path_to_a` are used only by the modal. `SkillSourcesModal.default`/`custom`/`scanning`/`remove_message`/`remove_confirm`/`add_success` are not referenced by any component (already dead) | Removal plan. Re-grep for dynamic `status.` key construction before deleting |
| `autobyteus-web/package.json` scripts | `guard:localization-boundary`, `audit:localization-literals` run in desktop builds | Run them after the catalog changes |
| `components/skills/SkillsList.vue:150`, `SkillCard.vue:50` | `import { Icon } from '@iconify/vue'` explicit import convention | Keep it in the ported components |
| `grep svg-spinners` | `svg-spinners:ring-resize` already used in production | Reuse |
| `autobyteus-web/plugins/` | No offline Iconify collection; icons load via the Iconify API | `mdi:github` etc. use the same mechanism (risk accepted) |
| `utils/skills/__tests__/` | Existing test folder for skills utils | Place the display-name test there |

## Requirement Implications

Presentation-only redesign; all BEH-001..007 preserved. Product Team owns the visual proposal; user approval of it becomes the UI basis of the requirements.
