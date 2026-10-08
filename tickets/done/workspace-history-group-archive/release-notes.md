# Release Notes — Archive All From Workspace History Group Headers

Status: prepared before user verification and archived as proposed content only. The user explicitly finalized **without a new version** ("now finalize, no need to release a new version"). Release, publication and deployment are Not required, and this file was not used to publish anything.

## Added
- Every agent, agent team and Agent Org group in the Workspaces sidebar now has an **Archive all runs** button on its header. It archives all saved runs of that group in that workspace, including older agent runs not shown in the list.
- A confirmation is shown first. One short message reports the result, for example "Archived 5 runs.".
- If any run in the group is still running, nothing is archived and you see "Stop running runs first.".

## Notes
- Archive only hides runs from history; run data stays on disk. Per-run Archive and permanent Delete are unchanged.
- English and Simplified Chinese strings are included.
- No data migration or reset.
- If this is published later, use the repository's documented release helper with a new version and tag.
