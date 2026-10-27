# Investigation — embedded-browser-history

## Investigation Meta
- Package `embedded-browser-history`; Task `autobyteus-workspace-1`; requested by `/project_task_manager`.
- Git workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history`; branch `task/embedded-browser-history`.
- Bootstrap: **success**. `git fetch origin` then `git worktree add -b task/embedded-browser-history <workspace> origin/personal`.
- Resolved base: `origin/personal`, `ec92b3c02aa3f949e9bfbf0deb7449ae653fee53`. Finalization target: `personal` / `origin/personal`, refresh at delivery. Shared checkout `/Users/normy/autobyteus-org/autobyteus-workspace` remained at `46e94fdea86ad9af7d8884e690721b373d754cea` with unrelated `?? task-plans/`; do not reset or overwrite it.
- Initial requirements and investigation templates created before deeper investigation; R1 approved before architecture completion. Current solution revision SR-002.
- Authorities read 2026-10-26: solution-designer SKILL; references/requirements-engineering.md, finding-the-cause.md, ticket-scope.md, architecture-design.md, design-principles.md, handoff.md; all four artifact templates. Project root AGENTS.md, DESIGN.md, TESTING.md, GLOSSARY.md and web AGENTS.md; browser_sessions.md, localization.md, relevant ARCHITECTURE.md context. No closer applicable DESIGN file found. No design-examples sections needed.
- Status: investigation complete for design; implementation/product validation remain downstream.

## Initial Request And Product Context
User asks for backward and forward navigation like a normal browser. Supplied screenshot inspected: full-view Browser chrome with new-tab, address, refresh, emulation and close; Galavion page content underneath. This is AutoByteus chrome, not website scope. Task reread at intake and requirements approval; no comments. Same-document coverage, active-tab targeting, independent histories, isolated fixture evidence, merge/base verification and cleanup are explicit direction. No Product Design handoff requested.

## Source Log / Existing Behavior / Architecture Evidence
Paths below are relative to worktree unless absolute. `Read` means inspected source/contract, not executed product evidence.
| ID | Method | Exact source | Observation and implication |
|---|---|---|---|
| E1 | Read | `autobyteus-web/components/workspace/tools/BrowserPanel.vue:48–119,223–297,355–357` | Toolbar lacks Back/Forward. Refresh uses active ID. Address follows active-session reference. Adding snapshot-only flags can otherwise overwrite an in-progress address edit because activeSession watcher runs on every changed object. Keep URL/tab identity-driven synchronization when adding flags. |
| E2 | Read | `autobyteus-web/stores/browserShellStore.ts:62–109,154–182,243–264`; `types/browserShell.ts` | Store projects snapshots, compares ID/title/URL/emulation only. History-only changes would be discarded without equality updates. No renderer history authority or persistence. |
| E3 | Read | `autobyteus-web/electron/browser/browser-shell-controller.ts:48–53,167–205,208–237,278–288,354–379` | Shell-scoped state/leases, cloned summaries, event-based publication. Existing navigate/reload set active after await; history command must not copy that selection-stealing pattern. Shell snapshot uses manager summary lookup. |
| E4 | Read | `electron/browser/register-browser-shell-ipc-handlers.ts:38–54`; `electron/preload.ts:55–77`; `types/electron.d.ts:51–62` (all web) | Existing sender ID→runtime→controller route and typed preload bridge. New history command belongs here, not server bridge/tools. |
| E5 | Read + Reproduced | Electron official NavigationHistory and webContents docs (URLs below), `autobyteus-web/package.json:164`, probe | Pinned Electron 42.11.16 supports native navigationHistory capability queries and traversal. Actual same-document events and flags confirmed below. |
| E6 | Read | `autobyteus-web/electron/browser/browser-tab-manager.ts:24–29,78–105,180–205,242–271,443–448,559–570` | Manager owns per-tab native view and session lookup; navigation mechanism is owned internally. Observers publish document and in-page changes; in-page currently writes child-frame URL without main-frame check. Do not propagate a child URL as the active page when adapting projection. Manager is already 570 lines; new history code must not grow it. |
| E7 | Read | `autobyteus-web/electron/browser/browser-tab-navigation.ts:108–132,135–257` | URL loads/reload use readiness waiter and native events; no history methods. History native commands return void, not load promises. Reusing load-only waiting would hang on same-document or no-op requests. |
| E8 | Read | `browser-view-factory.ts:14–24`; `browser-session-profile.ts:4–21` in same folder | Each view owns independent WebContents in Browser persistent partition, sandboxed with no Node integration. History capability is native; do not reset session/auth or make history persistence. |
| E9 | Read | `browser-tab-manager.spec.ts:340–499`; `browser-shell-controller.spec.ts:181–419`; `stores/__tests__/browserShellStore.spec.ts`; `components/workspace/tools/__tests__/BrowserPanel.spec.ts` | Existing mock regressions cover navigation readiness, shell leases, snapshot/store and controls. Must extend them; mocks alone do not establish native history behavior. |
| E10 | Read | `autobyteus-web/docs/localization.md:59–108`; `localization/messages/{en,zh-CN}/workspace.ts` | New labels use manual locale catalog owners in both languages and localization guard/audit, not inline strings. |
| E11 | Read | `autobyteus-web/electron/browser/browser-tab-navigation.ts:118`; `browser-tab-manager.ts:81–89` | Manual navigation can overwrite a redirect destination with requested URL after native event. Existing nearby behavior, not required to implement native history. FU-001. |

## Supported Product Paths
BEH-001 has **no current supported toolbar history trigger**; user Task approves addition (SCN-001/003). Existing supported link and address journeys create native history. BEH-002 tab switch/close are existing product controls with native view identity; SCN-002/004 require state projection rather than new history storage. BEH-003 controls must remain intact (SCN-005). Requirements doc owns full scenario validity and intended behavior.

## Native Dependency Probe Findings
- Source: `probes/native-history.cjs`; output: `evidence/native-history.json`. **Reproduced** on macOS arm64, Electron **42.11.16**, Chromium **148.0.7778.280** from cached official Electron archive. No AutoByteus app launched; no product E2E pass claimed.
- Isolated hidden BrowserWindow + two sandboxed WebContentsViews and in-memory `history-probe` partition; ephemeral HTTP server on loopback port 64301. Fixture link/button activation used `executeJavaScript(..., true)` (user-gesture semantics). Owned HOME/userData/sessionData only; no website/account interaction.
- Full-page A→B, Back→A, Forward→B works. Initial flags false/false; B true/false; Back false/true. Flags available during did-navigate.
- Hash link and hash Back emit did-navigate-in-page. New pushState after Back truncates forward branch. Same-URL pushState creates a distinct entry; Back changes only forward capability while URL remains the same. replaceState changes URL but not history length. Second view starts false/false, unaffected by first view's navigation.
- Events did-navigate-in-page and did-stop-loading reflect settled state; no need for a renderer URL stack, injected History API wrapper or polling.
- **Probe correction / limitation:** initial same-URL test polled native active index. That index changes immediately on command dispatch before did-navigate-in-page; issuing Forward before Back committed caused pending navigation to overtake the next command. Preserved trace `native-history-initial-index-race.json` is diagnostic only, **not settlement proof**, despite its coarse PASS line. Corrected probe waits for native navigation events; current native-history.json is authoritative for traversal proof. This is why command acceptance must not be documented as completed page load and validation must await actual event/content.
- Scope: normal user-triggered hash/History API history, not exhaustive Chromium navigation policy. Browser script/user-gesture skipping, form resubmission and unload policies remain native. Product-specific failures/disabled states/IPC are not tested yet; downstream evidence required.
- No production diagnostic edits. Probe source retained as evidence supplement, not shipped application code. Both runtime extractions and all owned instances removed; `evidence/probe-cleanup.txt`.

### Reproduction command
Use the pinned Electron executable after extracting its cached archive into an owned temp directory (or worktree dependency install). From repo root:
```
env -i PATH="$PATH" HOME="$OWNED_TEMP" PROBE_ROOT="$OWNED_TEMP" "$ELECTRON" "$PWD/tickets/in-progress/embedded-browser-history/probes/native-history.cjs"
```
Result `$OWNED_TEMP/result.json`. Remove only that owned temporary root after retaining results. This probe confirms dependency premises; initial missing buttons are source/screenshot evidence, not a failing product test.

## External Contracts
- [Electron NavigationHistory](https://www.electronjs.org/docs/latest/api/navigation-history): native history capability and traversal methods.
- [Electron webContents events](https://www.electronjs.org/docs/latest/api/web-contents): document and in-page event boundaries, including frame identity. Latest docs accessed 2026-10-26; runtime probe pins actual project version instead of assuming latest docs are exact historical behavior.

## Structural And Payload Surface Inventory
Payload: two locale entries per language, fixture HTML and ticket docs/evidence. Structural: BrowserPanel/store; typed shell snapshot/IPC/preload; controller, manager and navigation owner; extracted native session observer. No server bridge/tool contract changes, no persistence schema or deploy changes. New shell mutation and projection fields warrant independent architecture review. Existing manager can shrink by extracting observers while adding small boundary methods.

## Persisted Data And State Facts
Browser session partition remains `persist:autobyteus-browser`; browser content/auth untouched. History belongs to each live WebContents; manager stores tab records in memory only. No new durable history/reset/migration. Stored-data transition: Not Affected. Actual user data inspection unnecessary and not performed.

## Supplemental Artifact Inventory
All relative paths resolve under this ticket; owner Solution Designer unless noted.
| Artifact | Purpose / scope / IDs | Status / approval |
|---|---|---|
| Original Task screenshot: `/Users/normy/.autobyteus/server-data/projects/project_3165230d-b602-4efc-ac42-fb61a03f1ed5/tasks/project_task_c71ca86c-4134-4536-8767-a311fc2a2bf0/context/ctx_faf8177517d0__ctx_603de82ef2ee_ctx_10fee9a6d7c7_image.png` | User problem context; REQ-001 | User supplied; not normative UI design |
| `probes/native-history.cjs` | Dependency evidence source; REQ-001–003 | Reproduced; no separate behavior approval |
| `evidence/native-history.json` | Corrected runtime trace; AC-001–003 feasibility | Authoritative dependency evidence only |
| `evidence/native-history-initial-index-race.json` | Initial probe race/diagnosis | Superseded for traversal assertions; retained evidence |
| `evidence/native-history.stdout.log`, `evidence/probe-cleanup.txt` | Runtime and cleanup record | Complete |
| `follow-ups.md` | Adjacent findings | Non-authoritative scope; send on team exit |
| `solution-handoff.md` | Full context/routing | Current SR-002 handoff |

## Risks And Architecture Input
Native command returns before navigation commits; preserve event-driven eventual projection and do not promise load completion. Avoid history-only snapshot loss in store or address-edit disruption. Preserve active selection on completion. Independent IPC sender/active-tab checks required. Product native regression and rendered narrow/full-view proof remain implementation/API-E2E/delivery responsibilities. No unresolved requirements decision or external prerequisite.
