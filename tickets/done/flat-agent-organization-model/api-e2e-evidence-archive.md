# API/E2E raw evidence archive

The generated runtime evidence previously stored under
`api-e2e-evidence/` was removed from the active Git tree before the v1.4.71
release because 1,104 paths exceeded the repository's 200-character
cross-platform checkout limit. Canonical reports, ledgers, revision records, and
review artifacts remain in this ticket. Historical raw bytes remain available
from commit `d68fc0f7ba354dcad9d486dc39458feab7f77088` and the unpublished
`v1.4.70` tag.

Delivery also retained an out-of-repository archive:

- Path: `/Users/normy/.codex/delivery-archives/AORG-FLAT-TEAM-001-v1.4.70-20260921T095333Z/flat-agent-org-api-e2e-evidence.tar.gz`
- Files: 3,556
- Uncompressed file bytes: 66,045,353
- SHA-256: `194f5b061cccc3138b5b82b64ce647a845af7aaf04bd942e14e7434d3b24e98f`
- Per-file SHA-256 manifest:
  `/Users/normy/.codex/delivery-archives/AORG-FLAT-TEAM-001-v1.4.70-20260921T095333Z/flat-agent-org-api-e2e-evidence-files.sha256`

This is repository-artifact hygiene only; no product source, durable test, or
canonical result was changed.
