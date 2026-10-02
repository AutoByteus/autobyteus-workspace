# Rendered implementation self-check — IR-001

Not independent API/E2E, full desktop, or production AC sign-off. No Product artifact was changed.

## Surface and containment
- Root TESTING.md / README normal full-stack development surface, `node scripts/development/run-dev.mjs`, bound to 127.0.0.1:8000/3000 in the isolated assigned worktree. Both ports were checked free first.
- Launcher-created `.autobyteus/development/server-data` was the only preview data. The shell already supplied `ENABLE_PROJECTS=true`; this enabled the development-only visibility. No installed application setting, source default, feature middleware or automatic tool selection was changed. Source/unit default-off evidence is distinct from this explicitly enabled preview.
- Actual browser-equivalent rendering/interactions: task-owned BrowserBridge tab for initial inspection; dedicated Playwright-core/Chrome headless context for desktop 1512×862/806, narrow 390×844 and 1070×806 viewport with a 683px board container. This was iterative renderer self-inspection against the normal development stack, not a new E2E suite. The existing outdated Projects E2E probe was not run.
- Tools generated real text/PNG upload bytes, not object-URL-only Task persistence. The 1px PNG is a test-owned byte fixture, not simulated transcription or a production seed.

## Interactions and observed results
- Projects empty index → ordinary New Project; required-name error focused the real input; zero-workspace Save → Tasks board; create notice visible. New/Edit pages were not overlays.
- New Task heading focus, required-description validation and focus, editable multiline content; two real uploads became server metadata and saved Task-owned copies. Real renderer reload retained both file names; image thumbnail/inline preview opened and closed.
- Context Remove in Edit then Cancel preserved both saved references. A later explicit Save removed only the selected saved file, retained the image and current Done status, and showed a saved notice. Ctrl+Enter submitted the same pending-aware Save path.
- Task detail displayed description once, read-only status and adjacent Edit/Delete, without IDs/timestamps/extra information disclosure. Inline delete focused Cancel; Escape restored Delete focus. Confirmed Task deletion returned to the same board and left one remaining Task.
- Search/no-match/Clear, New Task/Cancel and detail navigation retained per-Project search. No human status or drag controls were introduced.
- New-folder workspace row registered normalized workspace metadata; the specified `/tmp/project-task-foundations-no-folder-*` path did not exist after Save. Existing/New draft mode toggling retained the saved existing workspace choice; Cancel did not save the unsaved path. Workspace descriptions and origin tab worked through real Project Save.
- External tool-manifest writes (explicitly initialized to the preview data root, not an Agent/MCP session) created TODO and patched IN_PROGRESS/DONE. With the board open, a subsequent write left the rendered cached lane unchanged until Refresh. Clicking Refresh retrieved the changed status and preserved search/route. This closes renderer implementation feedback; selected native/MCP HTTP execution remains downstream validation, not a claim from this bypassed-session fixture producer.
- Refresh pending disabled the duplicate control and retained rows. One browser-local GraphQL transport interception deliberately held then aborted only the Task-list request: error feedback retained the previous two rows; removing the interception and retrying recovered. This is injected renderer error/pending evidence, not a real backend-outage or API acceptance result.
- Fresh Project delete confirmation reported 2 total Tasks with one Done, then 1 total Task when all remaining Tasks were Done (not the open count). Cancel focused safely; original workspace folders/history were not targeted.
- All recorded document widths equal their viewports (no horizontal document overflow). At 1070px viewport / 683px actual board width there was one column; at 1512px /1125px board width there were three. Continuous containers/rows, borders/dividers, typography, spacing, composition and narrow action wrapping were inspected directly.

## Corrections during feedback
- The added Refresh control initially squeezed the narrow search field to an unusable width. Toolbar now wraps the full search row at board-container widths below 480px, retaining Refresh beside New task. Final narrow evidence is 18/19; 12 is intentionally retained as pre-correction history.
- Project deletion count refresh could drop safe initial Cancel focus during DOM replacement. The count-settlement owner restores it only when focus fell to body, without stealing meaningful user focus.
- Context file count wording is singular/plural, not “file(s)”. Route identities for Task pages use the compound Project/Task key, and typed draft text does not become an obsolete completion's navigation target.
- Initial preview was stopped/restarted after concurrent Nuxt checks rewrote generated `.nuxt` state; that development-tooling collision is not asserted as a product defect. Final preview had zero renderer page errors.

## Evidence and limitations
- `implementation-evidence/render-observations.json`: 27 state snapshots, paths, viewport/width/focus/text, zero final renderer errors.
- `implementation-evidence/01..27*.png`: supporting screenshots; direct interaction/DOM observations above are the checks, not screenshot-only acceptance. External normative spec/VIS remain the authority.
- `implementation-evidence/preview-project-record.json`: synthetic final preview aggregate, not installed/user data. `implementation-preview-external-write.log` records the explicit preview-root manifest writes.
- Optional local voice extension is unavailable in the web-equivalent preview. The optional control was honestly absent and typed authoring remained usable. Real microphone, configured audio devices, permission/extension/IPC/package behavior and VIS-014 real recording fidelity have NOT been validated. Unit tests use controlled capture/IPC doubles; they are not real voice sign-off.
- No shipped-phone, full desktop-shell, independent native/MCP HTTP/auth, performance-capacity or full product acceptance is claimed.
- Cleanup: owned Chrome context/browser and BrowserBridge tab closed; launcher stopped; 8000/3000 no longer listening. Only newly generated worktree development data and our untracked SDK build outputs were removed. No unrelated process/data/remote branch was touched.
