# Handoff: repository-secret-scan

- Package: `repository-secret-scan`
- Classification: `Direct Delivery Requested` (user-directed route; no handoff rule covers it, so the Solution Designer routes it as the user asked)
- From: Solution Designer, `/software_engineering_team/solution_designer`
- To: Delivery Engineer, `/software_engineering_team/delivery_engineer`
- Requested by: Project Task Manager, `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Date: 2026-10-20

## Route and why

The Task gives the user's view: this is delivery-engineer-sized work (find,
verify, clean up, finalize). The Delivery Engineer does it directly, no product
design is needed, and the Solution Designer only routes it and answers
questions. So there is no requirements doc, investigation notes, design spec or
solution revision record for this ticket, by the user's direction, not as an
upstream gap. Implementation, architecture review, code review and API/E2E
stages are not selected; mark their documents `N/A — not applicable (user-directed direct delivery)`.

Send questions to the Solution Designer. When done, return `Delivery Completed`
to the Solution Designer with the report and finalization evidence; the
Solution Designer verifies the receipt and returns the result (with
follow-ups) to the Project Task Manager.

## Workspace

- Ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/repository-secret-scan`
- Branch: `codex/repository-secret-scan`
- Base: `origin/personal` at `66d834b0acc3caa4e81d2e62c34d35ff0ad38bd1` (fetched 2026-10-20)
- Finalization target: `origin/personal` (per `RELEASE.md`), for changes to `autobyteus-workspace`. Changes in other repositories finalize on that repository's own default branch.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/repository-secret-scan/tickets/in-progress/repository-secret-scan/`
- The shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on `personal`, behind origin and holds other people's uncommitted work: do not work or commit there.

## The Task, in the delegator's words

> Secret scan of our git repositories and documents: find API keys, tokens and
> passwords that were committed, and clean them up.
>
> Why: the team is moving fast (many agents, many tickets, generated documents,
> test evidence, delivery receipts). A key that lands in a commit or a document
> is a security problem, most of all in a repository that is public or can be
> cloned by others. The user wants this checked now, before it becomes an
> incident.
>
> Who: this is a delivery-engineer-sized job (find, verify, clean up,
> finalize). The user's view: the Delivery Engineer of the software engineering
> team does it directly. No product design is needed. The Solution Designer
> only routes it to the Delivery Engineer and answers questions.
>
> What to check, in this order:
> 1. Inventory first. List the repositories and say which are public and which
>    private (their GitHub visibility). Repositories we know about under
>    /Users/normy/autobyteus_org include: autobyteus-workspace-superrepo (origin
>    AutoByteus/autobyteus-workspace), autobyteus-agents (public),
>    autobyteus-web-design (autobyteus-web-prototype), autobyteus_mcps and
>    autobyteus_private_mcps, autobyteus-private-agents,
>    autobyteus-private-skills, autobyteus-skills, autobyteus-message-gateway,
>    autobyteus-nfs, autobyteus-voice-runtime, autobyteus-desktop-releases,
>    autobyteus-delivery-receipts / delivery-receipts. Many other repositories
>    (including old copies, worktrees and tmp release clones) live there too.
>    Decide a sensible scope, name what you left out and why. Start with public
>    repositories and the product repositories.
> 2. Scan the working tree and the full git history of each repository (all
>    branches and tags), not only the latest commit. Use a proper secret scanner
>    (for example gitleaks or trufflehog) if one can be installed without
>    touching user data, plus targeted searches for the provider key names we
>    use (for example *_API_KEY, bearer tokens, private keys, OAuth client
>    secrets, passwords in connection strings).
> 3. Also look at documents: tickets, evidence folders, design docs, delivery
>    receipts, screenshots/log captures and test fixtures. Test fixtures must
>    use obviously fake values.
> 4. Check places where secrets hide in plain sight: .env files and copies that
>    are tracked, test databases (test.db and similar) with real keys, run logs
>    and traces that were committed, GitHub Actions config.
>
> For every finding (report the file, commit, repository, kind of key and
> whether it looks real or fake; NEVER write the secret value itself into a
> ticket, chat, log, message or document, and mask it in command output):
> - Real or possibly real key: the user must revoke or rotate it at the
>   provider. Removing it from git does not make it safe once it was pushed.
>   Tell the user exactly which key (by provider and where it was) and wait for
>   them. Do not use the key to test it.
> - Remove it from the current files and add a guard so it cannot come back
>   easily (for example .gitignore entries, a pre-commit or CI secret scan if
>   the user agrees). Keep it proportionate.
> - Rewriting git history (filter-repo or similar), force-pushing, or
>   deleting/moving a published tag needs the user's explicit approval for that
>   repository, after you show them the plan and a backup exists. Never move or
>   delete a published tag without it. Ask before; do not decide for the user.
> - Fake or test values: leave them, list them as false positives so the next
>   scan can ignore them (allowlist file).
>
> Done when: every repository in scope has a scan result (found / not found),
> every real finding is either cleaned up or waiting for a named user decision
> (rotate, history rewrite) with the reason, guards are in place or proposed,
> and the delivery finalization on the base branch is done where files changed.
> Write a short report with the inventory, counts per repository, what was
> cleaned, what waits for the user, and follow-ups. The report holds no secret
> values.
>
> Constraints: any change to the user's real data (local .env, databases, the
> user's vault) needs their explicit approval and a backup first; do not touch
> the user's own .env (the user cleans that himself; see the decision recorded
> in autobyteus-214). Related tickets already open: autobyteus-217 (list old
> test.db files that hold real keys; read-only), autobyteus-218 and
> autobyteus-219 (what agents inherit); this Task is about committed content in
> git repositories and documents, do not duplicate them, link them.

## Solution Designer notes (answers given up front)

These clarify the direction; they do not add scope.

1. **User decisions stay with the user, asked directly.** Rotation/revocation,
   history rewrite, force-push, tag changes, adding a pre-commit hook or CI
   scan, and any change to the user's real data are the user's decisions. Ask
   the user in your own conversation with the plan and your recommendation;
   the Project Task Manager's or the Solution Designer's reply cannot stand in
   for the user's approval.
2. **No secret value anywhere we write.** This ticket folder is committed to
   `AutoByteus/autobyteus-workspace`. Scanner reports go outside any repository
   (for example a temp folder you delete at the end) or are written redacted
   (`gitleaks --redact`, `trufflehog` without raw output). Evidence files
   describe findings by repository, path, commit, rule and provider, and a
   short fingerprint or hash at most.
3. **Do not verify keys against providers.** Turn off any scanner mode that
   calls a provider (for example trufflehog verification: `--no-verification`).
   Classify real vs. fake by shape and context only, as the Task says.
4. **Scanner install** must not touch user data: a Homebrew install or a
   standalone binary in a temp folder is fine; do not run scanners against the
   user's home directory, vault, local `.env` or databases outside the
   repositories.
5. **Scope boundaries with related tickets.** `test.db` files that are
   untracked local files belong to autobyteus-217; only a database file that
   is committed to git is this ticket. What agents inherit at run time is
   autobyteus-218/219. Link those keys in the report instead of repeating
   their work.
6. **Worktrees and old copies.** A git worktree shares its repository's
   history, so scanning the main repository's history (all refs) covers it;
   the uncommitted working-tree files of worktrees are local data, not
   committed content. Old copies and tmp release clones that have no remote of
   their own, or whose remote is a repository already in scope, can be named as
   left out with that reason, as the Task allows.
7. **Follow-ups.** Record anything outside this ticket in this folder's
   `follow-ups.md` (see `ticket-scope.md` in the team's shared folder); the
   Solution Designer sends them when the ticket leaves the team.

## Expected output

- A short report in this ticket folder (inventory with visibility, scope and
  left-out list, counts per repository, cleaned items, items waiting for a
  named user decision, guards in place or proposed, follow-ups), no secret
  values.
- An allowlist file for confirmed false positives where a scanner config is
  added.
- The delivery engineer's own documents (docs sync / handoff summary,
  `delivery-revision-record.md`) and finalization on `personal` where files
  changed, plus finalization in other repositories that changed.
- `Delivery Completed` returned to the Solution Designer, or a precise
  `Blocked` result naming the user decision being waited for.

## Status

- Approval basis: the Task's direction from the user, via the Project Task Manager. No Solution Designer requirements baseline (user direction).
- Open risks: real keys may already be public; rotation is the user's action and cannot be replaced by a git cleanup.
- Route record: sent to `/software_engineering_team/delivery_engineer` with `send_message_to` on 2026-10-20 (user-named collaborator; no matching handoff rule).
