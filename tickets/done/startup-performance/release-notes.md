# AutoByteus v1.4.89 — Faster startup and new conversations

- Remove repeated full-history attachment scans from startup and unrelated run creation while retaining structural package validation.
- Validate exact attachment ownership and physical containment when a file is accessed; an unavailable historical attachment fails locally instead of hiding an otherwise valid conversation.
- Simplify the existing attachment-reference migration under the same ID: one transform per source and atomic replacement only when changed, without new hashing, backup copies or a custom journal.
- Keep completed migrations skipped and existing originals/manifests untouched. Eligible partial retries preserve already-current records and newer content.

Representative packaged terminal startup improved from30.9s to8.6s in a controlled ordered trial. Actual user testing confirmed faster startup. Results vary with installation size and host load; first upgrades can still take longer than subsequent launches.

No migration reset or replay is needed. Self-hosted pending upgrades should use the usual stopped-writer, consistent-backup procedure and matching server/client versions. Do not restore old record backups over newer history.
