# Real App Reproduction — team-reload-stale-member-instructions

## Classification
Investigation evidence only, SR-002. Bug reproduced in an unchanged worktree-built packaged desktop app with real backend/disk source. No fix applied; intended-behavior approval remains pending.

## Environment / Isolation
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions
- Source revision: d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b
- App build: packaged enterprise macOS arm64 1.4.92, built from unchanged worktree source.
- Start command: `pnpm --silent isolated-app start --build`
- Instance: iso-53752-8cc8; control 53752; backend 53753.
- Data root: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-isolated-root-ifztDx (auto-created, subsequently removed by successful stop).
- UI control: mcp__cua_repl bound by exact worktree .app path. Every observed page URL pointed into that worktree app; workspace pointed into that isolated data root.
- Linked disposable package: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/evidence/reproduction-package
- Original public package and user's live app/data: untouched.

## Experiment Steps / Results
1. Copy public English Bridge Team package into the test-owned fixture. Give Worker version-one instruction/description markers and 6 tools; give Team an appended version-one marker.
2. Through real UI: Settings → Agent Packages → enter fixture absolute path → Import Package. UI confirms local path, 2 team-local Agents, 1 Team.
3. Through real UI: Agent Teams → initial Reload → View Details → worker View. Actual Worker AX contains v1 instruction/description and 6 tools. Initial assertion passes.
4. Complete source edit in test fixture, modelling Package Creator's completed write: Worker body becomes `Work on the request you receive.`, description becomes `Works on received requests.`, tool config becomes read_file/write_file; Team appended marker becomes version two. No model request necessary to isolate the reload issue.
5. Query real isolated backend before UI Reload. Agent response already returns updated Worker body, description and 2 tools; assertions pass. This direct HTTP observation does not publish frontend state. Team response is still cached v1 before Reload, as expected.
6. Through real UI: Agent Teams → Reload → View Details → expand Team instruction. Screenshot shows Team v2 marker. AX representation truncates the long instruction, so the direct AX marker assertion failed; full screenshot proves it visually, and subsequent API snapshot also confirms current Team v2.
7. Through real UI: worker View. Same exact Worker route/ID still displays v1 instruction, v1 description, 6 tools. Tool-call assertion of stale content passes. **Bug reproduced.**
8. Diagnostic control through existing UI: Agents → Reload → Agent Teams → same Team → worker View. Same Worker now displays latest instruction, latest description and 2 tools. Assertion passes. No code patch and no app restart involved.
9. Real backend final snapshot asserts current Team v2 plus current Worker v2 with 2 tools. Save test-owned instance log.
10. `pnpm --silent isolated-app stop iso-53752-8cc8`: confirmed graceful stop, auto data-root removal and release of both ports. `isolated-app list`: own instance absent; other stale records untouched.

## Conclusion
A real product journey reproduces the code-level cache finding. The backend reads the updated team-local Agent; Agent Teams Reload updates Team content but not the renderer's already-populated Agent catalog. Existing Agents Reload publishes current Worker state. A temporary workaround is Agents → Reload, then reopen the Worker from its Team.

## Limits
This is manual browser/computer-tool-driven investigation with real native UI and HTTP, not a newly authored automated E2E suite or post-fix validation. No Package Creator model turn was launched; completed package edits are faithfully represented by test-owned source writes. User's exact installed binary/registration was not independently inspected. Shared-member/error/repeated-edit regressions remain for subsequent approved fix verification. Screenshots were observed through tool outputs in the conversation, not saved as durable local PNGs; durable evidence includes transcribed AX excerpts and real JSON payloads.

## Durable Evidence
Ticket root: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions
- evidence/install.log; isolated-build.log; isolated-start.json.
- evidence/ui-observation-excerpts.md — transcribed real AX observations and assertion outcomes.
- evidence/api-before-edit.json; api-after-edit-before-reload.json; api-after-reload-and-control.json — real HTTP snapshots.
- evidence/reproduction-package/ — linked source fixture at v2 (2 tools is a deliberate fixture delta, not modification of public package).
- evidence/isolated-app.log; isolated-stop.json; isolated-list-after-stop.json.
- Earlier source/probe/screenshot evidence remains indexed in investigation-notes.md.
