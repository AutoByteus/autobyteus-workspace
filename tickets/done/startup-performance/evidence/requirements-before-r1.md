# Startup and migration performance — requirements Draft
Package startup-performance-20260927. New ticket requested by user through DR-009,
then directly expanded to investigate why the earlier attachment migration copies,
hashes and compares data and takes so long. Investigation authorized; performance
change, target architecture and implementation NOT yet approved.

## Scope
Explain separately (1) first/retry migration cost, including backup/hash/journal
rationale and repeated work; (2) terminal-migration repeat-startup cost; (3) shared
current-admission cost on new work if evidenced. Use preserved logs and released
source, then safe profiling as needed. Preserve exact execution ownership,
dependency isolation, original data and usable unrelated work. No production
restart, writes, ledger edits, data cleanup, safeguard bypass, or release work.
Docker monitoring remains user-owned, not part of this ticket.

## Scenarios and behavior
SC-001 / BEH-001 Supported Normal: upgrade with historical attachments; determine
why initial/retry transition delays app readiness and what work is necessary.
SC-002 / BEH-002 Supported Normal: reopen migrated application; explain repeated
startup delay independently of one-time conversion.
SC-003 / BEH-003 Supported Normal: create new run; investigate evidence of shared
admission processing without changing the current safety contract.

REQ-001 / AC-001: evidence-backed first/retry and repeat timelines, source mapping,
counts and known/unknown attribution; do not equate CPU samples with precise shares.
REQ-002 / AC-002: explain each backup/hash/compare purpose, classify observed repeat
work versus hypothesized avoidable cost; propose simplification only after proof.
REQ-003 / AC-003: retain prior safety/availability behavior, and obtain explicit
user approval of measurable performance goals and behavior before technical design.

Performance target: not yet agreed. Design/review/implementation: N/A — not yet
approved or ready. Product supplements N/A — not requested.


## User-directed scope clarification — SR-002
The user explicitly requests learning from historical implementations/tickets,
updating the SAME canonical Data Migration Guideline with good practices and
anti-patterns, then redesigning/correcting the existing attachment migration
object/ID, not creating another migration. They reaffirm that historical data
issues must never deny desktop startup or new work, even if no old runs can be
shown, and require the severe customer/business consequences documented.
These documentation and preserved-availability intentions are expressly approved.
REQ-004 / AC-004: guideline contains prominent critical lockout anti-pattern,
missing-Team-tree example, expected skip/preserve/exclude behavior, all-history-
unavailable new-work acceptance, and customer abandonment/financial-loss risk.
REQ-005 / AC-005: correction retains migration ID and original data/existing
backups; terminal successful records are not forcibly replayed. No new migration,
SQL history rewrite or destructive cleanup is authorized.
Historical study and guideline revision complete; per-phase profiling unfinished.
Specific backup/journal reduction was proposed in an asynchronous question; no
answer selecting that change is yet recorded. It is not silently treated as
approval to remove an existing preservation obligation. Runtime redesign and
implementation remain pending completed requirements approval; current-source
startup validation is not weakened. No runtime code edited.


## SR-006 — explicit startup-scan removal instruction (2026-09-27)
User: "Please remove the validation" in direct response to the measured full-history
pre-startup scan; also explicitly requests this recurring mistake in the same
Data Migration Guideline. This approves removal of that exhaustive startup
reference-validation prerequisite, not deletion of access-time ownership/security
checks or historical data. It supersedes the prior hold on this specific timing
change. Earlier pending backup/journal policy is separate and remains unresolved.
REQ-006 / BEH-004 / SC-004 (Supported Normal): user reopens an already-migrated app
and creates unrelated new work without waiting for validation of all retained
historical attachment traces. Requested historical operations still enforce exact
ownership and file-access validity; unavailable references affect their operation,
not unrelated work. User-directed removal scope includes the same global history
scan on unrelated new-run admission; no replacement global background audit or
persistent-cache framework is authorized by this instruction.
AC-006: terminal-migration startup and unrelated new-run creation perform no
exhaustive historical attachment-reference trace scan. Exercise large retained
history and missing historical references; app/new work remain usable. Applicable
access tests still reject wrong-owner,unavailable and uncontained attachment reads.
REQ-007 / AC-007: guideline names the recurring anti-pattern, actual measured
example,intended rationale,design error,consequences and simpler correct boundary.
Documentation updated. Runtime source removal/design/review are not completed by
this documentation turn. No new migration,forced successful replay or data deletion.

SR-007 approval clarification: completed conversion/validation must not be repeated
on ordinary startup under readiness/integrity names. This reinforces REQ-006,
not permission to remove checks for actually requested operations. Documentation
updated under REQ-007; runtime implementation remains pending.
