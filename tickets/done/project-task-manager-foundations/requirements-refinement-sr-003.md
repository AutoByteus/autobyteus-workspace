# Requirements refinement result — SR-003

## Identity, state and workspace
- Package: **PROJ-TASK-MANAGER-20261002-001**; ticket `project-task-manager-foundations`; date 2026-10-02.
- Owner: Solution Designer, `/software_engineering_team/solution_designer`.
- Outcome: **Draft — User Decision/Approval Hold**. Product manual UI integration complete; remaining material behavior decisions/full requirements approval required. Not Architecture Design Complete, production implementation-ready or a production delivery receipt.
- Isolated solution workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`, branch `codex/project-task-manager-foundations`.
- Source base: refreshed `origin/personal@e04cfef23550c3b78286a53befc6bd5d71fb1061`; finalization target `origin/personal`. Previous local docs checkpoint `f1dcea849e4966f348298b9929ad3fb79da7f584`. Only owned docs changed; no merge/push/release/runtime/feature-toggle/public-agent/Product source modifications.

## Original request and continued goal
Continue experimental Projects/Tasks while keeping the feature flag disabled by default and the user's installation off. Build task-management tools (create/read/progress/Done; MCP exposure comparable to collaborator/artifact tools), a public Project Task Manager, and perhaps a management Team later. The Manager discovers eligible Agents/Teams such as Software Engineering Team, decomposes work at useful granularity, analyzes dependencies and delegates independent work in parallel. User requested analysis then direct Product brainstorming because the UI was unsettled.

The original coordination goal remains in this draft. UI approval does not reduce this task to manual CRUD, nor does the tentative Team vision require speculative specialists. “Maximum parallelism” is a goal for independent work, not an unlimited-concurrency or optimal-scheduler guarantee.

## Canonical owned authorities
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/requirements-doc.md` — SR-003 **Draft**.
- Evidence/current full supplement inventory: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/investigation-notes.md` — E-001–022.
- Cumulative history: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/solution-revision-record.md` — SR-001/002 preserved, SR-003 appended.
- Historical handoffs: same directory `product-design-handoff.md` and `product-design-handoff-sr-002.md`. Historical Product in-progress paths are capture provenance, not active locators.
- `design-spec.md`, independent technical reviews, implementation/API-E2E/delivery artifacts: **N/A — these phases have not started**; do not invent paths or approval.

## Approval basis and external Product supplement
**UF-017** (2026-10-02): “the ui is good now. now i confirm the ui is good. continue”. Product explicitly records it as approval of the represented manual Projects/Tasks authoring/board/detail UI only; UF-004 Product-first handoff gate is released. It is not approval of the entire Manager/orchestration requirements or production engineering.

Canonical Product package: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations`.
- Approved external contract: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/project-task-manager-foundations/ui-ux-spec.md` and all 20 ticket-scoped VIS-001–020 screenshots under `visual-references/`, exact filenames enumerated by that spec. Every visible detail is normative unless the spec explicitly exempts fixture values or variation. Do not copy it into a competing visual specification.
- Approval/finding sources: same final directory `ui-brainstorm-record.md` (UF-001–017), `handoff-notes.md` (PFI-001–007), `prototype-ticket.md` (lifecycle/repository receipt).
- Exact approved runnable UI: `84ed47bac6877e2cdc6350cca789b0c30ffb55a3`; accepted cumulative base `df2f5cdaf9b168298dcae79ac47c11f31dd82d7c`; final artifacts/default-entry promotion `134e8e05169bb96e0b8132ad0f524ffc28c354f0`; integrated receipt `f66efa9c5c1d9976137f6c134120529466b34e48`.
- Canonical runnable root `/Users/normy/autobyteus_org/autobyteus-web-prototype`, personal and ticket branch `prototype/project-task-manager-foundations` clean at f66efa9. Retained authoring worktree `/Users/normy/autobyteus_org/autobyteus-web-prototype-worktrees/project-task-manager-foundations` is not canonical ownership. No post-approval UI code changes/remote push.
- Accepted source authority `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype-bootstrap-report.md` and `e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71`, distinct from investigation `e04cfef23550c3b78286a53befc6bd5d71fb1061`; no newer parity certification inferred.

All still-relevant external validation/history/runbook/change-log/review/DATA artifacts and exact absolute paths are retained in the canonical inventory in investigation-notes.md. That includes final-browser-validation.json, integration-validation.json, final-build-output.txt, ui-behavior-test-matrix.md, prototype-runbook.md, prototype-change-log.md, requirement-impact.md, review-round-1/3/4/5/6.md and review-evidence/ (including user screenshots and DATA-001-assessment.md). Earlier rejected screenshots are historical, not normative alternatives.

## Integrated product intent (not a duplicate UI spec)
| Finding | Requirements integration | Boundary |
| --- | --- | --- |
| PFI-001 | REQ-007/009; AC-013; SCN-006/008 | New/Edit Project content pages; no application-wide modal removal |
| PFI-002 | REQ-011; AC-014; SCN-008 | Optional multiple workspace links/descriptions in same direct form at create/edit, Existing/New restored; actual folder semantics open |
| PFI-003 | REQ-012; AC-017 | 3000ms non-actionable success feedback, not auto-dismissal of errors |
| PFI-004 | REQ-012; AC-015; SCN-009 | New/Edit/Detail Task pages; Create→same Project full board clears old search; Cancel/edit preserves approved context |
| PFI-005 | REQ-007/012; AC-016 | Board only, three continuous lanes/contiguous divided rows; no List/extra filters/widgets/card gaps/shadows |
| PFI-006 | REQ-009/012; AC-016 | Single description/read-only status/optional saved context/adjacent Edit then Delete; no Task ID/date/info section; inline Task confirmation. Active work and total Project-delete count policy not approved by legacy mock |
| PFI-007 | REQ-013/014; AC-018/019; SCN-009 | Voice→editable text and context files/inline image UI; real consent/storage/access/retention limits still need decisions |

Original REQ-001–010/AC-001–013/SCN-001–007 IDs preserved. SR-003 adds BEH-007/008, REQ-011–014, AC-014–019, SCN-008/009 and DEC-011–014. Manual UI portions of SCN-002/005/006 are approved; Manager portions remain draft. SCN-007 active edit/delete/ambiguous retry remains Unclear.

## Remaining material decisions and risks
These are **not** silently selected by the UI approval. Draft recommendations are discussion proposals, not target architecture or approved policy.
| Decision | Required clarification |
| --- | --- |
| DEC-001 | Off policy for new task tools vs existing visibility-only CRUD; installation must stay off |
| DEC-002/005 | Who owns business status, allowed transitions/reopen and accepted evidence for Done; spawn/idle/worker report alone cannot settle meaningful completion |
| DEC-003/008 | Durable dependencies vs manager prose/enforcement; safe independent parallel work with shared repositories, resources and conflicts |
| DEC-004 | Exact Task→execution/attempt linkage, rejected/uncertain/repeated dispatch and retry behavior; fresh delegation every time can duplicate work |
| DEC-006 | Waiting/blocked/failed/review/results meaning/display; accepted simple manual layout does not authorize new widgets/columns |
| DEC-007 | Manager entry/conversation, Project/workspace context, reuse/restart and execution navigation; no Manager tab/chat alternative was approved |
| DEC-009 | Active edit/delete/cancel/history/file retention; accurate all-Task Project deletion count, not inherited open-only warning |
| DEC-010 / REQ-010 | One standalone public Manager vs optional management Team; selected native and Agent Tools MCP delivery scope |
| DEC-011 | Real voice capability/consent/privacy/permissions/availability/errors; raw audio retention not approved |
| DEC-012 | Durable file types/size/count/security/access/retention and manager/worker availability; no object-URL persistence/file-only Task inference |
| DEC-013 | New folder means register existing path or actual creation; node/path/permission/availability/error behavior |
| DEC-014 | Observable agent-write freshness/rebinding/recovery expectation; no transport or synthetic-latency promise selected |

Existing node-local valid Projects/tasks/workspace links and unrelated execution history must not be reset just because the feature is experimental. Successfully saved new context needs explicit durability/retention contracts. Architecture must later investigate repository migration conventions; no migration/startup gate/schema/owner/transport design is selected here. Public package availability is not proof a Team is installed/eligible on the node. Software Engineering Team retains its own approval/review/testing/delivery gates.

## Verification performed and evidence uncertainty
Solution Designer read the final handoff/spec/ticket/feedback/validation/runbook/change log/DATA/bootstrap evidence and representative final screenshots (E-018–022). Read-only Git checks independently confirm canonical receipt/ticket branch, clean state, and no UI source change after approval. Product package authority is internally consistent; no correction request is indicated.

Product reports FV-001–013 manual desktop/narrow browser passes and 20 actual final screenshots, 24 tests/5 files, configured limited lint, scoped TS and full ticket Nuxt build; canonical tests/lint/scoped TS also pass. PI-001–004/006 pass; PI-005 **Recovered** cold-Vite dependency-optimization import errors, not silently Pass. No comprehensive copied-feature lint/TS/WCAG or production acceptance claimed. DATA-001 representative provenance is controlled handwritten synthetic fixtures, not proven production/API records; held source-store coupling concern remains.

All prototype saves are session-only; voice sample uses no microphone; context files are browser-local metadata/object URLs; New folder performs no real registration/creation. No API/MCP, agent-write refresh, durability, concurrent delegated execution, real file/mic security or actual phone validation. Synthetic delays and snapshot code are not implementation requirements. Product preview/smoke runtimes stopped; port 3286 is not an active review URL; canonical runbook documents restart. Solution Designer did not start/retest/stop them or inspect/change the installed feature flag.

Documentation checks: unique/ordered stable IDs, Markdown table structure, existence of all external supplements and all 20 exact normative screenshot paths, unchanged prior SR-001/002 entries/historical handoffs, and `git diff --check` pass. Initial check caught a split evidence table; corrected and rerun successfully. These are document integrity checks, not product tests.

## Next expected user decision and output
1. Ask the user three foundational decisions before detailed policy approval:
   - One standalone public Project Task Manager first (recommended), or the optional management Team now (DEC-010)?
   - Existing Agent chat with explicit Project/workspace context, or a dedicated Project entrypoint (DEC-007)? Neither was approved by Product; a new presentation needs user-directed Product treatment.
   - Persist inspectable dependencies and task-to-execution/attempt history (recommended for recovery), or keep coordination in the Manager conversation (DEC-003/004)? This is intended-behavior scope, not a selected schema/owner/transport.
   The original dependency-aware parallel-delegation goal and accepted manual UI remain; none of these proposals is yet approved.
2. Settle the remaining behavior contracts above; refine affected REQ/AC/scenarios. Any new Manager presentation must have user-directed Product treatment, not guessed additions to the accepted board.
3. Present the complete unambiguous refined requirements and exact already-approved Product supplement for **explicit complete requirements approval**. Only then start architecture, investigate technical gaps, author design-spec.md and classify the completed design for routing.

## Handoff rule evaluation
`get_handoff_rules` called on 2026-10-02 after this full result was persisted. **No rule matches this outcome**:
- Product Design Requested: no new user-directed Product request/result correction; the returned consistent manual UI supplement was integrated, not re-dispatched.
- Marketing: no positioning/launch/campaign work requested.
- Architecture review/direct implementation: no approved complete requirements or completed/classified design.
- Delivery receipt correction: this is a Product prototype result, not a production Delivery Completed receipt.

No `send_message_to` or delegation is required/performed for SR-003. Return to the user for the three foundational decisions; retain Draft/full-approval gate. This is a routine requirements conversation, not a specialist handoff.
