# Release Notes — Stopped AgentOrg Team Workspace Editing

## What's New

- An eligible stopped AgentOrg can now change the Workspace Directory of a mounted Team from the existing configuration screen.
- One Save applies the selected directory to the Team and every configured Agent inside it while preserving model/runtime overrides.

## Improvements

- Existing conversations, provider identities, Org/Team/Agent identities, composer state, history, attachments, sibling scopes, and historical task snapshots are retained.
- The next normal message and fresh delegated work use the saved configured workspace without moving project files or requiring a persisted-data migration.
- Model choices are validated in the destination workspace context, and model plus workspace edits are committed as one canonical configuration result.
- Files now fails closed while canonical workspace metadata is unavailable and recovers on the first metadata retry without showing or writing through a stale workspace.

## Fixes

- Fixed metadata-only File Explorer activation repeatedly entering Loading or failing to settle after same-workspace metadata registration.
- Fixed scoped AgentOrg Files views falling back to an unrelated active workspace or retained launch draft while the saved workspace was unavailable.
