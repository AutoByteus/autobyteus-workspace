# Release Notes — Codex Interrupted Compaction Fix

Planned for the next beta (expected **v1.4.94-beta.5**) after the user's finalization and beta-release authorization. This is the archived functional summary; the documented beta workflow publishes generated GitHub notes. The beta also contains the earlier unreleased compaction fixes merged to `personal` (Claude Agent SDK and Antigravity).

- **Codex:** a context compaction that is cut off (Stop, failed turn, Codex error or app-server exit) now ends as **Failed** with the reason, on the same row, instead of staying "started" forever. It never archives conversation history. The next compaction completes normally, and reopened runs show no stuck compaction rows.
- **Claude Agent SDK:** each compaction (`/compact` or automatic) shows as one activity that ends Completed or Failed. History is archived once per successful compaction, and reopened runs start after the latest compaction.
- **Antigravity (AGY CLI ≥ 1.2.16):** automatic compactions are now detected and shown as one Completed row, with history archived at each compaction. Older AGY versions are unchanged.

Known limitations: reopened history shows a failed compaction without its reason, and compaction duration is not displayed.
