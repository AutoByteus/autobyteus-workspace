# D-19 desktop test data (API-REV-006)

Created by API/E2E for the isolated desktop validation of one skill per name (REQ-022–024).

| Folder | Use | Expected |
| --- | --- | --- |
| `chat-entry-desk-package/` | Import first (Settings → Agent Packages) | Imports; `desk-alpha`, `desk-beta` bundled in `desk-helper` |
| `chat-entry-dup-package/` | Import after the desk package | Rejected: "Duplicate skill names" lists `desk-alpha` existing (desk-helper) and new (dup-helper) paths; not registered |
| `chat-entry-dup-skill-folder/` | Skills → Manage Skill Sources → Add Folder | Rejected: `desk-beta` duplicate; folder not added (`folder-unique` not installed) |
| `chat-entry-reload-package/` | Import (clean), then copy a `desk-alpha` skill into `agents/reload-helper/skills/` of the *imported copy's source path*, then Reload | Rejected reload; package stays registered; Skills banner lists the pulled copy as ignored |

The reload scenario modifies a working copy under the isolated instance's temp root, never this folder.
| `chat-entry-org-package/` | Import (Agent Packages) | Org `desk-org`: `desk-writer` (skill `desk-writer-skill`), team `desk-crew` (shared `desk-crew-shared`, team-local `crew-member` with `desk-member-skill`); all three on the Skills page and in `/` (DEC-017a) |
| `chat-entry-org-dup-package/` | Import after the org package | Rejected: `desk-writer-skill` duplicate (org agent path vs incoming org path) |
