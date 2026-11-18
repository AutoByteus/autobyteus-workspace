# API-13 — Before/after result sizes for delivery (autobyteus-260, REQ-010, AC-008, QR-001)

- Case: API-13 (collation of measured numbers; no new measurement on user data). Date 2026-10-25. Source commit `17d631c704`.
- Sources (all in this `evidence/` folder):
  - **Before on the user's data** (read-only, numbers only): `SD-measure-sizes-output-20261025.txt`, `SD-measure-summary-output-20261025.txt` (Solution Designer, approved basis).
  - **Before/after on synthesized data with the user's shapes** (the real tool output of this build): `IMP-09-after-sizes-output.txt` (shapes: `IMP-09-shape-parameters-output.json`), reused as case API-13 because no server source changed since `17d631c704`.
  - **After shapes observed at the real transport** in this round's E2E: `API-06-get-project-task-worker-scope-receipt.json` (MCP `content[0].text` equals the compact JSON of `structuredContent`, no empty field).

## Table for the user

| Result | Before | After | Change | Basis |
| --- | --- | --- | --- | --- |
| `list_project_tasks`, AutoByteus Project, 153 open Tasks (user data) | 481,648 B | ≈31,126 B (short entries) | ≈ −94% | before: measured read-only; after: estimate from the same data (`SD-measure-summary`) |
| `list_project_tasks`, AutoByteus Project, all 300 Tasks (user data) | 1,287,231 B | ≈59,528 B | ≈ −95% | same |
| `list_project_tasks`, 155 synthesized open Tasks with the user's shapes | 386,253 B | 33,002 B | −91.5% | this build's real tool output (`IMP-09`) |
| QR-001: default list after / before (synthesized) | — | 8.5% | ≤ 10% required: met | `IMP-09` |
| One Task in full (base list entry vs `get_project_task`, 202-byte title) | 3,714 B | 3,861 B | +4.0% | `IMP-09` (the title adds bytes) |
| `update_task` acknowledgement (202-byte title) | 140 B | 324 B | +131% | `IMP-09` (the title is now part of the ack, REQ-009) |
| `send_message_to` refusal | 144 B | 117 B | −18.8% | `IMP-09` |
| Browser `dom_snapshot`, 200 elements (before pretty-printed) | 60,542 B | 36,334 B | −40.0% | `IMP-09` / `SD-measure-sizes` |

Notes:
- The 153 vs 155 open-Task counts differ because the user's board changed between the two read-only measurements; neither copied any Task content.
- The acknowledgement grows by the title on purpose (REQ-009); search and list savings dominate (implementation handoff, Known Risks).
