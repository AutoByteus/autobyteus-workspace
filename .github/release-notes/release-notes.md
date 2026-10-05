# AutoByteus 1.4.94

## Improvements
- Skills → Sources accepts public GitHub repository URLs alongside local folders. Their skills join the catalog, updates are explicit and confirmed, and removal deletes only the managed copy. Note that confirmed updates or removal discard local edits in the managed copy; use a local source for skills you edit.
- Activity → Background Tasks shows the shell command a Claude background task is running. Long commands are truncated to one line; click to expand.
- Switching members with the Org (Messages) tab open in long-running Agent Orgs now takes well under 0.1 s instead of several seconds. Reference files in Messages are shown compactly, with a file count per message and a "Show all" list.
- Org and Team run configuration no longer waits for unrelated runtime discovery, and a failed inherited model catalog can be retried directly.
- A standalone agent run's token usage now includes its collaborators. Agent-to-agent messages name the sender's full address, and the Event Monitor's earlier-events page shows who sent each message.
- Project descriptions can be dictated by voice and reviewed before Save. Task dictation no longer shows a success banner.
- Projects now appears right after Agent Orgs in the navigation.

## Fixes
- Context compaction is now shown and recorded reliably across runtimes:
  - Claude Agent SDK: each compaction (`/compact` or automatic) is one activity that ends Completed or Failed.
  - Codex: a compaction cut off by Stop, a failed turn or a Codex exit now ends as Failed instead of staying "started".
  - Antigravity (CLI 1.2.16 or later): automatic compactions are now detected.
  - In all three, history is archived once per successful compaction, and reopened runs start after the latest one.
- Antigravity tool calls show their actual inputs, including file content and options, in live Activity and reopened history.
- A collaborator in a standalone run can no longer delegate a task to itself.
- More reliable iOS release builds: the release UI tests no longer fail intermittently on slow build machines. App behavior is unchanged.
