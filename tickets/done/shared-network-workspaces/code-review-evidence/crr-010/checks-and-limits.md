# CRR-010 — personal checks and limits

Entry: focused failure-origin review of API004/API-F004, not another full source
review or successful test-code review. Root DESIGN.md/TESTING.md, server AGENTS,
code-reviewer workflow/template and Example9 were read; no closer NFS/scripts
AGENTS was found. The worktree's testing guideline governs (the current main
checkout has later additions and is not the reviewed branch's authority).

Personal command from worktree root:
`python3 tickets/in-progress/shared-network-workspaces/code-review-evidence/crr-010/audit-failure-package.py`

- Pass audit:992 unique incoming refs exist; production/durable-test paths match
  source d318bd9...; API commits only changed ticket evidence. All15 retained
  IR005/007 candidate files independently match incoming sizes/SHA256.
- Parsed all243 unique-fixture observations: old bytes persist at5.053/5.051s
  and until60.644/60.467s; first new observations61.149/60.975s. Both channels,
  source-after hashes, changed nanosecond mtime, same inode and matching UUID
  checked. This is an audit of API's real execution, **not a new live repro**.
- Read actual argv/executable source: ordinary write/flush/fsync/context close,
  fresh Path.read_bytes and urlopen/context close each loop. Timer starts after
  writer close. Timestamps follow both serial reads, sampled about0.5s; not
  separate exact timestamps per read, nor packet-level attribution.
- Native live config/CLI hash/package requery inspected; inherited Docker helper
  envelope is not native provenance. API identity correction is retained. No
  fresh package-absence proof credited to the misquoted guard.
- Rechecked prior API-F003 closure's exact two distinct boot IDs, current node
  ID/image/Config/HostConfig (only known null/[] DNS normalization), unordered
  exact Mounts, ports/aliases, actual API/source/private assertions and raw
  execution commands. No manual Start/reconnect in first two-boot commands.
  Normal Stop/veto/upgrade/detach receipts and scripts are separate controls.
- Read-only exact retained engine source inspection, six files with member
  hashes/line spans and Debian expiry-patch scan. Independently browsed official
  versioned upstream sources (primary-contracts.md). No dependency rebuild.
- Reviewer exploratory output was initially too broad and truncated; later
  field-selective audit retained all authoritative raw files. A read-only archive
  lookup of nonexistent `src/FSAL/FSAL_VFS/main.c` raised KeyError; a guessed
  singular REST filename returned no-such-file. Both were corrected by member/
  path listing; neither executed a test, changed files, or supports a conclusion.
  Final audit uses verified archive members and actual `workspaces.ts`.

No new live VM, root operation, daemon, mount, app instance, provider call,
physical device, network workaround or paid resource. No Go/Python product suite
rerun required for this evidence/source-only entry. API004's suites/builds and
cleanup remain inherited evidence; source review is not runtime qualification.
No source/durable-test fixes. No public release/merge/push/tag/TaskDone/delegation.
No scratch/toolchain/process created by this review; cleanup N/A for reviewer
runtime resources. Retained candidate archives only read. Five preexisting dist
trees retained/unstaged and outside hash audit; no byteidentity claim.

Current API004 Fail57.14%/broaderRequired remains. Exact repair and runtime cache
causality remain investigation/validation work; the supported failure and
inadequate end-to-end freshness policy are sufficiently evidenced to route
Design Impact without inventing a configuration patch.
