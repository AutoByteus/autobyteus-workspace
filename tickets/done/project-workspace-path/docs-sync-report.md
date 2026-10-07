# Docs Sync Report — Project workspace paths

## Scope / Authority
- Date: 2026-10-07; delivery baseline **DR-001**. Trigger: CRR-002 Pass after API-REV-001 Pass/95.00%.
- Classification retained: **task_size Medium; architectural_risk High; Reviewed route** (independent architecture, source and successful test-code reviews).
- Approved requirements SR-002/AP-001; design SR-003; ARCH-REV-001; IR-001; CRR-001/002; API-REV-001 unchanged.
- Bootstrap base: origin/personal `5316a0cad19498819a8a50c594b72c0197d8b6a1`.
- Refreshed base: origin/personal `af50bdd4056b9341e53494ad393b6283136a00ed`; integrated by conflict-free ort merge at `8448cd18af3fb08b13cb8d47291c9ba89794b9d3` before delivery-owned edits.
- Checked integrated state: rebuilt server + 9 HTTP/two-node tests pass, browser 16/16 pass. Exact commands/results: `delivery-evidence/dr-001/commands.md`; build/source receipt and browser result remain separate from API-owned history.

## Why Docs Were Updated
The implementation already updated the path-only tool, storage and frontend descriptions. Delivery found contradictory long-lived migration prose still claiming the released migration used the current Project reader, a stale no-shape-change sentence, and a missing Project mutation in the MCP catalog inventory. These are documentation-local corrections against inspected source, not changed intent or new runtime design.

## Long-Lived Docs Reviewed
| Path (worktree-relative) | Result | Reason / disposition |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Updated | Service validation is registration-free; Project targets use the frozen historical reader, while layout/Task reader still have a freeze-before-change obligation. Records coordinated cutover and downgrade limitation. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Updated | Include create_or_update_project in the actual four-tool catalog; existing workspace_path semantics retained. |
| `TESTING.md` | Updated | Correct which migration dependencies are already frozen; preserve commands and require migration/startup checks when changing the relevant boundaries. |
| `autobyteus-web/docs/projects.md` | No change | Upstream path/picker/manual/edit/unlink/tolerant-read/ordinary-save/no-registration descriptions match integrated source and browser proof. |
| `DESIGN.md` and `autobyteus-server-ts/docs/design/data_migration_guideline.md` §§2–4 | No change | Current no-migration subtractive projection and frozen released classifier follow existing policy; no new policy needed. |
| Root/server/web AGENTS.md and README testing pointers | No change | Existing source-current isolated validation and release process remain applicable; no command changed. |

## Durable Knowledge Promoted / Removed Concepts
| Topic | Source authority | Canonical destination |
| --- | --- | --- |
| workspace_path tool input; workspaceRootPath/description-only storage/API/feed; direct path authoring | SR-002/AP-001, SR-003, IR-001 + source/API evidence | Server Projects/tool docs and web Projects docs (upstream updates retained) |
| Historical classifier is not the current tolerant reader; preserve old four-field output/classification/retry | Existing migration source, SR-003/MP-001, API startup receipt | Server Projects migration section; TESTING maintenance note |
| Matched backend/web contracts; no old-ID aliases or automatic downgrade after reduced saves | SR-003, CRR-001, source contract | Server Projects workspace boundary |
| Old registration admission, ID/time association identity and timestamp sorting removed | IR-001 and current service/store/web source | Server/web Projects docs; saved array order and registry-only availability retained |
| Global workspace IDs, Task data and existing migration lifecycle remain | Scope guardrail + preserved source | Same docs; no global-ID redesign, migration reset or cleanup sweep |

## Result / Continuation
**Pass — Updated.** Source/test/docs diff checks pass; no unresolved documentation-local issue. Docs were synchronized only on the merged and executably checked state. No production/test code was changed by Delivery. DR-002 continuation: user explicitly accepted finalization, remote recheck found no new base commits; ordered finalization proceeds without changing source or docs conclusions. No-impact conclusion does not apply to the overall ticket.
