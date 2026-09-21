# LIVE-001 observed boundaries — direct configured Agent summary

- Persistent browser tab: `open_tab` tab `1`, production-generated renderer at `http://127.0.0.1:3590/workspace/`.
- Normal user launch: Agent Orgs -> AORG E2E Direct Agents Org -> Run -> Codex App Server / OpenAI GPT-5.6-Sol / Run Agent Org.
- Root: `aorg_e2e_direct_agents_org_81a6edffd0c94545b9406c2ef21a4f60`; exact Agent `/lead` -> `aorg_e2e_lead_3563a536a9e448cdbed4ec6e0f85eecb`.
- Before message, the already-rendered root row was exactly `New - AORG E2E Direct Agents Org` (`LIVE-001-tree-after-launch.json`).
- First accepted external prompt contained deliberate repeated and leading/trailing whitespace and 222 compacted characters. Its exact required projection was 100 characters: `Return exactly APIREV11-DIRECT-REPLY-001 on the first line and five words on the second line. Thi...`.
- The browser wait for that exact title in the existing row succeeded before the provider-completion wait. The durable index mtime is `2026-09-06T00:01:45.913476435Z`; the first raw user trace is `00:01:45.929Z` and provider assistant completion is `00:01:51.795Z`. This is consistent with ACK-path authoritative refresh, not provider-derived completion.
- The same open page retained exactly one PerformanceNavigationTiming entry rooted at `/workspace/`; the route URL did not change. No browser reload occurred.
- Second and third accepted messages produced real Codex replies but left the exact first title unchanged.
- `listCollaborationRootHistory` returned the same active root and exact durable summary. The index file contains the same exact value.
- Harness note: the initial automation assumed a generated data-test on the root row; the real unified tree root uses a semantic `role=treeitem`. That selector error happened before any message and was corrected. A later snapshot helper searched the post-update row for the definition name even though the approved row switches to summary-only text; its assertions ran only after both real messages and did not invalidate the captured browser/index/trace evidence.

Result: Pass.
